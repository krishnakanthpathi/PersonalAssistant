import React, { useState, useEffect } from 'react';
import { 
  SquarePen, 
  MessageSquare, 
  Trash2, 
  Search, 
  PanelLeftClose, 
  Settings,
  LayoutDashboard
} from 'lucide-react';

export default function Sidebar({ 
  activeSessionId, 
  onSelectSession, 
  onNewChat, 
  onOpenSettings,
  onOpenAdminDashboard,
  isOpen,
  onToggleSidebar
}) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/chats');
      const data = await res.json();
      if (data.success && Array.isArray(data.chats)) {
        setSessions(data.chats);
      }
    } catch (err) {
      console.error('Failed to fetch chat sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [activeSessionId]);

  const handleDelete = async (e, sessionId) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/chats/${sessionId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setSessions(sessions.filter(s => s.id !== sessionId));
        if (activeSessionId === sessionId) {
          onNewChat();
        }
      }
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  };

  const filteredSessions = sessions.filter(s => 
    (s.title || 'New Chat').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div 
          onClick={onToggleSidebar}
          className="md:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-xs"
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`fixed md:static inset-y-0 left-0 z-50 w-64 chatgpt-sidebar flex flex-col h-full select-none text-sm border-r border-[#262626] transition-all duration-300 transform ${
        isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0 md:hidden'
      }`}>
        {/* Header */}
        <div className="p-3 flex items-center justify-between">
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#212121] transition-colors cursor-pointer"
            title="Close sidebar"
          >
            <PanelLeftClose className="w-5 h-5" />
          </button>

          <button
            onClick={onNewChat}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#212121] transition-colors flex items-center space-x-2 cursor-pointer"
            title="New chat"
          >
            <SquarePen className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input */}
        <div className="px-3 pb-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search chats..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#1c1c1c] border border-[#2a2a2a] text-slate-200 text-xs focus:outline-none focus:border-[#404040] placeholder-slate-500 font-sans"
            />
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
          <div className="text-[11px] font-medium text-slate-500 px-3 py-1.5">
            Recent chats
          </div>

          {loading ? (
            <div className="p-3 text-center text-xs text-slate-500">
              Loading...
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="p-3 text-center text-xs text-slate-500">
              No chats found
            </div>
          ) : (
            filteredSessions.map((session) => {
              const isActive = session.id === activeSessionId;
              return (
                <div
                  key={session.id}
                  onClick={() => onSelectSession(session.id)}
                  className={`group flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer text-xs transition-colors ${
                    isActive 
                      ? 'bg-[#212121] text-white font-semibold' 
                      : 'text-slate-400 hover:bg-[#1c1c1c] hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 overflow-hidden mr-2">
                    <MessageSquare className="w-4 h-4 flex-shrink-0 text-slate-500" />
                    <span className="truncate">{session.title || 'New chat'}</span>
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, session.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-white rounded transition-opacity cursor-pointer"
                    title="Delete chat"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* User Profile Footer with Direct Settings Button */}
        <div className="p-3 border-t border-[#262626] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-full bg-white text-black font-bold flex items-center justify-center text-xs">
              PA
            </div>
            <div>
              <div className="text-xs font-medium text-slate-200">Personal Assistant</div>
              <div className="text-[10px] text-slate-500 font-mono">Engine 2.0</div>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            {onOpenAdminDashboard && (
              <button
                onClick={onOpenAdminDashboard}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#212121] transition-colors cursor-pointer"
                title="Admin Panel"
              >
                <LayoutDashboard className="w-4 h-4" />
              </button>
            )}

            {onOpenSettings && (
              <button
                onClick={onOpenSettings}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#212121] transition-colors cursor-pointer"
                title="Settings"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
