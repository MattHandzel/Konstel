"""
Konstel Backend - FastAPI server for AI-powered goal optimization system
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uvicorn
from database.db_manager import DatabaseManager
from models.data_models import *
from agents.goal_refinement_agent import GoalRefinementAgent
from agents.factor_discovery_agent import FactorDiscoveryAgent
from agents.conversation_agent import ConversationAgent
import os
from dotenv import load_dotenv

load_dotenv()

# Global database manager
db_manager = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    global db_manager
    db_manager = DatabaseManager()
    await db_manager.initialize()
    yield
    # Shutdown
    await db_manager.close()

app = FastAPI(
    title="Konstel Backend",
    description="AI-powered goal optimization system backend",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS for Electron frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "konstel-backend"}

# Constellation endpoints
@app.post("/constellations", response_model=Constellation)
async def create_constellation(constellation: ConstellationCreate):
    """Create a new constellation (graph)"""
    return await db_manager.create_constellation(constellation)

@app.get("/constellations", response_model=list[Constellation])
async def get_constellations():
    """Get all constellations"""
    return await db_manager.get_constellations()

@app.get("/constellations/{constellation_id}", response_model=ConstellationDetail)
async def get_constellation(constellation_id: str):
    """Get constellation with nodes and edges"""
    constellation = await db_manager.get_constellation_detail(constellation_id)
    if not constellation:
        raise HTTPException(status_code=404, detail="Constellation not found")
    return constellation

@app.put("/constellations/{constellation_id}", response_model=Constellation)
async def update_constellation(constellation_id: str, constellation: ConstellationUpdate):
    """Update constellation"""
    updated = await db_manager.update_constellation(constellation_id, constellation)
    if not updated:
        raise HTTPException(status_code=404, detail="Constellation not found")
    return updated

@app.delete("/constellations/{constellation_id}")
async def delete_constellation(constellation_id: str):
    """Delete constellation"""
    success = await db_manager.delete_constellation(constellation_id)
    if not success:
        raise HTTPException(status_code=404, detail="Constellation not found")
    return {"message": "Constellation deleted successfully"}

# Node endpoints
@app.post("/constellations/{constellation_id}/nodes", response_model=Node)
async def create_node(constellation_id: str, node: NodeCreate):
    """Create a new node in constellation"""
    return await db_manager.create_node(constellation_id, node)

@app.put("/nodes/{node_id}", response_model=Node)
async def update_node(node_id: str, node: NodeUpdate):
    """Update node"""
    updated = await db_manager.update_node(node_id, node)
    if not updated:
        raise HTTPException(status_code=404, detail="Node not found")
    return updated

@app.delete("/nodes/{node_id}")
async def delete_node(node_id: str):
    """Delete node"""
    success = await db_manager.delete_node(node_id)
    if not success:
        raise HTTPException(status_code=404, detail="Node not found")
    return {"message": "Node deleted successfully"}

# Edge endpoints
@app.post("/constellations/{constellation_id}/edges", response_model=Edge)
async def create_edge(constellation_id: str, edge: EdgeCreate):
    """Create a new edge in constellation"""
    return await db_manager.create_edge(constellation_id, edge)

@app.put("/edges/{edge_id}", response_model=Edge)
async def update_edge(edge_id: str, edge: EdgeUpdate):
    """Update edge"""
    updated = await db_manager.update_edge(edge_id, edge)
    if not updated:
        raise HTTPException(status_code=404, detail="Edge not found")
    return updated

@app.delete("/edges/{edge_id}")
async def delete_edge(edge_id: str):
    """Delete edge"""
    success = await db_manager.delete_edge(edge_id)
    if not success:
        raise HTTPException(status_code=404, detail="Edge not found")
    return {"message": "Edge deleted successfully"}

# Goal refinement endpoints
@app.post("/goals/refine")
async def refine_goal(goal_request: GoalRefinementRequest):
    """Refine and evaluate a goal using AI"""
    agent = GoalRefinementAgent()
    evaluation = await agent.evaluate_goal(goal_request.goal_text)
    suggestions = await agent.suggest_improvements(goal_request.goal_text)
    
    return {
        "evaluation": evaluation,
        "suggestions": suggestions
    }

# Factor discovery endpoints
@app.post("/constellations/{constellation_id}/discover-factors")
async def discover_factors(constellation_id: str, discovery_request: FactorDiscoveryRequest):
    """Discover factors for a goal using AI"""
    agent = FactorDiscoveryAgent()
    factors = await agent.discover_factors(
        discovery_request.goal_definition,
        depth=discovery_request.depth or 2
    )
    
    # Create nodes and edges in the constellation
    created_nodes = []
    created_edges = []
    
    for factor in factors:
        # Create node for factor
        node = await db_manager.create_node(constellation_id, NodeCreate(
            title=factor.name,
            description=factor.description,
            impact_score=factor.impact_score,
            node_type="factor",
            source="ai"
        ))
        created_nodes.append(node)
        
        # Create edges to related factors
        for related_id in factor.related_factors:
            if related_id in [n.id for n in created_nodes]:
                edge = await db_manager.create_edge(constellation_id, EdgeCreate(
                    source_id=node.id,
                    target_id=related_id,
                    weight=factor.impact_score,
                    relationship_type="influences"
                ))
                created_edges.append(edge)
    
    return {
        "factors": factors,
        "created_nodes": created_nodes,
        "created_edges": created_edges
    }

# Conversation endpoints
@app.post("/constellations/{constellation_id}/chat")
async def chat_with_constellation(constellation_id: str, chat_request: ChatRequest):
    """Process natural language interaction with constellation"""
    agent = ConversationAgent()
    
    # Get constellation context
    constellation = await db_manager.get_constellation_detail(constellation_id)
    if not constellation:
        raise HTTPException(status_code=404, detail="Constellation not found")
    
    # Process the message
    response = await agent.process_message(
        chat_request.message,
        constellation,
        chat_request.conversation_history or []
    )
    
    return response

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
        log_level="info"
    )
