import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import * as d3 from 'd3'
import { useConstellation } from '../contexts/ConstellationContext'
import { NodePopup } from './NodePopup'
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
  const [popup, setPopup] = useState<{
    node: Node
    x: number
    y: number
  } | null>(null)
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  // Connection creation state for ctrl+click
  const [connectionSource, setConnectionSource] = useState<string | null>(null)
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null)

  // Transform Konstel data into graph nodes
  const transformToGraphNodes = useCallback((nodes: Node[]): GraphNode[] => {
    return nodes.map(node => {
      // Position goal nodes at the center of the canvas
      let x = node.position_x
      let y = node.position_y
      
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
      const source = elementMap.get(edge.source_id)
      const target = elementMap.get(edge.target_id)
      if (!source || !target) {
        console.warn('Edge references missing node(s):', edge, { source, target })
        return null
      }
      return {
        source,
        target,
        causal_strength: edge.weight,
        confidence: edge.confidence_level,
        influence_flow: 0,
        last_update_time: 0
      }
    }).filter((conn): conn is CausalConnection => !!conn)
  }, [])

  // --- D3 simulation and SVG creation (only once) ---
  useEffect(() => {
    if (!svgRef.current) return
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    // Add zoom-layer and causal-field
    const zoomLayer = svg.append('g').attr('class', 'zoom-layer')
    const fieldContainer = zoomLayer.append('g').attr('class', 'causal-field')
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

    // Add pan/zoom behavior
    svg.call(
      d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.2, 3])
        .on('zoom', (event) => {
          zoomLayer.attr('transform', event.transform)
        })
    )

    // Create simulation ONCE
    // Custom exponential centering force
    function exponentialCenteringForce(strength = 0.0003, exp = 2) {
      return function(alpha: number) {
        for (const node of simulation.nodes()) {
          const dx = (width / 2) - node.x;
          const dy = (height / 2) - node.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 0.1) {
            // Exponential pull: force ~ distance^exp
            const force = strength * Math.pow(dist, exp) * alpha;
            node.vx += (dx / dist) * force;
            node.vy += (dy / dist) * force;
          }
        }
      }
    }

    const simulation = d3.forceSimulation<GraphNode>([])
      .force('influence_attraction', d3.forceManyBody<GraphNode>().strength(d => d.influence_strength * 50).distanceMax(200))
      .force('node_repulsion', d3.forceManyBody<GraphNode>().strength(-100).distanceMin(50))
      .force('causal_links', d3.forceLink<GraphNode, CausalConnection>([]).id(d => d.id).distance(d => 100 + (1 - d.causal_strength) * 100).strength(d => d.causal_strength * 0.8))
      .force('field_center', d3.forceCenter(width / 2, height / 2))
      .force('boundary_containment', d3.forceManyBody<GraphNode>().strength(20).distanceMax(50))
      .force('exponential_center', exponentialCenteringForce(0.0001, 1.5)) // Add custom center force
      .force('collision', d3.forceCollide<GraphNode>().radius(d => {
        // Core + influence field (match node rendering)
        const core = d.node_type === 'goal' ? 15 + d.impact_score * 8 : 8 + d.impact_score * 12;
        const field = 20 + d.influence_strength * 30;
        return Math.max(core, field) + 8; // add a little padding
      }).strength(1.1))

    simulationRef.current = simulation

    // Tick handler (updates positions)
    simulation.on('tick', () => {
      if (!fieldContainerRef.current) return
      fieldContainerRef.current.selectAll<SVGGElement, GraphNode>('.graph-node')
        .attr('transform', d => `translate(${d.x},${d.y})`)
    })
  }, [])

  // --- Update simulation data when nodes/edges change ---
  // Memoize graph node objects to preserve D3 positions unless graph structure changes
  const stableGraphNodes = useMemo(() => {
    // Only re-create node objects if the actual graph structure changes
    return transformToGraphNodes(state.currentConstellation?.nodes || [])
  }, [state.currentConstellation?.nodes, width, height, transformToGraphNodes])

  const stableGraphLinks = useMemo(() => {
    return transformToCausalConnections(state.currentConstellation?.edges || [], stableGraphNodes)
  }, [state.currentConstellation?.edges, stableGraphNodes, transformToCausalConnections])

  useEffect(() => {
    if (!simulationRef.current || !fieldContainerRef.current) return
    // Only update simulation nodes/links if graph structure changes
    simulationRef.current.nodes(stableGraphNodes)
    const linkForce = simulationRef.current.force('causal_links') as d3.ForceLink<GraphNode, CausalConnection>
    if (linkForce) linkForce.links(stableGraphLinks)
    simulationRef.current.alpha(1).restart()

    // Render/Update SVG edges (connections) BEFORE nodes
    const fieldContainer = fieldContainerRef.current
    const graphLinks = fieldContainer.selectAll<SVGLineElement, CausalConnection>('.graph-link')
      .data(stableGraphLinks, d => `${d.source.id}->${d.target.id}`)

    graphLinks.exit().remove()
    const graphLinksEnter = graphLinks.enter()
      .append('line')
      .attr('class', 'graph-link')
      .attr('stroke', d => {
        const edgeId = `${d.source.id}->${d.target.id}`
        if (hoveredEdge === edgeId) return '#fbbf24'
        return d.causal_strength > 0.7 ? '#7c3aed' : d.causal_strength > 0.4 ? '#3b82f6' : '#6b7280'
      })
      .attr('stroke-width', d => Math.max(1, d.causal_strength * 4 + 1))
      .attr('opacity', d => Math.max(0.6, d.confidence * 0.8))
      .attr('stroke-dasharray', d => d.confidence < 0.5 ? '5,5' : 'none')
      .style('cursor', 'pointer')
      .on('mouseenter', function(event, d) {
        const edgeId = `${d.source.id}->${d.target.id}`
        setHoveredEdge(edgeId)
        d3.select(this)
          .attr('stroke-width', Math.max(3, d.causal_strength * 4 + 2))
          .attr('opacity', 1)
      })
      .on('mouseleave', function(event, d) {
        setHoveredEdge(null)
        d3.select(this)
          .attr('stroke-width', Math.max(1, d.causal_strength * 4 + 1))
          .attr('opacity', Math.max(0.6, d.confidence * 0.8))
      })
      .on('click', function(event, d) {
        event.stopPropagation()
        handleEdgeClick(d)
      })

    // Update existing edges
    graphLinks
      .attr('stroke', d => {
        const edgeId = `${d.source.id}->${d.target.id}`
        if (hoveredEdge === edgeId) return '#fbbf24'
        return d.causal_strength > 0.7 ? '#7c3aed' : d.causal_strength > 0.4 ? '#3b82f6' : '#6b7280'
      })
      .attr('stroke-width', d => Math.max(1, d.causal_strength * 4 + 1))
      .attr('opacity', d => Math.max(0.6, d.confidence * 0.8))

    // Update positions on tick
    simulationRef.current.on('tick', () => {
      fieldContainer.selectAll<SVGLineElement, CausalConnection>('.graph-link')
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y)
      fieldContainer.selectAll<SVGGElement, GraphNode>('.graph-node')
        .attr('transform', d => `translate(${d.x},${d.y})`)
    })

    // Render/Update SVG nodes
    const graphNodes = fieldContainer.selectAll<SVGGElement, GraphNode>('.graph-node')
      .data(stableGraphNodes, d => d.id)

    const graphEnter = graphNodes.enter()
      .append('g')
      .attr('class', 'graph-node')
      .style('cursor', 'pointer')
      .on('click', function(event, d) {
        handleNodeClick(event as unknown as React.MouseEvent, d);
      })
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
      .attr('stroke', d => {
        if (connectionSource === d.id) return '#10b981' // Green for connection source
        if (selectedNodes.has(d.id)) return '#fbbf24' // Yellow for selected
        return '#ffffff' // White for normal
      })
      .attr('stroke-width', d => {
        if (connectionSource === d.id) return 4
        if (selectedNodes.has(d.id)) return 3
        return 2
      })

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
      .attr('stroke', d => {
        if (connectionSource === d.id) return '#2563eb' // Blue for connection source
        if (selectedNodes.has(d.id)) return '#fbbf24' // Yellow for selected
        return '#ffffff' // White for normal
      })
      .attr('stroke-width', d => {
        if (connectionSource === d.id) return 4
        if (selectedNodes.has(d.id)) return 3
        return 2
      })
      .attr('filter', d => connectionSource === d.id ? 'url(#causal-connection-glow)' : null)
    
    // Remove exited nodes
    graphNodes.exit().remove()
  }, [state.currentConstellation, transformToGraphNodes, transformToCausalConnections])

  // Node interaction handlers
  const handleNodeClick = useCallback((event: React.MouseEvent, d: GraphNode) => {
    event.stopPropagation();
    
    console.log('Node click:', { 
      ctrlKey: event.ctrlKey, 
      metaKey: event.metaKey,
      nodeId: d.id,
      connectionSource
    });

    // Handle ctrl+click connection creation
    if ((event.ctrlKey || event.metaKey)) {
      if (!connectionSource) {
        // First ctrl+click: set as source
        setConnectionSource(d.id);
        setSelectedNodes(new Set([d.id]));
        if (onNodeSelect) onNodeSelect([d.id]);
        // Don't open popup
        if (simulationRef.current) simulationRef.current.alphaTarget(0);
        return;
      } else if (connectionSource !== d.id) {
        // Second ctrl+click: create connection
        handleCreateConnection(connectionSource, d.id);
        setConnectionSource(null);
        setSelectedNodes(new Set());
        if (simulationRef.current) simulationRef.current.alphaTarget(0);
        return;
      } else {
        // Same node ctrl+clicked: cancel
        setConnectionSource(null);
        setSelectedNodes(new Set());
        if (simulationRef.current) simulationRef.current.alphaTarget(0);
        return;
      }
    }

    setSelectedNodes(new Set([d.id]));
    if (onNodeSelect) onNodeSelect([d.id]);

    // Open popup at node position
    const svg = svgRef.current;
    if (svg) {
      const pt = (svg as SVGSVGElement).createSVGPoint();
      pt.x = d.x;
      pt.y = d.y;
      const screenCTM = svg.getScreenCTM();
      const transformed = screenCTM ? pt.matrixTransform(screenCTM) : { x: d.x, y: d.y };
      setPopup({ node: d as Node, x: transformed.x, y: transformed.y });
    } else {
      setPopup({ node: d as Node, x: d.x, y: d.y });
    }
    // Freeze simulation after node click (not drag)
    if (simulationRef.current) {
      simulationRef.current.alphaTarget(0);
    }
  }, [onNodeSelect, connectionSource]);

  const handleNodeMouseEnter = useCallback((event: MouseEvent, d: GraphNode) => {
    setHoveredNode(d.id);
    // Trigger neural pulse for visual feedback
    actions.triggerNeuralPulse([d.id]);
  }, [actions]);

  const handleNodeMouseLeave = useCallback(() => {
    setHoveredNode(null);
  }, []);

  const handleDragStart = useCallback((event: d3.D3DragEvent<SVGGElement, GraphNode, GraphNode>) => {
    if (!event.active && simulationRef.current) {
      simulationRef.current.alphaTarget(0.3).restart();
    }
    event.subject.fx = event.subject.x;
    event.subject.fy = event.subject.y;
  }, []);

  const handleDrag = useCallback((event: d3.D3DragEvent<SVGGElement, GraphNode, GraphNode>) => {
    event.subject.fx = event.x;
    event.subject.fy = event.y;
  }, []);

  const handleDragEnd = useCallback((event: d3.D3DragEvent<SVGGElement, GraphNode, GraphNode>) => {
    if (!event.active && simulationRef.current) {
      simulationRef.current.alphaTarget(0);
    }
    event.subject.fx = null;
    event.subject.fy = null;
  }, []);

  // Edge interaction handlers
  const handleEdgeClick = useCallback((edge: CausalConnection) => {
    console.log('Edge clicked:', edge)
    // Could open edge editing dialog here
  }, [])

  // Connection creation handler
  const handleCreateConnection = useCallback(async (sourceId: string, targetId: string) => {
    try {
      await actions.establishCausalLink(sourceId, targetId, 0.5) // Default strength of 0.5
      console.log('Connection created:', sourceId, '->', targetId)
    } catch (error) {
      console.error('Failed to create connection:', error)
    }
  }, [actions])

  const handleCanvasClick = useCallback(() => {
    if (connectionSource) {
      setConnectionSource(null)
      setSelectedNodes(new Set())
    }
    setPopup(null)
  }, [connectionSource])

  // --- Render ---
  return (
    <div className="relative w-full h-full bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Connection Mode Indicator */}
      {connectionSource && (
        <div className="absolute top-4 left-4 z-10 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">
              {connectionSource ? 'Click target node to connect' : 'Click source node to start'}
            </span>
            <button 
              onClick={() => {
                setConnectionSource(null)
                setSelectedNodes(new Set())
              }}
              className="ml-2 text-green-200 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Connection Mode Toggle Button */}
      <div className="absolute top-4 right-4 z-10">
        <div className="absolute top-4 right-4 z-10 px-4 py-2 text-gray-400 text-sm">
          Ctrl+Click to create connections
        </div>
      </div>

      <svg
        ref={svgRef}
        width={width}
        height={height}
        className={`${className} cursor-grab active:cursor-grabbing`}
        style={{
          background: 'radial-gradient(ellipse at center, rgba(139, 69, 19, 0.1) 0%, rgba(30, 41, 59, 0.8) 70%, rgba(15, 23, 42, 0.95) 100%)'
        }}
        onClick={handleCanvasClick}
      >
        {/* D3 will render nodes and edges inside zoom-layer */}
        <g className="zoom-layer">
          <g className="causal-field" />
        </g>
      </svg>
      {/* Overlay popup if open */}
      {popup && (
        <NodePopup
          node={popup.node}
          x={popup.x}
          y={popup.y}
          onClose={() => setPopup(null)}
          onEdit={onNodeEdit}
          onDelete={onNodeDelete}
          onExpand={onNodeExpand}
        />
      )}
    </div>
  );
};

export default CausalExplorationCanvas;
