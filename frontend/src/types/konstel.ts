/**
 * Konstel Type Definitions - Neural Architecture for Goal Optimization
 * 
 * These types define the cognitive structures used in Konstel's causal reasoning
 * interface. Each type represents a concept in the neural metaphor of goal
 * achievement through factor interconnection.
 */

// Base neural entity types
export interface BaseEntity {
  id: string
  created_at: string
  updated_at: string
}

// Constellation - the primary goal ecosystem
export interface Constellation extends BaseEntity {
  name: string
  description?: string
}

export interface ConstellationCreate {
  name: string
  description?: string
}

export interface ConstellationDetail extends Constellation {
  nodes: Node[]
  edges: Edge[]
}

// Node types - factors in the causal network
export type NodeType = 'goal' | 'factor' | 'action' | 'constraint'
export type SourceType = 'user' | 'ai' | 'document' | 'internet'

export interface Node extends BaseEntity {
  constellation_id: string
  title: string
  description?: string
  impact_score: number // -1.0 to 1.0: strength of influence on goal
  node_type: NodeType
  source: SourceType
  position_x?: number
  position_y?: number
  metadata?: Record<string, any>
}

export interface NodeCreate {
  title: string
  description?: string
  impact_score?: number
  node_type?: NodeType
  source?: SourceType
  position_x?: number
  position_y?: number
  metadata?: Record<string, any>
}

// Edge types - causal relationships between factors
export type RelationshipType = 'influences' | 'enables' | 'blocks' | 'requires' | 'correlates'

export interface Edge extends BaseEntity {
  constellation_id: string
  source_id: string
  target_id: string
  weight: number // 0.0 to 1.0: strength of causal relationship
  relationship_type: RelationshipType
  confidence_level: number // 0.0 to 1.0: AI's confidence in this relationship
  metadata?: Record<string, any>
}

export interface EdgeCreate {
  source_id: string
  target_id: string
  weight?: number
  relationship_type?: RelationshipType
  confidence_level?: number
  metadata?: Record<string, any>
}

// Goal definition and refinement
export interface GoalDefinition {
  name: string
  description: string
  timeframe?: string
  constraints: string[]
  success_criteria: string[]
  specificity_score: number
  measurability_score: number
  metadata?: Record<string, any>
}

// Dynamic rubric item structure
export interface RubricItem {
  score: number
  reasoning: string
  suggestion: string
}

// Dynamic rubric evaluation (keys are rubric criteria)
export interface GoalEvaluation {
  [key: string]: RubricItem
}

// Goal refinement response from backend
export interface GoalRefinementResponse {
  evaluation: GoalEvaluation
  suggestions: string[]
}

export interface GoalRefinementRequest {
  goal_text: string
  context?: Record<string, any>
}

// AI factor discovery
export interface Factor {
  name: string
  description: string
  impact_score: number
  confidence: number
  category?: string
  related_factors: string[]
  evidence?: string
  actionable: boolean
}

export interface FactorDiscoveryRequest {
  goal_definition: GoalDefinition
  depth?: number
  focus_areas?: string[]
  user_context?: Record<string, any>
}

// Chat and conversation
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  graph_modifications?: Record<string, any>[]
}

export interface ChatRequest {
  message: string
  conversation_history?: ChatMessage[]
  context?: Record<string, any>
}

export interface ChatResponse {
  message: string
  graph_modifications: Record<string, any>[]
  suggestions?: string[]
  timestamp: string
}

// Unique Konstel visualization types - innovative causal interface concepts

// Causal Resonance - how factors vibrate together in the goal ecosystem
export interface CausalResonance {
  frequency: number // 0.1-2.0: how often this resonance pattern occurs
  amplitude: number // 0.0-1.0: strength of the resonance effect
  nodeIds: string[] // nodes participating in this resonance
  pattern: 'synchronous' | 'harmonic' | 'dissonant' | 'emergent'
  discovered_at: number // timestamp
}

// Neural Clustering - cognitive groupings of related factors
export interface NeuralCluster {
  id: string
  centroid: { x: number; y: number } // visual center of the cluster
  nodeIds: string[]
  cohesion: number // 0.0-1.0: how tightly related the factors are
  influence_radius: number // visual size of the cluster influence
  cluster_type: 'synergistic' | 'competitive' | 'supportive' | 'blocking'
  emergence_strength: number // how strongly this cluster emerged from the data
}

// Impact Propagation - how changes ripple through the causal network
export interface ImpactWave {
  id: string
  origin_node_id: string
  current_position: { x: number; y: number }
  wave_strength: number // 0.0-1.0: current strength of the impact wave
  propagation_speed: number // pixels per second
  affected_nodes: Set<string>
  wave_type: 'positive' | 'negative' | 'neutral'
  creation_time: number
}

// Causal Pathway Analysis - understanding chains of influence
export interface CausalPathway {
  id: string
  path_nodes: string[] // ordered sequence of nodes in the causal chain
  total_strength: number // cumulative causal strength along the path
  confidence: number // AI's confidence in this pathway
  path_length: number // number of hops in the causal chain
  pathway_type: 'reinforcing' | 'balancing' | 'amplifying' | 'dampening'
  discovered_by: 'user' | 'ai' | 'analysis'
  bottlenecks: string[] // node IDs that constrain this pathway
}

// Insight Crystallization - moments of understanding that emerge from exploration
export interface InsightCrystal {
  id: string
  insight_text: string
  confidence: number
  supporting_evidence: string[] // node IDs that support this insight
  contradicting_evidence: string[] // node IDs that challenge this insight
  crystallization_time: number
  insight_category: 'leverage_point' | 'hidden_connection' | 'systemic_pattern' | 'intervention_opportunity'
  actionability: number // 0.0-1.0: how actionable this insight is
}

// Cognitive Lens - different ways of viewing the causal network
export type CognitiveLens = 
  | 'impact_intensity' // view by strength of causal impact
  | 'temporal_flow' // view by time-based cause and effect
  | 'controllability' // view by what the user can actually influence
  | 'uncertainty' // view by confidence levels and unknowns
  | 'emergence' // view by emergent patterns and clusters
  | 'optimization' // view by potential intervention points

// Visual Metaphor Configuration - how the brain-like interface appears
export interface VisualizationMetaphor {
  neural_density: number // 0.1-1.0: how densely packed the neural elements appear
  synapse_visibility: number // 0.0-1.0: how prominent the connections are
  electrical_activity: number // 0.0-1.0: intensity of the pulsing/flowing effects
  cognitive_depth: number // 0.0-1.0: how much depth/layering to show
  resonance_sensitivity: number // 0.1-1.0: how sensitive to show resonance patterns
  active_lens: CognitiveLens
}

// Exploration Session - tracking the user's journey through causal space
export interface ExplorationSession {
  session_id: string
  constellation_id: string
  start_time: number
  insights_discovered: InsightCrystal[]
  pathways_explored: CausalPathway[]
  focus_sequence: string[] // sequence of nodes the user focused on
  lens_switches: { lens: CognitiveLens; timestamp: number }[]
  cognitive_load: number // 0.0-1.0: estimated mental effort
  exploration_depth: number // how deeply the user explored
}
