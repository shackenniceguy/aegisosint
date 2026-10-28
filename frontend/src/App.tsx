import React, { useState } from 'react';
import { LanguageProvider } from './context/LanguageContext';
import { WorkspaceProvider, useWorkspace } from './context/WorkspaceContext';
import { Navbar } from './components/Navbar';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { TerminalLog } from './components/TerminalLog';

import { DomainReconView } from './views/DomainReconView';
import { SocmintView } from './views/SocmintView';
import { MetadataForensicsView } from './views/MetadataForensicsView';
import { DorkArchiveView } from './views/DorkArchiveView';
import { GraphWorkspaceView } from './views/GraphWorkspaceView';
import { ReportView } from './views/ReportView';

const MainLayout: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('domain');
  const { activeWorkspace } = useWorkspace();

  return (
    <div className="min-h-screen bg-cyber-bg flex flex-col text-cyber-textPrimary font-sans">
      <Navbar />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        <main className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
          {activeTab === 'domain' && <DomainReconView />}
          {activeTab === 'socmint' && <SocmintView />}
          {activeTab === 'forensics' && <MetadataForensicsView />}
          {activeTab === 'dorks' && <DorkArchiveView />}
          {activeTab === 'graph' && <GraphWorkspaceView />}
          {activeTab === 'reports' && <ReportView />}

          <div className="pt-4">
            <TerminalLog />
          </div>
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <LanguageProvider>
      <WorkspaceProvider>
        <MainLayout />
      </WorkspaceProvider>
    </LanguageProvider>
  );
};

export default App;

