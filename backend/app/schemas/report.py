from pydantic import BaseModel
from typing import Dict, Any, List, Optional

class ReportGenerateRequest(BaseModel):
    workspace_id: str
    language: str = "ru"  # ru, en, uz
    format: str = "markdown"  # markdown, json, html

class ExecutiveSummary(BaseModel):
    target: str
    security_score: int
    score_grade: str
    total_entities: int
    critical_risks_count: int
    high_risks_count: int
    medium_risks_count: int
    low_risks_count: int
    key_findings: List[str]

class ReportResponse(BaseModel):
    title: str
    generated_at: str
    language: str
    executive_summary: ExecutiveSummary
    content: str  # Markdown text or HTML string
    raw_data: Optional[Dict[str, Any]] = None

