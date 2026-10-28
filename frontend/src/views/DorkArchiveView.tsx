import React, { useState } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { useLanguage } from '../context/LanguageContext';
import { apiService } from '../api/client';
import { DorkQuery, WaybackSnapshot } from '../types';
import {
  SearchCode,
  Search,
  ExternalLink,
  History,
  Archive,
  Filter,
  CheckCircle2
} from 'lucide-react';

export const DorkArchiveView: React.FC = () => {
  const { activeWorkspace, addLog } = useWorkspace();
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState<'dorks' | 'archive'>('dorks');
  const [target, setTarget] = useState(activeWorkspace?.target || '');
  const [loading, setLoading] = useState(false);
  const [dorks, setDorks] = useState<DorkQuery[]>([]);
  const [snapshots, setSnapshots] = useState<WaybackSnapshot[]>([]);
  const [snapshotLimit, setSnapshotLimit] = useState(50);
  const [mimeFilter, setMimeFilter] = useState('');

  const handleGenerateDorks = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target) return;
    setLoading(true);
    addLog('Dorks', 'STARTED', `Generating visual Google/Yandex/GitHub/Shodan dorks for '${target}'...`);

    try {
      const res = await apiService.getDorks(target);
      setDorks(res);
      addLog('Dorks', 'SUCCESS', `Constructed ${res.length} targeted intelligence queries.`);
    } catch (err: any) {
      addLog('Dorks', 'ERROR', `Dork builder failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleQueryWayback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target) return;
    setLoading(true);
    addLog('Wayback', 'STARTED', `Querying Internet Archive CDX API for *.${target}/*...`);

    try {
      const res = await apiService.queryWayback(target, snapshotLimit, mimeFilter);
      setSnapshots(res.snapshots);
      addLog('Wayback', 'SUCCESS', `Discovered ${res.total_snapshots} historical URL snapshots.`);
    } catch (err: any) {
      addLog('Wayback', 'ERROR', `Wayback query failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-cyber-card border border-cyber-border rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-bold text-cyber-textPrimary flex items-center gap-2">
              <SearchCode className="w-5 h-5 text-cyber-accent" />
              {t('dorks.title')}
            </h2>
            <p className="text-xs text-cyber-textMuted mt-1">
              {t('dorks.subtitle')}
            </p>
          </div>

          <div className="flex bg-cyber-bg border border-cyber-border rounded-xl p-1 shrink-0">
            <button
              onClick={() => setActiveTab('dorks')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'dorks'
                  ? 'bg-cyber-accent text-black shadow-md'
                  : 'text-cyber-textMuted hover:text-white'
              }`}
            >
              {t('dorks.dorks_tab')}
            </button>
            <button
              onClick={() => setActiveTab('archive')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'archive'
                  ? 'bg-cyber-accent text-black shadow-md'
                  : 'text-cyber-textMuted hover:text-white'
              }`}
            >
              {t('dorks.archive_tab')}
            </button>
          </div>
        </div>

        {activeTab === 'dorks' ? (
          <form onSubmit={handleGenerateDorks} className="flex gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-cyber-textMuted" />
              <input
                type="text"
                required
                placeholder={t('dorks.input_placeholder')}
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="w-full bg-cyber-bg border border-cyber-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-cyber-textPrimary focus:outline-none focus:border-cyber-accent font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-cyber-accent text-black font-bold text-xs uppercase tracking-wider hover:bg-cyber-accent/90 transition-all shadow-lg shadow-cyber-accent/20"
            >
              {t('dorks.generate_btn')}
            </button>
          </form>
        ) : (
          <form onSubmit={handleQueryWayback} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Archive className="w-4 h-4 absolute left-3.5 top-3.5 text-cyber-textMuted" />
              <input
                type="text"
                required
                placeholder="Domain, e.g. target.com"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="w-full bg-cyber-bg border border-cyber-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-cyber-textPrimary focus:outline-none focus:border-cyber-accent font-mono"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={mimeFilter}
                onChange={(e) => setMimeFilter(e.target.value)}
                className="bg-cyber-bg border border-cyber-border rounded-xl px-3 py-2 text-xs text-cyber-textPrimary font-mono"
              >
                <option value="">All Mime Types</option>
                <option value="text/html">text/html</option>
                <option value="application/pdf">application/pdf</option>
                <option value="application/json">application/json</option>
              </select>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 rounded-xl bg-cyber-accent text-black font-bold text-xs uppercase tracking-wider hover:bg-cyber-accent/90 transition-all shadow-lg shadow-cyber-accent/20"
              >
                {t('dorks.query_archive_btn')}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Dorks Display */}
      {activeTab === 'dorks' && dorks.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {dorks.map((item, idx) => (
            <div
              key={idx}
              className="bg-cyber-card border border-cyber-border rounded-2xl p-5 shadow-lg flex flex-col justify-between hover:border-cyber-accent/40 transition-colors"
            >
              <div>
                <span className="text-[10px] font-mono font-bold uppercase text-cyber-accent px-2 py-0.5 bg-cyber-bg border border-cyber-border rounded">
                  {item.category}
                </span>
                <h3 className="text-sm font-bold text-cyber-textPrimary mt-2">{item.title}</h3>
                <p className="text-xs text-cyber-textMuted mt-1">{item.description}</p>
                <div className="p-2.5 bg-cyber-bg/70 border border-cyber-border rounded-xl font-mono text-xs text-slate-300 break-all my-3">
                  {item.query}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-2 border-t border-cyber-border">
                <a
                  href={item.google_url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-cyber-bg border border-cyber-border hover:border-cyber-accent rounded-lg text-xs font-semibold text-cyber-accent flex items-center gap-1.5"
                >
                  {t('dorks.search_google')}
                  <ExternalLink className="w-3 h-3" />
                </a>
                <a
                  href={item.yandex_url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-cyber-bg border border-cyber-border hover:border-amber-400 rounded-lg text-xs font-semibold text-amber-400 flex items-center gap-1.5"
                >
                  {t('dorks.search_yandex')}
                  <ExternalLink className="w-3 h-3" />
                </a>
                {item.github_url && (
                  <a
                    href={item.github_url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-cyber-bg border border-cyber-border hover:border-white rounded-lg text-xs font-semibold text-white flex items-center gap-1.5"
                  >
                    {t('dorks.search_github')}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {item.shodan_url && (
                  <a
                    href={item.shodan_url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-cyber-bg border border-cyber-border hover:border-rose-400 rounded-lg text-xs font-semibold text-rose-400 flex items-center gap-1.5"
                  >
                    {t('dorks.search_shodan')}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Wayback Historical Snapshots */}
      {activeTab === 'archive' && snapshots.length > 0 && (
        <div className="bg-cyber-card border border-cyber-border rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-cyber-textPrimary flex items-center gap-2">
              <History className="w-4 h-4 text-cyber-accent" />
              Internet Archive Endpoints ({snapshots.length})
            </h3>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto font-mono text-xs">
            {snapshots.map((s, idx) => (
              <div
                key={idx}
                className="p-3 bg-cyber-bg/60 border border-cyber-border rounded-xl flex items-center justify-between hover:border-cyber-accent/40 transition-colors"
              >
                <div className="truncate mr-4">
                  <div className="text-slate-200 font-medium truncate">{s.original_url}</div>
                  <div className="text-[10px] text-cyber-textMuted flex items-center gap-3 mt-0.5">
                    <span>{s.timestamp}</span>
                    <span>{s.mimetype}</span>
                    <span className="text-emerald-400">HTTP {s.status_code}</span>
                  </div>
                </div>

                <a
                  href={s.archive_url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1 bg-cyber-card border border-cyber-border hover:border-cyber-accent rounded-lg text-xs text-cyber-accent font-semibold flex items-center gap-1 shrink-0"
                >
                  Snapshot
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

