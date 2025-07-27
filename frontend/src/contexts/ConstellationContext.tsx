import React, { createContext, useContext, useReducer, useEffect } from 'react'
import { useKonstelAPI } from '../hooks/useKonstelAPI'
import type { 
  Constellation, 
  ConstellationDetail, 
  Node, 
  Edge,
  GoalDefinition 
} from '../types/konstel'

/**
 * Konstel Constellation Context - Neural State Management
 * 
 * Manages the cognitive state of goal constellations using a brain-inspired
 * state architecture. Each constellation represents a neural cluster of 
 * interconnected factors influencing a primary goal.
 */

interface ConstellationState {
  currentConstellation: ConstellationDetail | null
  constellations: Constellation[]
  selectedNodeIds: Set<string>
  focusedNodeId: string | null
  causalPathways: CausalPathway[]
  insightMode: InsightMode
  neuralActivity: NeuralActivity
  isProcessingAI: boolean
}

interface CausalPathway {
  id: string
  sourceId: string
  targetId: string
  strength: number // 0-1, how strong the causal relationship is
  confidence: number // 0-1, AI's confidence in this relationship
  pathType: 'direct' | 'indirect' | 'feedback'
  discoveredBy: 'user' | 'ai' | 'inference'
}

interface NeuralActivity {
  activeNodes: Set<string>
  pulsatingNodes: Set<string>
  propagatingSignals: PropagatingSignal[]
}

interface PropagatingSignal {
  id: string
  fromNodeId: string
  toNodeId: string
  strength: number
  timestamp: number
}

type InsightMode = 'exploration' | 'analysis' | 'optimization' | 'synthesis'

type ConstellationAction =
  | { type: 'SET_CONSTELLATION'; payload: ConstellationDetail }
  | { type: 'ADD_NODE'; payload: Node }
  | { type: 'UPDATE_NODE'; payload: { id: string; updates: Partial<Node> } }
  | { type: 'REMOVE_NODE'; payload: string }
  | { type: 'ADD_EDGE'; payload: Edge }
  | { type: 'REMOVE_EDGE'; payload: string }
  | { type: 'SELECT_NODES'; payload: string[] }
  | { type: 'FOCUS_NODE'; payload: string | null }
  | { type: 'SET_INSIGHT_MODE'; payload: InsightMode }
  | { type: 'TRIGGER_NEURAL_PULSE'; payload: string[] }
  | { type: 'ADD_CAUSAL_PATHWAY'; payload: CausalPathway }
  | { type: 'SET_AI_PROCESSING'; payload: boolean }
  | { type: 'PROPAGATE_SIGNAL'; payload: PropagatingSignal }

const initialState: ConstellationState = {
  currentConstellation: null,
  constellations: [],
  selectedNodeIds: new Set(),
  focusedNodeId: null,
  causalPathways: [],
  insightMode: 'exploration',
  neuralActivity: {
    activeNodes: new Set(),
    pulsatingNodes: new Set(),
    propagatingSignals: []
  },
  isProcessingAI: false
}

