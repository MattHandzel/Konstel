"""
Konstel Goal Refinement Agent - AI agent for evaluating and improving goal definitions
"""
import openai
import os
from typing import List, Dict, Any
from models.data_models import GoalDefinition, GoalEvaluation
import json
import re

class GoalRefinementAgent:
    def __init__(self):
        self.client = openai.AsyncOpenAI(
            api_key=os.getenv("OPENAI_API_KEY")
        )
        self.rubric = GoalSpecificityRubric()
    
    async def evaluate_goal(self, goal_text: str) -> GoalEvaluation:
        """Evaluate a goal using structured rubric"""
        
        system_prompt = """You are an expert goal-setting coach. Evaluate the given goal using these criteria:

1. SPECIFICITY (0.0-1.0): How clear and specific is the goal?
   - 0.0-0.3: Vague, unclear what exactly needs to be achieved
   - 0.4-0.6: Somewhat specific but missing key details
   - 0.7-0.9: Clear and specific with most details defined
   - 1.0: Extremely specific with all key details defined

2. MEASURABILITY (0.0-1.0): How measurable is the goal?
   - 0.0-0.3: No clear way to measure progress or success
   - 0.4-0.6: Some measurable elements but incomplete
   - 0.7-0.9: Mostly measurable with clear metrics
   - 1.0: Completely measurable with precise metrics

3. TIME-BOUNDEDNESS (0.0-1.0): How well-defined is the timeframe?
   - 0.0-0.3: No timeframe mentioned
   - 0.4-0.6: Vague timeframe (e.g., "soon", "eventually")
   - 0.7-0.9: Clear timeframe with some specificity
   - 1.0: Precise deadline or timeframe

Respond with a JSON object containing:
- specificity_score: float
- measurability_score: float  
- time_boundedness_score: float
- overall_score: float (average of the three)
- feedback: string (2-3 sentences explaining the scores)
- areas_for_improvement: array of strings (specific suggestions)
"""

        user_prompt = f"Evaluate this goal: '{goal_text}'"
        
        try:
            response = await self.client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.3,
                max_tokens=500
            )
            
            # Parse JSON response
            content = response.choices[0].message.content
            evaluation_data = json.loads(content)
            
            return GoalEvaluation(**evaluation_data)
            
        except Exception as e:
            # Fallback evaluation if API fails
            return GoalEvaluation(
                specificity_score=0.5,
                measurability_score=0.5,
                time_boundedness_score=0.5,
                overall_score=0.5,
                feedback=f"Unable to evaluate goal due to error: {str(e)}",
                areas_for_improvement=["Please try again with a clearer goal statement"]
            )
    
    async def suggest_improvements(self, goal_text: str) -> List[str]:
        """Generate specific questions to improve goal definition"""
        
        system_prompt = """You are a goal-setting coach helping someone refine their goal. 
Generate 3-5 specific, actionable questions that would help make this goal more specific, measurable, and time-bound.

Focus on:
- What exactly needs to be achieved?
- How will success be measured?
- What is the specific timeframe?
- What are the key constraints or requirements?
- What would success look like in concrete terms?

Return a JSON array of question strings."""

        user_prompt = f"Generate improvement questions for this goal: '{goal_text}'"
        
        try:
            response = await self.client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.7,
                max_tokens=300
            )
            
            content = response.choices[0].message.content
            questions = json.loads(content)
            
            return questions if isinstance(questions, list) else []
            
        except Exception as e:
            # Fallback questions if API fails
            return [
                "What specific outcome do you want to achieve?",
                "How will you measure progress toward this goal?",
                "What is your target deadline for achieving this?",
                "What constraints or limitations should be considered?",
                "What would success look like in concrete, observable terms?"
            ]

class GoalSpecificityRubric:
    """Structured rubric for evaluating goal quality"""
    
    def __init__(self):
        self.specificity_criteria = {
            "clarity": "Is the goal clearly stated?",
            "scope": "Is the scope well-defined?",
            "outcome": "Is the desired outcome specific?",
            "context": "Is relevant context provided?"
        }
        
        self.measurability_criteria = {
            "metrics": "Are there clear success metrics?",
            "progress": "Can progress be tracked?",
            "completion": "Is completion clearly defined?",
            "quantification": "Are quantities/amounts specified?"
        }
        
        self.time_criteria = {
            "deadline": "Is there a specific deadline?",
            "milestones": "Are there interim milestones?",
            "urgency": "Is the timeframe realistic?",
            "schedule": "Is there a clear timeline?"
        }
    
    def evaluate_text_quality(self, text: str) -> Dict[str, float]:
        """Basic text analysis for goal quality"""
        scores = {}
        
        # Specificity indicators
        specific_words = ["specific", "exactly", "precisely", "particular", "detailed"]
        vague_words = ["better", "more", "improve", "increase", "good", "some"]
        
        specificity_score = 0.5
        for word in specific_words:
            if word in text.lower():
                specificity_score += 0.1
        for word in vague_words:
            if word in text.lower():
                specificity_score -= 0.1
        
        scores["specificity"] = max(0.0, min(1.0, specificity_score))
        
        # Measurability indicators
        number_pattern = r'\d+'
        measurement_words = ["measure", "track", "count", "percent", "pounds", "dollars", "hours", "days"]
        
        measurability_score = 0.3
        if re.search(number_pattern, text):
            measurability_score += 0.3
        for word in measurement_words:
            if word in text.lower():
                measurability_score += 0.1
        
        scores["measurability"] = max(0.0, min(1.0, measurability_score))
        
        # Time-boundedness indicators
        time_words = ["by", "within", "before", "after", "deadline", "date", "week", "month", "year"]
        
        time_score = 0.2
        for word in time_words:
            if word in text.lower():
                time_score += 0.2
        
        scores["time_boundedness"] = max(0.0, min(1.0, time_score))
        
        return scores
