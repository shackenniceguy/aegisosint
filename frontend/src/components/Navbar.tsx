import React, { useState } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { useLanguage } from '../context/LanguageContext';
import { LanguageSwitcher } from './LanguageSwitcher';
import { Shield, Plus, Target, CheckCircle2 } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { workspaces, activeWorkspace, setActiveWorkspace, createWorkspace } = useWorkspace();
  const { t } = useLanguage();
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [description, setDescription] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !target) return;
    await createWorkspace(name, target, description);
    setName('');
    setTarget('');
    setDescription('');
    setModalOpen(false);
  };

  return (
    <>
      <header className="h-16 border-b border-cyber-border bg-cyber-card/70 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyber-accent/10 border border-cyber-accent/30 flex items-center justify-center shadow-lg shadow-cyber-accent/5">
            <Shield className="w-6 h-6 text-cyber-accent" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-cyber-accent bg-clip-text text-transparent">
                AegisOSINT
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                WHITE-ZONE ASM
              </span>
            </div>
            <p className="text-[11px] text-cyber-textMuted hidden sm:block">
              {t('app_tagline')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Workspace selector */}
          <div className="flex items-center gap-2 bg-cyber-bg border border-cyber-border rounded-lg px-3 py-1.5">
            <Target className="w-4 h-4 text-cyber-accent" />
            <select
              value={activeWorkspace?.id || ''}
              onChange={(e) => {
                const found = workspaces.find((w) => w.id === e.target.value);
                setActiveWorkspace(found || null);
              }}
              className="bg-transparent text-xs text-cyber-textPrimary font-medium focus:outline-none cursor-pointer max-w-[150px] truncate"
            >
              {workspaces.length === 0 ? (
                <option value="">{t('workspace.none_selected')}</option>
              ) : (
                workspaces.map((ws) => (
                  <option key={ws.id} value={ws.id} className="bg-cyber-card text-white">
                    {ws.name} ({ws.target})
                  </option>
                ))
              )}
            </select>
            <button
              onClick={() => setModalOpen(true)}
              className="p-1 hover:bg-cyber-cardHover rounded text-cyber-accent transition-colors"
              title={t('workspace.create_new')}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <LanguageSwitcher />

          <div className="flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
            <CheckCircle2 className="w-3 h-3" />
            <span className="hidden md:inline">SYSTEM READY</span>
          </div>
        </div>
      </header>

      {/* Modal to Create Workspace */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-cyber-card border border-cyber-border rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <h3 className="text-lg font-bold text-cyber-textPrimary mb-1">
              {t('workspace.create_new')}
            </h3>
            <p className="text-xs text-cyber-textMuted mb-4">
              {t('workspace.select_prompt')}
            </p>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-cyber-textMuted mb-1">
                  {t('workspace.name')} *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Audit Q4 / Project Redux"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-cyber-bg border border-cyber-border rounded-lg px-3 py-2 text-sm text-cyber-textPrimary focus:outline-none focus:border-cyber-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-cyber-textMuted mb-1">
                  {t('workspace.target')} *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. targetdomain.com or @username"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  className="w-full bg-cyber-bg border border-cyber-border rounded-lg px-3 py-2 text-sm text-cyber-textPrimary focus:outline-none focus:border-cyber-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-cyber-textMuted mb-1">
                  {t('workspace.description')}
                </label>
                <textarea
                  rows={3}
                  placeholder="Notes, scope limitations, or hypotheses..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-cyber-bg border border-cyber-border rounded-lg px-3 py-2 text-sm text-cyber-textPrimary focus:outline-none focus:border-cyber-accent resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-cyber-textMuted hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold rounded-lg bg-cyber-accent text-black hover:bg-cyber-accent/90 transition-all shadow-lg shadow-cyber-accent/20"
                >
                  {t('workspace.create_btn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

