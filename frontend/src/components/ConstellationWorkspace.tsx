import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useConstellation } from '../contexts/ConstellationContext'
import { CausalExplorationCanvas } from './CausalExplorationCanvas'
import { Brain, MessageCircle, Settings, ArrowLeft, Zap, Plus, Search } from 'lucide-react'

/**
 * Constellation Workspace - The Neural Command Center
 * 
 * This is the main interface where users explore and manipulate their goal
 * constellations. Unlike traditional graph editors, this workspace is designed
 * as a cognitive amplification tool that helps users think more effectively
 * about causal relationships and goal optimization strategies.
 */

export function ConstellationWorkspace() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { state, actions } = useConstellation()
  
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [chatMessage, setChatMessage] = useState('')
  const [isAddingFactor, setIsAddingFactor] = useState(false)
  const [newFactorName, setNewFactorName] = useState('')
  const [workspaceMode, setWorkspaceMode] = useState<'exploration' | 'analysis' | 'optimization'>('exploration')

  // Load constellation when component mounts or ID changes
  useEffect(() => {
    if (id && id !== state.currentConstellation?.id) {
      actions.loadConstellation(id)
    }
  }, [id, actions, state.currentConstellation?.id])

  // Handle keyboard shortcuts for neural interface navigation
  useEffect(() => {
    const handleKeyboardShortcuts = (event: KeyboardEvent) => {
      // Ctrl+? or Cmd+? opens chat interface
      if ((event.ctrlKey || event.metaKey) && event.key === '/') {
        event.preventDefault()
        setIsChatOpen(true)
      }
      
      // Escape closes modals and chat
      if (event.key === 'Escape') {
        setIsChatOpen(false)
        setIsAddingFactor(false)
      }
      
      // Ctrl+N or Cmd+N adds new factor
      if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
        event.preventDefault()
        setIsAddingFactor(true)
      }
    }

    document.addEventListener('keydown', handleKeyboardShortcuts)
    return () => document.removeEventListener('keydown', handleKeyboardShortcuts)
  }, [])

  const handleAddFactor = useCallback(async () => {
    if (!newFactorName.trim()) return

    try {
      await actions.addFactorNode(newFactorName.trim(), '', 0.5)
      setNewFactorName('')
      setIsAddingFactor(false)
    } catch (error) {
      console.error('Failed to add factor:', error)
    }
  }, [newFactorName, actions])

  const handleChatSubmit = useCallback(async () => {
    if (!chatMessage.trim() || !state.currentConstellation) return

    try {
      // TODO: Implement chat with constellation
      console.log('Chat message:', chatMessage)
      setChatMessage('')
    } catch (error) {
      console.error('Chat failed:', error)
    }
  }, [chatMessage, state.currentConstellation])

  const handleDiscoverFactorsWithAI = useCallback(async () => {
    if (!state.currentConstellation) return

    const goalDefinition = {
      name: state.currentConstellation.name,
      description: state.currentConstellation.description || '',
      timeframe: '',
      constraints: [],
      success_criteria: [],
      specificity_score: 0.7,
      measurability_score: 0.6
    }

    try {
      await actions.discoverFactorsWithAI(goalDefinition)
    } catch (error) {
      console.error('AI factor discovery failed:', error)
    }
  }, [state.currentConstellation, actions])

  // Show loading state while constellation loads
  if (!state.currentConstellation) {
    return (
      <div className="constellation-workspace h-screen flex items-center justify-center">
        <div className="text-center">
          <Brain size={48} className="text-purple-400 causal-pulse mx-auto mb-4" />
          <p className="text-slate-300">Loading neural constellation...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="constellation-workspace h-screen flex flex-col overflow-hidden">
      {/* Neural Navigation Bar */}
      <div className="neural-navbar bg-slate-900/95 backdrop-blur-sm border-b border-slate-700/50 px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left: Navigation and Title */}
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/50 transition-colors konstel-focus"
            >
              <ArrowLeft size={20} />
            </button>
            
            <div className="flex items-center space-x-3">
              <Brain size={24} className="text-purple-400" />
              <div>
                <h1 className="text-lg font-medium text-white">
                  {state.currentConstellation.name}
                </h1>
                <p className="text-xs text-slate-400">
                  {state.currentConstellation.nodes.length} factors • {state.currentConstellation.edges.length} connections
                </p>
              </div>
            </div>
          </div>

          {/* Center: Mode Selector */}
          <div className="flex items-center space-x-2 bg-slate-800/50 rounded-lg p-1">
            {[
              { mode: 'exploration', icon: Search, label: 'Explore' },
              { mode: 'analysis', icon: Brain, label: 'Analyze' },
              { mode: 'optimization', icon: Zap, label: 'Optimize' }
            ].map(({ mode, icon: Icon, label }) => (
              <button
                key={mode}
                onClick={() => {
                  setWorkspaceMode(mode as any)
                  actions.switchInsightMode(mode as any)
                }}
                className={`
                  px-4 py-2 text-sm rounded-md transition-all duration-200 flex items-center space-x-2
                  ${workspaceMode === mode 
                    ? 'bg-purple-600 text-white shadow-lg' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                  }
                `}
              >
                <Icon size={16} />
                <span>{label}</span>
              </button>
            ))}
          </div>

          {/* Right: Action Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsAddingFactor(true)}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg 
                       transition-colors flex items-center space-x-2 konstel-focus"
            >
              <Plus size={16} />
              <span>Add Factor</span>
            </button>
            
            <button
              onClick={handleDiscoverFactorsWithAI}
              disabled={state.isProcessingAI}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 
                       text-white text-sm rounded-lg transition-colors flex items-center space-x-2 konstel-focus"
            >
              <Zap size={16} />
              <span>{state.isProcessingAI ? 'AI Thinking...' : 'Discover Factors'}</span>
            </button>
            
            <button
              onClick={() => setIsChatOpen(true)}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/50 
                       transition-colors relative konstel-focus"
            >
              <MessageCircle size={20} />
              {isChatOpen && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full pulse-slow" />
              )}
            </button>
            
            <button className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/50 transition-colors konstel-focus">
              <Settings size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Workspace Area */}
      <div className="flex-1 relative">
        {/* Causal Exploration Canvas */}
        <CausalExplorationCanvas
          width={window.innerWidth}
          height={window.innerHeight - 80} // Account for navbar
          className="absolute inset-0"
        />

        {/* Neural Activity Overlay */}
        {state.isProcessingAI && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50">
            <div className="bg-purple-900/90 backdrop-blur-sm border border-purple-500/50 rounded-lg px-6 py-3">
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-purple-100 text-sm font-medium">
                  AI exploring causal relationships...
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Focused Node Details */}
        {state.focusedNodeId && (
          <div className="absolute top-4 left-4 bg-slate-800/90 backdrop-blur-sm border border-slate-600/50 
                        rounded-lg p-4 max-w-sm z-40">
            {(() => {
              const focusedNode = state.currentConstellation?.nodes.find(n => n.id === state.focusedNodeId)
              if (!focusedNode) return null
              
              return (
                <div>
                  <h3 className="text-lg font-medium text-white mb-2">{focusedNode.title}</h3>
                  {focusedNode.description && (
                    <p className="text-sm text-slate-300 mb-3">{focusedNode.description}</p>
                  )}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Impact Score</span>
                    <span className={`font-medium ${
                      focusedNode.impact_score > 0 ? 'text-green-400' : 
                      focusedNode.impact_score < 0 ? 'text-red-400' : 'text-gray-400'
                    }`}>
                      {focusedNode.impact_score > 0 ? '+' : ''}{focusedNode.impact_score.toFixed(2)}
                    </span>
                  </div>
                </div>
              )
            })()}
          </div>
        )}
      </div>

      {/* Neural Chat Interface */}
      {isChatOpen && (
        <div className="absolute bottom-0 right-0 w-96 h-80 bg-slate-800/95 backdrop-blur-sm 
                      border-l border-t border-slate-600/50 rounded-tl-lg z-50">
          <div className="flex flex-col h-full">
            {/* Chat Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-600/50">
              <div className="flex items-center space-x-2">
                <MessageCircle size={18} className="text-blue-400" />
                <span className="text-white font-medium">Neural Assistant</span>
              </div>
              <button
                onClick={() => setIsChatOpen(false)}
                className="text-slate-400 hover:text-white text-xl leading-none"
              >
                ×
              </button>
            </div>
            
            {/* Chat Messages Area */}
            <div className="flex-1 p-4 overflow-y-auto">
              <div className="text-sm text-slate-400 mb-4">
                Ask me about your constellation, add factors, or modify connections using natural language.
              </div>
              {/* TODO: Implement chat messages display */}
            </div>
            
            {/* Chat Input */}
            <div className="p-4 border-t border-slate-600/50">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleChatSubmit()}
                  className="flex-1 px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg 
                           text-white text-sm placeholder-slate-400 konstel-focus"
                  placeholder="Type your message..."
                />
                <button
                  onClick={handleChatSubmit}
                  disabled={!chatMessage.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 
                           text-white text-sm rounded-lg konstel-focus"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Factor Modal */}
      {isAddingFactor && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4 border border-slate-700">
            <h2 className="text-xl font-medium text-white mb-4">Add New Factor</h2>
            
            <input
              type="text"
              value={newFactorName}
              onChange={(e) => setNewFactorName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddFactor()}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg 
                       text-white placeholder-slate-400 konstel-focus"
              placeholder="Factor name (e.g., 'Regular Exercise')"
              autoFocus
            />
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={handleAddFactor}
                disabled={!newFactorName.trim()}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 
                         text-white font-medium rounded-lg konstel-focus"
              >
                Add Factor
              </button>
              <button
                onClick={() => {
                  setIsAddingFactor(false)
                  setNewFactorName('')
                }}
                className="px-4 py-2 border border-slate-600 text-slate-300 font-medium rounded-lg
                         hover:border-slate-500 hover:text-white konstel-focus"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Hint */}
      <div className="absolute bottom-4 left-4 text-xs text-slate-500 z-30">
        <div>Ctrl+? Chat • Ctrl+N Add Factor • Escape Close</div>
      </div>
    </div>
  )
}
