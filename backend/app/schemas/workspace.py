from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class WorkspaceCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    target: str = Field(..., min_length=2, max_length=255)
    description: Optional[str] = ""

class WorkspaceResponse(BaseModel):
    id: str
    name: str
    target: str
    description: Optional[str] = ""
    created_at: datetime
    updated_at: datetime
    entity_count: Optional[int] = 0
    relationship_count: Optional[int] = 0

    class Config:
        from_attributes = True

