import { useState, useCallback } from 'react'
import type {
  Constellation,
  ConstellationCreate,
  ConstellationDetail,
  Node,
  NodeCreate,
  Edge,
  EdgeCreate,
  GoalDefinition,
  GoalEvaluation,
  FactorDiscoveryRequest,
  ChatRequest,
  ChatResponse
} from '../types/konstel'

/**
 * Konstel API Hook - Neural Network Communication Layer
 * 
 * Handles all communication with the Konstel backend, designed around
 * the metaphor of neural signal transmission between the frontend brain
 * and the AI reasoning engine.
 */

interface APIResponse<T> {
  data: T | null
  error: string | null
  isLoading: boolean
}

export function useKonstelAPI() {
  const [isConnected, setIsConnected] = useState(false)

  // Neural signal transmission - sends requests to backend brain
  const transmitNeuralSignal = useCallback(async <T>(
    method: string,
    endpoint: string,
    payload?: any
  ): Promise<T> => {
    try {
      let response: any

      if (window.electronAPI) {
        // Desktop mode - use IPC for direct neural connection
        response = await window.electronAPI.apiCall(method, endpoint, payload)
      } else {
        // Web mode - use HTTP for neural signal transmission
        const options: RequestInit = {
          method,
          headers: {
            'Content-Type': 'application/json',
          },
        }

        if (payload) {
          options.body = JSON.stringify(payload)
        }

        const httpResponse = await fetch(`http://127.0.0.1:8000${endpoint}`, options)
        
        if (!httpResponse.ok) {
          throw new Error(`Neural transmission failed: ${httpResponse.status}`)
        }

        response = await httpResponse.json()
      }

      setIsConnected(true)
      return response
    } catch (error) {
      setIsConnected(false)
      console.error('Neural signal transmission failed:', error)
      throw error
    }
  }, [])

  // Health monitoring for neural network status
  const healthCheck = useCallback(async (): Promise<boolean> => {
    try {
      await transmitNeuralSignal('GET', '/health')
      return true
    } catch {
      return false
    }
  }, [transmitNeuralSignal])

  // Constellation management - goal ecosystem operations
  const createConstellation = useCallback(async (constellation: ConstellationCreate): Promise<Constellation> => {
    return transmitNeuralSignal('POST', '/constellations', constellation)
  }, [transmitNeuralSignal])

  const getConstellations = useCallback(async (): Promise<Constellation[]> => {
    return transmitNeuralSignal('GET', '/constellations')
  }, [transmitNeuralSignal])

  const getConstellation = useCallback(async (id: string): Promise<ConstellationDetail> => {
    return transmitNeuralSignal('GET', `/constellations/${id}`)
  }, [transmitNeuralSignal])

  const updateConstellation = useCallback(async (
    id: string, 
    updates: Partial<ConstellationCreate>
  ): Promise<Constellation> => {
    return transmitNeuralSignal('PUT', `/constellations/${id}`, updates)
  }, [transmitNeuralSignal])

  const deleteConstellation = useCallback(async (id: string): Promise<void> => {
    return transmitNeuralSignal('DELETE', `/constellations/${id}`)
  }, [transmitNeuralSignal])

  // Factor node operations - causal element management
  const createNode = useCallback(async (
    constellationId: string, 
    node: NodeCreate
  ): Promise<Node> => {
    return transmitNeuralSignal('POST', `/constellations/${constellationId}/nodes`, node)
  }, [transmitNeuralSignal])

  const updateNode = useCallback(async (
    nodeId: string, 
    updates: Partial<NodeCreate>
  ): Promise<Node> => {
    return transmitNeuralSignal('PUT', `/nodes/${nodeId}`, updates)
  }, [transmitNeuralSignal])

  const deleteNode = useCallback(async (nodeId: string): Promise<void> => {
    return transmitNeuralSignal('DELETE', `/nodes/${nodeId}`)
  }, [transmitNeuralSignal])

  // Causal relationship operations - neural pathway management
  const createEdge = useCallback(async (
    constellationId: string, 
    edge: EdgeCreate
  ): Promise<Edge> => {
    return transmitNeuralSignal('POST', `/constellations/${constellationId}/edges`, edge)
  }, [transmitNeuralSignal])

  const updateEdge = useCallback(async (
    edgeId: string, 
    updates: Partial<EdgeCreate>
  ): Promise<Edge> => {
    return transmitNeuralSignal('PUT', `/edges/${edgeId}`, updates)
  }, [transmitNeuralSignal])

  const deleteEdge = useCallback(async (edgeId: string): Promise<void> => {
    return transmitNeuralSignal('DELETE', `/edges/${edgeId}`)
  }, [transmitNeuralSignal])

  // AI reasoning operations - cognitive enhancement
  const refineGoal = useCallback(async (goalText: string): Promise<{
    evaluation: GoalEvaluation
    suggestions: string[]
  }> => {
    return transmitNeuralSignal('POST', '/goals/refine', { goal_text: goalText })
  }, [transmitNeuralSignal])

  const discoverFactors = useCallback(async (
    constellationId: string,
    request: FactorDiscoveryRequest
  ): Promise<{
    factors: any[]
    created_nodes: Node[]
    created_edges: Edge[]
  }> => {
    return transmitNeuralSignal('POST', `/constellations/${constellationId}/discover-factors`, request)
  }, [transmitNeuralSignal])

  const chatWithConstellation = useCallback(async (
    constellationId: string,
    request: ChatRequest
  ): Promise<ChatResponse> => {
    return transmitNeuralSignal('POST', `/constellations/${constellationId}/chat`, request)
  }, [transmitNeuralSignal])

  // Enhanced hook patterns for real-time neural activity
  const useNeuralStream = useCallback(<T>(
    endpoint: string,
    dependencies: any[] = []
  ) => {
    const [state, setState] = useState<APIResponse<T>>({
      data: null,
      error: null,
      isLoading: true
    })

    const fetchData = useCallback(async () => {
      setState(prev => ({ ...prev, isLoading: true, error: null }))
      
      try {
        const data = await transmitNeuralSignal<T>('GET', endpoint)
        setState({ data, error: null, isLoading: false })
      } catch (error) {
        setState({ 
          data: null, 
          error: error instanceof Error ? error.message : 'Unknown neural error',
          isLoading: false 
        })
      }
    }, [endpoint, ...dependencies])

    return { ...state, refetch: fetchData }
  }, [transmitNeuralSignal])

  // Cognitive load monitoring - tracks API usage patterns
  const [cognitiveLoad, setCognitiveLoad] = useState({
    requestCount: 0,
    averageResponseTime: 0,
    failureRate: 0
  })

  const trackCognitiveMetrics = useCallback((responseTime: number, success: boolean) => {
    setCognitiveLoad(prev => ({
      requestCount: prev.requestCount + 1,
      averageResponseTime: (prev.averageResponseTime * (prev.requestCount - 1) + responseTime) / prev.requestCount,
      failureRate: success 
        ? (prev.failureRate * (prev.requestCount - 1)) / prev.requestCount
        : (prev.failureRate * (prev.requestCount - 1) + 1) / prev.requestCount
    }))
  }, [])

  return {
    // Connection status
    isConnected,
    healthCheck,
    cognitiveLoad,

    // Core operations
    createConstellation,
    getConstellations,
    getConstellation,
    updateConstellation,
    deleteConstellation,
    
    createNode,
    updateNode,
    deleteNode,
    
    createEdge,
    updateEdge,
    deleteEdge,

    // AI operations
    refineGoal,
    discoverFactors,
    chatWithConstellation,

    // Advanced patterns
    useNeuralStream,
    transmitNeuralSignal,
    trackCognitiveMetrics
  }
}
