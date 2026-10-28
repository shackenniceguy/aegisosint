import React, { useState } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { useLanguage } from '../context/LanguageContext';
import { apiService } from '../api/client';
import { UsernameScanData } from '../types';
import {
  Users,
  Search,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Github,
  Building,
  MapPin,
  BookOpen
} from 'lucide-react';

export const SocmintView: React.FC = () => {
  const { activeWorkspace, addLog } = useWorkspace();
  const { t } = useLanguage();

  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<UsernameScanData | null>(null);
  const [filterExistsOnly, setFilterExistsOnly] = useState(true);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username) return;
    setLoading(true);
    addLog('SOCMINT', 'STARTED', `Initiating footprint scan across 30+ platforms for @${username}...`);

    try {
      const res = await apiService.scanUsername(username, activeWorkspace?.id);
      setData(res);
      addLog('SOCMINT', 'SUCCESS', `Found ${res.found_count} matching profiles out of ${res.total_checked} platforms.`);
    } catch (err: any) {
      addLog('SOCMINT', 'ERROR', `Scan failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const displayedProfiles = data?.profiles.filter((p) => (filterExistsOnly ? p.exists : true)) || [];

  return (
    <div className="space-y-6">
      {/* Header & Search */}
      <div className="bg-cyber-card border border-cyber-border rounded-2xl p-6 shadow-xl">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-cyber-textPrimary flex items-center gap-2">
            <Users className="w-5 h-5 text-cyber-accent" />
            {t('socmint.title')}
          </h2>
          <p className="text-xs text-cyber-textMuted mt-1">
            {t('socmint.subtitle')}
          </p>
        </div>

        <form onSubmit={handleScan} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-cyber-textMuted" />
            <input
              type="text"
              required
              placeholder={t('socmint.input_placeholder')}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-cyber-bg border border-cyber-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-cyber-textPrimary focus:outline-none focus:border-cyber-accent font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 rounded-xl bg-cyber-accent text-black font-bold text-xs uppercase tracking-wider hover:bg-cyber-accent/90 transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-cyber-accent/20"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                <span>{t('socmint.scanning')}</span>
              </>
            ) : (
              <span>{t('socmint.scan_btn')}</span>
            )}
          </button>
        </form>
      </div>

      {data && (
        <>
          {/* Quick Metrics & GitHub Enrichment */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-cyber-card border border-cyber-border rounded-2xl p-6 shadow-lg flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-cyber-accent/10 border border-cyber-accent/30 flex items-center justify-center font-extrabold text-2xl text-cyber-accent">
                {data.found_count}
              </div>
              <div>
                <span className="text-xs uppercase font-mono text-cyber-textMuted block">
                  {t('socmint.found_profiles')}
                </span>
                <span className="text-xs text-slate-300">
                  {t('socmint.checked_total')}: <strong>{data.total_checked}</strong>
                </span>
              </div>
            </div>

            {/* GitHub Profile Card */}
            {data.github_enrichment && (
              <div className="md:col-span-2 bg-cyber-card border border-cyber-border rounded-2xl p-6 shadow-lg flex flex-col sm:flex-row items-start sm:items-center gap-4">
                {data.github_enrichment.avatar_url && (
                  <img
                    src={data.github_enrichment.avatar_url}
                    alt="GitHub Avatar"
                    className="w-16 h-16 rounded-2xl border-2 border-cyber-accent/40 object-cover"
                  />
                )}
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Github className="w-4 h-4 text-cyber-accent" />
                    <h3 className="font-bold text-sm text-cyber-textPrimary">
                      {data.github_enrichment.name || data.username}
                    </h3>
                    <span className="text-xs font-mono text-cyber-textMuted">@{data.username}</span>
                  </div>
                  {data.github_enrichment.bio && (
                    <p className="text-xs text-slate-300 italic">"{data.github_enrichment.bio}"</p>
                  )}
                  <div className="flex flex-wrap gap-4 text-xs text-cyber-textMuted pt-1">
                    {data.github_enrichment.company && (
                      <span className="flex items-center gap-1">
                        <Building className="w-3.5 h-3.5 text-cyber-accent" />
                        {data.github_enrichment.company}
                      </span>
                    )}
                    {data.github_enrichment.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-cyber-accent" />
                        {data.github_enrichment.location}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5 text-cyber-accent" />
                      {data.github_enrichment.public_repos} Repos
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Platform Result Grid */}
          <div className="bg-cyber-card border border-cyber-border rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-cyber-textPrimary">
                Target Accounts ({displayedProfiles.length})
              </h3>
              <label className="flex items-center gap-2 text-xs font-semibold text-cyber-textMuted cursor-pointer">
                <input
                  type="checkbox"
                  checked={filterExistsOnly}
                  onChange={(e) => setFilterExistsOnly(e.target.checked)}
                  className="rounded border-cyber-border text-cyber-accent focus:ring-0"
                />
                Show Active Only
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {displayedProfiles.map((p, idx) => (
                <div
                  key={idx}
                  className={`p-3.5 rounded-xl border transition-all ${
                    p.exists
                      ? 'bg-cyber-bg/80 border-cyber-accent/30 hover:border-cyber-accent shadow-sm'
                      : 'bg-cyber-bg/40 border-cyber-border opacity-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-xs text-cyber-textPrimary flex items-center gap-1.5">
                      {p.exists ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-slate-500" />
                      )}
                      {p.platform}
                    </span>
                    <span className="text-[10px] font-mono text-cyber-textMuted uppercase px-1.5 py-0.5 bg-cyber-card rounded border border-cyber-border">
                      {p.category}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] font-mono text-cyber-textMuted">
                      {p.response_time_ms}ms
                    </span>
                    {p.exists ? (
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-cyber-accent hover:underline flex items-center gap-1"
                      >
                        {t('socmint.open_profile')}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-[11px] text-slate-500">Not Found</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

