"""
Konstel Factor Discovery Agent - AI agent for discovering factors that influence goals
"""
import os
from llm_client import LLMClient, MODEL_NAME
from typing import List, Dict, Any
from models.data_models import GoalDefinition, Factor
import json

class FactorDiscoveryAgent:
    def __init__(self):
        self.llm_client = LLMClient()
    
    async def discover_factors(self, goal_definition: GoalDefinition, depth: int = 2) -> List[Factor]:
        """Discover factors that influence the given goal"""
        
        system_prompt = f"""You are an expert systems thinker and goal optimization specialist. 
Your task is to discover factors that influence the achievement of a given goal.

For each factor, consider:
1. DIRECT FACTORS (depth 1): Things that directly impact the goal
2. INDIRECT FACTORS (depth 2): Things that influence the direct factors
3. SYSTEMIC FACTORS: Broader environmental or contextual influences

For each factor, provide:
- name: Clear, concise name (2-4 words)
- description: Brief explanation of how it influences the goal
- impact_score: Float from -1.0 to 1.0 (-1 = strongly negative, 0 = neutral, 1 = strongly positive)
- confidence: Float from 0.0 to 1.0 (how confident you are in this factor's relevance)
- category: Type of factor (personal, environmental, social, technical, financial, etc.)
- evidence: Brief rationale for why this factor matters
- actionable: Boolean indicating if this is something the person can directly influence

Discover {min(20, depth * 10)} factors total. Focus on the most impactful and actionable factors first.

Return a JSON array of factor objects."""

        user_prompt = f"""
Goal: {goal_definition.name}
Description: {goal_definition.description}
Timeframe: {goal_definition.timeframe or 'Not specified'}
Constraints: {', '.join(goal_definition.constraints) if goal_definition.constraints else 'None specified'}
Success Criteria: {', '.join(goal_definition.success_criteria) if goal_definition.success_criteria else 'None specified'}

Discover factors that influence this goal (depth level: {depth}).
"""
        
        try:
            content = await self.llm_client.chat_completion(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                model=MODEL_NAME,
                temperature=0.7,
                max_tokens=2000
            )
            factors_data = json.loads(content)
            factors = []
            for factor_data in factors_data:
                factor = Factor(
                    name=factor_data.get("name", "Unknown Factor"),
                    description=factor_data.get("description", ""),
                    impact_score=factor_data.get("impact_score", 0.0),
                    confidence=factor_data.get("confidence", 0.5),
                    category=factor_data.get("category", "general"),
                    evidence=factor_data.get("evidence", ""),
                    actionable=factor_data.get("actionable", True),
                    related_factors=factor_data.get("related_factors", [])
                )
                factors.append(factor)
            return factors
            
        except Exception as e:
            # Fallback factors if API fails
            return self._get_fallback_factors(goal_definition)
    
    async def estimate_impact(self, factor: Factor, goal: GoalDefinition) -> float:
        """Estimate the relative impact of a factor on a goal"""
        
        system_prompt = """You are analyzing the impact of a specific factor on a goal.
Consider:
- How directly does this factor influence the goal?
- How much control does the person have over this factor?
- What is the magnitude of potential impact?
- Are there any dependencies or prerequisites?

Return a JSON object with:
- impact_score: Float from -1.0 to 1.0
- reasoning: Brief explanation of the impact assessment
"""

        user_prompt = f"""
Goal: {goal.name} - {goal.description}
Factor: {factor.name} - {factor.description}

Estimate the impact of this factor on achieving the goal.
"""
        
        try:
            content = await self.llm_client.chat_completion(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                model=MODEL_NAME,
                temperature=0.3,
                max_tokens=200
            )
            result = json.loads(content)
            return result.get("impact_score", factor.impact_score)
            
        except Exception as e:
            # Return original impact score if API fails
            return factor.impact_score
    
    def _get_fallback_factors(self, goal_definition: GoalDefinition) -> List[Factor]:
        """Provide fallback factors when AI is unavailable"""
        
        # Generic factors that apply to most goals
        fallback_factors = [
            Factor(
                name="Time Management",
                description="How effectively time is allocated and used",
                impact_score=0.8,
                confidence=0.9,
                category="personal",
                evidence="Time allocation directly affects goal achievement",
                actionable=True
            ),
            Factor(
                name="Motivation Level",
                description="Internal drive and commitment to the goal",
                impact_score=0.9,
                confidence=0.95,
                category="personal",
                evidence="Motivation is crucial for sustained effort",
                actionable=True
            ),
            Factor(
                name="Available Resources",
                description="Financial, material, and informational resources",
                impact_score=0.7,
                confidence=0.8,
                category="environmental",
                evidence="Resources enable or constrain goal achievement",
                actionable=False
            ),
            Factor(
                name="Social Support",
                description="Support from family, friends, and colleagues",
                impact_score=0.6,
                confidence=0.8,
                category="social",
                evidence="Social support provides encouragement and accountability",
                actionable=True
            ),
            Factor(
                name="Skill Level",
                description="Current competency in relevant skills",
                impact_score=0.8,
                confidence=0.9,
                category="personal",
                evidence="Skills directly impact ability to execute",
                actionable=True
            ),
            Factor(
                name="External Obstacles",
                description="Environmental barriers and challenges",
                impact_score=-0.5,
                confidence=0.7,
                category="environmental",
                evidence="Obstacles can prevent or delay goal achievement",
                actionable=False
            ),
            Factor(
                name="Planning Quality",
                description="How well the approach is planned and structured",
                impact_score=0.7,
                confidence=0.85,
                category="personal",
                evidence="Good planning increases efficiency and success rate",
                actionable=True
            ),
            Factor(
                name="Health Status",
                description="Physical and mental health condition",
                impact_score=0.6,
                confidence=0.8,
                category="personal",
                evidence="Health affects energy and cognitive capacity",
                actionable=True
            )
        ]
        
        return fallback_factors[:min(8, len(fallback_factors))]

