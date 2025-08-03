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

        system_prompt = """You are an expert goal-setting coach.  
Evaluate the user’s goal using the five SMART-style criteria below.  
For each criterion, give:

• "score": an integer 1-5  
• "reasoning": 1-2 sentences explaining the score  
• "suggestion": a concrete revision tip **only** if score < 4, otherwise ""  

After the five criteria, add a "suggestions" array containing 2-3 actionable tips for improving the goal overall.

Scoring rubric (applies to every criterion):
1 = Very poor – criterion nearly absent or fatally flawed  
2 = Poor – criterion present but vague, weak, or unrealistic  
3 = Adequate – criterion partially met; clear gaps remain  
4 = Good – criterion well met with minor improvements possible  
5 = Excellent – criterion fully satisfied; no notable weaknesses

Criterion-specific guidance:

1. specificity  
   • 1: Goal is abstract & ambiguous (“get healthier”).  
   • 3: States desired outcome but lacks key details (“exercise more three times”).  
   • 5: States exactly what will be done, by whom, where, & how often (“jog 5 km in the campus gym every weekday morning”).  

2. measurability  
   • 1: No measurable metric (“read more”).  
   • 3: Has a metric but unclear target or tracking method (“read books regularly”).  
   • 5: Quantified metric and clear tracking (“finish one 300-page book per month, logging pages in a spreadsheet”).  

3. time_boundedness  
   • 1: No timeframe.  
   • 3: Vague timeframe (“sometime next semester”).  
   • 5: Specific deadline or schedule (“submit the app to the App Store by 11 Dec 2025”).  

4. personal_relevance  
   • 1: No link to user’s life or values is apparent.  
   • 3: Generic relevance (“good for my career”).  
   • 5: Explicit personal motivation or value tie-in (“to strengthen my grad-school application in HCI”).  

5. achievability  
   • 1: Clearly unrealistic given typical constraints.  
   • 3: Plausible but missing evidence of feasibility (resources, skills, time).  
   • 5: Realistic with supporting factors stated (skills, resources, prior experience).

Return ONLY valid JSON wrapped in triple backticks:

```json
{
  "specificity": {"score": 4, "reasoning": "...", "suggestion": "..."},
  "measurability": {"score": 3, "reasoning": "...", "suggestion": "..."},
  "time_boundedness": {"score": 5, "reasoning": "...", "suggestion": ""},
  "personal_relevance": {"score": 5, "reasoning": "...", "suggestion": ""},
  "achievability": {"score": 4, "reasoning": "...", "suggestion": "..."},
}
```

If evaluation is impossible, still output valid JSON with empty strings and score 1 for every category."""

        user_prompt = f"Evaluate this goal: '{goal_text}'"

        try:
            content = await self.llm_client.chat_completion(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                model=MODEL_NAME,
                temperature=0,
                max_tokens=5000,
            )
            print(content)
            if "```" in content:
                content = content.replace("```json", "```")
                content = content.split("```")[1]

            evaluation_data = json.loads(content)
            return GoalEvaluation(**evaluation_data)

        except Exception as e:
            print("Got an error during goal evaluation:", e)
            # Fallback evaluation if API fails
            return GoalEvaluation(
                specificity={
                    "score": 1,
                    "reasoning": "Evaluation failed",
                    "suggestion": "",
                },
                measurability={
                    "score": 1,
                    "reasoning": "Evaluation failed",
                    "suggestion": "",
                },
                time_boundedness={
                    "score": 1,
                    "reasoning": "Evaluation failed",
                    "suggestion": "",
                },
                personal_relevance={
                    "score": 1,
                    "reasoning": "Evaluation failed",
                    "suggestion": "",
                },
                achievability={
                    "score": 1,
                    "reasoning": "Evaluation failed",
                    "suggestion": "",
                },
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
