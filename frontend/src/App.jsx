import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ChatPanel from './components/ChatPanel';
import AdminDashboard from './components/AdminDashboard';
import SettingsPanel from './components/SettingsPanel';
import PrebuiltFormsModal from './components/cards/PrebuiltFormsModal';

export default function App() {
  const [activeSessionId, setActiveSessionId] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('session') || params.get('sessionId') || null;
  });
  const [isPrebuiltOpen, setIsPrebuiltOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('chat'); // 'chat', 'admin', 'settings'

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const sId = params.get('session') || params.get('sessionId');
      setActiveSessionId(sId || null);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const updateUrlSession = (sessionId, clearChart = false) => {
    const url = new URL(window.location.href);
    if (sessionId) {
      url.searchParams.set('session', sessionId);
    } else {
      url.searchParams.delete('session');
      url.searchParams.delete('sessionId');
    }
    if (clearChart) {
      url.searchParams.delete('chartId');
    }
    window.history.pushState({}, '', url.toString());
    window.dispatchEvent(new Event('urlchartchange'));
  };

  const handleNewChat = () => {
    setActiveSessionId(null);
    setActiveTab('chat');
    updateUrlSession(null, true);
  };

  const handleSelectSession = (sessionId) => {
    setActiveSessionId(sessionId);
    setActiveTab('chat');
    updateUrlSession(sessionId);
  };

  const handleSessionCreated = (newId) => {
    setActiveSessionId(newId);
    updateUrlSession(newId);
  };

  const [initialPrompt, setInitialPrompt] = useState(null);

  const handleSelectPrebuiltForm = (form) => {
    const promptToRun = form.populatedPrompt || form.prompt || form.promptTemplate;
    if (promptToRun) {
      setInitialPrompt(promptToRun);
      setActiveTab('chat');
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#212121] text-slate-100 font-sans">
      {/* OpenAI ChatGPT Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        activeSessionId={activeSessionId}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
        onOpenPrebuiltForms={() => setIsPrebuiltOpen(true)}
        onOpenAdminDashboard={() => setActiveTab(activeTab === 'admin' ? 'chat' : 'admin')}
      />

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <Header
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onClearMessages={handleNewChat}
          onOpenPrebuiltForms={() => setIsPrebuiltOpen(true)}
          onOpenAdminDashboard={() => setActiveTab(activeTab === 'admin' ? 'chat' : 'admin')}
          onOpenSettings={() => setActiveTab(activeTab === 'settings' ? 'chat' : 'settings')}
        />

        {activeTab === 'admin' ? (
          <div className="flex-1 overflow-y-auto p-4 bg-[#1e1e1e]">
            <AdminDashboard />
          </div>
        ) : activeTab === 'settings' ? (
          <div className="flex-1 overflow-y-auto p-4 bg-[#1e1e1e]">
            <SettingsPanel onConfigUpdated={() => { }} />
          </div>
        ) : (
          <ChatPanel
            activeSessionId={activeSessionId}
            onSessionCreated={handleSessionCreated}
            initialPrompt={initialPrompt}
            onClearInitialPrompt={() => setInitialPrompt(null)}
          />
        )}
      </div>

      {/* Prebuilt Cards Modal */}
      <PrebuiltFormsModal
        isOpen={isPrebuiltOpen}
        onClose={() => setIsPrebuiltOpen(false)}
        onSelectForm={handleSelectPrebuiltForm}
      />
    </div>
  );
}
