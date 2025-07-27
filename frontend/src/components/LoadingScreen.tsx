import React, { useState, useEffect } from 'react'
import { Brain, Zap } from 'lucide-react'

/**
 * Konstel Loading Screen - Neural Network Initialization
 * 
 * This loading screen provides visual feedback during system initialization
 * using the neural metaphor. Rather than a generic spinner, it shows
 * animated neural activity that represents the cognitive processes
 * starting up in the background.
 */

interface LoadingScreenProps {
  message?: string
  progress?: number // 0-100, optional progress indicator
}

export function LoadingScreen({ message = "Initializing neural pathways...", progress }: LoadingScreenProps) {
  const [dots, setDots] = useState('')
  const [neuralActivity, setNeuralActivity] = useState<Array<{ id: number; x: number; y: number; delay: number }>>([])

  // Animated loading dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => {
        if (prev === '...') return ''
        return prev + '.'
      })
    }, 500)

    return () => clearInterval(interval)
  }, [])

  // Generate random neural activity points
  useEffect(() => {
    const generateNeuralPoints = () => {
      const points = []
      for (let i = 0; i < 15; i++) {
        points.push({
          id: i,
          x: Math.random() * 100,
          y: Math.random() * 100,
          delay: Math.random() * 3
        })
      }
      setNeuralActivity(points)
    }

    generateNeuralPoints()
  }, [])

  return (
    <div className="loading-screen h-screen flex items-center justify-center relative overflow-hidden">
      {/* Neural background activity */}
      <div className="absolute inset-0 opacity-20">
        {neuralActivity.map((point) => (
          <div
            key={point.id}
            className="absolute w-1 h-1 bg-purple-400 rounded-full"
            style={{
              left: `${point.x}%`,
              top: `${point.y}%`,
              animation: `pulse ${2 + point.delay}s ease-in-out infinite`,
              animationDelay: `${point.delay}s`
            }}
          />
        ))}
        
        {/* Neural connection lines */}
        <svg className="absolute inset-0 w-full h-full" style={{ zIndex: -1 }}>
          {neuralActivity.slice(0, 8).map((point, index) => {
            const nextPoint = neuralActivity[(index + 1) % neuralActivity.length]
            return (
              <line
                key={`connection-${index}`}
                x1={`${point.x}%`}
                y1={`${point.y}%`}
                x2={`${nextPoint.x}%`}
                y2={`${nextPoint.y}%`}
                stroke="rgba(124, 58, 237, 0.1)"
                strokeWidth="1"
                strokeDasharray="2,4"
                style={{
                  animation: `pathway-flow ${3 + point.delay}s linear infinite`
                }}
              />
            )
          })}
        </svg>
      </div>

      {/* Main loading content */}
      <div className="relative z-10 text-center">
        {/* Konstel brain icon with activity */}
        <div className="relative mb-8">
          <Brain size={64} className="text-purple-400 mx-auto" />
          
          {/* Neural activity indicator */}
          <div className="absolute -top-2 -right-2">
            <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full 
                          flex items-center justify-center animate-pulse">
              <Zap size={12} className="text-white" />
            </div>
          </div>
          
          {/* Pulsing neural field */}
          <div className="absolute inset-0 -m-8">
            <div className="w-full h-full border border-purple-400/30 rounded-full animate-ping" />
          </div>
          <div className="absolute inset-0 -m-12">
            <div className="w-full h-full border border-blue-400/20 rounded-full animate-ping" 
                 style={{ animationDelay: '0.5s' }} />
          </div>
        </div>

        {/* Loading message */}
        <div className="mb-6">
          <h2 className="text-2xl font-light text-white mb-2">
            {message.replace(/\.\.\.$/, '')}<span className="text-purple-400">{dots}</span>
          </h2>
          <p className="text-slate-400 text-sm">
            Connecting neural pathways and initializing causal reasoning systems
          </p>
        </div>

        {/* Progress indicator (if provided) */}
        {typeof progress === 'number' && (
          <div className="w-64 mx-auto mb-4">
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Neural Synchronization</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-300 relative overflow-hidden"
                style={{ width: `${progress}%` }}
              >
                {/* Progress bar shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent 
                              animate-pulse" style={{ animationDuration: '1.5s' }} />
              </div>
            </div>
          </div>
        )}

        {/* Loading animation */}
        <div className="flex justify-center space-x-2 mb-8">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="w-3 h-3 bg-purple-500 rounded-full animate-bounce"
              style={{ 
                animationDelay: `${index * 0.2}s`,
                animationDuration: '1s'
              }}
            />
          ))}
        </div>

        {/* System status indicators */}
        <div className="text-xs text-slate-500 space-y-1">
          <div className="flex items-center justify-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span>Neural Network: Online</span>
          </div>
          <div className="flex items-center justify-center space-x-2">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
            <span>Causal Reasoning Engine: Initializing</span>
          </div>
          <div className="flex items-center justify-center space-x-2">
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
            <span>Factor Discovery System: Standby</span>
          </div>
        </div>
      </div>

      {/* Subtle background gradient animation */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900/20 to-blue-900/20 
                    animate-pulse" style={{ animationDuration: '4s' }} />
    </div>
  )
}
