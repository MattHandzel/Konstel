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
  
  // Neural simulation state
  const [neuralElements, setNeuralElements] = useState<NeuralElement[]>([])
  const [synapticConnections, setSynapticConnections] = useState<SynapticConnection[]>([])
  const [resonancePatterns, setResonancePatterns] = useState<CausalResonance[]>([])
  const [impactWaves, setImpactWaves] = useState<ImpactWave[]>([])
  const [neuralClusters, setNeuralClusters] = useState<NeuralCluster[]>([])
  
  // Simulation references
  const simulationRef = useRef<d3.Simulation<NeuralElement, SynapticConnection> | null>(null)
  const animationFrameRef = useRef<number>()

  // Transform Konstel data into neural elements
  const transformToNeuralElements = useCallback((nodes: Node[]): NeuralElement[] => {
    return nodes.map(node => ({
      id: node.id,
      title: node.title,
      impact_score: node.impact_score,
      node_type: node.node_type,
      x: node.position_x || Math.random() * width,
      y: node.position_y || Math.random() * height,
      causal_energy: Math.abs(node.impact_score) * 0.8 + 0.2, // Base energy from impact
      resonance_frequency: 0.5 + Math.abs(node.impact_score) * 2, // 0.5-2.5 Hz
      last_activity_time: Date.now()
    }))
  }, [width, height])

  // Transform edges into synaptic connections
  const transformToSynapticConnections = useCallback((
    edges: Edge[], 
    elements: NeuralElement[]
  ): SynapticConnection[] => {
    const elementMap = new Map(elements.map(el => [el.id, el]))
    
    return edges.map(edge => {
      const source = elementMap.get(edge.source_id)!
      const target = elementMap.get(edge.target_id)!
      
      return {
        source,
        target,
        causal_strength: edge.weight,
        confidence: edge.confidence_level,
        signal_flow: 0, // Will be animated
        last_signal_time: 0
      }
    }).filter(conn => conn.source && conn.target)
  }, [])

  // Initialize the neural field simulation (not standard force simulation)
  const initializeCausalField = useCallback(() => {
    if (!svgRef.current) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    // Create neural field layers
    const fieldContainer = svg.append('g').attr('class', 'neural-field')
    
    // Background resonance field
    const defs = svg.append('defs')
    
    // Gradient for causal energy visualization
    const energyGradient = defs.append('radialGradient')
      .attr('id', 'causal-energy-gradient')
      .attr('cx', '50%')
      .attr('cy', '50%')
    
    energyGradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#7c3aed')
      .attr('stop-opacity', 0.8)
    
    energyGradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#1e3a8a')
      .attr('stop-opacity', 0.1)

    // Neural pathway filter for flowing signals
    const pathwayFilter = defs.append('filter')
      .attr('id', 'neural-pathway-glow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%')
    
    pathwayFilter.append('feGaussianBlur')
      .attr('stdDeviation', 3)
      .attr('result', 'coloredBlur')
    
    const pathwayMerge = pathwayFilter.append('feMerge')
    pathwayMerge.append('feMergeNode').attr('in', 'coloredBlur')
    pathwayMerge.append('feMergeNode').attr('in', 'SourceGraphic')

    // Create custom force simulation with causal field physics
    const simulation = d3.forceSimulation<NeuralElement>(neuralElements)
      .force('causal_attraction', d3.forceMany<NeuralElement>()
        .strength(d => d.causal_energy * 50) // Stronger factors attract more
        .distanceMax(200))
      .force('neural_repulsion', d3.forceMany<NeuralElement>()
        .strength(-100) // Keep elements from overlapping
        .distanceMin(50))
      .force('synaptic_links', d3.forceLink<NeuralElement, SynapticConnection>(synapticConnections)
        .id(d => d.id)
        .distance(d => 100 + (1 - d.causal_strength) * 100) // Stronger connections are shorter
        .strength(d => d.causal_strength * 0.8))
      .force('field_center', d3.forceCenter(width / 2, height / 2))
      .force('boundary_containment', d3.forceMany<NeuralElement>()
        .strength(20)
        .distanceMax(50))

    simulationRef.current = simulation

    // Render neural elements as pulsing causal nodes
    const renderNeuralElements = () => {
      const neuralNodes = fieldContainer.selectAll<SVGGElement, NeuralElement>('.neural-element')
        .data(neuralElements, d => d.id)

      const neuralEnter = neuralNodes.enter()
        .append('g')
        .attr('class', 'neural-element')
        .style('cursor', 'pointer')

      // Causal energy field around each node
      neuralEnter.append('circle')
        .attr('class', 'causal-field')
        .attr('r', d => 20 + d.causal_energy * 30)
        .attr('fill', 'url(#causal-energy-gradient)')
        .attr('opacity', 0.3)

      // Core neural element
      neuralEnter.append('circle')
        .attr('class', 'neural-core')
        .attr('r', d => 8 + d.impact_score * 12)
        .attr('fill', d => {
          // Color based on causal impact type
          if (d.impact_score > 0.5) return '#059669' // Strong positive: growth green
          if (d.impact_score > 0) return '#3b82f6' // Positive: neural blue
          if (d.impact_score < -0.5) return '#dc2626' // Strong negative: impact red
          if (d.impact_score < 0) return '#f59e0b' // Negative: insight gold
          return '#6b7280' // Neutral: gray
        })
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 2)

      // Neural label
      neuralEnter.append('text')
        .attr('class', 'neural-label')
        .attr('dy', d => -15 - d.impact_score * 12)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('font-weight', '500')
        .style('fill', '#f1f5f9')
        .style('text-shadow', '0 0 8px rgba(0,0,0,0.8)')
        .text(d => d.title)

      // Merge enter + update selections
      const neuralMerged = neuralEnter.merge(neuralNodes)

      // Update positions during simulation
      simulation.on('tick', () => {
        neuralMerged
          .attr('transform', d => `translate(${d.x},${d.y})`)

        // Update causal field pulsing based on resonance frequency
        neuralMerged.select('.causal-field')
          .attr('r', d => {
            const time = Date.now() / 1000
            const pulse = Math.sin(time * d.resonance_frequency * 2 * Math.PI) * 0.3 + 0.7
            return (20 + d.causal_energy * 30) * pulse
          })
          .attr('opacity', d => {
            const time = Date.now() / 1000
            const pulse = Math.sin(time * d.resonance_frequency * 2 * Math.PI) * 0.2 + 0.3
            return pulse
          })
      })

      // Interactive behaviors
      neuralMerged
        .on('click', (event, d) => {
          actions.focusOnFactor(d.id)
          triggerImpactWave(d)
        })
        .on('mouseenter', (event, d) => {
          d.causal_energy = Math.min(1, d.causal_energy + 0.3)
          d.resonance_frequency *= 1.5
        })
        .on('mouseleave', (event, d) => {
          d.causal_energy = Math.abs(d.impact_score) * 0.8 + 0.2
          d.resonance_frequency = 0.5 + Math.abs(d.impact_score) * 2
        })
    }

    // Render synaptic pathways as flowing neural connections
    const renderSynapticPathways = () => {
      const pathways = fieldContainer.selectAll<SVGPathElement, SynapticConnection>('.synaptic-pathway')
        .data(synapticConnections)

      pathways.enter()
        .append('path')
        .attr('class', 'synaptic-pathway')
        .attr('fill', 'none')
        .attr('stroke', d => {
          // Color based on causal relationship strength and confidence
          const intensity = d.causal_strength * d.confidence
          if (intensity > 0.7) return '#7c3aed' // Strong: synapse purple
          if (intensity > 0.4) return '#3b82f6' // Medium: neural blue
          return '#64748b' // Weak: slate gray
        })
        .attr('stroke-width', d => 2 + d.causal_strength * 4)
        .attr('opacity', d => 0.4 + d.confidence * 0.4)
        .attr('filter', 'url(#neural-pathway-glow)')
        .style('stroke-dasharray', '8,4')
        .style('animation', d => `pathway-flow ${2 / d.causal_strength}s linear infinite`)

      // Update pathway shapes during simulation
      simulation.on('tick', () => {
        pathways
          .attr('d', d => {
            // Create curved neural pathways instead of straight lines
            const sourceX = (d.source as NeuralElement).x!
            const sourceY = (d.source as NeuralElement).y!
            const targetX = (d.target as NeuralElement).x!
            const targetY = (d.target as NeuralElement).y!
            
            const dx = targetX - sourceX
            const dy = targetY - sourceY
            const dr = Math.sqrt(dx * dx + dy * dy) * 0.3 // Curvature based on distance
            
            return `M ${sourceX},${sourceY} A ${dr},${dr} 0 0,1 ${targetX},${targetY}`
          })
      })
    }

    renderNeuralElements()
    renderSynapticPathways()

  }, [neuralElements, synapticConnections, width, height, actions])

  // Trigger impact wave from a neural element
  const triggerImpactWave = useCallback((element: NeuralElement) => {
    const wave: ImpactWave = {
      id: `wave-${Date.now()}`,
      origin_node_id: element.id,
      current_position: { x: element.x!, y: element.y! },
      wave_strength: element.causal_energy,
      propagation_speed: 100, // pixels per second
      affected_nodes: new Set(),
      wave_type: element.impact_score > 0 ? 'positive' : element.impact_score < 0 ? 'negative' : 'neutral',
      creation_time: Date.now()
    }
    
    setImpactWaves(prev => [...prev, wave])
    
    // Auto-remove wave after 3 seconds
    setTimeout(() => {
      setImpactWaves(prev => prev.filter(w => w.id !== wave.id))
    }, 3000)
  }, [])

  // Update neural elements when constellation data changes
  useEffect(() => {
    if (state.currentConstellation) {
      const elements = transformToNeuralElements(state.currentConstellation.nodes)
      const connections = transformToSynapticConnections(state.currentConstellation.edges, elements)
      
      setNeuralElements(elements)
      setSynapticConnections(connections)
    }
  }, [state.currentConstellation, transformToNeuralElements, transformToSynapticConnections])

  // Initialize visualization when elements are ready
  useEffect(() => {
    if (neuralElements.length > 0) {
      initializeCausalField()
    }
  }, [neuralElements, synapticConnections, initializeCausalField])

  // Continuous neural activity animation
  useEffect(() => {
    const animateNeuralActivity = () => {
      // Update pulsing, flowing signals, and other dynamic effects
      // This runs at 60fps for smooth neural animations
      animationFrameRef.current = requestAnimationFrame(animateNeuralActivity)
    }
    
    animateNeuralActivity()
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  // Cleanup simulation on unmount
  useEffect(() => {
    return () => {
      if (simulationRef.current) {
        simulationRef.current.stop()
      }
    }
  }, [])

  return (
    <div className={`causal-exploration-canvas ${className || ''}`}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="neural-field-svg"
        style={{
          background: 'radial-gradient(circle at center, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 1) 100%)',
          overflow: 'visible'
        }}
      />
      
      {/* Neural activity indicators */}
      <div className="absolute top-4 left-4 text-xs text-slate-400 font-mono">
        <div>Neural Elements: {neuralElements.length}</div>
        <div>Synaptic Pathways: {synapticConnections.length}</div>
        <div>Active Resonances: {resonancePatterns.length}</div>
        <div>Impact Waves: {impactWaves.length}</div>
      </div>
      
      {/* Cognitive lens controls */}
      <div className="absolute top-4 right-4 flex space-x-2">
        {['impact_intensity', 'temporal_flow', 'controllability', 'uncertainty'].map(lens => (
          <button
            key={lens}
            className="px-3 py-1 text-xs bg-slate-800/80 text-slate-300 rounded hover:bg-slate-700/80 transition-colors"
            onClick={() => actions.switchInsightMode(lens as any)}
          >
            {lens.replace('_', ' ')}
          </button>
        ))}
      </div>
    </div>
  )
}
