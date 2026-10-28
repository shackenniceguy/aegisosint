from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class DomainScanRequest(BaseModel):
    domain: str = Field(..., description="Target domain, e.g. example.com")
    workspace_id: Optional[str] = None
    resolve_subdomains: bool = True
    check_http: bool = True

class DNSRecord(BaseModel):
    type: str
    values: List[str]

class SubdomainResult(BaseModel):
    subdomain: str
    ip_addresses: List[str] = []
    is_active: bool = False
    source: str = "crt.sh"

class SecurityHeaderGrade(BaseModel):
    header: str
    value: Optional[str] = None
    status: str  # PASS, WARN, FAIL
    description: str

class HTTPTechResult(BaseModel):
    status_code: Optional[int] = None
    server: Optional[str] = None
    x_powered_by: Optional[str] = None
    technologies: List[str] = []
    security_headers: List[SecurityHeaderGrade] = []
    security_score: int = 0
    grade: str = "F"
    tls_info: Optional[Dict[str, Any]] = None

class DomainReconResponse(BaseModel):
    domain: str
    dns_records: Dict[str, List[str]] = {}
    spf_record: Optional[str] = None
    spf_valid: bool = False
    dmarc_record: Optional[str] = None
    dmarc_policy: Optional[str] = None
    whois_rdap: Optional[Dict[str, Any]] = None
    ip_details: List[Dict[str, Any]] = []
    subdomains: List[SubdomainResult] = []
    http_fingerprint: Optional[HTTPTechResult] = None
    security_posture_score: int = 100
    risks_identified: List[Dict[str, str]] = []

