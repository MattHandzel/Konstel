import React, { useRef, useEffect, useState, useCallback } from 'react'
import * as d3 from 'd3'
import { useConstellation } from '../contexts/ConstellationContext'
import { NodeContextMenu } from './NodeContextMenu'
import type { Node, Edge, CausalResonance, FactorCluster, ImpactWave } from '../types/konstel'

/**
 * Causal Exploration Canvas - Interactive Causal Graph Visualization
 * 
 * This is not a traditional graph visualization. Instead, it's a dynamic
 * representation of causal relationships and influence propagation within a goal system.
 * 
 * Key features:
 * - Factors pulse visually based on their influence strength
 * - Connections show flowing influence rather than static lines
 * - Clusters emerge organically from causal relationships
 * - Impact propagation animates through the network when changes occur
 * - Pattern analysis reveals hidden systemic behaviors
 */

interface CausalCanvasProps {
  width: number
  height: number
  className?: string
  onNodeSelect?: (nodeIds: string[]) => void
  onNodeEdit?: (nodeId: string) => void
  onNodeDelete?: (nodeId: string) => void
  onNodeExpand?: (nodeId: string) => void
}

interface GraphNode extends d3.SimulationNodeDatum {
  id: string
  title: string
  impact_score: number
  node_type: string
  influence_strength: number // 0-1: current influence level
  pattern_frequency: number // Hz: how fast this node updates
  cluster_membership?: string // ID of factor cluster this belongs to
  last_activity_time: number // timestamp of last interaction
}

interface CausalConnection {
  source: GraphNode
  target: GraphNode
  causal_strength: number // 0-1: strength of causal relationship
  confidence: number // 0-1: AI confidence in this connection
  influence_flow: number // -1 to 1: direction and intensity of current influence flow
  last_update_time: number // timestamp of last propagation
}