function constellationReducer(state: ConstellationState, action: ConstellationAction): ConstellationState {
  switch (action.type) {
    case 'SET_CONSTELLATION':
      return {
        ...state,
        currentConstellation: action.payload,
        selectedNodeIds: new Set(),
        focusedNodeId: null
      }

    case 'ADD_NODE':
      if (!state.currentConstellation) return state
      
      return {
        ...state,
        currentConstellation: {
          ...state.currentConstellation,
          nodes: [...state.currentConstellation.nodes, action.payload]
        },
        neuralActivity: {
          ...state.neuralActivity,
          pulsatingNodes: new Set([...state.neuralActivity.pulsatingNodes, action.payload.id])
        }
      }

    case 'UPDATE_NODE':
      if (!state.currentConstellation) return state
      
      return {
        ...state,
        currentConstellation: {
          ...state.currentConstellation,
          nodes: state.currentConstellation.nodes.map(node =>
            node.id === action.payload.id 
              ? { ...node, ...action.payload.updates }
              : node
          )
        }
      }

    case 'FOCUS_NODE':
      // When focusing on a node, activate its neural neighborhood
      const focusedNodeId = action.payload
      let activeNodes = new Set<string>()
      
      if (focusedNodeId && state.currentConstellation) {
        activeNodes.add(focusedNodeId)
        
        // Activate connected nodes to show causal influence
        state.currentConstellation.edges.forEach(edge => {
          if (edge.source_id === focusedNodeId) {
            activeNodes.add(edge.target_id)
          }
          if (edge.target_id === focusedNodeId) {
            activeNodes.add(edge.source_id)
          }
        })
      }

      return {
        ...state,
        focusedNodeId: action.payload,
        neuralActivity: {
          ...state.neuralActivity,
          activeNodes
        }
      }

    case 'SET_INSIGHT_MODE':
      return {
        ...state,
        insightMode: action.payload,
        neuralActivity: {
          ...state.neuralActivity,
          activeNodes: new Set() // Reset neural activity when changing modes
        }
      }

    case 'TRIGGER_NEURAL_PULSE':
      return {
        ...state,
        neuralActivity: {
          ...state.neuralActivity,
          pulsatingNodes: new Set(action.payload)
        }
      }

    case 'PROPAGATE_SIGNAL':
      return {
        ...state,
        neuralActivity: {
          ...state.neuralActivity,
          propagatingSignals: [
            ...state.neuralActivity.propagatingSignals.filter(s => 
              Date.now() - s.timestamp < 2000 // Keep signals for 2 seconds
            ),
            action.payload
          ]
        }
      }

    case 'ADD_CAUSAL_PATHWAY':
      return {
        ...state,
        causalPathways: [...state.causalPathways, action.payload]
      }

    case 'SET_AI_PROCESSING':
      return {
        ...state,
        isProcessingAI: action.payload
      }

    default:
      return state
  }
}

const ConstellationContext = createContext<{
  state: ConstellationState
  dispatch: React.Dispatch<ConstellationAction>
  actions: ConstellationActions
} | null>(null)

interface ConstellationActions {
  loadConstellation: (id: string) => Promise<void>
  createConstellation: (name: string, description: string) => Promise<ConstellationDetail>
  addFactorNode: (title: string, description: string, impactScore?: number) => Promise<void>
  establishCausalLink: (sourceId: string, targetId: string, strength: number) => Promise<void>
  focusOnFactor: (nodeId: string | null) => void
  switchInsightMode: (mode: InsightMode) => void
  triggerNeuralPulse: (nodeIds: string[]) => void
  discoverFactorsWithAI: (goalDefinition: GoalDefinition) => Promise<void>
  propagateImpactSignal: (fromNodeId: string, toNodeId: string, strength: number) => void
}

