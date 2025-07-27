import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { ConstellationProvider } from './contexts/ConstellationContext'
import { WelcomeScreen } from './components/WelcomeScreen'
import { ConstellationWorkspace } from './components/ConstellationWorkspace'
import { LoadingScreen } from './components/LoadingScreen'
import { ErrorBoundary } from './components/ErrorBoundary'
import { useKonstelAPI } from './hooks/useKonstelAPI'

/**
 * Konstel Main Application - Neural Interface for Goal Optimization
 * 
 * This is the primary orchestrator for Konstel's causal reasoning interface.
 * It manages the flow between goal definition, factor discovery, and insight generation
 * through a brain-inspired visual metaphor.
 */
function App() {
  const [isInitializing, setIsInitializing] = useState(true)
  const [appInfo, setAppInfo] = useState<any>(null)
  const { healthCheck } = useKonstelAPI()

  useEffect(() => {
    initializeKonstelSystem()
  }, [])

  const initializeKonstelSystem = async () => {
    try {
      // Get app information if running in Electron
      if (window.electronAPI) {
        const info = await window.electronAPI.getAppInfo()
        setAppInfo(info)
      }

      // Verify backend connectivity for AI-powered insights
      await healthCheck()
      
      // Simulate neural network initialization - aesthetic touch for brain metaphor
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      setIsInitializing(false)
    } catch (error) {
      console.error('Konstel system initialization failed:', error)
      // Continue anyway - offline mode still provides value
      setIsInitializing(false)
    }
  }

  if (isInitializing) {
    return <LoadingScreen message="Initializing neural pathways..." />
  }

  return (
    <ErrorBoundary>
      <ConstellationProvider>
        <Router>
          <div className="konstel-app w-full h-screen overflow-hidden constellation-canvas">
            <Routes>
              <Route path="/" element={<WelcomeScreen />} />
              <Route path="/constellation/:id" element={<ConstellationWorkspace />} />
              <Route path="/constellation" element={<ConstellationWorkspace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            
            {/* Subtle neural activity indicator */}
            <div className="fixed bottom-4 right-4 z-50">
              <div className="w-3 h-3 bg-synapse rounded-full causal-pulse opacity-60" />
            </div>
            
            {/* App info overlay for development */}
            {appInfo?.isDev && (
              <div className="fixed top-4 left-4 text-xs text-slate-400 font-mono z-50">
                Konstel v{appInfo.version} • Neural Mode
              </div>
            )}
          </div>
        </Router>
      </ConstellationProvider>
    </ErrorBoundary>
  )
}

export default App
