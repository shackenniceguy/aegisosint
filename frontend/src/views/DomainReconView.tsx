import React, { useState } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { useLanguage } from '../context/LanguageContext';
import { apiService } from '../api/client';
import { DomainReconData } from '../types';
import {
  Globe,
  Search,
  ShieldCheck,
  ShieldAlert,
  Server,
  Layers,
  AlertTriangle,
  Lock,
  ExternalLink,
  CheckCircle2,
  XCircle
} from 'lucide-react';

export const DomainReconView: React.FC = () => {
  const { activeWorkspace, addLog } = useWorkspace();
  const { t } = useLanguage();

  const [domain, setDomain] = useState(activeWorkspace?.target || '');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DomainReconData | null>(null);
  const [filterActiveSubs, setFilterActiveSubs] = useState(false);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanDomain = domain.trim().replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/.*$/, '').toLowerCase();
    if (!cleanDomain) return;
    setDomain(cleanDomain);
    setLoading(true);
    addLog('DomainRecon', 'STARTED', `Starting passive reconnaissance on ${cleanDomain}...`);

    try {
      const result = await apiService.scanDomain(cleanDomain, activeWorkspace?.id);
      setData(result);
      addLog('DomainRecon', 'SUCCESS', `Discovered ${result.subdomains.length} subdomains and evaluated posture (${result.security_posture_score}/100)`);
    } catch (err: any) {
      addLog('DomainRecon', 'ERROR', `Recon failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredSubs = data?.subdomains.filter((s) => (filterActiveSubs ? s.is_active : true)) || [];

  return (
    <div className="space-y-6">
      {/* Header & Search */}
      <div className="bg-cyber-card border border-cyber-border rounded-2xl p-6 shadow-xl">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-cyber-textPrimary flex items-center gap-2">
            <Globe className="w-5 h-5 text-cyber-accent" />
            {t('domain.title')}
          </h2>
          <p className="text-xs text-cyber-textMuted mt-1">
            {t('domain.subtitle')}
          </p>
        </div>

        <form onSubmit={handleScan} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-cyber-textMuted" />
            <input
              type="text"
              required
              placeholder={t('domain.input_placeholder')}
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
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
                <span>{t('domain.scanning')}</span>
              </>
            ) : (
              <span>{t('domain.scan_btn')}</span>
            )}
          </button>
        </form>
      </div>

      {data && (
        <>
          {/* Posture Score & Risks Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-cyber-card border border-cyber-border rounded-2xl p-6 flex items-center gap-6 shadow-lg">
              <div
                className={`w-20 h-20 rounded-full flex items-center justify-center font-extrabold text-2xl border-4 ${
                  data.security_posture_score >= 70
                    ? 'border-emerald-500 text-emerald-400 bg-emerald-950/20'
                    : data.security_posture_score >= 40
                    ? 'border-amber-500 text-amber-400 bg-amber-950/20'
                    : 'border-rose-500 text-rose-400 bg-rose-950/20'
                }`}
              >
                {data.security_posture_score}
              </div>
              <div>
                <span className="text-xs uppercase font-mono tracking-wider text-cyber-textMuted">
                  {t('domain.score_label')}
                </span>
                <h3 className="text-lg font-bold text-cyber-textPrimary">
                  {data.security_posture_score >= 70
                    ? 'Defensible Posture'
                    : data.security_posture_score >= 40
                    ? 'Moderate Exposure'
                    : 'Critical Exposure'}
                </h3>
                <p className="text-xs text-cyber-textMuted mt-0.5">
                  Target: <span className="font-mono text-cyber-accent">{data.domain}</span>
                </p>
              </div>
            </div>

            <div className="md:col-span-2 bg-cyber-card border border-cyber-border rounded-2xl p-6 shadow-lg">
              <h3 className="text-xs font-mono uppercase tracking-wider text-cyber-textMuted mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                {t('domain.risks_title')} ({data.risks_identified.length})
              </h3>
              <div className="space-y-2 max-h-36 overflow-y-auto">
                {data.risks_identified.length === 0 ? (
                  <p className="text-xs text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> No high-severity misconfigurations detected.
                  </p>
                ) : (
                  data.risks_identified.map((r, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2.5 p-2 bg-cyber-bg/60 border border-cyber-border rounded-lg text-xs"
                    >
                      <span
                        className={`px-1.5 py-0.5 text-[10px] font-mono font-bold rounded ${
                          r.severity === 'HIGH'
                            ? 'bg-rose-950 text-rose-400 border border-rose-800'
                            : 'bg-amber-950 text-amber-400 border border-amber-800'
                        }`}
                      >
                        {r.severity}
                      </span>
                      <div>
                        <strong className="text-slate-200">{r.issue}</strong>
                        <p className="text-[11px] text-cyber-textMuted">{r.detail}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* DNS & Email Security */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-cyber-card border border-cyber-border rounded-2xl p-6 shadow-lg">
              <h3 className="text-sm font-bold text-cyber-textPrimary mb-3 flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyber-accent" />
                {t('domain.dns_title')}
              </h3>
              <div className="space-y-3 font-mono text-xs max-h-64 overflow-y-auto">
                {Object.entries(data.dns_records).map(([type, values]) => (
                  <div key={type} className="p-2.5 bg-cyber-bg/60 border border-cyber-border rounded-lg">
                    <div className="text-[10px] font-bold text-cyber-accent uppercase mb-1">{type}</div>
                    <div className="space-y-1 text-slate-300 break-all text-[11px]">
                      {values.map((v, idx) => (
                        <div key={idx}>• {v}</div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-cyber-card border border-cyber-border rounded-2xl p-6 shadow-lg space-y-4">
              <h3 className="text-sm font-bold text-cyber-textPrimary flex items-center gap-2">
                <Lock className="w-4 h-4 text-cyber-accent" />
                {t('domain.email_sec')}
              </h3>

              {/* SPF */}
              <div className="p-3 bg-cyber-bg/60 border border-cyber-border rounded-xl">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-slate-300">{t('domain.spf_status')}</span>
                  {data.spf_valid ? (
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                      STRICT (-all / ~all)
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-rose-400 bg-rose-950 px-2 py-0.5 rounded border border-rose-800">
                      PERMISSIVE / MISSING
                    </span>
                  )}
                </div>
                <p className="font-mono text-xs text-cyber-textMuted break-all">
                  {data.spf_record || 'No SPF record published'}
                </p>
              </div>

              {/* DMARC */}
              <div className="p-3 bg-cyber-bg/60 border border-cyber-border rounded-xl">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-slate-300">{t('domain.dmarc_status')}</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                      data.dmarc_policy === 'reject'
                        ? 'text-emerald-400 bg-emerald-950 border-emerald-800'
                        : data.dmarc_policy === 'quarantine'
                        ? 'text-amber-400 bg-amber-950 border-amber-800'
                        : 'text-rose-400 bg-rose-950 border-rose-800'
                    }`}
                  >
                    POLICY: {data.dmarc_policy ? data.dmarc_policy.toUpperCase() : 'NONE / MISSING'}
                  </span>
                </div>
                <p className="font-mono text-xs text-cyber-textMuted break-all">
                  {data.dmarc_record || 'No DMARC record found at _dmarc'}
                </p>
              </div>

              {/* IP / ASN Geolocation */}
              <div className="p-3 bg-cyber-bg/60 border border-cyber-border rounded-xl">
                <span className="text-xs font-semibold text-slate-300 block mb-2">
                  {t('domain.ip_title')}
                </span>
                <div className="space-y-2 text-xs">
                  {data.ip_details.map((ip, idx) => (
                    <div key={idx} className="flex justify-between items-center font-mono text-[11px] border-b border-cyber-border pb-1 last:border-none">
                      <span className="text-cyber-accent">{ip.query}</span>
                      <span className="text-slate-400">{ip.country} ({ip.city})</span>
                      <span className="text-cyber-textMuted truncate max-w-[120px]">{ip.isp}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Subdomains from CT Logs */}
          <div className="bg-cyber-card border border-cyber-border rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-cyber-textPrimary">
                  {t('domain.subdomains_title')} ({data.subdomains.length})
                </h3>
                <p className="text-xs text-cyber-textMuted">
                  Retrieved via Certificate Transparency crt.sh query
                </p>
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold text-cyber-textMuted cursor-pointer">
                <input
                  type="checkbox"
                  checked={filterActiveSubs}
                  onChange={(e) => setFilterActiveSubs(e.target.checked)}
                  className="rounded border-cyber-border text-cyber-accent focus:ring-0"
                />
                {t('domain.active_only')}
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-80 overflow-y-auto">
              {filteredSubs.map((sub, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-cyber-bg/60 border border-cyber-border rounded-xl flex items-center justify-between font-mono text-xs hover:border-cyber-accent/40 transition-colors"
                >
                  <div className="truncate mr-2">
                    <span className="text-slate-200 font-medium">{sub.subdomain}</span>
                    {sub.ip_addresses.length > 0 && (
                      <div className="text-[10px] text-cyber-accent">{sub.ip_addresses.join(', ')}</div>
                    )}
                  </div>
                  {sub.is_active ? (
                    <span className="px-1.5 py-0.5 text-[9px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800 rounded">
                      ACTIVE
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 text-[9px] font-bold bg-slate-800 text-slate-500 rounded">
                      LOG ONLY
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Web Tech & Security Headers */}
          {data.http_fingerprint && (
            <div className="bg-cyber-card border border-cyber-border rounded-2xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Server className="w-5 h-5 text-cyber-accent" />
                  <h3 className="text-sm font-bold text-cyber-textPrimary">
                    {t('domain.tech_title')}
                  </h3>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-cyber-textMuted font-mono">
                    Grade: <strong className="text-cyber-accent text-sm">{data.http_fingerprint.grade}</strong> ({data.http_fingerprint.security_score}/100)
                  </span>
                </div>
              </div>

              {/* Technologies */}
              <div className="flex flex-wrap gap-2 mb-4">
                {data.http_fingerprint.technologies.map((tech, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 bg-cyber-bg border border-cyber-accent/30 text-cyber-accent rounded-lg text-xs font-mono font-semibold"
                  >
                    {tech}
                  </span>
                ))}
              </div>

              {/* Header evaluation list */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {data.http_fingerprint.security_headers.map((hdr, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-cyber-bg/60 border border-cyber-border rounded-xl flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-mono font-bold text-slate-200">{hdr.header}</div>
                      <div className="text-[11px] text-cyber-textMuted">{hdr.description}</div>
                    </div>
                    {hdr.status === 'PASS' ? (
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800 rounded">
                        PASS
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-950 text-rose-400 border border-rose-800 rounded">
                        FAIL
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

