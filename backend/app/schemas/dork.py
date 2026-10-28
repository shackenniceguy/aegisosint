from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class DorkQuery(BaseModel):
    category: str
    title: str
    description: str
    query: str
    google_url: str
    yandex_url: str
    github_url: Optional[str] = None
    shodan_url: Optional[str] = None

class DorkGenerateRequest(BaseModel):
    target: str = Field(..., description="Domain or organization keyword, e.g. example.com")

class WaybackSnapshot(BaseModel):
    original_url: str
    timestamp: str
    mimetype: str
    status_code: str
    archive_url: str

class WaybackRequest(BaseModel):
    domain: str
    limit: int = 50
    mimetype_filter: Optional[str] = None  # e.g., "application/pdf" or "text/html"

class WaybackResponse(BaseModel):
    domain: str
    total_snapshots: int
    snapshots: List[WaybackSnapshot]