export function CausalExplorationCanvas({ 
  width, 
  height, 
  className,
  onNodeSelect,
  onNodeEdit,
  onNodeDelete,
  onNodeExpand
}: CausalCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const { state, actions } = useConstellation()

  // Persistent simulation and field container refs
  const simulationRef = useRef<d3.Simulation<GraphNode, CausalConnection> | null>(null)
  const fieldContainerRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null)
  
  // Node interaction state
  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set())
  const [contextMenu, setContextMenu] = useState<{
    nodeId: string
    x: number
    y: number
  } | null>(null)
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)

  // Transform Konstel data into graph nodes
  const transformToGraphNodes = useCallback((nodes: Node[]): GraphNode[] => {
    return nodes.map(node => {
      // Position goal nodes at the center of the canvas
      let x = node.position?.x
      let y = node.position?.y
      
      if (node.node_type === 'goal') {
        x = width / 2
        y = height / 2
      } else if (!x || !y) {
        // Random position for other nodes if no position is set
        x = Math.random() * width
        y = Math.random() * height
      }
      
      return {
        id: node.id,
        title: node.title,
        description: node.description || '',
        node_type: node.node_type,
        impact_score: node.impact_score || 0,
        influence_strength: Math.abs(node.impact_score || 0),
        x,
        y,
        fx: node.node_type === 'goal' ? width / 2 : undefined, // Fix goal nodes at center
        fy: node.node_type === 'goal' ? height / 2 : undefined,
        pattern_frequency: 0.5 + Math.abs(node.impact_score) * 2,
        last_activity_time: Date.now()
      }
    })
  }, [width, height])

  const transformToCausalConnections = useCallback((edges: Edge[], elements: GraphNode[]): CausalConnection[] => {
    const elementMap = new Map(elements.map(el => [el.id, el]))
    return edges.map(edge => {
      const source = elementMap.get(edge.source_id)!
      const target = elementMap.get(edge.target_id)!
      return {
        source,
        target,
        causal_strength: edge.weight,
        confidence: edge.confidence_level,
        influence_flow: 0,
        last_update_time: 0
      }
    }).filter(conn => conn.source && conn.target)
  }, [])

  // --- D3 simulation and SVG creation (only once) ---
  useEffect(() => {
    if (!svgRef.current) return
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    const fieldContainer = svg.append('g').attr('class', 'causal-field')
    fieldContainerRef.current = fieldContainer

    // Gradients/filters (same as before)
    const defs = svg.append('defs')
    const influenceGradient = defs.append('radialGradient')
      .attr('id', 'influence-gradient')
      .attr('cx', '50%')
      .attr('cy', '50%')
    influenceGradient.append('stop').attr('offset', '0%').attr('stop-color', '#7c3aed').attr('stop-opacity', 0.8)
    influenceGradient.append('stop').attr('offset', '100%').attr('stop-color', '#1e3a8a').attr('stop-opacity', 0.1)
    const connectionFilter = defs.append('filter').attr('id', 'causal-connection-glow').attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%')
    connectionFilter.append('feGaussianBlur').attr('stdDeviation', 3).attr('result', 'coloredBlur')
    const connectionMerge = connectionFilter.append('feMerge')
    connectionMerge.append('feMergeNode').attr('in', 'coloredBlur')
    connectionMerge.append('feMergeNode').attr('in', 'SourceGraphic')

    // Create simulation ONCE
    const simulation = d3.forceSimulation<GraphNode>([])
      .force('influence_attraction', d3.forceManyBody<GraphNode>().strength(d => d.influence_strength * 50).distanceMax(200))
      .force('node_repulsion', d3.forceManyBody<GraphNode>().strength(-100).distanceMin(50))
      .force('causal_links', d3.forceLink<GraphNode, CausalConnection>([]).id(d => d.id).distance(d => 100 + (1 - d.causal_strength) * 100).strength(d => d.causal_strength * 0.8))
      .force('field_center', d3.forceCenter(width / 2, height / 2))
      .force('boundary_containment', d3.forceManyBody<GraphNode>().strength(20).distanceMax(50))

    simulationRef.current = simulation

    // Tick handler (updates positions)
    simulation.on('tick', () => {
      if (!fieldContainerRef.current) return
      fieldContainerRef.current.selectAll<SVGGElement, GraphNode>('.graph-node')
        .attr('transform', d => `translate(${d.x},${d.y})`)
    })
  }, [width, height])

  // --- Update simulation data when nodes/edges change ---
  useEffect(() => {
    if (!simulationRef.current || !fieldContainerRef.current) return
    const nodes = transformToGraphNodes(state.currentConstellation?.nodes || [])
    const links = transformToCausalConnections(state.currentConstellation?.edges || [], nodes)
    simulationRef.current.nodes(nodes)
    const linkForce = simulationRef.current.force('causal_links') as d3.ForceLink<GraphNode, CausalConnection>
    if (linkForce) linkForce.links(links)
    simulationRef.current.alpha(1).restart()

    // Render/Update SVG nodes
    const fieldContainer = fieldContainerRef.current
    const graphNodes = fieldContainer.selectAll<SVGGElement, GraphNode>('.graph-node')
      .data(nodes, d => d.id)

    const graphEnter = graphNodes.enter()
      .append('g')
      .attr('class', 'graph-node')
      .style('cursor', 'pointer')
      .on('click', handleNodeClick)
      .on('contextmenu', handleNodeRightClick)
      .on('mouseenter', handleNodeMouseEnter)
      .on('mouseleave', handleNodeMouseLeave)
      .call(d3.drag<SVGGElement, GraphNode>()
        .on('start', handleDragStart)
        .on('drag', handleDrag)
        .on('end', handleDragEnd)
      )

    graphEnter.append('circle')
      .attr('class', 'influence-field')
      .attr('r', d => 20 + d.influence_strength * 30)
      .attr('fill', 'url(#influence-gradient)')
      .attr('opacity', 0.3)

    graphEnter.append('circle')
      .attr('class', 'node-core')
      .attr('r', d => d.node_type === 'goal' ? 15 + d.impact_score * 8 : 8 + d.impact_score * 12)
      .attr('fill', d => {
        if (d.node_type === 'goal') return '#7c3aed'
        if (d.impact_score > 0.5) return '#059669'
        if (d.impact_score > 0) return '#3b82f6'
        if (d.impact_score < -0.5) return '#dc2626'
        if (d.impact_score < 0) return '#f59e0b'
        return '#6b7280'
      })
      .attr('stroke', d => selectedNodes.has(d.id) ? '#fbbf24' : '#ffffff')
      .attr('stroke-width', d => selectedNodes.has(d.id) ? 3 : 2)

    graphEnter.append('text')
      .attr('class', 'node-label')
      .attr('dy', d => -15 - d.impact_score * 12)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('font-weight', '500')
      .style('fill', '#f1f5f9')
      .style('text-shadow', '0 0 8px rgba(0,0,0,0.8)')
      .text(d => d.title)

    // Update existing nodes
    graphNodes.select('.node-core')
      .attr('stroke', d => selectedNodes.has(d.id) ? '#fbbf24' : '#ffffff')
      .attr('stroke-width', d => selectedNodes.has(d.id) ? 3 : 2)
    
    // Remove exited nodes
    graphNodes.exit().remove()
  }, [state.currentConstellation, transformToGraphNodes, transformToCausalConnections, selectedNodes])

  // Node interaction handlers
  const handleNodeClick = useCallback((event: MouseEvent, d: GraphNode) => {
    event.stopPropagation()
    
    if (event.ctrlKey || event.metaKey) {
      // Multi-select with Ctrl/Cmd
      const newSelection = new Set(selectedNodes)
      if (newSelection.has(d.id)) {
        newSelection.delete(d.id)
      } else {
        newSelection.add(d.id)
      }
      setSelectedNodes(newSelection)
      onNodeSelect?.(Array.from(newSelection))
    } else {
      // Single select
      const newSelection = new Set([d.id])
      setSelectedNodes(newSelection)
      onNodeSelect?.(Array.from(newSelection))
      actions.focusOnFactor(d.id)
    }
  }, [selectedNodes, onNodeSelect, actions])

  const handleNodeRightClick = useCallback((event: MouseEvent, d: GraphNode) => {
    event.preventDefault()
    event.stopPropagation()
    
    const rect = svgRef.current?.getBoundingClientRect()
    if (rect) {
      setContextMenu({
        nodeId: d.id,
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      })
    }
  }, [])

  const handleNodeMouseEnter = useCallback((event: MouseEvent, d: GraphNode) => {
    setHoveredNode(d.id)
    // Trigger neural pulse for visual feedback
    actions.triggerNeuralPulse([d.id])
  }, [actions])

  const handleNodeMouseLeave = useCallback(() => {
    setHoveredNode(null)
  }, [])

  const handleDragStart = useCallback((event: d3.D3DragEvent<SVGGElement, GraphNode, GraphNode>) => {
    if (!event.active && simulationRef.current) {
      simulationRef.current.alphaTarget(0.3).restart()
    }
    event.subject.fx = event.subject.x
    event.subject.fy = event.subject.y
  }, [])

  const handleDrag = useCallback((event: d3.D3DragEvent<SVGGElement, GraphNode, GraphNode>) => {
    event.subject.fx = event.x
    event.subject.fy = event.y
  }, [])

  const handleDragEnd = useCallback((event: d3.D3DragEvent<SVGGElement, GraphNode, GraphNode>) => {
    if (!event.active && simulationRef.current) {
      simulationRef.current.alphaTarget(0)
    }
    event.subject.fx = null
    event.subject.fy = null
  }, [])

  // Context menu handlers
  const handleContextMenuClose = useCallback(() => {
    setContextMenu(null)
  }, [])

  const handleNodeEdit = useCallback((nodeId: string) => {
    setContextMenu(null)
    onNodeEdit?.(nodeId)
  }, [onNodeEdit])

  const handleNodeDelete = useCallback((nodeId: string) => {
    setContextMenu(null)
    setSelectedNodes(prev => {
      const newSet = new Set(prev)
      newSet.delete(nodeId)
      return newSet
    })
    onNodeDelete?.(nodeId)
  }, [onNodeDelete])

  const handleNodeExpand = useCallback((nodeId: string) => {
    setContextMenu(null)
    onNodeExpand?.(nodeId)
  }, [onNodeExpand])

  // Clear selection when clicking on empty canvas
  const handleCanvasClick = useCallback(() => {
    setSelectedNodes(new Set())
    setContextMenu(null)
    onNodeSelect?.([])
    actions.focusOnFactor(null)
  }, [onNodeSelect, actions])

  // --- Render SVG ---
  return (
    <div className="relative">
      <svg 
        ref={svgRef} 
        width={width} 
        height={height} 
        className={className}
        onClick={handleCanvasClick}
      />
      {contextMenu && (
        <NodeContextMenu
          nodeId={contextMenu.nodeId}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={handleContextMenuClose}
          onEdit={handleNodeEdit}
          onDelete={handleNodeDelete}
          onExpand={handleNodeExpand}
          nodes={state.currentConstellation?.nodes || []}
        />
      )}
    </div>
  )
}
