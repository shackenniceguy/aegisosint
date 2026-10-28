import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Workspace, LogMessage } from '../types';
import { apiService, getApiBaseUrl } from '../api/client';

interface WorkspaceContextType {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  setActiveWorkspace: (ws: Workspace | null) => void;
  loadWorkspaces: () => Promise<void>;
  createWorkspace: (name: string, target: string, description?: string) => Promise<Workspace>;
  deleteWorkspace: (id: string) => Promise<void>;
  logs: LogMessage[];
  clearLogs: () => void;
  addLog: (module: string, status: string, message: string) => void;
  graphRevision: number;
  isBackendConnected: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [graphRevision, setGraphRevision] = useState(0);
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const addLog = (module: string, status: string, message: string) => {
    const newLog: LogMessage = {
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toLocaleTimeString(),
      module,
      status,
      message
    };
    setLogs((prev) => [newLog, ...prev.slice(0, 150)]);
  };

  const clearLogs = () => setLogs([]);

  const loadWorkspaces = async () => {
    try {
      const data = await apiService.getWorkspaces();
      if (Array.isArray(data)) {
        setIsBackendConnected(true);
        setWorkspaces(data);
        if (data.length > 0 && !activeWorkspace) {
          setActiveWorkspace(data[0]);
        }
      } else {
        throw new Error('Data is not array');
      }
    } catch (e: any) {
      setIsBackendConnected(false);
      // Fallback local session workspace so the app works standalone even without backend
      const defaultWs: Workspace = {
        id: 'local-session',
        name: 'Demo Workspace',
        target: 'example.com',
        description: 'Автономная локальная рабочая область',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        entity_count: 0,
        relationship_count: 0
      };
      setWorkspaces((prev) => (prev.length > 0 ? prev : [defaultWs]));
      if (!activeWorkspace) {
        setActiveWorkspace(defaultWs);
      }
    }
  };

  useEffect(() => {
    loadWorkspaces();
  }, []);

  // Manage WebSocket connection to active workspace
  useEffect(() => {
    if (!activeWorkspace || activeWorkspace.id === 'local-session' || !isBackendConnected) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }

    try {
      const apiUrl = getApiBaseUrl();
      let wsBase = '';
      if (apiUrl.startsWith('http://') || apiUrl.startsWith('https://')) {
        wsBase = apiUrl.replace(/^http/, 'ws');
      } else {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        wsBase = `${protocol}//${window.location.host}${apiUrl}`;
      }

      const wsUrl = `${wsBase}/ws/${activeWorkspace.id}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        addLog('System', 'SUCCESS', `Real-time stream connected to workspace '${activeWorkspace.name}'`);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'log') {
            addLog(data.module, data.status, data.message);
          } else if (data.type === 'graph_update') {
            setGraphRevision((r) => r + 1);
          }
        } catch (err) {
          console.error('WebSocket parse error', err);
        }
      };

      ws.onerror = () => {
        // Quietly ignore websocket error in demo or cloud static mode
      };

      ws.onclose = () => {
        // Disconnected
      };

      return () => {
        ws.close();
        wsRef.current = null;
      };
    } catch (err) {
      console.warn('WebSocket connection not initialized', err);
    }
  }, [activeWorkspace?.id, isBackendConnected]);

  const createWorkspace = async (name: string, target: string, description?: string): Promise<Workspace> => {
    try {
      const ws = await apiService.createWorkspace({ name, target, description });
      await loadWorkspaces();
      setActiveWorkspace(ws);
      return ws;
    } catch (e) {
      const newWs: Workspace = {
        id: 'ws-' + Math.random().toString(36).substring(7),
        name,
        target,
        description,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        entity_count: 0,
        relationship_count: 0
      };
      setWorkspaces((prev) => [newWs, ...prev]);
      setActiveWorkspace(newWs);
      return newWs;
    }
  };

  const deleteWorkspace = async (id: string) => {
    try {
      await apiService.deleteWorkspace(id);
    } catch (e) {
      console.warn('Local delete workspace fallback', e);
    }
    setWorkspaces((prev) => prev.filter((w) => w.id !== id));
    if (activeWorkspace?.id === id) {
      setActiveWorkspace(null);
    }
  };

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        activeWorkspace,
        setActiveWorkspace,
        loadWorkspaces,
        createWorkspace,
        deleteWorkspace,
        logs,
        clearLogs,
        addLog,
        graphRevision,
        isBackendConnected
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used within WorkspaceProvider');
  return ctx;
};
