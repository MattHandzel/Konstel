"""
Konstel Conversation Agent - AI agent for natural language interaction with graphs
"""
import openai
import os
from typing import List, Dict, Any, Optional
from models.data_models import (
    ConstellationDetail, ChatMessage, ChatResponse, 
    NodeCreate, EdgeCreate, NodeUpdate, EdgeUpdate
)
import json
from datetime import datetime
import uuid

class ConversationAgent:
    def __init__(self):
        self.client = openai.AsyncOpenAI(
            api_key=os.getenv("OPENAI_API_KEY")
        )
    
    async def process_message(
        self, 
        message: str, 
        constellation: ConstellationDetail,
        conversation_history: List[ChatMessage]
    ) -> ChatResponse:
        """Process a natural language message and potentially modify the graph"""
        
        # Parse intent from the message
        intent = await self._parse_intent(message, constellation, conversation_history)
        
        # Execute graph modifications if needed
        modifications = []
        if intent.get("action") and intent["action"] != "query":
            modifications = await self._execute_graph_modification(intent, constellation)
        
        # Generate response
        response_text = await self._generate_response(message, constellation, intent, modifications)
        
        return ChatResponse(
            message=response_text,
            graph_modifications=modifications,
            suggestions=intent.get("suggestions", []),
            timestamp=datetime.now()
        )
    
    async def _parse_intent(
        self, 
        message: str, 
        constellation: ConstellationDetail,
        conversation_history: List[ChatMessage]
    ) -> Dict[str, Any]:
        """Parse user intent from natural language"""
        
        # Get context about current graph
        graph_context = self._build_graph_context(constellation)
        
        system_prompt = f"""You are an AI assistant helping users interact with their goal optimization graph through natural language.

Current graph context:
- Goal: {constellation.name}
- Description: {constellation.description}
- Nodes: {len(constellation.nodes)} nodes
- Edges: {len(constellation.edges)} connections

Node details:
{graph_context}

Parse the user's message and determine their intent. Respond with a JSON object containing:

1. "action": One of:
   - "add_node": User wants to add a new factor/node
   - "remove_node": User wants to remove a node
   - "modify_node": User wants to change node properties
   - "add_edge": User wants to connect two nodes
   - "remove_edge": User wants to remove a connection
   - "query": User is asking a question about the graph
   - "general": General conversation

2. "parameters": Object with relevant parameters for the action:
   - For add_node: {{"title": str, "description": str, "node_type": str, "impact_score": float}}
   - For remove_node: {{"node_title": str}}
   - For modify_node: {{"node_title": str, "changes": dict}}
   - For add_edge: {{"source_title": str, "target_title": str, "relationship_type": str}}
   - For remove_edge: {{"source_title": str, "target_title": str}}
   - For query: {{"question": str, "focus_nodes": [str]}}

3. "confidence": Float 0.0-1.0 indicating confidence in intent parsing

4. "suggestions": Array of follow-up suggestions for the user

Examples:
- "Add exercise as a factor" → {{"action": "add_node", "parameters": {{"title": "Exercise", "description": "Regular physical activity", "node_type": "factor", "impact_score": 0.7}}}}
- "Remove the stress node" → {{"action": "remove_node", "parameters": {{"node_title": "Stress"}}}}
- "Connect diet to energy levels" → {{"action": "add_edge", "parameters": {{"source_title": "Diet", "target_title": "Energy Levels", "relationship_type": "influences"}}}}
"""

        user_prompt = f"User message: '{message}'"
        
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
            
            content = response.choices[0].message.content
            intent = json.loads(content)
            
            return intent
            
        except Exception as e:
            # Fallback intent parsing
            return {
                "action": "general",
                "parameters": {},
                "confidence": 0.1,
                "suggestions": ["Could you please rephrase your request?"]
            }
    
    async def _execute_graph_modification(
        self, 
        intent: Dict[str, Any], 
        constellation: ConstellationDetail
    ) -> List[Dict[str, Any]]:
        """Execute graph modifications based on parsed intent"""
        
        modifications = []
        action = intent.get("action")
        params = intent.get("parameters", {})
        
        if action == "add_node":
            modification = {
                "type": "add_node",
                "data": {
                    "title": params.get("title", "New Factor"),
                    "description": params.get("description", ""),
                    "node_type": params.get("node_type", "factor"),
                    "impact_score": params.get("impact_score", 0.5),
                    "source": "user"
                }
            }
            modifications.append(modification)
        
        elif action == "remove_node":
            node_title = params.get("node_title", "")
            matching_node = self._find_node_by_title(constellation, node_title)
            if matching_node:
                modification = {
                    "type": "remove_node",
                    "data": {"node_id": matching_node.id}
                }
                modifications.append(modification)
        
        elif action == "modify_node":
            node_title = params.get("node_title", "")
            changes = params.get("changes", {})
            matching_node = self._find_node_by_title(constellation, node_title)
            if matching_node:
                modification = {
                    "type": "modify_node",
                    "data": {
                        "node_id": matching_node.id,
                        "changes": changes
                    }
                }
                modifications.append(modification)
        
        elif action == "add_edge":
            source_title = params.get("source_title", "")
            target_title = params.get("target_title", "")
            relationship_type = params.get("relationship_type", "influences")
            
            source_node = self._find_node_by_title(constellation, source_title)
            target_node = self._find_node_by_title(constellation, target_title)
            
            if source_node and target_node:
                modification = {
                    "type": "add_edge",
                    "data": {
                        "source_id": source_node.id,
                        "target_id": target_node.id,
                        "relationship_type": relationship_type,
                        "weight": 0.7
                    }
                }
                modifications.append(modification)
        
        elif action == "remove_edge":
            source_title = params.get("source_title", "")
            target_title = params.get("target_title", "")
            
            source_node = self._find_node_by_title(constellation, source_title)
            target_node = self._find_node_by_title(constellation, target_title)
            
            if source_node and target_node:
                matching_edge = self._find_edge_between_nodes(
                    constellation, source_node.id, target_node.id
                )
                if matching_edge:
                    modification = {
                        "type": "remove_edge",
                        "data": {"edge_id": matching_edge.id}
                    }
                    modifications.append(modification)
        
        return modifications
    
    async def _generate_response(
        self, 
        message: str, 
        constellation: ConstellationDetail,
        intent: Dict[str, Any],
        modifications: List[Dict[str, Any]]
    ) -> str:
        """Generate a natural language response"""
        
        system_prompt = """You are a helpful AI assistant for a goal optimization system. 
The user is interacting with their goal graph through natural language.

Respond naturally and helpfully. If graph modifications were made, acknowledge them.
If the user asked a question, provide a thoughtful answer based on the graph data.
Keep responses concise but informative."""

        context = f"""
User message: {message}
Intent parsed: {intent.get('action', 'unknown')}
Modifications made: {len(modifications)} changes
Graph: {constellation.name} with {len(constellation.nodes)} factors
"""

        try:
            response = await self.client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": context}
                ],
                temperature=0.7,
                max_tokens=200
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            # Fallback response
            if modifications:
                return f"I've made {len(modifications)} changes to your graph as requested."
            else:
                return "I understand your message. How else can I help you with your goal?"
    
    def _build_graph_context(self, constellation: ConstellationDetail) -> str:
        """Build a text summary of the current graph"""
        if not constellation.nodes:
            return "No factors have been added yet."
        
        context_parts = []
        for node in constellation.nodes[:10]:  # Limit to first 10 nodes
            impact_desc = "positive" if node.impact_score > 0 else "negative" if node.impact_score < 0 else "neutral"
            context_parts.append(f"- {node.title}: {impact_desc} impact ({node.impact_score:.2f})")
        
        if len(constellation.nodes) > 10:
            context_parts.append(f"... and {len(constellation.nodes) - 10} more factors")
        
        return "\n".join(context_parts)
    
    def _find_node_by_title(self, constellation: ConstellationDetail, title: str) -> Optional[Any]:
        """Find a node by its title (case-insensitive partial match)"""
        title_lower = title.lower()
        
        # Exact match first
        for node in constellation.nodes:
            if node.title.lower() == title_lower:
                return node
        
        # Partial match
        for node in constellation.nodes:
            if title_lower in node.title.lower() or node.title.lower() in title_lower:
                return node
        
        return None
    
    def _find_edge_between_nodes(
        self, 
        constellation: ConstellationDetail, 
        source_id: str, 
        target_id: str
    ) -> Optional[Any]:
        """Find an edge between two nodes"""
        for edge in constellation.edges:
            if (edge.source_id == source_id and edge.target_id == target_id) or \
               (edge.source_id == target_id and edge.target_id == source_id):
                return edge
        
        return None

class IntentClassifier:
    """Helper class for classifying user intents"""
    
    def __init__(self):
        self.intent_patterns = {
            "add_node": [
                "add", "create", "include", "insert", "new factor", "add factor"
            ],
            "remove_node": [
                "remove", "delete", "eliminate", "take out", "get rid of"
            ],
            "modify_node": [
                "change", "update", "modify", "edit", "adjust", "alter"
            ],
            "add_edge": [
                "connect", "link", "relate", "associate", "tie", "influences"
            ],
            "remove_edge": [
                "disconnect", "unlink", "separate", "break connection"
            ],
            "query": [
                "what", "how", "why", "which", "show me", "tell me", "explain"
            ]
        }
    
    def classify_intent(self, message: str) -> str:
        """Classify intent based on keyword patterns"""
        message_lower = message.lower()
        
        intent_scores = {}
        for intent, patterns in self.intent_patterns.items():
            score = sum(1 for pattern in patterns if pattern in message_lower)
            if score > 0:
                intent_scores[intent] = score
        
        if intent_scores:
            return max(intent_scores, key=intent_scores.get)
        
        return "general"
