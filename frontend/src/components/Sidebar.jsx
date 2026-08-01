import React, { useState, useEffect } from 'react';
import { 
  SquarePen, 
  MessageSquare, 
  Trash2, 
  Search, 
  PanelLeftClose, 
  Settings,
  LayoutDashboard,
  Pin,
  BarChart2,
  X
} from 'lucide-react';
import ChartCard from './cards/ChartCard';
import MermaidCard from './cards/MermaidCard';

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
  const [pinnedCharts, setPinnedCharts] = useState([]);
  const [selectedPinnedChart, setSelectedPinnedChart] = useState(null);
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('sidebarWidth');
    return saved ? parseInt(saved, 10) : 260;
  });
  const [isResizing, setIsResizing] = useState(false);

  const fetchPinnedCharts = async () => {
    try {
      const res = await fetch('/api/charts/favorites');
      const data = await res.json();
      if (data.success && Array.isArray(data.favorites)) {
        setPinnedCharts(data.favorites);
      }
    } catch (err) {
      console.error('Failed to fetch pinned charts:', err);
    }
  };

  useEffect(() => {
    fetchPinnedCharts();
    window.addEventListener('pinnedchartschange', fetchPinnedCharts);
    return () => window.removeEventListener('pinnedchartschange', fetchPinnedCharts);
  }, []);

  const handleUnpinChart = async (e, chartId) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/charts/favorites/${chartId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setPinnedCharts(prev => prev.filter(c => c.chartId !== chartId));
        if (selectedPinnedChart?.chartId === chartId) {
          setSelectedPinnedChart(null);
        }
        window.dispatchEvent(new Event('pinnedchartschange'));
      }
    } catch (err) {
      console.error('Failed to unpin chart:', err);
    }
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      const newWidth = Math.min(480, Math.max(200, e.clientX));
      setSidebarWidth(newWidth);
      localStorage.setItem('sidebarWidth', newWidth);
    };

    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
      }
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

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

  const handleTogglePinChat = async (e, sessionId) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/chats/${sessionId}/pin`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, isPinned: data.isPinned } : s));
      }
    } catch (err) {
      console.error('Failed to toggle pin for session:', err);
    }
  };

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

  const pinnedSessions = filteredSessions.filter(s => s.isPinned === true);
  const recentSessions = filteredSessions.filter(s => !s.isPinned);

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
      <aside 
        style={{ width: isOpen ? `${sidebarWidth}px` : undefined }}
        className={`fixed md:static inset-y-0 left-0 z-50 chatgpt-sidebar flex flex-col h-full select-none text-sm border-r border-[#262626] relative transition-[transform] duration-300 transform ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0 md:hidden'
        }`}
      >
        {/* Drag Resizer Handle Bar */}
        <div
          onMouseDown={handleMouseDown}
          className="hidden md:block absolute top-0 -right-1 w-2.5 h-full cursor-col-resize hover:bg-white/20 active:bg-white/40 transition-colors z-50 group"
          title="Drag to resize sidebar width"
        >
          <div className="w-0.5 h-8 bg-slate-500 group-hover:bg-white absolute top-1/2 left-1 -translate-y-1/2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
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

        {/* Main Sidebar Feed */}
        <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
          {/* Pinned Chats */}
          {pinnedSessions.map((session) => {
            const isActive = session.id === activeSessionId;
            return (
              <div
                key={session.id}
                onClick={() => onSelectSession(session.id)}
                className={`group flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer text-xs transition-colors ${
                  isActive 
                    ? 'bg-[#212121] text-white font-semibold' 
                    : 'text-slate-300 hover:bg-[#1c1c1c] hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-2.5 overflow-hidden mr-2">
                  <Pin className="w-3.5 h-3.5 fill-white text-white rotate-45 flex-shrink-0" />
                  <span className="truncate">{session.title || 'New chat'}</span>
                </div>
                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => handleTogglePinChat(e, session.id)}
                    className="p-1 text-slate-300 hover:text-white rounded transition-colors cursor-pointer"
                    title="Unpin chat"
                  >
                    <Pin className="w-3.5 h-3.5 fill-white text-white rotate-45" />
                  </button>
                  <button
                    onClick={(e) => handleDelete(e, session.id)}
                    className="p-1 text-slate-500 hover:text-white rounded transition-colors cursor-pointer"
                    title="Delete chat"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}

          {/* Subtle separator if pinned sessions exist */}
          {pinnedSessions.length > 0 && recentSessions.length > 0 && (
            <div className="my-1.5 border-t border-[#262626]" />
          )}

          {/* Recent Chats */}
          {loading ? (
            <div className="p-3 text-center text-xs text-slate-500">
              Loading...
            </div>
          ) : recentSessions.length === 0 && pinnedSessions.length === 0 ? (
            <div className="p-3 text-center text-xs text-slate-500">
              No chats found
            </div>
          ) : (
            recentSessions.map((session) => {
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
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => handleTogglePinChat(e, session.id)}
                      className="p-1 text-slate-500 hover:text-white rounded transition-colors cursor-pointer"
                      title="Pin chat"
                    >
                      <Pin className="w-3.5 h-3.5 text-slate-500 hover:text-white rotate-45" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, session.id)}
                      className="p-1 text-slate-500 hover:text-white rounded transition-colors cursor-pointer"
                      title="Delete chat"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
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

      {/* Pinned Chart Interactive Modal */}
      {selectedPinnedChart && (
        <div 
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
          onClick={() => setSelectedPinnedChart(null)}
        >
          <div 
            className="bg-[#141414] border border-[#2a2a2a] rounded-3xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl font-sans"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 sm:p-5 border-b border-[#262626] flex items-center justify-between bg-[#1c1c1c]">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-amber-400/10 border border-amber-500/20 text-amber-400">
                  <Pin className="w-4 h-4 fill-amber-400 rotate-45" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                    <span>{selectedPinnedChart.chartTitle || 'Pinned Analytics Chart'}</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                    Saved Pinned Chart • ID: {selectedPinnedChart.chartId}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedPinnedChart(null)}
                className="p-2 rounded-xl bg-[#262626] hover:bg-[#333333] text-slate-300 hover:text-white cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto">
              {selectedPinnedChart.chartType === 'mermaid' ? (
                <MermaidCard chartCode={selectedPinnedChart.chartData?.[0]?.code || ''} />
              ) : (
                <ChartCard
                  chartId={selectedPinnedChart.chartId}
                  chartData={selectedPinnedChart.chartData}
                  chartTitle={selectedPinnedChart.chartTitle}
                  chartType={selectedPinnedChart.chartType}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
