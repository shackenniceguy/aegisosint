from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class GraphNodeData(BaseModel):
    id: str
    label: str
    type: str  # domain, subdomain, ip, asn, tech, username, profile, doc, location
    value: str
    risk_level: str = "INFO"
    metadata: Dict[str, Any] = {}

class GraphNode(BaseModel):
    data: GraphNodeData

class GraphEdgeData(BaseModel):
    id: str
    source: str
    target: str
    label: str
    relation_type: str

class GraphEdge(BaseModel):
    data: GraphEdgeData

class GraphElements(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]

class AddNodeRequest(BaseModel):
    type: str
    value: str
    label: str
    risk_level: str = "INFO"
    metadata: Dict[str, Any] = {}

class PivotRequest(BaseModel):
    entity_id: str
    pivot_type: str  # "REVERSE_DNS", "SOCMINT_SCAN", "WHOIS_LOOKUP"

