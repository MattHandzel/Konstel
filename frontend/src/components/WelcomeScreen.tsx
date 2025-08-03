import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useConstellation } from '../contexts/ConstellationContext'
import { useKonstelAPI } from '../hooks/useKonstelAPI'
import { Brain, Plus, FolderOpen, Zap, Target, Lightbulb, Network } from 'lucide-react'
import { GoalDefinitionWizard } from './GoalDefinitionWizard'
import type { Constellation, GoalDefinition } from '../types/konstel'

/**
 * Konstel Welcome Screen - Gateway to Causal Exploration
 * 
 * This screen introduces users to Konstel's neural approach to goal optimization.
 * Rather than a traditional dashboard, it's designed as a "neural command center"
 * that helps users either begin a new cognitive journey or resume exploration
 * of existing goal constellations.
 */

export function WelcomeScreen() {
  const navigate = useNavigate()
  const { actions, dispatch } = useConstellation()
  const { getConstellations, createConstellation } = useKonstelAPI()
  
  const [existingConstellations, setExistingConstellations] = useState<Constellation[]>([])
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [newGoalName, setNewGoalName] = useState('')
  const [newGoalDescription, setNewGoalDescription] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [showGoalWizard, setShowGoalWizard] = useState(false)

  // Load existing constellations on mount
  useEffect(() => {
    loadExistingConstellations()
  }, [])

  const loadExistingConstellations = async () => {
    try {
      const constellations = await getConstellations()
      setExistingConstellations(constellations)
    } catch (error) {
      console.error('Failed to load constellations:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateNewConstellation = async () => {
    if (!newGoalName.trim()) return

    try {
      setIsLoading(true)
      const constellation = await actions.createConstellation(
        newGoalName.trim(),
        newGoalDescription.trim()
      )
      
      // Navigate to the new constellation workspace
      navigate(`/constellation/${constellation.id}`)
    } catch (error) {
      console.error('Failed to create constellation:', error)
      setIsLoading(false)
    }
  }

  const handleStartWithGoal = () => {
    setShowGoalWizard(true)
  }

  const handleGoalDefined = async (goal: GoalDefinition) => {
    setIsLoading(true)
    try {
      // Create constellation with goal-based name and description
      const newConstellation = await createConstellation({
        name: goal.name,
        description: goal.description
      })
      
      // Store goal definition in constellation metadata
      // This will be used by the factor discovery agent
      dispatch({ type: 'SET_CURRENT_CONSTELLATION', payload: {
        ...newConstellation,
        goal_definition: goal
      }})
      dispatch({ type: 'SET_CURRENT_VIEW', payload: 'workspace' })
      setShowGoalWizard(false)
      navigate(`/constellation/${newConstellation.id}`)
    } catch (error) {
      console.error('Failed to create goal-based constellation:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancelGoalWizard = () => {
    setShowGoalWizard(false)
  }

  const handleOpenConstellation = async (constellation: Constellation) => {
    try {
      await actions.loadConstellation(constellation.id)
      navigate(`/constellation/${constellation.id}`)
    } catch (error) {
      console.error('Failed to open constellation:', error)
    }
  }

  if (isLoading && existingConstellations.length === 0) {
    return (
      <div className="welcome-screen h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-300">Loading your neural workspace...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="welcome-screen h-screen overflow-y-auto">
      {showGoalWizard && (
        <GoalDefinitionWizard
          onGoalDefined={handleGoalDefined}
          onCancel={handleCancelGoalWizard}
          initialGoal={undefined}
        />
      )}
      {/* Neural Header */}
      <div className="relative min-h-screen flex flex-col">
        {/* Animated background patterns */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-purple-400 rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animation: `pulse ${2 + Math.random() * 3}s ease-in-out infinite`,
                  animationDelay: `${Math.random() * 2}s`
                }}
              />
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="relative z-10 flex-1 flex flex-col">
          {/* Hero Section */}
          <div className="flex-1 flex items-center justify-center px-8">
            <div className="max-w-4xl mx-auto text-center">
              {/* Konstel Logo/Brain Icon */}
              <div className="mb-8">
                <div className="relative inline-block">
                  <Brain size={80} className="text-purple-400 causal-pulse" />
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                    <Zap size={14} className="text-white" />
                  </div>
                </div>
              </div>

              {/* Welcome Message */}
              <h1 className="text-5xl font-light text-white mb-4">
                Welcome to <span className="text-purple-400 font-medium">Konstel</span>
              </h1>
              
              <p className="text-xl text-slate-300 mb-8 leading-relaxed">
                Transform your goals into <span className="text-blue-400">neural constellations</span> of interconnected factors.
                <br />
                Discover hidden connections, optimize your approach, and achieve breakthrough insights.
              </p>

              {/* Core Value Propositions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                <div className="text-center p-6 rounded-lg bg-slate-800/30 backdrop-blur-sm border border-slate-700/50">
                  <Target className="w-8 h-8 text-green-400 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-white mb-2">Goal Clarity</h3>
                  <p className="text-sm text-slate-400">
                    AI-powered refinement transforms vague aspirations into specific, measurable objectives
                  </p>
                </div>
                
                <div className="text-center p-6 rounded-lg bg-slate-800/30 backdrop-blur-sm border border-slate-700/50">
                  <Network className="w-8 h-8 text-blue-400 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-white mb-2">Factor Discovery</h3>
                  <p className="text-sm text-slate-400">
                    Uncover hidden influences and leverage points that impact your success
                  </p>
                </div>
                
                <div className="text-center p-6 rounded-lg bg-slate-800/30 backdrop-blur-sm border border-slate-700/50">
                  <Brain className="w-8 h-8 text-purple-400 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-white mb-2">Neural Insights</h3>
                  <p className="text-sm text-slate-400">
                    Visualize causal relationships through an intuitive, brain-inspired interface
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <button
                  onClick={handleStartWithGoal}
                  className="group relative px-8 py-4 bg-gradient-to-r from-green-600 to-blue-600 
                           text-white font-medium rounded-lg hover:from-green-700 hover:to-blue-700 
                           transition-all duration-300 transform hover:scale-105 konstel-focus"
                >
                  <div className="flex items-center space-x-2">
                    <Lightbulb size={20} />
                    <span>Define Goal First</span>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-blue-400 
                                rounded-lg opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
                </button>

                <button
                  onClick={() => setIsCreatingNew(true)}
                  className="group relative px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 
                           text-white font-medium rounded-lg hover:from-purple-700 hover:to-blue-700 
                           transition-all duration-300 transform hover:scale-105 konstel-focus"
                >
                  <div className="flex items-center space-x-2">
                    <Plus size={20} />
                    <span>Begin New Exploration</span>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-blue-400 
                                rounded-lg opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
                </button>

                {existingConstellations.length > 0 && (
                  <button
                    onClick={() => document.getElementById('existing-constellations')?.scrollIntoView({ behavior: 'smooth' })}
                    className="px-8 py-4 border border-slate-600 text-slate-300 font-medium rounded-lg
                             hover:border-slate-500 hover:text-white transition-all duration-300 konstel-focus"
                  >
                    Continue Previous Work
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Existing Constellations Section */}
          {existingConstellations.length > 0 && (
            <div id="existing-constellations" className="py-16 px-8 border-t border-slate-700/50">
              <div className="max-w-6xl mx-auto">
                <h2 className="text-2xl font-light text-white mb-8 text-center">
                  Your Neural <span className="text-purple-400">Constellations</span>
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {existingConstellations.map((constellation) => (
                    <div
                      key={constellation.id}
                      onClick={() => handleOpenConstellation(constellation)}
                      className="group cursor-pointer p-6 rounded-lg bg-slate-800/50 backdrop-blur-sm 
                               border border-slate-700/50 hover:border-purple-500/50 
                               transition-all duration-300 transform hover:scale-105"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-lg font-medium text-white group-hover:text-purple-300 transition-colors">
                          {constellation.name}
                        </h3>
                        <Brain size={18} className="text-purple-400 opacity-60 group-hover:opacity-100 transition-opacity" />
                      </div>
                      
                      {constellation.description && (
                        <p className="text-sm text-slate-400 mb-4 line-clamp-2">
                          {constellation.description}
                        </p>
                      )}
                      
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>Neural Network</span>
                        <span className="text-purple-400">
                          {new Date(constellation.updated_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Constellation Modal */}
      {isCreatingNew && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg p-8 max-w-lg w-full border border-slate-700">
            <h2 className="text-2xl font-light text-white mb-6">
              Create New <span className="text-purple-400">Constellation</span>
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Goal Name
                </label>
                <input
                  type="text"
                  value={newGoalName}
                  onChange={(e) => setNewGoalName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg 
                           text-white placeholder-slate-400 konstel-focus"
                  placeholder="e.g., Improve Physical Fitness"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={newGoalDescription}
                  onChange={(e) => setNewGoalDescription(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg 
                           text-white placeholder-slate-400 resize-none konstel-focus"
                  rows={3}
                  placeholder="Describe your goal in more detail..."
                />
              </div>
            </div>
            
            <div className="flex space-x-4 mt-8">
              <button
                onClick={handleCreateNewConstellation}
                disabled={!newGoalName.trim() || isLoading}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 
                         text-white font-medium rounded-lg hover:from-purple-700 hover:to-blue-700 
                         disabled:opacity-50 disabled:cursor-not-allowed konstel-focus"
              >
                {isLoading ? 'Creating...' : 'Create Constellation'}
              </button>
              
              <button
                onClick={() => {
                  setIsCreatingNew(false)
                  setNewGoalName('')
                  setNewGoalDescription('')
                }}
                className="px-6 py-3 border border-slate-600 text-slate-300 font-medium rounded-lg
                         hover:border-slate-500 hover:text-white konstel-focus"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Goal Definition Wizard */}
      {showGoalWizard && (
        <GoalDefinitionWizard
          onGoalDefined={handleGoalDefined}
          onCancel={handleCancelGoalWizard}
        />
      )}
    </div>
  )
}