export function ConstellationProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(constellationReducer, initialState)
  const api = useKonstelAPI()

  // Neural activity cleanup - remove old signals
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now()
      const activeSignals = state.neuralActivity.propagatingSignals.filter(
        signal => now - signal.timestamp < 2000
      )
      
      if (activeSignals.length !== state.neuralActivity.propagatingSignals.length) {
        dispatch({
          type: 'PROPAGATE_SIGNAL',
          payload: { id: '', fromNodeId: '', toNodeId: '', strength: 0, timestamp: 0 } // Dummy payload for cleanup
        })
      }
    }, 100)

    return () => clearInterval(cleanup)
  }, [state.neuralActivity.propagatingSignals])

  const actions: ConstellationActions = {
    async loadConstellation(id: string) {
      try {
        const constellation = await api.getConstellation(id)
        dispatch({ type: 'SET_CONSTELLATION', payload: constellation })
      } catch (error) {
        console.error('Failed to load constellation:', error)
      }
    },

    async createConstellation(name: string, description: string) {
      try {
        const constellation = await api.createConstellation({ name, description })
        const detail = await api.getConstellation(constellation.id)
        dispatch({ type: 'SET_CONSTELLATION', payload: detail })
        return detail
      } catch (error) {
        console.error('Failed to create constellation:', error)
        throw error
      }
    },

    async addFactorNode(title: string, description: string, impactScore = 0.5) {
      if (!state.currentConstellation) return

      try {
        const node = await api.createNode(state.currentConstellation.id, {
          title,
          description,
          impact_score: impactScore,
          node_type: 'factor',
          source: 'user'
        })
        
        dispatch({ type: 'ADD_NODE', payload: node })
        
        // Trigger neural pulse for new factor
        actions.triggerNeuralPulse([node.id])
      } catch (error) {
        console.error('Failed to add factor node:', error)
      }
    },

    async establishCausalLink(sourceId: string, targetId: string, strength: number) {
      if (!state.currentConstellation) return

      try {
        const edge = await api.createEdge(state.currentConstellation.id, {
          source_id: sourceId,
          target_id: targetId,
          weight: strength,
          relationship_type: 'influences'
        })
        
        dispatch({ type: 'ADD_EDGE', payload: edge })
        
        // Create visual signal propagation
        actions.propagateImpactSignal(sourceId, targetId, strength)
        
        // Add to causal pathways for analysis
        const pathway: CausalPathway = {
          id: edge.id,
          sourceId,
          targetId,
          strength,
          confidence: 0.8, // User-defined links have high confidence
          pathType: 'direct',
          discoveredBy: 'user'
        }
        
        dispatch({ type: 'ADD_CAUSAL_PATHWAY', payload: pathway })
      } catch (error) {
        console.error('Failed to establish causal link:', error)
      }
    },

    focusOnFactor(nodeId: string | null) {
      dispatch({ type: 'FOCUS_NODE', payload: nodeId })
    },

    switchInsightMode(mode: InsightMode) {
      dispatch({ type: 'SET_INSIGHT_MODE', payload: mode })
    },

    triggerNeuralPulse(nodeIds: string[]) {
      dispatch({ type: 'TRIGGER_NEURAL_PULSE', payload: nodeIds })
      
      // Auto-clear pulse after animation
      setTimeout(() => {
        dispatch({ type: 'TRIGGER_NEURAL_PULSE', payload: [] })
      }, 3000)
    },

    async discoverFactorsWithAI(goalDefinition: GoalDefinition) {
      if (!state.currentConstellation) return

      dispatch({ type: 'SET_AI_PROCESSING', payload: true })
      
      try {
        const response = await api.discoverFactors(state.currentConstellation.id, {
          goal_definition: goalDefinition,
          depth: 2
        })
        
        // Add discovered nodes with neural activation
        const newNodeIds: string[] = []
        for (const node of response.created_nodes) {
          dispatch({ type: 'ADD_NODE', payload: node })
          newNodeIds.push(node.id)
        }
        
        // Add discovered edges with pathway visualization
        for (const edge of response.created_edges) {
          dispatch({ type: 'ADD_EDGE', payload: edge })
          actions.propagateImpactSignal(edge.source_id, edge.target_id, edge.weight)
        }
        
        // Trigger neural pulse for AI-discovered factors
        actions.triggerNeuralPulse(newNodeIds)
        
      } catch (error) {
        console.error('AI factor discovery failed:', error)
      } finally {
        dispatch({ type: 'SET_AI_PROCESSING', payload: false })
      }
    },

    propagateImpactSignal(fromNodeId: string, toNodeId: string, strength: number) {
      const signal: PropagatingSignal = {
        id: `signal-${Date.now()}-${Math.random()}`,
        fromNodeId,
        toNodeId,
        strength,
        timestamp: Date.now()
      }
      
      dispatch({ type: 'PROPAGATE_SIGNAL', payload: signal })
    }
  }

  return (
    <ConstellationContext.Provider value={{ state, dispatch, actions }}>
      {children}
    </ConstellationContext.Provider>
  )
}

export function useConstellation() {
  const context = useContext(ConstellationContext)
  if (!context) {
    throw new Error('useConstellation must be used within ConstellationProvider')
  }
  return context
}