class KnowledgeBase:
    """Simple knowledge base for factor discovery"""
    
    def __init__(self):
        self.domain_factors = {
            "health": [
                "diet", "exercise", "sleep", "stress", "medical_conditions",
                "habits", "environment", "genetics", "age", "lifestyle"
            ],
            "career": [
                "skills", "experience", "networking", "education", "market_demand",
                "company_culture", "leadership", "performance", "opportunities", "economy"
            ],
            "financial": [
                "income", "expenses", "debt", "investments", "market_conditions",
                "financial_literacy", "budgeting", "emergency_fund", "insurance", "taxes"
            ],
            "education": [
                "study_habits", "time_management", "resources", "motivation", "aptitude",
                "teaching_quality", "environment", "support_system", "technology", "assessment"
            ],
            "relationships": [
                "communication", "trust", "compatibility", "shared_values", "time_together",
                "conflict_resolution", "emotional_intelligence", "life_stage", "external_stress", "commitment"
            ]
        }
    
    def get_domain_factors(self, domain: str) -> List[str]:
        """Get factors relevant to a specific domain"""
        return self.domain_factors.get(domain.lower(), [])
    
    def identify_domain(self, goal_text: str) -> str:
        """Identify the primary domain of a goal"""
        goal_lower = goal_text.lower()
        
        domain_keywords = {
            "health": ["health", "weight", "fitness", "exercise", "diet", "medical", "wellness"],
            "career": ["job", "career", "work", "promotion", "salary", "business", "professional"],
            "financial": ["money", "save", "invest", "debt", "financial", "budget", "income"],
            "education": ["learn", "study", "degree", "course", "skill", "education", "training"],
            "relationships": ["relationship", "marriage", "family", "social", "friends", "dating"]
        }
        
        for domain, keywords in domain_keywords.items():
            if any(keyword in goal_lower for keyword in keywords):
                return domain
        
        return "general"
