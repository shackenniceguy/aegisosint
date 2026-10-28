export interface Workspace {
  id: string;
  name: string;
  target: string;
  description?: string;
  created_at: string;
  updated_at: string;
  entity_count: number;
  relationship_count: number;
}

export interface SecurityHeaderGrade {
  header: string;
  value?: string;
  status: 'PASS' | 'WARN' | 'FAIL';
  description: string;
}

export interface SubdomainResult {
  subdomain: string;
  ip_addresses: string[];
  is_active: boolean;
  source: string;
}

export interface HTTPTechResult {
  status_code?: number;
  server?: string;
  x_powered_by?: string;
  technologies: string[];
  security_headers: SecurityHeaderGrade[];
  security_score: number;
  grade: string;
  tls_info?: any;
}

export interface DomainReconData {
  domain: string;
  dns_records: Record<string, string[]>;
  spf_record?: string;
  spf_valid: boolean;
  dmarc_record?: string;
  dmarc_policy?: string;
  whois_rdap?: any;
  ip_details: any[];
  subdomains: SubdomainResult[];
  http_fingerprint?: HTTPTechResult;
  security_posture_score: number;
  risks_identified: Array<{ severity: string; issue: string; detail: string }>;
}

export interface SocialProfile {
  platform: string;
  category: string;
  url: string;
  exists: boolean;
  status_code?: number;
  response_time_ms: number;
  confidence: string;
}

export interface UsernameScanData {
  username: string;
  total_checked: number;
  found_count: number;
  profiles: SocialProfile[];
  github_enrichment?: any;
}

export interface GPSInfo {
  latitude: number;
  longitude: number;
  altitude?: number;
  google_maps_url: string;
  osm_url: string;
}

export interface FileMetadata {
  filename: string;
  file_type: string;
  file_size_bytes: number;
  mime_type: string;
  exif_data: Record<string, any>;
  gps_info?: GPSInfo;
  document_properties: Record<string, any>;
  embedded_urls: string[];
  has_sensitive_leaks: boolean;
  leak_warnings: string[];
}

export interface DorkQuery {
  category: string;
  title: string;
  description: string;
  query: string;
  google_url: string;
  yandex_url: string;
  github_url?: string;
  shodan_url?: string;
}

export interface WaybackSnapshot {
  original_url: string;
  timestamp: string;
  mimetype: string;
  status_code: string;
  archive_url: string;
}

export interface GraphElements {
  nodes: Array<{
    data: {
      id: string;
      label: string;
      type: string;
      value: string;
      risk_level: string;
      metadata?: any;
    };
  }>;
  edges: Array<{
    data: {
      id: string;
      source: string;
      target: string;
      label: string;
      relation_type: string;
    };
  }>;
}

export interface ReportData {
  title: string;
  generated_at: string;
  language: string;
  executive_summary: {
    target: string;
    security_score: number;
    score_grade: string;
    total_entities: number;
    critical_risks_count: number;
    high_risks_count: number;
    medium_risks_count: number;
    low_risks_count: number;
    key_findings: string[];
  };
  content: string;
}

export interface LogMessage {
  id: string;
  timestamp: string;
  module: string;
  status: string;
  message: string;
}

