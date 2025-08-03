"""
Konstel Goal Refinement Agent - AI agent for evaluating and improving goal definitions
"""

import os
from llm_client import LLMClient, MODEL_NAME
from typing import List, Dict, Any
from models.data_models import GoalDefinition, GoalEvaluation
import json
import re


class GoalRefinementAgent:
    def __init__(self):
        self.llm_client = LLMClient()

    async def evaluate_goal(self, goal_text: str) -> GoalEvaluation:
        """Evaluate a goal using an improved 1-5 rubric with JSON output and robust parsing."""

        system_prompt = """You are an expert goal-setting coach. Evaluate the following goal using these five criteria, each on a 1-5 scale (1 = very poor, 5 = excellent):

1. specificity: How clear and precise is the goal?
2. measurability: How easy is it to measure progress/success?
3. time_boundedness: Is there a clear, specific timeframe or deadline?
4. personal_relevance: Is the goal clearly tied to the user's own life, values, or motivation?
5. achievability: Is the goal realistic and attainable?

For each category, provide:
- a score (1-5)
- a 1-2 sentence reasoning for the score
- if the score is less than 4, provide a concrete suggestion for improvement (otherwise, use an empty string)

After the categories, include a "suggestions" array with 2-3 actionable tips for improving the goal overall.

Output ONLY valid JSON wrapped in triple backticks (```), in the following format:
```
{
  "specificity": {"score": 4, "reasoning": "...", "suggestion": "..."},
  "measurability": {"score": 3, "reasoning": "...", "suggestion": "..."},
  "time_boundedness": {"score": 5, "reasoning": "...", "suggestion": ""},
  "personal_relevance": {"score": 5, "reasoning": "...", "suggestion": ""},
  "achievability": {"score": 4, "reasoning": "...", "suggestion": "..."},
  "suggestions": ["...", "...", "..."]
}
```
If you cannot evaluate, still output valid JSON with empty strings and score 1 for each category.
"""

        user_prompt = f"Evaluate this goal: '{goal_text}'"

        try:
            content = await self.llm_client.chat_completion(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                model=MODEL_NAME,
                temperature=0.3,
                max_tokens=700,
            )
            print(content)
            evaluation_data = json.loads(json_str)
            return GoalEvaluation(**evaluation_data)

        except Exception as e:
            # Fallback evaluation if API fails
            return GoalEvaluation(
                specificity_score=0.5,
                measurability_score=0.5,
                time_boundedness_score=0.5,
                overall_score=0.5,
                feedback=f"Unable to evaluate goal due to error: {str(e)}",
                areas_for_improvement=[
                    "Please try again with a clearer goal statement"
                ],
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
            content = await self.llm_client.chat_completion(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                model=MODEL_NAME,
                temperature=0.7,
                max_tokens=300,
            )
            # Parse LLM output: extract JSON between triple backticks if present
            match = re.search(r"```(?:json)?\s*([\s\S]+?)\s*```", content)
            if match:
                json_str = match.group(1)
            else:
                # fallback: try to find first JSON object
                match = re.search(r"\{.*\}", content, re.DOTALL)
                if not match:
                    raise ValueError("No JSON object found in LLM output")
                json_str = match.group(0)
            try:
                result = json.loads(json_str)
            except Exception as e:
                raise ValueError(
                    f"Failed to parse JSON from LLM output: {e}\nRaw output: {content}"
                )
            return result if isinstance(result, list) else []

        except Exception as e:
            # Fallback questions if API fails
            return [
                "What specific outcome do you want to achieve?",
                "How will you measure progress toward this goal?",
                "What is your target deadline for achieving this?",
                "What constraints or limitations should be considered?",
                "What would success look like in concrete, observable terms?",
            ]
