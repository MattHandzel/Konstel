"""
Konstel Database Manager - SQLite database operations with async support
"""
import aiosqlite
import json
import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from pathlib import Path

from models.data_models import (
    Constellation, ConstellationCreate, ConstellationUpdate, ConstellationDetail,
    Node, NodeCreate, NodeUpdate,
    Edge, EdgeCreate, EdgeUpdate,
    UserProfileEntry, UserProfile
)

class DatabaseManager:
    def __init__(self, db_path: str = "database/konstel.db"):
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(exist_ok=True)
    
    async def initialize(self):
        """Initialize database with required tables"""
        async with aiosqlite.connect(self.db_path) as db:
            # Enable foreign keys
            await db.execute("PRAGMA foreign_keys = ON")
            
            # Create constellations table
            await db.execute("""
                CREATE TABLE IF NOT EXISTS constellations (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    description TEXT,
                    created_at TIMESTAMP NOT NULL,
                    updated_at TIMESTAMP NOT NULL
                )
            """)
            
            # Create nodes table
            await db.execute("""
                CREATE TABLE IF NOT EXISTS nodes (
                    id TEXT PRIMARY KEY,
                    constellation_id TEXT NOT NULL,
                    title TEXT NOT NULL,
                    description TEXT,
                    impact_score REAL DEFAULT 0.0,
                    node_type TEXT DEFAULT 'factor',
                    source TEXT DEFAULT 'user',
                    position_x REAL,
                    position_y REAL,
                    metadata TEXT DEFAULT '{}',
                    created_at TIMESTAMP NOT NULL,
                    updated_at TIMESTAMP NOT NULL,
                    FOREIGN KEY (constellation_id) REFERENCES constellations(id) ON DELETE CASCADE
                )
            """)
            
            # Create edges table
            await db.execute("""
                CREATE TABLE IF NOT EXISTS edges (
                    id TEXT PRIMARY KEY,
                    constellation_id TEXT NOT NULL,
                    source_id TEXT NOT NULL,
                    target_id TEXT NOT NULL,
                    weight REAL DEFAULT 1.0,
                    relationship_type TEXT DEFAULT 'influences',
                    confidence_level REAL DEFAULT 0.5,
                    metadata TEXT DEFAULT '{}',
                    created_at TIMESTAMP NOT NULL,
                    updated_at TIMESTAMP NOT NULL,
                    FOREIGN KEY (constellation_id) REFERENCES constellations(id) ON DELETE CASCADE,
                    FOREIGN KEY (source_id) REFERENCES nodes(id) ON DELETE CASCADE,
                    FOREIGN KEY (target_id) REFERENCES nodes(id) ON DELETE CASCADE
                )
            """)
            
            # Create user profile table
            await db.execute("""
                CREATE TABLE IF NOT EXISTS user_profile (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL,
                    data_type TEXT DEFAULT 'string',
                    updated_at TIMESTAMP NOT NULL
                )
            """)
            
            # Create indexes for better performance
            await db.execute("CREATE INDEX IF NOT EXISTS idx_nodes_constellation ON nodes(constellation_id)")
            await db.execute("CREATE INDEX IF NOT EXISTS idx_edges_constellation ON edges(constellation_id)")
            await db.execute("CREATE INDEX IF NOT EXISTS idx_edges_source ON edges(source_id)")
            await db.execute("CREATE INDEX IF NOT EXISTS idx_edges_target ON edges(target_id)")
            
            await db.commit()
    
    async def close(self):
        """Close database connections"""
        # No persistent connections to close in this implementation
        pass
    
    # Constellation operations
    async def create_constellation(self, constellation: ConstellationCreate) -> Constellation:
        """Create a new constellation"""
        constellation_id = str(uuid.uuid4())
        now = datetime.now()
        
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                INSERT INTO constellations (id, name, description, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?)
            """, (constellation_id, constellation.name, constellation.description, now, now))
            await db.commit()
        
        return Constellation(
            id=constellation_id,
            name=constellation.name,
            description=constellation.description,
            created_at=now,
            updated_at=now
        )
    
    async def get_constellations(self) -> List[Constellation]:
        """Get all constellations"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("SELECT * FROM constellations ORDER BY updated_at DESC") as cursor:
                rows = await cursor.fetchall()
                return [
                    Constellation(
                        id=row["id"],
                        name=row["name"],
                        description=row["description"],
                        created_at=datetime.fromisoformat(row["created_at"]),
                        updated_at=datetime.fromisoformat(row["updated_at"])
                    )
                    for row in rows
                ]
    
    async def get_constellation_detail(self, constellation_id: str) -> Optional[ConstellationDetail]:
        """Get constellation with nodes and edges"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            
            # Get constellation
            async with db.execute("SELECT * FROM constellations WHERE id = ?", (constellation_id,)) as cursor:
                constellation_row = await cursor.fetchone()
                if not constellation_row:
                    return None
            
            # Get nodes
            async with db.execute("SELECT * FROM nodes WHERE constellation_id = ?", (constellation_id,)) as cursor:
                node_rows = await cursor.fetchall()
                nodes = [
                    Node(
                        id=row["id"],
                        constellation_id=row["constellation_id"],
                        title=row["title"],
                        description=row["description"],
                        impact_score=row["impact_score"],
                        node_type=row["node_type"],
                        source=row["source"],
                        position_x=row["position_x"],
                        position_y=row["position_y"],
                        metadata=json.loads(row["metadata"]) if row["metadata"] else {},
                        created_at=datetime.fromisoformat(row["created_at"]),
                        updated_at=datetime.fromisoformat(row["updated_at"])
                    )
                    for row in node_rows
                ]
            
            # Get edges
            async with db.execute("SELECT * FROM edges WHERE constellation_id = ?", (constellation_id,)) as cursor:
                edge_rows = await cursor.fetchall()
                edges = [
                    Edge(
                        id=row["id"],
                        constellation_id=row["constellation_id"],
                        source_id=row["source_id"],
                        target_id=row["target_id"],
                        weight=row["weight"],
                        relationship_type=row["relationship_type"],
                        confidence_level=row["confidence_level"],
                        metadata=json.loads(row["metadata"]) if row["metadata"] else {},
                        created_at=datetime.fromisoformat(row["created_at"]),
                        updated_at=datetime.fromisoformat(row["updated_at"])
                    )
                    for row in edge_rows
                ]
            
            return ConstellationDetail(
                id=constellation_row["id"],
                name=constellation_row["name"],
                description=constellation_row["description"],
                created_at=datetime.fromisoformat(constellation_row["created_at"]),
                updated_at=datetime.fromisoformat(constellation_row["updated_at"]),
                nodes=nodes,
                edges=edges
            )
    
    async def update_constellation(self, constellation_id: str, constellation: ConstellationUpdate) -> Optional[Constellation]:
        """Update constellation"""
        now = datetime.now()
        
        # Build update query dynamically
        updates = []
        params = []
        
        if constellation.name is not None:
            updates.append("name = ?")
            params.append(constellation.name)
        
        if constellation.description is not None:
            updates.append("description = ?")
            params.append(constellation.description)
        
        if not updates:
            # No updates to make, return current constellation
            return await self.get_constellation_by_id(constellation_id)
        
        updates.append("updated_at = ?")
        params.append(now)
        params.append(constellation_id)
        
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(f"""
                UPDATE constellations 
                SET {', '.join(updates)}
                WHERE id = ?
            """, params)
            
            if db.total_changes == 0:
                return None
            
            await db.commit()
        
        return await self.get_constellation_by_id(constellation_id)
    
    async def get_constellation_by_id(self, constellation_id: str) -> Optional[Constellation]:
        """Get constellation by ID"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("SELECT * FROM constellations WHERE id = ?", (constellation_id,)) as cursor:
                row = await cursor.fetchone()
                if not row:
                    return None
                
                return Constellation(
                    id=row["id"],
                    name=row["name"],
                    description=row["description"],
                    created_at=datetime.fromisoformat(row["created_at"]),
                    updated_at=datetime.fromisoformat(row["updated_at"])
                )
    
    async def delete_constellation(self, constellation_id: str) -> bool:
        """Delete constellation and all related data"""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("DELETE FROM constellations WHERE id = ?", (constellation_id,))
            success = db.total_changes > 0
            await db.commit()
            return success
    
    # Node operations
    async def create_node(self, constellation_id: str, node: NodeCreate) -> Node:
        """Create a new node"""
        node_id = str(uuid.uuid4())
        now = datetime.now()
        
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                INSERT INTO nodes (
                    id, constellation_id, title, description, impact_score, 
                    node_type, source, position_x, position_y, metadata, 
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                node_id, constellation_id, node.title, node.description, node.impact_score,
                node.node_type, node.source, node.position_x, node.position_y,
                json.dumps(node.metadata), now, now
            ))
            await db.commit()
        
        return Node(
            id=node_id,
            constellation_id=constellation_id,
            title=node.title,
            description=node.description,
            impact_score=node.impact_score,
            node_type=node.node_type,
            source=node.source,
            position_x=node.position_x,
            position_y=node.position_y,
            metadata=node.metadata,
            created_at=now,
            updated_at=now
        )
    
    async def update_node(self, node_id: str, node: NodeUpdate) -> Optional[Node]:
        """Update node"""
        now = datetime.now()
        
        # Build update query dynamically
        updates = []
        params = []
        
        if node.title is not None:
            updates.append("title = ?")
            params.append(node.title)
        
        if node.description is not None:
            updates.append("description = ?")
            params.append(node.description)
        
        if node.impact_score is not None:
            updates.append("impact_score = ?")
            params.append(node.impact_score)
        
        if node.node_type is not None:
            updates.append("node_type = ?")
            params.append(node.node_type)
        
        if node.position_x is not None:
            updates.append("position_x = ?")
            params.append(node.position_x)
        
        if node.position_y is not None:
            updates.append("position_y = ?")
            params.append(node.position_y)
        
        if node.metadata is not None:
            updates.append("metadata = ?")
            params.append(json.dumps(node.metadata))
        
        if not updates:
            return await self.get_node_by_id(node_id)
        
        updates.append("updated_at = ?")
        params.append(now)
        params.append(node_id)
        
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(f"""
                UPDATE nodes 
                SET {', '.join(updates)}
                WHERE id = ?
            """, params)
            
            if db.total_changes == 0:
                return None
            
            await db.commit()
        
        return await self.get_node_by_id(node_id)
    
    async def get_node_by_id(self, node_id: str) -> Optional[Node]:
        """Get node by ID"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("SELECT * FROM nodes WHERE id = ?", (node_id,)) as cursor:
                row = await cursor.fetchone()
                if not row:
                    return None
                
                return Node(
                    id=row["id"],
                    constellation_id=row["constellation_id"],
                    title=row["title"],
                    description=row["description"],
                    impact_score=row["impact_score"],
                    node_type=row["node_type"],
                    source=row["source"],
                    position_x=row["position_x"],
                    position_y=row["position_y"],
                    metadata=json.loads(row["metadata"]) if row["metadata"] else {},
                    created_at=datetime.fromisoformat(row["created_at"]),
                    updated_at=datetime.fromisoformat(row["updated_at"])
                )
    
    async def delete_node(self, node_id: str) -> bool:
        """Delete node and all related edges"""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("DELETE FROM nodes WHERE id = ?", (node_id,))
            success = db.total_changes > 0
            await db.commit()
            return success
    
    # Edge operations
    async def create_edge(self, constellation_id: str, edge: EdgeCreate) -> Edge:
        """Create a new edge"""
        edge_id = str(uuid.uuid4())
        now = datetime.now()
        
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                INSERT INTO edges (
                    id, constellation_id, source_id, target_id, weight,
                    relationship_type, confidence_level, metadata,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                edge_id, constellation_id, edge.source_id, edge.target_id, edge.weight,
                edge.relationship_type, edge.confidence_level, json.dumps(edge.metadata),
                now, now
            ))
            await db.commit()
        
        return Edge(
            id=edge_id,
            constellation_id=constellation_id,
            source_id=edge.source_id,
            target_id=edge.target_id,
            weight=edge.weight,
            relationship_type=edge.relationship_type,
            confidence_level=edge.confidence_level,
            metadata=edge.metadata,
            created_at=now,
            updated_at=now
        )
    
    async def update_edge(self, edge_id: str, edge: EdgeUpdate) -> Optional[Edge]:
        """Update edge"""
        now = datetime.now()
        
        # Build update query dynamically
        updates = []
        params = []
        
        if edge.weight is not None:
            updates.append("weight = ?")
            params.append(edge.weight)
        
        if edge.relationship_type is not None:
            updates.append("relationship_type = ?")
            params.append(edge.relationship_type)
        
        if edge.confidence_level is not None:
            updates.append("confidence_level = ?")
            params.append(edge.confidence_level)
        
        if edge.metadata is not None:
            updates.append("metadata = ?")
            params.append(json.dumps(edge.metadata))
        
        if not updates:
            return await self.get_edge_by_id(edge_id)
        
        updates.append("updated_at = ?")
        params.append(now)
        params.append(edge_id)
        
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(f"""
                UPDATE edges 
                SET {', '.join(updates)}
                WHERE id = ?
            """, params)
            
            if db.total_changes == 0:
                return None
            
            await db.commit()
        
        return await self.get_edge_by_id(edge_id)
    
    async def get_edge_by_id(self, edge_id: str) -> Optional[Edge]:
        """Get edge by ID"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("SELECT * FROM edges WHERE id = ?", (edge_id,)) as cursor:
                row = await cursor.fetchone()
                if not row:
                    return None
                
                return Edge(
                    id=row["id"],
                    constellation_id=row["constellation_id"],
                    source_id=row["source_id"],
                    target_id=row["target_id"],
                    weight=row["weight"],
                    relationship_type=row["relationship_type"],
                    confidence_level=row["confidence_level"],
                    metadata=json.loads(row["metadata"]) if row["metadata"] else {},
                    created_at=datetime.fromisoformat(row["created_at"]),
                    updated_at=datetime.fromisoformat(row["updated_at"])
                )
    
    async def delete_edge(self, edge_id: str) -> bool:
        """Delete edge"""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("DELETE FROM edges WHERE id = ?", (edge_id,))
            success = db.total_changes > 0
            await db.commit()
            return success
    
    # User profile operations
    async def get_user_profile(self) -> UserProfile:
        """Get user profile"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("SELECT * FROM user_profile") as cursor:
                rows = await cursor.fetchall()
                
                entries = {}
                for row in rows:
                    entries[row["key"]] = UserProfileEntry(
                        key=row["key"],
                        value=row["value"],
                        data_type=row["data_type"],
                        updated_at=datetime.fromisoformat(row["updated_at"])
                    )
                
                return UserProfile(entries=entries)
    
    async def update_user_profile(self, key: str, value: str, data_type: str = "string") -> None:
        """Update user profile entry"""
        now = datetime.now()
        
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                INSERT OR REPLACE INTO user_profile (key, value, data_type, updated_at)
                VALUES (?, ?, ?, ?)
            """, (key, value, data_type, now))
            await db.commit()
