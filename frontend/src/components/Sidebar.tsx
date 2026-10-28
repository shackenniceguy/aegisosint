import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import {
  Globe2,
  Users,
  FileSearch,
  SearchCode,
  Network,
  FileText
} from 'lucide-react';

export type ActiveTab = 'domain' | 'socmint' | 'forensics' | 'dorks' | 'graph' | 'reports';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { t } = useLanguage();

  const navItems = [
    { id: 'domain' as ActiveTab, label: t('nav.domain_recon'), icon: Globe2 },
    { id: 'socmint' as ActiveTab, label: t('nav.socmint'), icon: Users },
    { id: 'forensics' as ActiveTab, label: t('nav.forensics'), icon: FileSearch },
    { id: 'dorks' as ActiveTab, label: t('nav.dorks'), icon: SearchCode },
    { id: 'graph' as ActiveTab, label: t('nav.graph'), icon: Network },
    { id: 'reports' as ActiveTab, label: t('nav.reports'), icon: FileText }
  ];

  return (
    <aside className="w-64 border-r border-cyber-border bg-cyber-card/40 flex flex-col justify-between p-4 shrink-0">
      <div className="space-y-1.5">
        <div className="px-3 py-2 text-[10px] font-mono font-bold uppercase tracking-wider text-cyber-textMuted">
          INTELLIGENCE MODULES
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-cyber-accent text-black font-bold shadow-lg shadow-cyber-accent/20'
                  : 'text-cyber-textMuted hover:bg-cyber-cardHover hover:text-cyber-textPrimary'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-black' : 'text-cyber-accent'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      <div className="p-3 bg-cyber-bg/60 border border-cyber-border rounded-xl text-[11px] text-cyber-textMuted space-y-1">
        <div className="flex items-center justify-between font-mono text-[10px] text-cyber-accent font-bold">
          <span>WHITE-ZONE OSINT</span>
          <span>v1.0.0</span>
        </div>
        <p className="leading-tight text-[10px] opacity-75">
          Public records, DNS, RDAP, CT logs, and open web protocols.
        </p>
      </div>
    </aside>
  );
};

