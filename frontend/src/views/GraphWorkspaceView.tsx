import React, { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import { useWorkspace } from '../context/WorkspaceContext';
import { useLanguage } from '../context/LanguageContext';
import { apiService } from '../api/client';
import { GraphElements } from '../types';
import {
  Network,
  Maximize2,
  Minimize2,
  RefreshCw,
  Plus,
  Trash2,
  Compass,
  Layers,
  Filter,
  Info,
  ChevronRight
} from 'lucide-react';

export const GraphWorkspaceView: React.FC = () => {
  const { activeWorkspace, graphRevision, addLog } = useWorkspace();
  const { t } = useLanguage();

  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);

  const [elements, setElements] = useState<GraphElements>({ nodes: [], edges: [] });
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [layoutName, setLayoutName] = useState<'cose' | 'breadthfirst' | 'concentric' | 'grid'>('cose');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [modalOpen, setModalOpen] = useState(false);

  // Form for custom node
  const [newNodeType, setNewNodeType] = useState('domain');
  const [newNodeValue, setNewNodeValue] = useState('');
  const [newNodeLabel, setNewNodeLabel] = useState('');

  const loadGraph = async () => {
    if (!activeWorkspace) return;
    try {
      const data = await apiService.getGraph(activeWorkspace.id);
      setElements(data);
    } catch (e: any) {
      addLog('Graph', 'ERROR', `Failed to load graph: ${e.message}`);
    }
  };

  useEffect(() => {
    loadGraph();
  }, [activeWorkspace?.id, graphRevision]);

  // Initialize or update Cytoscape
  useEffect(() => {
    if (!containerRef.current) return;

    // Filter nodes by type if specified
    const filteredNodes = typeFilter === 'all'
      ? elements.nodes
      : elements.nodes.filter((n) => n.data.type === typeFilter);

    const nodeIds = new Set(filteredNodes.map((n) => n.data.id));
    const filteredEdges = elements.edges.filter(
      (e) => nodeIds.has(e.data.source) && nodeIds.has(e.data.target)
    );

    if (cyRef.current) {
      cyRef.current.destroy();
    }

    const cy = cytoscape({
      container: containerRef.current,
      elements: [...filteredNodes, ...filteredEdges],
      style: [
        {
          selector: 'node',
          style: {
            'label': 'data(label)',
            'color': '#f8fafc',
            'font-size': '11px',
            'font-family': 'JetBrains Mono, monospace',
            'text-valign': 'bottom',
            'text-margin-y': 6,
            'background-color': '#00f2fe',
            'width': 36,
            'height': 36,
            'border-width': 2,
            'border-color': '#ffffff22',
            'text-background-opacity': 0.8,
            'text-background-color': '#080c14',
            'text-background-padding': '3px',
            'text-background-shape': 'roundrectangle'
          }
        },
        {
          selector: 'node[type = "domain"]',
          style: { 'background-color': '#00f2fe', 'shape': 'diamond', 'width': 44, 'height': 44 }
        },
        {
          selector: 'node[type = "subdomain"]',
          style: { 'background-color': '#38bdf8', 'shape': 'ellipse' }
        },
        {
          selector: 'node[type = "ip"]',
          style: { 'background-color': '#10b981', 'shape': 'round-rectangle', 'width': 34, 'height': 34 }
        },
        {
          selector: 'node[type = "asn"]',
          style: { 'background-color': '#818cf8', 'shape': 'hexagon' }
        },
        {
          selector: 'node[type = "tech"]',
          style: { 'background-color': '#f59e0b', 'shape': 'tag' }
        },
        {
          selector: 'node[type = "username"]',
          style: { 'background-color': '#ec4899', 'shape': 'star', 'width': 42, 'height': 42 }
        },
        {
          selector: 'node[type = "profile"]',
          style: { 'background-color': '#a855f7', 'shape': 'round-diamond' }
        },
        {
          selector: 'node[type = "location"]',
          style: { 'background-color': '#ef4444', 'shape': 'vee', 'width': 40, 'height': 40 }
        },
        {
          selector: 'node[type = "doc"]',
          style: { 'background-color': '#14b8a6', 'shape': 'barrel' }
        },
        {
          selector: 'edge',
          style: {
            'width': 1.5,
            'line-color': '#334155',
            'target-arrow-color': '#38bdf8',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'label': 'data(label)',
            'font-size': '8px',
            'font-family': 'monospace',
            'color': '#64748b',
            'text-background-opacity': 0.8,
            'text-background-color': '#080c14',
            'text-background-padding': '2px'
          }
        },
        {
          selector: ':selected',
          style: {
            'border-width': 4,
            'border-color': '#00f2fe',
            'line-color': '#00f2fe',
            'target-arrow-color': '#00f2fe'
          }
        }
      ],
      layout: {
        name: layoutName,
        animate: true,
        animationDuration: 500
      }
    });

    cy.on('tap', 'node', (evt) => {
      const node = evt.target;
      setSelectedNode(node.data());
    });

    cy.on('tap', (evt) => {
      if (evt.target === cy) {
        setSelectedNode(null);
      }
    });

    cyRef.current = cy;

    return () => {
      cy.destroy();
    };
  }, [elements, layoutName, typeFilter]);

  const handleAddCustomNode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace || !newNodeValue) return;

    await apiService.addCustomNode(activeWorkspace.id, {
      type: newNodeType,
      value: newNodeValue,
      label: newNodeLabel || newNodeValue,
      risk_level: 'INFO'
    });

    setModalOpen(false);
    setNewNodeValue('');
    setNewNodeLabel('');
    await loadGraph();
  };

  const handleDeleteNode = async (nodeId: string) => {
    if (!activeWorkspace) return;
    await apiService.deleteNode(activeWorkspace.id, nodeId);
    setSelectedNode(null);
    await loadGraph();
  };

  const handlePivot = async (nodeId: string, pivotType: string) => {
    if (!activeWorkspace) return;
    addLog('Pivot', 'STARTED', `Executing pivot '${pivotType}' on entity ${nodeId}...`);
    try {
      await apiService.pivotNode(activeWorkspace.id, nodeId, pivotType);
      addLog('Pivot', 'SUCCESS', `Pivot expanded graph elements.`);
      await loadGraph();
    } catch (e: any) {
      addLog('Pivot', 'ERROR', `Pivot failed: ${e.message}`);
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="bg-cyber-card border border-cyber-border rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Network className="w-5 h-5 text-cyber-accent" />
            <h2 className="text-base font-bold text-cyber-textPrimary">
              {t('graph.title')}
            </h2>
          </div>
          <span className="px-2 py-0.5 rounded font-mono text-xs bg-cyber-bg border border-cyber-border text-cyber-textMuted">
            Nodes: <strong className="text-cyber-accent">{elements.nodes.length}</strong> | Edges: <strong className="text-cyber-accent">{elements.edges.length}</strong>
          </span>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Layout switcher */}
          <div className="flex items-center gap-1.5 text-xs text-cyber-textMuted font-mono">
            <Compass className="w-3.5 h-3.5" />
            <select
              value={layoutName}
              onChange={(e: any) => setLayoutName(e.target.value)}
              className="bg-cyber-bg border border-cyber-border rounded-lg px-2.5 py-1 text-xs text-cyber-textPrimary focus:outline-none cursor-pointer"
            >
              <option value="cose">{t('graph.force_directed')}</option>
              <option value="breadthfirst">{t('graph.hierarchical')}</option>
              <option value="concentric">{t('graph.circular')}</option>
              <option value="grid">{t('graph.grid')}</option>
            </select>
          </div>

          {/* Type filter */}
          <div className="flex items-center gap-1.5 text-xs text-cyber-textMuted font-mono">
            <Filter className="w-3.5 h-3.5" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-cyber-bg border border-cyber-border rounded-lg px-2.5 py-1 text-xs text-cyber-textPrimary focus:outline-none cursor-pointer"
            >
              <option value="all">{t('graph.all_types')}</option>
              <option value="domain">Domains</option>
              <option value="subdomain">Subdomains</option>
              <option value="ip">IP Addresses</option>
              <option value="asn">ASN / Autonomous Systems</option>
              <option value="tech">Technologies</option>
              <option value="username">Usernames</option>
              <option value="profile">Social Profiles</option>
              <option value="location">GPS Locations</option>
              <option value="doc">Documents</option>
            </select>
          </div>

          <button
            onClick={() => setModalOpen(true)}
            className="px-3 py-1 bg-cyber-bg border border-cyber-border hover:border-cyber-accent rounded-lg text-xs font-semibold text-cyber-accent flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            {t('graph.add_node')}
          </button>

          <button
            onClick={() => cyRef.current?.fit(undefined, 40)}
            className="p-1.5 bg-cyber-bg border border-cyber-border hover:border-cyber-accent rounded-lg text-cyber-textMuted hover:text-white"
            title="Fit to Screen"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Canvas & Details Drawer */}
      <div className="relative w-full h-[620px] bg-cyber-bg/90 border border-cyber-border rounded-2xl overflow-hidden shadow-2xl flex">
        {/* Cytoscape Container */}
        <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

        {/* Selected Node Details Drawer */}
        {selectedNode && (
          <div className="absolute right-4 top-4 bottom-4 w-80 bg-cyber-card/95 border border-cyber-border rounded-xl p-5 shadow-2xl backdrop-blur-md flex flex-col justify-between overflow-y-auto z-20">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-cyber-border pb-3">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-cyber-bg border border-cyber-border text-cyber-accent">
                  {selectedNode.type}
                </span>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="text-cyber-textMuted hover:text-white text-xs font-bold"
                >
                  ✕
                </button>
              </div>

              <div>
                <h3 className="font-mono text-sm font-bold text-cyber-textPrimary break-all">
                  {selectedNode.label}
                </h3>
                <p className="font-mono text-xs text-cyber-textMuted mt-1 break-all">
                  Value: {selectedNode.value}
                </p>
              </div>

              {/* Node Metadata Viewer */}
              {selectedNode.metadata && Object.keys(selectedNode.metadata).length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase text-cyber-textMuted font-bold">
                    Metadata Attributes
                  </span>
                  <div className="p-2.5 bg-cyber-bg/60 border border-cyber-border rounded-lg text-xs font-mono space-y-1 max-h-40 overflow-y-auto text-slate-300">
                    {Object.entries(selectedNode.metadata).map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-2">
                        <span className="text-cyber-accent">{k}:</span>
                        <span className="truncate max-w-[120px]">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pivot Actions */}
              <div className="pt-2 border-t border-cyber-border space-y-2">
                <span className="text-[10px] font-mono uppercase text-cyber-accent font-bold block">
                  Maltego-Style Pivoting
                </span>
                {selectedNode.type === 'username' && (
                  <button
                    onClick={() => handlePivot(selectedNode.id, 'SOCMINT_SCAN')}
                    className="w-full px-3 py-1.5 bg-cyber-bg border border-cyber-accent/40 hover:border-cyber-accent text-cyber-accent rounded-lg text-xs font-semibold text-left flex items-center justify-between"
                  >
                    <span>Run SOCMINT Footprint Scan</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
                {selectedNode.type === 'ip' && (
                  <button
                    onClick={() => handlePivot(selectedNode.id, 'REVERSE_DNS')}
                    className="w-full px-3 py-1.5 bg-cyber-bg border border-cyber-accent/40 hover:border-cyber-accent text-cyber-accent rounded-lg text-xs font-semibold text-left flex items-center justify-between"
                  >
                    <span>Query Reverse DNS & ASN</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-cyber-border">
              <button
                onClick={() => handleDeleteNode(selectedNode.id)}
                className="w-full py-2 bg-rose-950/40 border border-rose-800 hover:bg-rose-900/60 text-rose-400 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {t('graph.delete_node')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal to Add Custom Node */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-cyber-card border border-cyber-border rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-base font-bold text-cyber-textPrimary mb-3">
              {t('graph.add_node')}
            </h3>

            <form onSubmit={handleAddCustomNode} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-cyber-textMuted mb-1">
                  {t('graph.node_type')}
                </label>
                <select
                  value={newNodeType}
                  onChange={(e) => setNewNodeType(e.target.value)}
                  className="w-full bg-cyber-bg border border-cyber-border rounded-lg px-3 py-2 text-xs text-cyber-textPrimary"
                >
                  <option value="domain">Domain</option>
                  <option value="subdomain">Subdomain</option>
                  <option value="ip">IP Address</option>
                  <option value="asn">ASN</option>
                  <option value="tech">Technology</option>
                  <option value="username">Username</option>
                  <option value="profile">Profile</option>
                  <option value="location">Location</option>
                  <option value="doc">Document</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-cyber-textMuted mb-1">
                  {t('graph.node_value')} *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 192.168.1.1 or @johndoe"
                  value={newNodeValue}
                  onChange={(e) => setNewNodeValue(e.target.value)}
                  className="w-full bg-cyber-bg border border-cyber-border rounded-lg px-3 py-2 text-xs text-cyber-textPrimary font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-cyber-textMuted mb-1">
                  {t('graph.node_label')}
                </label>
                <input
                  type="text"
                  placeholder="Leave empty to use value"
                  value={newNodeLabel}
                  onChange={(e) => setNewNodeLabel(e.target.value)}
                  className="w-full bg-cyber-bg border border-cyber-border rounded-lg px-3 py-2 text-xs text-cyber-textPrimary font-mono"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-cyber-textMuted hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold rounded-lg bg-cyber-accent text-black hover:bg-cyber-accent/90"
                >
                  Add Node
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

