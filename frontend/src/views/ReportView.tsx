import React, { useState } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { useLanguage } from '../context/LanguageContext';
import { apiService } from '../api/client';
import { ReportData } from '../types';
import {
  FileText,
  Printer,
  Copy,
  Check,
  Award,
  AlertOctagon,
  FileCode
} from 'lucide-react';

export const ReportView: React.FC = () => {
  const { activeWorkspace, addLog } = useWorkspace();
  const { language, t } = useLanguage();

  const [format, setFormat] = useState<'markdown' | 'html' | 'json'>('markdown');
  const [reportLang, setReportLang] = useState<string>(language);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<ReportData | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!activeWorkspace) return;
    setLoading(true);
    addLog('Report', 'STARTED', `Generating investigation audit report (${format.toUpperCase()}, ${reportLang.toUpperCase()})...`);

    try {
      const data = await apiService.generateReport(activeWorkspace.id, reportLang, format);
      setReport(data);
      addLog('Report', 'SUCCESS', `Audit report compiled. Security score: ${data.executive_summary.security_score}/100`);
    } catch (err: any) {
      addLog('Report', 'ERROR', `Report generation error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!report) return;
    navigator.clipboard.writeText(report.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    if (!report) return;
    if (format === 'html') {
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(report.content);
        win.document.close();
      }
    } else {
      window.print();
    }
  };

  return (
    <div className="space-y-6">
      {/* Configuration & Controls */}
      <div className="bg-cyber-card border border-cyber-border rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-cyber-textPrimary flex items-center gap-2">
            <FileText className="w-5 h-5 text-cyber-accent" />
            {t('reports.title')}
          </h2>
          <p className="text-xs text-cyber-textMuted mt-1">
            {t('reports.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={format}
            onChange={(e: any) => setFormat(e.target.value)}
            className="bg-cyber-bg border border-cyber-border rounded-xl px-3 py-2 text-xs text-cyber-textPrimary font-mono cursor-pointer"
          >
            <option value="markdown">Markdown (.md)</option>
            <option value="html">HTML (Print / PDF)</option>
            <option value="json">Raw JSON (.json)</option>
          </select>

          <select
            value={reportLang}
            onChange={(e) => setReportLang(e.target.value)}
            className="bg-cyber-bg border border-cyber-border rounded-xl px-3 py-2 text-xs text-cyber-textPrimary font-mono cursor-pointer uppercase"
          >
            <option value="ru">Русский (RU)</option>
            <option value="en">English (EN)</option>
            <option value="uz">O'zbekcha (UZ)</option>
          </select>

          <button
            onClick={handleGenerate}
            disabled={loading || !activeWorkspace}
            className="px-6 py-2.5 rounded-xl bg-cyber-accent text-black font-bold text-xs uppercase tracking-wider hover:bg-cyber-accent/90 transition-all disabled:opacity-50 shadow-lg shadow-cyber-accent/20"
          >
            {loading ? 'Compiling...' : t('reports.generate_btn')}
          </button>
        </div>
      </div>

      {report && (
        <div className="space-y-6">
          {/* Executive Summary Card */}
          <div className="bg-cyber-card border border-cyber-border rounded-2xl p-6 shadow-lg flex flex-col md:flex-row items-center gap-8">
            <div className="flex items-center gap-4">
              <div
                className={`w-20 h-20 rounded-2xl flex items-center justify-center font-extrabold text-3xl border-2 ${
                  report.executive_summary.security_score >= 70
                    ? 'border-emerald-500 text-emerald-400 bg-emerald-950/30'
                    : report.executive_summary.security_score >= 40
                    ? 'border-amber-500 text-amber-400 bg-amber-950/30'
                    : 'border-rose-500 text-rose-400 bg-rose-950/30'
                }`}
              >
                {report.executive_summary.score_grade}
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-cyber-textMuted tracking-wider block">
                  Security Posture Score
                </span>
                <h3 className="text-2xl font-black text-cyber-textPrimary">
                  {report.executive_summary.security_score} <span className="text-sm font-normal text-cyber-textMuted">/ 100</span>
                </h3>
                <span className="text-xs text-slate-400">
                  Target: <strong className="text-cyber-accent">{report.executive_summary.target}</strong>
                </span>
              </div>
            </div>

            <div className="flex-1 border-t md:border-t-0 md:border-l border-cyber-border pt-4 md:pt-0 md:pl-8 space-y-2">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-cyber-textMuted">
                Identified Findings Overview
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                <div className="p-2.5 bg-cyber-bg/60 border border-cyber-border rounded-xl">
                  <span className="text-[10px] text-rose-400 block font-bold">CRITICAL</span>
                  <span className="text-lg font-bold text-white">{report.executive_summary.critical_risks_count}</span>
                </div>
                <div className="p-2.5 bg-cyber-bg/60 border border-cyber-border rounded-xl">
                  <span className="text-[10px] text-amber-400 block font-bold">HIGH</span>
                  <span className="text-lg font-bold text-white">{report.executive_summary.high_risks_count}</span>
                </div>
                <div className="p-2.5 bg-cyber-bg/60 border border-cyber-border rounded-xl">
                  <span className="text-[10px] text-sky-400 block font-bold">MEDIUM</span>
                  <span className="text-lg font-bold text-white">{report.executive_summary.medium_risks_count}</span>
                </div>
                <div className="p-2.5 bg-cyber-bg/60 border border-cyber-border rounded-xl">
                  <span className="text-[10px] text-slate-400 block font-bold">TOTAL ASSETS</span>
                  <span className="text-lg font-bold text-white">{report.executive_summary.total_entities}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 shrink-0">
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-cyber-bg border border-cyber-border hover:border-cyber-accent rounded-xl text-xs font-semibold text-cyber-accent flex items-center gap-2 transition-all shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" />
                {t('reports.print_pdf')}
              </button>
              <button
                onClick={handleCopy}
                className="px-4 py-2 bg-cyber-bg border border-cyber-border hover:border-white rounded-xl text-xs font-semibold text-white flex items-center gap-2 transition-all"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : t('reports.copy_markdown')}
              </button>
            </div>
          </div>

          {/* Report Content Preview */}
          <div className="bg-cyber-card border border-cyber-border rounded-2xl p-6 shadow-xl">
            {format === 'html' ? (
              <iframe
                title="Report HTML Preview"
                srcDoc={report.content}
                className="w-full h-[600px] rounded-xl border border-cyber-border bg-white"
              />
            ) : (
              <pre className="p-5 bg-black/60 border border-cyber-border rounded-xl text-xs font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-[600px] overflow-y-auto">
                {report.content}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

