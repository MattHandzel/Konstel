"""
Konstel Data Models - Pydantic models for API and database operations
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

# Enums
class NodeType(str, Enum):
    GOAL = "goal"
    FACTOR = "factor"
    ACTION = "action"
    CONSTRAINT = "constraint"

class RelationshipType(str, Enum):
    INFLUENCES = "influences"
    ENABLES = "enables"
    BLOCKS = "blocks"
    REQUIRES = "requires"
    CORRELATES = "correlates"

class SourceType(str, Enum):
    USER = "user"
    AI = "ai"
    DOCUMENT = "document"
    INTERNET = "internet"

# Base models
class BaseEntity(BaseModel):
    id: str
    created_at: datetime
    updated_at: datetime

# Constellation models
class ConstellationBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)

class ConstellationCreate(ConstellationBase):
    pass

class ConstellationUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)

class Constellation(ConstellationBase, BaseEntity):
    pass

# Node models
class NodeBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    impact_score: float = Field(default=0.0, ge=-1.0, le=1.0)
    node_type: NodeType = Field(default=NodeType.FACTOR)
    source: SourceType = Field(default=SourceType.USER)
    position_x: Optional[float] = None
    position_y: Optional[float] = None
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)

class NodeCreate(NodeBase):
    pass

class NodeUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    impact_score: Optional[float] = Field(None, ge=-1.0, le=1.0)
    node_type: Optional[NodeType] = None
    position_x: Optional[float] = None
    position_y: Optional[float] = None
    metadata: Optional[Dict[str, Any]] = None

class Node(NodeBase, BaseEntity):
    constellation_id: str

# Edge models
class EdgeBase(BaseModel):
    source_id: str
    target_id: str
    weight: float = Field(default=1.0, ge=0.0, le=1.0)
    relationship_type: RelationshipType = Field(default=RelationshipType.INFLUENCES)
    confidence_level: float = Field(default=0.5, ge=0.0, le=1.0)
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)

class EdgeCreate(EdgeBase):
    pass

class EdgeUpdate(BaseModel):
    weight: Optional[float] = Field(None, ge=0.0, le=1.0)
    relationship_type: Optional[RelationshipType] = None
    confidence_level: Optional[float] = Field(None, ge=0.0, le=1.0)
    metadata: Optional[Dict[str, Any]] = None

class Edge(EdgeBase, BaseEntity):
    constellation_id: str

# Constellation detail (with nodes and edges)
class ConstellationDetail(Constellation):
    nodes: List[Node] = Field(default_factory=list)
    edges: List[Edge] = Field(default_factory=list)

# Goal definition models
class GoalDefinition(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=10, max_length=2000)
    timeframe: Optional[str] = Field(None, max_length=100)
    constraints: List[str] = Field(default_factory=list)
    success_criteria: List[str] = Field(default_factory=list)
    specificity_score: float = Field(default=0.0, ge=0.0, le=1.0)
    measurability_score: float = Field(default=0.0, ge=0.0, le=1.0)
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)

class GoalEvaluation(BaseModel):
    specificity_score: float = Field(..., ge=0.0, le=1.0)
    measurability_score: float = Field(..., ge=0.0, le=1.0)
    time_boundedness_score: float = Field(..., ge=0.0, le=1.0)
    overall_score: float = Field(..., ge=0.0, le=1.0)
    feedback: str
    areas_for_improvement: List[str]

class GoalRefinementRequest(BaseModel):
    goal_text: str = Field(..., min_length=10, max_length=2000)
    context: Optional[Dict[str, Any]] = Field(default_factory=dict)

# Factor discovery models
class Factor(BaseModel):
    name: str
    description: str
    impact_score: float = Field(..., ge=-1.0, le=1.0)
    confidence: float = Field(..., ge=0.0, le=1.0)
    category: Optional[str] = None
    related_factors: List[str] = Field(default_factory=list)
    evidence: Optional[str] = None
    actionable: bool = True

class FactorDiscoveryRequest(BaseModel):
    goal_definition: GoalDefinition
    depth: Optional[int] = Field(default=2, ge=1, le=3)
    focus_areas: Optional[List[str]] = Field(default_factory=list)
    user_context: Optional[Dict[str, Any]] = Field(default_factory=dict)

# Chat and conversation models
class ChatMessage(BaseModel):
    id: str
    role: str = Field(..., pattern="^(user|assistant)$")
    content: str = Field(..., min_length=1)
    timestamp: datetime
    graph_modifications: Optional[List[Dict[str, Any]]] = Field(default_factory=list)

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=1000)
    conversation_history: Optional[List[ChatMessage]] = Field(default_factory=list)
    context: Optional[Dict[str, Any]] = Field(default_factory=dict)

class ChatResponse(BaseModel):
    message: str
    graph_modifications: List[Dict[str, Any]] = Field(default_factory=list)
    suggestions: Optional[List[str]] = Field(default_factory=list)
    timestamp: datetime

# User profile models
class UserProfileEntry(BaseModel):
    key: str = Field(..., pattern=r'^[a-zA-Z0-9_-]+$')  # Ensures key is URL-safe
    value: str
    data_type: str = Field("string", pattern=r'^[a-z]+$')  # Simple type validation
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        json_encoders = {
            datetime: lambda dt: dt.isoformat()
        }

class UserProfile(BaseModel):
    entries: Dict[str, UserProfileEntry] = Field(default_factory=dict)
    
    def get(self, key: str, default: Any = None) -> Any:
        """Get a value from the profile with type conversion"""
        if key not in self.entries:
            return default
        
        entry = self.entries[key]
        if entry.data_type == "int":
            return int(entry.value)
        elif entry.data_type == "float":
            return float(entry.value)
        elif entry.data_type == "bool":
            return entry.value.lower() == "true"
        elif entry.data_type == "json":
            import json
            return json.loads(entry.value)
        else:
            return entry.value
    
    def set(self, key: str, value: Any, data_type: Optional[str] = None) -> None:
        """Set a value in the profile with automatic type detection"""
        if data_type is None:
            if isinstance(value, bool):
                data_type = "bool"
            elif isinstance(value, int):
                data_type = "int"
            elif isinstance(value, float):
                data_type = "float"
            elif isinstance(value, (dict, list)):
                data_type = "json"
                import json
                value = json.dumps(value)
            else:
                data_type = "string"
                value = str(value)
        
        self.entries[key] = UserProfileEntry(
            key=key,
            value=str(value),
            data_type=data_type,
            updated_at=datetime.now()
        )

# Graph export/import models
class GraphExport(BaseModel):
    constellation: Constellation
    nodes: List[Node]
    edges: List[Edge]
    metadata: Dict[str, Any] = Field(default_factory=dict)
    export_timestamp: datetime
    version: str = "1.0"

class GraphImport(BaseModel):
    constellation: ConstellationCreate
    nodes: List[NodeCreate]
    edges: List[EdgeCreate]
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)
