import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Workspace, LogMessage } from '../types';
import { apiService } from '../api/client';

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
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [graphRevision, setGraphRevision] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);

  const loadWorkspaces = async () => {
    try {
      const data = await apiService.getWorkspaces();
      setWorkspaces(data);
      if (data.length > 0 && !activeWorkspace) {
        setActiveWorkspace(data[0]);
      }
    } catch (e) {
      console.error('Failed to load workspaces', e);
    }
  };

  useEffect(() => {
    loadWorkspaces();
  }, []);

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

  // Manage WebSocket connection to active workspace
  useEffect(() => {
    if (!activeWorkspace) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/api/v1/ws/${activeWorkspace.id}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      addLog('System', 'SUCCESS', `Connected real-time stream to workspace '${activeWorkspace.name}'`);
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
      // Ignore or log quietly
    };

    ws.onclose = () => {
      // Disconnected
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [activeWorkspace?.id]);

  const createWorkspace = async (name: string, target: string, description?: string): Promise<Workspace> => {
    const ws = await apiService.createWorkspace({ name, target, description });
    await loadWorkspaces();
    setActiveWorkspace(ws);
    return ws;
  };

  const deleteWorkspace = async (id: string) => {
    await apiService.deleteWorkspace(id);
    if (activeWorkspace?.id === id) {
      setActiveWorkspace(null);
    }
    await loadWorkspaces();
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
        graphRevision
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

