import React, { useState } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { useLanguage } from '../context/LanguageContext';
import { LanguageSwitcher } from './LanguageSwitcher';
import { getApiBaseUrl, setApiBaseUrl } from '../api/client';
import { Shield, Plus, Target, CheckCircle2, AlertCircle, Settings, Server } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { workspaces, activeWorkspace, setActiveWorkspace, createWorkspace, isBackendConnected, loadWorkspaces } = useWorkspace();
  const { t } = useLanguage();
  const [modalOpen, setModalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [apiUrl, setApiUrl] = useState(getApiBaseUrl());

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

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiBaseUrl(apiUrl.trim() || null);
    setSettingsOpen(false);
    await loadWorkspaces();
  };

  const safeWorkspaces = Array.isArray(workspaces) ? workspaces : [];

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

        <div className="flex items-center gap-3">
          {/* Workspace selector */}
          <div className="flex items-center gap-2 bg-cyber-bg border border-cyber-border rounded-lg px-3 py-1.5">
            <Target className="w-4 h-4 text-cyber-accent" />
            <select
              value={activeWorkspace?.id || ''}
              onChange={(e) => {
                const found = safeWorkspaces.find((w) => w.id === e.target.value);
                setActiveWorkspace(found || null);
              }}
              className="bg-transparent text-xs text-cyber-textPrimary font-medium focus:outline-none cursor-pointer max-w-[150px] truncate"
            >
              {safeWorkspaces.length === 0 ? (
                <option value="">{t('workspace.none_selected')}</option>
              ) : (
                safeWorkspaces.map((ws) => (
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

          {/* Backend Status indicator */}
          <button
            onClick={() => setSettingsOpen(true)}
            className={`flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded-full border transition-all ${
              isBackendConnected
                ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20'
                : 'text-amber-400 bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20'
            }`}
            title="Нажмите для настройки подключения к API бэкенда"
          >
            {isBackendConnected ? (
              <>
                <CheckCircle2 className="w-3 h-3" />
                <span className="hidden md:inline">API ONLINE</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-3 h-3" />
                <span className="hidden md:inline">STANDALONE</span>
              </>
            )}
            <Settings className="w-3 h-3 opacity-60 ml-0.5" />
          </button>
        </div>
      </header>

      {/* Modal to Configure Backend API */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-cyber-card border border-cyber-border rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <div className="flex items-center gap-2 mb-2">
              <Server className="w-5 h-5 text-cyber-accent" />
              <h3 className="text-lg font-bold text-cyber-textPrimary">Настройки подключения к API</h3>
            </div>
            <p className="text-xs text-cyber-textMuted mb-4">
              Укажите адрес вашего запущенного FastAPI бэкенда. Для локальной разработки используйте <code>http://localhost:8000/api/v1</code>.
            </p>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-cyber-textMuted mb-1">
                  API Base URL
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. http://localhost:8000/api/v1 or https://your-server.com/api/v1"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  className="w-full bg-cyber-bg border border-cyber-border rounded-lg px-3 py-2 text-sm text-cyber-textPrimary font-mono focus:outline-none focus:border-cyber-accent"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setApiUrl('http://localhost:8000/api/v1')}
                  className="px-2.5 py-1 text-[11px] font-mono bg-cyber-cardHover rounded border border-cyber-border text-cyber-accent hover:border-cyber-accent"
                >
                  Localhost (8000)
                </button>
                <button
                  type="button"
                  onClick={() => setApiUrl('/api/v1')}
                  className="px-2.5 py-1 text-[11px] font-mono bg-cyber-cardHover rounded border border-cyber-border text-cyber-textMuted hover:border-cyber-border"
                >
                  Относительный (/api/v1)
                </button>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSettingsOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-cyber-textMuted hover:text-white transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold rounded-lg bg-cyber-accent text-black hover:bg-cyber-accent/90 transition-all shadow-lg shadow-cyber-accent/20"
                >
                  Сохранить и подключиться
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                  Отмена
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
