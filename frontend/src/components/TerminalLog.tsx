import React, { useState } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { useLanguage } from '../context/LanguageContext';
import { Terminal, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

export const TerminalLog: React.FC = () => {
  const { logs, clearLogs } = useWorkspace();
  const { t } = useLanguage();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="bg-cyber-card border border-cyber-border rounded-xl overflow-hidden shadow-2xl">
      <div className="flex items-center justify-between px-4 py-2.5 bg-cyber-bg/80 border-b border-cyber-border">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyber-accent" />
          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-cyber-accent">
            {t('terminal.title')}
          </span>
          <span className="px-1.5 py-0.2 bg-cyber-border text-cyber-textMuted rounded text-[10px] font-mono">
            {logs.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={clearLogs}
            className="p-1 hover:bg-cyber-cardHover rounded text-cyber-textMuted hover:text-cyber-neonRed transition-colors"
            title={t('terminal.clear')}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 hover:bg-cyber-cardHover rounded text-cyber-textMuted hover:text-cyber-textPrimary transition-colors"
          >
            {collapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="p-3 font-mono text-xs max-h-48 overflow-y-auto space-y-1.5 bg-black/40">
          {logs.length === 0 ? (
            <div className="text-cyber-textMuted/60 italic text-center py-4">
              {t('terminal.waiting')}
            </div>
          ) : (
            logs.map((log) => {
              let badgeColor = 'bg-cyber-border text-cyber-textMuted';
              if (log.status === 'SUCCESS') badgeColor = 'bg-emerald-950/70 text-emerald-400 border border-emerald-800';
              if (log.status === 'STARTED') badgeColor = 'bg-sky-950/70 text-sky-400 border border-sky-800';
              if (log.status === 'WARNING') badgeColor = 'bg-amber-950/70 text-amber-400 border border-amber-800';
              if (log.status === 'ERROR') badgeColor = 'bg-rose-950/70 text-rose-400 border border-rose-800';

              return (
                <div key={log.id} className="flex items-start gap-2 leading-relaxed">
                  <span className="text-cyber-textMuted/60 select-none text-[10px] pt-0.5">
                    [{log.timestamp}]
                  </span>
                  <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${badgeColor}`}>
                    {log.module}
                  </span>
                  <span className="text-slate-300 flex-1 break-words">{log.message}</span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

