import React, { useRef, useEffect, useState, useCallback } from 'react'
import * as d3 from 'd3'
import { useConstellation } from '../contexts/ConstellationContext'
import type { Node, Edge, CausalResonance, NeuralCluster, ImpactWave } from '../types/konstel'

/**
 * Causal Exploration Canvas - The Heart of Konstel's Neural Interface
 * 
 * This is not a traditional graph visualization. Instead, it's a living, breathing
 * representation of causal relationships that behaves like a neural network.
 * 
 * Key innovations:
 * - Factors pulse with neural activity based on their causal influence
 * - Connections show flowing signals rather than static lines
 * - Clusters emerge organically from causal relationships
 * - Impact waves propagate through the network when changes occur
 * - Resonance patterns reveal hidden systemic behaviors
 */

interface CausalCanvasProps {
  width: number
  height: number
  className?: string
}

interface NeuralElement extends d3.SimulationNodeDatum {
  id: string
  title: string
  impact_score: number
  node_type: string
  causal_energy: number // 0-1: current neural activation level
  resonance_frequency: number // Hz: how fast this node pulses
  cluster_membership?: string // ID of neural cluster this belongs to
  last_activity_time: number // timestamp of last interaction
}

interface SynapticConnection {
  source: NeuralElement
  target: NeuralElement
  causal_strength: number // 0-1: strength of causal relationship
  confidence: number // 0-1: AI confidence in this connection
  signal_flow: number // -1 to 1: direction and intensity of current signal flow
  last_signal_time: number // timestamp of last signal transmission
}

export function CausalExplorationCanvas({ width, height, className }: CausalCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const { state, actions } = useConstellation()

  // Persistent simulation and field container refs
  const simulationRef = useRef<d3.Simulation<NeuralElement, SynapticConnection> | null>(null)
  const fieldContainerRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null)

  // Transform Konstel data into neural elements
  const transformToNeuralElements = useCallback((nodes: Node[]): NeuralElement[] => {
    return nodes.map(node => ({
      id: node.id,
      title: node.title,
      impact_score: node.impact_score,
      node_type: node.node_type,
      x: node.position_x || Math.random() * width,
      y: node.position_y || Math.random() * height,
      causal_energy: Math.abs(node.impact_score) * 0.8 + 0.2,
      resonance_frequency: 0.5 + Math.abs(node.impact_score) * 2,
      last_activity_time: Date.now()
    }))
  }, [width, height])

  const transformToSynapticConnections = useCallback((edges: Edge[], elements: NeuralElement[]): SynapticConnection[] => {
    const elementMap = new Map(elements.map(el => [el.id, el]))
    return edges.map(edge => {
      const source = elementMap.get(edge.source_id)!
      const target = elementMap.get(edge.target_id)!
      return {
        source,
        target,
        causal_strength: edge.weight,
        confidence: edge.confidence_level,
        signal_flow: 0,
        last_signal_time: 0
      }
    }).filter(conn => conn.source && conn.target)
  }, [])

  // --- D3 simulation and SVG creation (only once) ---
  useEffect(() => {
    if (!svgRef.current) return
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    const fieldContainer = svg.append('g').attr('class', 'neural-field')
    fieldContainerRef.current = fieldContainer

    // Gradients/filters (same as before)
    const defs = svg.append('defs')
    const energyGradient = defs.append('radialGradient')
      .attr('id', 'causal-energy-gradient')
      .attr('cx', '50%')
      .attr('cy', '50%')
    energyGradient.append('stop').attr('offset', '0%').attr('stop-color', '#7c3aed').attr('stop-opacity', 0.8)
    energyGradient.append('stop').attr('offset', '100%').attr('stop-color', '#1e3a8a').attr('stop-opacity', 0.1)
    const pathwayFilter = defs.append('filter').attr('id', 'neural-pathway-glow').attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%')
    pathwayFilter.append('feGaussianBlur').attr('stdDeviation', 3).attr('result', 'coloredBlur')
    const pathwayMerge = pathwayFilter.append('feMerge')
    pathwayMerge.append('feMergeNode').attr('in', 'coloredBlur')
    pathwayMerge.append('feMergeNode').attr('in', 'SourceGraphic')

    // Create simulation ONCE
    const simulation = d3.forceSimulation<NeuralElement>([])
      .force('causal_attraction', d3.forceManyBody<NeuralElement>().strength(d => d.causal_energy * 50).distanceMax(200))
      .force('neural_repulsion', d3.forceManyBody<NeuralElement>().strength(-100).distanceMin(50))
      .force('synaptic_links', d3.forceLink<NeuralElement, SynapticConnection>([]).id(d => d.id).distance(d => 100 + (1 - d.causal_strength) * 100).strength(d => d.causal_strength * 0.8))
      .force('field_center', d3.forceCenter(width / 2, height / 2))
      .force('boundary_containment', d3.forceManyBody<NeuralElement>().strength(20).distanceMax(50))

    simulationRef.current = simulation

    // Tick handler (updates positions)
    simulation.on('tick', () => {
      if (!fieldContainerRef.current) return
      fieldContainerRef.current.selectAll<SVGGElement, NeuralElement>('.neural-element')
        .attr('transform', d => `translate(${d.x},${d.y})`)
    })
  }, [width, height])

  // --- Update simulation data when nodes/edges change ---
  useEffect(() => {
    if (!simulationRef.current || !fieldContainerRef.current) return
    const nodes = transformToNeuralElements(state.currentConstellation?.nodes || [])
    const links = transformToSynapticConnections(state.currentConstellation?.edges || [], nodes)
    simulationRef.current.nodes(nodes)
    const linkForce = simulationRef.current.force('synaptic_links') as d3.ForceLink<NeuralElement, SynapticConnection>
    if (linkForce) linkForce.links(links)
    simulationRef.current.alpha(1).restart()

    // Render/Update SVG nodes
    const fieldContainer = fieldContainerRef.current
    const neuralNodes = fieldContainer.selectAll<SVGGElement, NeuralElement>('.neural-element')
      .data(nodes, d => d.id)

    const neuralEnter = neuralNodes.enter()
      .append('g')
      .attr('class', 'neural-element')
      .style('cursor', 'pointer')

    neuralEnter.append('circle')
      .attr('class', 'causal-field')
      .attr('r', d => 20 + d.causal_energy * 30)
      .attr('fill', 'url(#causal-energy-gradient)')
      .attr('opacity', 0.3)

    neuralEnter.append('circle')
      .attr('class', 'neural-core')
      .attr('r', d => 8 + d.impact_score * 12)
      .attr('fill', d => {
        if (d.impact_score > 0.5) return '#059669'
        if (d.impact_score > 0) return '#3b82f6'
        if (d.impact_score < -0.5) return '#dc2626'
        if (d.impact_score < 0) return '#f59e0b'
        return '#6b7280'
      })
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 2)

    neuralEnter.append('text')
      .attr('class', 'neural-label')
      .attr('dy', d => -15 - d.impact_score * 12)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('font-weight', '500')
      .style('fill', '#f1f5f9')
      .style('text-shadow', '0 0 8px rgba(0,0,0,0.8)')
      .text(d => d.title)

    // Remove exited nodes
    neuralNodes.exit().remove()
  }, [state.currentConstellation, transformToNeuralElements, transformToSynapticConnections])

  // --- Render SVG ---
  return (
    <svg ref={svgRef} width={width} height={height} className={className} />
  )
}
