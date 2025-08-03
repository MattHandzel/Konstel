import React, { useState, useEffect, useCallback } from 'react'
import { useKonstelAPI } from '../hooks/useKonstelAPI'
import { Target, Brain, CheckCircle, AlertCircle, Lightbulb, ArrowRight, ArrowLeft } from 'lucide-react'
import type { GoalDefinition, GoalEvaluation, GoalRefinementResponse, RubricItem } from '../types/konstel'

/**
 * Goal Definition Wizard - Neural Goal Crystallization Interface
 * 
 * This wizard guides users through the process of transforming vague aspirations
 * into crystal-clear, measurable goals using AI-powered analysis and refinement.
 * The interface uses neural metaphors to represent the goal clarification process
 * as "crystallizing" thoughts into actionable objectives.
 */

interface GoalDefinitionWizardProps {
  onGoalDefined: (goal: GoalDefinition) => void
  onCancel: () => void
  initialGoal?: Partial<GoalDefinition>
}

interface WizardStep {
  id: string
  title: string
  description: string
  icon: React.ComponentType<any>
}

export function GoalDefinitionWizard({ onGoalDefined, onCancel, initialGoal }: GoalDefinitionWizardProps) {
  const { refineGoal } = useKonstelAPI()
  const [isProcessing, setIsProcessing] = useState(false)

  // Goal definition state
  const [goalText, setGoalText] = useState(initialGoal?.description || '')
  const [goalName, setGoalName] = useState(initialGoal?.name || '')
  const [evaluation, setEvaluation] = useState<GoalEvaluation | null>(null)

  // Helper: format rubric keys
  const formatRubricKey = (key: string) =>
    key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')

  // Evaluate goal using backend
  const handleEvaluate = async () => {
    if (!goalName.trim() && !goalText.trim()) return
    setIsProcessing(true)
    try {
      const result = await refineGoal(goalText)
      setEvaluation(result)
    } catch (e) {
      alert('AI evaluation failed. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  // Finalize and create constellation
  const handleNext = () => {
    if (!goalName.trim() || !goalText.trim()) {
      alert('Please provide a goal name and description.')
      return
    }
    onGoalDefined({
      name: goalName.trim(),
      description: goalText.trim(),
      constraints: [],
      success_criteria: [],
      specificity_score: 0, // legacy, not used
      measurability_score: 0, // legacy, not used
      metadata: {}
    })
  }

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg max-w-xl w-full max-h-[90vh] overflow-y-auto border border-slate-700 relative">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
          <h2 className="text-2xl font-light text-white">
            Goal Definition <span className="text-purple-400">Wizard</span>
          </h2>
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-white text-xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-8">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Goal Name</label>
            <input
              type="text"
              value={goalName}
              onChange={e => setGoalName(e.target.value)}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-400 konstel-focus"
              placeholder="Short, memorable name for your goal"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Goal Description</label>
            <textarea
              value={goalText}
              onChange={e => setGoalText(e.target.value)}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-400 resize-none konstel-focus"
              rows={4}
              placeholder="Describe your goal in detail..."
            />
          </div>
          <div>
            <button
              onClick={handleEvaluate}
              disabled={isProcessing || (!goalName.trim() && !goalText.trim())}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed konstel-focus w-full"
            >
              {isProcessing ? 'Evaluating...' : 'Evaluate Goal'}
            </button>
          </div>
          {evaluation && (
            <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
              <h3 className="text-lg font-medium text-white mb-4">Rubric Evaluation</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(evaluation).map(([key, rubricItem]) => {
                  if (
                    rubricItem &&
                    typeof rubricItem === 'object' &&
                    typeof rubricItem.score === 'number'
                  ) {
                    return (
                      <div key={key} className="text-center">
                        <div className="text-2xl font-bold mb-1 text-white">
                          Score: <span className="text-yellow-300">{rubricItem.score}</span> / 5
                        </div>
                        <div className="text-sm text-slate-400 mb-2">{formatRubricKey(key)}</div>
                        <div className="w-full bg-slate-700 rounded-full h-2 mb-2">
                          <div
                            className={`h-2 rounded-full bg-blue-500`}
                            style={{ width: `${(rubricItem.score / 5) * 100}%` }}
                          />
                        </div>
                        {rubricItem.reasoning && (
                          <div className="text-xs text-slate-500 text-left mt-2">
                            {rubricItem.reasoning}
                          </div>
                        )}
                        {rubricItem.suggestion && (
                          <div className="text-xs text-blue-400 text-left mt-1">
                            💡 {rubricItem.suggestion}
                          </div>
                        )}
                      </div>
                    )
                  }
                  return null
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end space-x-2 p-6 border-t border-slate-700/50 sticky bottom-0 bg-slate-800">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg konstel-focus"
          >Cancel</button>
          <button
            onClick={handleNext}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg konstel-focus"
          >Create Constellation</button>
        </div>
      </div>
    </div>
  )
}
