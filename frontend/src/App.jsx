import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ChatPanel from './components/ChatPanel';
import AdminDashboard from './components/AdminDashboard';
import SettingsPanel from './components/SettingsPanel';
import PrebuiltFormsModal from './components/cards/PrebuiltFormsModal';

export default function App() {
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [isPrebuiltOpen, setIsPrebuiltOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('chat'); // 'chat', 'admin', 'settings'

  const handleNewChat = () => {
    setActiveSessionId(null);
    setActiveTab('chat');
  };

  const handleSelectSession = (sessionId) => {
    setActiveSessionId(sessionId);
    setActiveTab('chat');
  };

  const handleSelectPrebuiltForm = (form) => {
    console.log('Selected action card:', form);
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
            <SettingsPanel onConfigUpdated={() => {}} />
          </div>
        ) : (
          <ChatPanel
            activeSessionId={activeSessionId}
            onSessionCreated={(newId) => setActiveSessionId(newId)}
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
