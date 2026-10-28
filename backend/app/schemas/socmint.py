from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class UsernameScanRequest(BaseModel):
    username: str = Field(..., min_length=2, max_length=60)
    workspace_id: Optional[str] = None
    enrich_github: bool = True

class SocialProfileResult(BaseModel):
    platform: str
    category: str
    url: str
    exists: bool
    status_code: Optional[int] = None
    response_time_ms: int = 0
    confidence: str = "HIGH"  # HIGH, MEDIUM, LOW
    extra_data: Optional[Dict[str, Any]] = None

class UsernameScanResponse(BaseModel):
    username: str
    total_checked: int
    found_count: int
    profiles: List[SocialProfileResult]
    github_enrichment: Optional[Dict[str, Any]] = None

