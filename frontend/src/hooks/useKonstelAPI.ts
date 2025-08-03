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
  GoalRefinementResponse,
  FactorDiscoveryRequest,
  ChatRequest,
  ChatResponse
} from '../types/konstel'

/**
 * Konstel API Hook - API Network Communication Layer
 * 
 * Handles all communication with the Konstel backend, designed around
 * the metaphor of API request transmission between the frontend system
 * and the API server.
 */

interface APIResponse<T> {
  data: T | null
  error: string | null
  isLoading: boolean
}

export function useKonstelAPI() {
  const [isConnected, setIsConnected] = useState(false)

  // API request transmission - sends requests to backend system
  const transmitAPIRequest = useCallback(async <T>(
    method: string,
    endpoint: string,
    payload?: any
  ): Promise<T> => {
    try {
      let response: any

      if (window.electronAPI) {
        // Desktop mode - use IPC for direct API connection
        response = await window.electronAPI.apiCall(method, endpoint, payload)
      } else {
        // Web mode - use HTTP for API request transmission
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
          throw new Error(`API transmission failed: ${httpResponse.status}`)
        }

        response = await httpResponse.json()
      }

      setIsConnected(true)
      return response
    } catch (error) {
      setIsConnected(false)
      console.error('API request transmission failed:', error)
      throw error
    }
  }, [])

  // Health monitoring for API network status
  const healthCheck = useCallback(async (): Promise<boolean> => {
    try {
      await transmitAPIRequest('GET', '/health')
      return true
    } catch {
      return false
    }
  }, [transmitAPIRequest])

  // Constellation management - goal ecosystem operations
  const createConstellation = useCallback(async (constellation: ConstellationCreate): Promise<Constellation> => {
    return transmitAPIRequest('POST', '/constellations', constellation)
  }, [transmitAPIRequest])

  const getConstellations = useCallback(async (): Promise<Constellation[]> => {
    return transmitAPIRequest('GET', '/constellations')
  }, [transmitAPIRequest])

  const getConstellation = useCallback(async (id: string): Promise<ConstellationDetail> => {
    return transmitAPIRequest('GET', `/constellations/${id}`)
  }, [transmitAPIRequest])

  const updateConstellation = useCallback(async (
    id: string, 
    updates: Partial<ConstellationCreate>
  ): Promise<Constellation> => {
    return transmitAPIRequest('PUT', `/constellations/${id}`, updates)
  }, [transmitAPIRequest])

  const deleteConstellation = useCallback(async (id: string): Promise<void> => {
    return transmitAPIRequest('DELETE', `/constellations/${id}`)
  }, [transmitAPIRequest])

  // Factor node operations - causal element management
  const createNode = useCallback(async (
    constellationId: string, 
    node: NodeCreate
  ): Promise<Node> => {
    return transmitAPIRequest('POST', `/constellations/${constellationId}/nodes`, node)
  }, [transmitAPIRequest])

  const updateNode = useCallback(async (
    nodeId: string, 
    updates: Partial<NodeCreate>
  ): Promise<Node> => {
    return transmitAPIRequest('PUT', `/nodes/${nodeId}`, updates)
  }, [transmitAPIRequest])

  const deleteNode = useCallback(async (nodeId: string): Promise<void> => {
    return transmitAPIRequest('DELETE', `/nodes/${nodeId}`)
  }, [transmitAPIRequest])

  // Causal relationship operations - API pathway management
  const createEdge = useCallback(async (
    constellationId: string, 
    edge: EdgeCreate
  ): Promise<Edge> => {
    return transmitAPIRequest('POST', `/constellations/${constellationId}/edges`, edge)
  }, [transmitAPIRequest])

  const updateEdge = useCallback(async (
    edgeId: string, 
    updates: Partial<EdgeCreate>
  ): Promise<Edge> => {
    return transmitAPIRequest('PUT', `/edges/${edgeId}`, updates)
  }, [transmitAPIRequest])

  const deleteEdge = useCallback(async (edgeId: string): Promise<void> => {
    return transmitAPIRequest('DELETE', `/edges/${edgeId}`)
  }, [transmitAPIRequest])

  // API operations - system enhancement
  const refineGoal = useCallback(async (goalText: string): Promise<GoalRefinementResponse> => {
    return transmitAPIRequest('POST', '/goals/refine', { goal_text: goalText })
  }, [transmitAPIRequest])

  const discoverFactors = useCallback(async (
    constellationId: string,
    request: FactorDiscoveryRequest
  ): Promise<{
    factors: any[]
    created_nodes: Node[]
    created_edges: Edge[]
  }> => {
    return transmitAPIRequest('POST', `/constellations/${constellationId}/discover-factors`, request)
  }, [transmitAPIRequest])

  const chatWithConstellation = useCallback(async (
    constellationId: string,
    request: ChatRequest
  ): Promise<ChatResponse> => {
    return transmitAPIRequest('POST', `/constellations/${constellationId}/chat`, request)
  }, [transmitAPIRequest])

  // Enhanced hook patterns for real-time API activity
  const useAPIStream = useCallback(<T>(
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
        const data = await transmitAPIRequest<T>('GET', endpoint)
        setState({ data, error: null, isLoading: false })
      } catch (error) {
        setState({ 
          data: null, 
          error: error instanceof Error ? error.message : 'Unknown API error',
          isLoading: false 
        })
      }
    }, [endpoint, ...dependencies])

    return { ...state, refetch: fetchData }
  }, [transmitAPIRequest])

  // System load monitoring - tracks API usage patterns
  const [systemLoad, setSystemLoad] = useState({
    requestCount: 0,
    averageResponseTime: 0,
    failureRate: 0
  })

  const trackSystemMetrics = useCallback((responseTime: number, success: boolean) => {
    setSystemLoad(prev => ({
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
    systemLoad,

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

    // API operations
    refineGoal,
    discoverFactors,
    chatWithConstellation,

    // Advanced patterns
    useAPIStream,
    transmitAPIRequest,
    trackSystemMetrics
  }
}
