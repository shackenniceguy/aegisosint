import axios from 'axios';
import {
  Workspace,
  DomainReconData,
  UsernameScanData,
  FileMetadata,
  DorkQuery,
  WaybackSnapshot,
  GraphElements,
  ReportData
} from '../types';

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json'
  }
});

export const apiService = {
  // Workspaces
  getWorkspaces: async (): Promise<Workspace[]> => {
    const res = await api.get('/workspaces');
    return res.data;
  },
  createWorkspace: async (data: { name: string; target: string; description?: string }): Promise<Workspace> => {
    const res = await api.post('/workspaces', data);
    return res.data;
  },
  deleteWorkspace: async (id: string): Promise<void> => {
    await api.delete(`/workspaces/${id}`);
  },

  // Module 1: Domain
  scanDomain: async (domain: string, workspace_id?: string): Promise<DomainReconData> => {
    const res = await api.post('/recon/domain', {
      domain,
      workspace_id,
      resolve_subdomains: true,
      check_http: true
    });
    return res.data;
  },

  // Module 2: SOCMINT
  scanUsername: async (username: string, workspace_id?: string): Promise<UsernameScanData> => {
    const res = await api.post('/recon/username', {
      username,
      workspace_id,
      enrich_github: true
    });
    return res.data;
  },

  // Module 3: Forensics
  analyzeMetadata: async (file: File, workspace_id?: string): Promise<FileMetadata> => {
    const formData = new FormData();
    formData.append('file', file);
    if (workspace_id) {
      formData.append('workspace_id', workspace_id);
    }
    const res = await api.post('/forensics/metadata', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  },
  sanitizeFile: async (file: File): Promise<Blob> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post('/forensics/sanitize', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      responseType: 'blob'
    });
    return res.data;
  },

  // Module 4: Dorks & Archive
  getDorks: async (target: string): Promise<DorkQuery[]> => {
    const res = await api.post('/archive/dorks', { target });
    return res.data;
  },
  queryWayback: async (domain: string, limit: number = 50, mimeFilter?: string): Promise<{ domain: string; total_snapshots: number; snapshots: WaybackSnapshot[] }> => {
    const res = await api.post('/archive/wayback', {
      domain,
      limit,
      mimetype_filter: mimeFilter || undefined
    });
    return res.data;
  },

  // Module 5: Graph
  getGraph: async (workspaceId: string): Promise<GraphElements> => {
    const res = await api.get(`/graph/${workspaceId}`);
    return res.data;
  },
  addCustomNode: async (workspaceId: string, node: { type: string; value: string; label: string; risk_level?: string }): Promise<void> => {
    await api.post(`/graph/${workspaceId}/node`, node);
  },
  deleteNode: async (workspaceId: string, nodeId: string): Promise<void> => {
    await api.delete(`/graph/${workspaceId}/node/${nodeId}`);
  },
  pivotNode: async (workspaceId: string, entityId: string, pivotType: string): Promise<void> => {
    await api.post(`/graph/${workspaceId}/pivot`, { entity_id: entityId, pivot_type: pivotType });
  },

  // Reporting
  generateReport: async (workspaceId: string, language: string, format: string): Promise<ReportData> => {
    const res = await api.post('/reports/generate', {
      workspace_id: workspaceId,
      language,
      format
    });
    return res.data;
  }
};

