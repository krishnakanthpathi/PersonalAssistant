import React from 'react';
import {
  Sparkles,
  MessageSquare,
  FileText,
  Settings,
  Loader2,
  CheckCircle,
  AlertCircle,
  Trash2,
  X
} from 'lucide-react';

export default function Sidebar({
  activeTab,
  setActiveTab,
  isConnected,
  config,
  mcpTasks,
  chats,
  currentSessionId,
  isProcessing,
  startNewChat,
  loadChatSession,
  handleDeleteChat,
  fetchSystemPrompt,
  // Mobile drawer props
  mobileOpen,
  onMobileClose,
}) {
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (onMobileClose) onMobileClose();
  };

  const handleChatLoad = (id) => {
    loadChatSession(id);
    if (onMobileClose) onMobileClose();
  };

  return (
    <>
      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`
          fixed lg:relative inset-y-0 left-0 z-50
          w-72 lg:w-80
          bg-bg-secondary border-r border-border-color
          flex flex-col p-5 lg:p-6 h-full flex-shrink-0 select-none
          transition-transform duration-300 ease-in-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Mobile close button */}
        <button
          onClick={onMobileClose}
          className="lg:hidden absolute top-4 right-4 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all"
        >
          <X size={16} />
        </button>

        {/* Branding */}
        <div className="flex items-center gap-3 mb-6 pr-8 lg:pr-0">
          <div className="w-10 h-10 rounded-xl bg-accent-gradient flex items-center justify-center shadow-glow flex-shrink-0">
            <Sparkles className="text-white w-[22px] h-[22px]" />
          </div>
          <h1 className="text-xl font-bold bg-accent-gradient bg-clip-text text-transparent tracking-tight">Antigravity Hub</h1>
        </div>

        {/* Sidebar Navigation Tabs */}
        <div className="flex flex-col gap-1 mb-6">
          <button
            onClick={() => handleTabChange('chat')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${activeTab === 'chat' ? 'bg-accent-mono/10 text-accent-mono border border-accent-mono/20' : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'}`}
          >
            <MessageSquare className="w-4 h-4" />
            Chat Assistant
          </button>
          <button
            onClick={() => {
              handleTabChange('system-prompt');
              fetchSystemPrompt();
            }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${activeTab === 'system-prompt' ? 'bg-accent-emerald/10 text-accent-emerald border border-accent-emerald/20' : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'}`}
          >
            <FileText className="w-4 h-4" />
            System Prompt
          </button>
          <button
            onClick={() => handleTabChange('settings')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${activeTab === 'settings' ? 'bg-accent-blue/10 text-accent-blue border border-accent-blue/20' : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'}`}
          >
            <Settings className="w-4 h-4" />
            Settings
          </button>
        </div>

        {/* Status indicator Card */}
        <div className="bg-bg-card border border-border-color rounded-2xl p-4 mb-6 shadow-sm backdrop-blur-md">
          <div className="flex items-center justify-between mb-3 text-xs uppercase tracking-wider text-gray-400 font-semibold">
            System status
            <span className="flex items-center gap-1.5 font-bold normal-case text-gray-200">
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-accent-emerald shadow-[0_0_10px_var(--color-accent-emerald)] animate-pulse' : 'bg-red-500 shadow-[0_0_10px_#ef4444]'}`}></span>
              {isConnected ? 'Online' : 'Offline'}
            </span>
          </div>
          <div className="flex flex-col gap-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">LLM Provider:</span>
              <span className="font-mono text-gray-200 font-semibold uppercase">{config.provider}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Active Model:</span>
              <span className="font-mono text-gray-200 font-semibold text-[10px] max-w-[150px] truncate" title={config.model}>{config.model}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Port:</span>
              <span className="font-mono text-gray-200 font-semibold">{config.port}</span>
            </div>
          </div>
        </div>

        {/* Background Tasks Card */}
        {mcpTasks && mcpTasks.length > 0 && (
          <div className="bg-bg-card border border-border-color rounded-2xl p-4 mb-6 shadow-sm backdrop-blur-md flex-shrink-0">
            <div className="flex items-center gap-2 mb-3 text-xs uppercase tracking-wider text-gray-400 font-semibold">
              {mcpTasks.some(t => t.status === 'running' || t.status === 'initiating') ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-accent-mono" />
              ) : mcpTasks.every(t => t.status === 'finished') ? (
                <CheckCircle className="w-3.5 h-3.5 text-accent-emerald" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 text-red-400" />
              )}
              MCP Tasks
            </div>
            <div className="flex flex-col gap-3 max-h-32 overflow-y-auto pr-1">
              {mcpTasks.map(task => {
                const pct = task.total > 0 ? Math.round((task.progress / task.total) * 100) : null;
                const isRunning = task.status === 'running' || task.status === 'initiating';
                const isFinished = task.status === 'finished';
                const isFailed = task.status === 'failed';

                return (
                  <div key={task.taskId} className="flex flex-col gap-1.5 text-xs">
                    <div className="flex items-center justify-between font-medium">
                      <div className="flex items-center gap-1.5 min-w-0 flex-grow">
                        {isRunning && <Loader2 className="w-3.5 h-3.5 animate-spin text-accent-mono shrink-0" />}
                        {isFinished && <CheckCircle className="w-3.5 h-3.5 text-accent-emerald shrink-0" />}
                        {isFailed && <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />}
                        <span className="text-gray-300 truncate font-sans" title={task.message}>
                          {task.message || task.taskId}
                        </span>
                      </div>
                      <span className="text-gray-400 font-mono text-[9px] shrink-0 ml-2">
                        {pct !== null && isRunning ? `${pct}%` : task.status}
                      </span>
                    </div>
                    {pct !== null && isRunning && (
                      <div className="w-full bg-white/5 rounded-full h-1 overflow-hidden">
                        <div
                          className="bg-accent-mono h-full transition-all duration-300 rounded-full"
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Chat History */}
        <div className="flex flex-col flex-grow overflow-hidden mt-2">
          <div className="flex items-center justify-between mb-3 text-gray-400">
            <div className="flex items-center gap-2">
              <MessageSquare size={14} className="text-accent-mono" />
              <h2 className="text-xs font-bold uppercase tracking-wider">Chat History ({chats.length})</h2>
            </div>
            <button
              onClick={startNewChat}
              disabled={isProcessing}
              title="New Chat (Ctrl+N)"
              className="px-3.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all text-xs font-bold flex items-center gap-1 border border-white/10 hover:border-accent-mono/30 active:scale-95 cursor-pointer shadow-sm"
            >
              + New Chat
            </button>
          </div>
          <div className="flex flex-col gap-2 overflow-y-auto pr-1 flex-grow">
            {chats.length === 0 ? (
              <div className="text-gray-500 text-xs text-center py-4 border border-dashed border-white/5 rounded-xl">
                No chats recorded yet.
              </div>
            ) : (
              chats.map((chat) => {
                const isActive = currentSessionId === chat.id;
                return (
                  <div
                    key={chat.id}
                    onClick={() => handleChatLoad(chat.id)}
                    className={`p-3 text-left rounded-xl transition-all duration-200 border cursor-pointer group flex items-start justify-between gap-2 ${isActive
                        ? 'bg-accent-mono/10 border-accent-mono/20 text-white'
                        : 'bg-white/5 hover:bg-white/10 border-transparent text-gray-400 hover:text-white'
                      }`}
                  >
                    <div className="min-w-0 flex-grow">
                      <p className="font-medium text-xs truncate text-gray-200" title={chat.title || 'Untitled Chat'}>{chat.title || 'Untitled Chat'}</p>
                      <span className="text-[9px] text-gray-500 font-mono">
                        {new Date(chat.updated_at).toLocaleDateString([], { month: 'short', day: 'numeric' })} at {new Date(chat.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <button
                      onClick={(e) => handleDeleteChat(e, chat.id)}
                      disabled={isProcessing}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-all shrink-0 self-center"
                      title="Delete chat session"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
