import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Plus,
  RefreshCw,
  Edit3,
  Trash2,
  Check,
  X,
  AlertCircle,
  Search,
  Power,
  Zap,
  Terminal,
  Globe,
  Settings,
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';

export default function McpServerManagementPanel() {
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'stdio', 'sse', 'connected', 'disabled'
  const [toastMsg, setToastMsg] = useState(null);
  const [toastErr, setToastErr] = useState(null);

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingServerName, setEditingServerName] = useState(null); // null if creating
  const [form, setForm] = useState({
    name: '',
    type: 'stdio', // 'stdio' | 'sse'
    url: '',
    command: '',
    args: [''],
    env: [{ key: '', value: '' }],
    enabled: true
  });

  // Delete modal state
  const [deletingServerName, setDeletingServerName] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchServers();
  }, []);

  const showToast = (msg, isError = false) => {
    if (isError) {
      setToastErr(msg);
      setTimeout(() => setToastErr(null), 4000);
    } else {
      setToastMsg(msg);
      setTimeout(() => setToastMsg(null), 3000);
    }
  };

  const fetchServers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/mcp/config');
      const data = await res.json();
      if (data.success && Array.isArray(data.servers)) {
        setServers(data.servers);
      } else if (Array.isArray(data.servers)) {
        setServers(data.servers);
      }
    } catch (err) {
      showToast('Failed to fetch MCP servers list', true);
    } finally {
      setLoading(false);
    }
  };

  // Open Create Form Modal
  const handleOpenCreate = () => {
    setEditingServerName(null);
    setForm({
      name: '',
      type: 'stdio',
      url: '',
      command: '',
      args: [''],
      env: [{ key: '', value: '' }],
      enabled: true
    });
    setIsModalOpen(true);
  };

  // Open Edit Form Modal
  const handleOpenEdit = (server) => {
    setEditingServerName(server.name);

    // Format env object into key-value pairs array
    const envPairs = Object.entries(server.env || {}).map(([key, value]) => ({ key, value }));
    if (envPairs.length === 0) envPairs.push({ key: '', value: '' });

    const argsArr = Array.isArray(server.args) && server.args.length > 0 ? [...server.args] : [''];

    setForm({
      name: server.name,
      type: server.type || (server.url ? 'sse' : 'stdio'),
      url: server.url || '',
      command: server.command || '',
      args: argsArr,
      env: envPairs,
      enabled: server.enabled !== false
    });
    setIsModalOpen(true);
  };

  // Submit Save Server (Create or Update)
  const handleSaveServer = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      showToast('Server name is required', true);
      return;
    }

    if (form.type === 'sse' && !form.url.trim()) {
      showToast('SSE URL is required for SSE transport', true);
      return;
    }

    if (form.type === 'stdio' && !form.command.trim()) {
      showToast('Command is required for stdio transport', true);
      return;
    }

    // Clean up empty args
    const cleanedArgs = form.args.map(a => a.trim()).filter(a => a.length > 0);

    // Clean up env pairs into key-value object
    const envObj = {};
    for (const pair of form.env) {
      if (pair.key.trim()) {
        envObj[pair.key.trim()] = pair.value;
      }
    }

    const payload = {
      name: form.name.trim(),
      type: form.type,
      url: form.type === 'sse' ? form.url.trim() : undefined,
      command: form.type === 'stdio' ? form.command.trim() : undefined,
      args: form.type === 'stdio' ? cleanedArgs : undefined,
      env: form.type === 'stdio' ? envObj : undefined,
      enabled: form.enabled
    };

    try {
      setActionLoading(true);
      const res = await fetch('/api/mcp/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success || res.ok) {
        showToast(`Server "${form.name}" saved successfully.`);
        setIsModalOpen(false);
        fetchServers();
      } else {
        showToast(data.error || 'Failed to save server config', true);
      }
    } catch (err) {
      showToast(err.message, true);
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle Server Enabled State
  const handleToggleEnabled = async (server) => {
    const nextState = !server.enabled;
    try {
      const res = await fetch(`/api/mcp/config/${encodeURIComponent(server.name)}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: nextState })
      });
      const data = await res.json();
      if (data.success || res.ok) {
        showToast(`Server "${server.name}" ${nextState ? 'enabled' : 'disabled'}.`);
        fetchServers();
      } else {
        showToast(data.error || 'Failed to toggle server state', true);
      }
    } catch (err) {
      showToast(err.message, true);
    }
  };

  // Manual Reconnect
  const handleReconnect = async (serverName) => {
    try {
      setActionLoading(true);
      const res = await fetch(`/api/mcp/config/${encodeURIComponent(serverName)}/reconnect`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.success || res.ok) {
        showToast(`Server "${serverName}" reconnected successfully.`);
        fetchServers();
      } else {
        showToast(data.error || `Failed to reconnect "${serverName}"`, true);
      }
    } catch (err) {
      showToast(err.message, true);
    } finally {
      setActionLoading(false);
    }
  };

  // Sync Config & Knowledge Catalog
  const handleSyncConfig = async () => {
    try {
      setActionLoading(true);
      const res = await fetch('/api/mcp/config/sync', { method: 'POST' });
      const data = await res.json();
      if (data.success || res.ok) {
        showToast('MCP config & Knowledge Catalog synced!');
        fetchServers();
      } else {
        showToast(data.error || 'Failed to sync config', true);
      }
    } catch (err) {
      showToast(err.message, true);
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Server
  const handleDeleteConfirm = async () => {
    if (!deletingServerName) return;
    try {
      setActionLoading(true);
      const res = await fetch(`/api/mcp/config/${encodeURIComponent(deletingServerName)}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success || res.ok) {
        showToast(`Server "${deletingServerName}" deleted.`);
        setDeletingServerName(null);
        fetchServers();
      } else {
        showToast(data.error || 'Failed to delete server', true);
      }
    } catch (err) {
      showToast(err.message, true);
    } finally {
      setActionLoading(false);
    }
  };

  // Filter logic
  const filteredServers = servers.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.command && s.command.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.url && s.url.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (filterType === 'stdio') return s.type === 'stdio';
    if (filterType === 'sse') return s.type === 'sse';
    if (filterType === 'connected') return s.status === 'connected';
    if (filterType === 'disabled') return !s.enabled || s.status === 'disabled';
    return true;
  });

  return (
    <div className="space-y-6 font-sans text-slate-100">
      {/* Toast Notifications */}
      {toastMsg && (
        <div className="fixed top-4 right-4 z-50 px-4 py-3 rounded-xl bg-[#212121] text-slate-100 border border-[#333333] text-xs font-semibold shadow-2xl flex items-center space-x-2 animate-in fade-in slide-in-from-top-2">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}
      {toastErr && (
        <div className="fixed top-4 right-4 z-50 px-4 py-3 rounded-xl bg-[#212121] text-slate-100 border border-[#333333] text-xs font-semibold shadow-2xl flex items-center space-x-2 animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="w-4 h-4 text-rose-400" />
          <span>{toastErr}</span>
        </div>
      )}

      {/* Control Header */}
      <div className="p-5 rounded-2xl bg-[#141414] border border-[#2a2a2a] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#262626] pb-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <Cpu className="w-5 h-5 text-white" />
              <span>MCP Server Configuration & Operations</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Add, edit, toggle, reconnect, or delete Model Context Protocol (MCP) tool server processes
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleSyncConfig}
              disabled={actionLoading}
              className="px-3.5 py-2 rounded-xl bg-[#212121] hover:bg-[#2a2a2a] text-xs font-semibold text-slate-200 flex items-center space-x-1.5 transition-colors border border-white/5 cursor-pointer"
              title="Sync configuration state & update OKF catalog"
            >
              <Zap className={`w-3.5 h-3.5 text-slate-300 ${actionLoading ? 'animate-spin' : ''}`} />
              <span>Sync & Re-index</span>
            </button>

            <button
              onClick={fetchServers}
              disabled={loading}
              className="px-3.5 py-2 rounded-xl bg-[#212121] hover:bg-[#2a2a2a] text-xs font-semibold text-slate-200 flex items-center space-x-1.5 transition-colors border border-white/5 cursor-pointer"
              title="Refresh server connection status"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Status</span>
            </button>

            <button
              onClick={handleOpenCreate}
              className="px-4 py-2 rounded-xl bg-white text-black font-semibold text-xs hover:bg-slate-200 shadow-md flex items-center space-x-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Add MCP Server</span>
            </button>
          </div>
        </div>

        {/* Filter Bar & Stats */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2 overflow-x-auto">
            {[
              { id: 'all', label: `All (${servers.length})` },
              { id: 'connected', label: `Connected (${servers.filter(s => s.status === 'connected').length})` },
              { id: 'disabled', label: `Disabled (${servers.filter(s => !s.enabled || s.status === 'disabled').length})` },
              { id: 'stdio', label: `Stdio (${servers.filter(s => s.type === 'stdio').length})` },
              { id: 'sse', label: `SSE (${servers.filter(s => s.type === 'sse').length})` }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterType(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  filterType === tab.id
                    ? 'bg-white text-black font-bold shadow'
                    : 'bg-[#1c1c1c] text-slate-400 hover:text-white hover:bg-[#262626] border border-[#2a2a2a]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search server name/command..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#0c0c0c] border border-[#262626] text-xs text-slate-200 focus:outline-none focus:border-white/30"
            />
          </div>
        </div>
      </div>

      {/* Server Cards Grid */}
      {filteredServers.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-[#141414] border border-[#2a2a2a] space-y-3">
          <Cpu className="w-8 h-8 text-slate-600 mx-auto" />
          <p className="text-xs text-slate-400">No MCP servers match your current filter query.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredServers.map((server) => {
            const isConnected = server.status === 'connected';
            const isDisabled = !server.enabled || server.status === 'disabled';

            return (
              <div
                key={server.name}
                className={`p-4 rounded-2xl bg-[#141414] border border-[#2a2a2a] hover:border-white/20 transition-all flex flex-col justify-between space-y-3 ${
                  isDisabled ? 'opacity-60' : ''
                }`}
              >
                {/* Header info */}
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      {/* Connection status indicator light */}
                      <span className={`w-2.5 h-2.5 rounded-full ${
                        isConnected
                          ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]'
                          : isDisabled
                          ? 'bg-slate-600'
                          : 'bg-amber-500'
                      }`} />

                      <span className="text-sm font-bold font-mono text-white tracking-wide">
                        {server.name}
                      </span>

                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md font-semibold bg-[#212121] text-slate-300 border border-[#333333]">
                        {server.type}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 text-[11px] text-slate-400 font-mono">
                      <span>Status:</span>
                      <span className="font-semibold capitalize text-slate-300">
                        {server.status}
                      </span>
                      {isConnected && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#212121] text-slate-300 border border-[#333333]">
                          {server.toolsCount} tools
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Enable / Disable Toggle Switch */}
                  <button
                    onClick={() => handleToggleEnabled(server)}
                    className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                      server.enabled
                        ? 'bg-[#212121] text-slate-200 border-[#333333] hover:bg-[#2a2a2a]'
                        : 'bg-[#181818] text-slate-600 border-[#262626] hover:text-slate-400'
                    }`}
                    title={server.enabled ? 'Disable Server' : 'Enable Server'}
                  >
                    <Power className="w-4 h-4" />
                  </button>
                </div>

                {/* Command / URL Details */}
                <div className="p-3 rounded-xl bg-[#0c0c0c] border border-[#262626] font-mono text-xs space-y-1.5 overflow-x-auto">
                  {server.type === 'sse' ? (
                    <div className="flex items-center space-x-2 text-slate-300">
                      <Globe className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="truncate">{server.url || 'No URL specified'}</span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2 text-slate-200 font-semibold">
                        <Terminal className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="truncate">{server.command || 'No command specified'}</span>
                      </div>
                      {Array.isArray(server.args) && server.args.length > 0 && (
                        <div className="text-[11px] text-slate-400 pl-5 truncate">
                          Args: {server.args.join(' ')}
                        </div>
                      )}
                    </div>
                  )}

                  {server.env && Object.keys(server.env).length > 0 && (
                    <div className="text-[10px] text-slate-500 pt-1 border-t border-[#1a1a1a]">
                      Env: {Object.keys(server.env).join(', ')}
                    </div>
                  )}
                </div>

                {/* Footer Action Buttons */}
                <div className="flex items-center justify-between pt-2 border-t border-[#212121]">
                  <button
                    onClick={() => handleReconnect(server.name)}
                    disabled={actionLoading || !server.enabled}
                    className="px-3 py-1.5 rounded-xl bg-[#1c1c1c] hover:bg-[#262626] text-[11px] font-semibold text-slate-300 flex items-center space-x-1.5 transition-colors border border-white/5 disabled:opacity-40 cursor-pointer"
                    title="Restart / Reconnect server"
                  >
                    <RefreshCw className="w-3 h-3 text-slate-400" />
                    <span>Reconnect</span>
                  </button>

                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => handleOpenEdit(server)}
                      className="p-1.5 rounded-xl bg-[#1c1c1c] hover:bg-[#262626] text-slate-300 hover:text-white transition-colors border border-white/5 cursor-pointer"
                      title="Edit Configuration"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => setDeletingServerName(server.name)}
                      className="p-1.5 rounded-xl bg-[#1c1c1c] hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 transition-colors border border-white/5 cursor-pointer"
                      title="Delete Server"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-xl bg-[#141414] border border-[#2a2a2a] rounded-2xl shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#262626] pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <SlidersHorizontal className="w-4 h-4 text-white" />
                <span>{editingServerName ? `Edit MCP Server: ${editingServerName}` : 'Add New MCP Server'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#212121]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveServer} className="space-y-4">
              {/* Server Name & Transport Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Server Name *</label>
                  <input
                    type="text"
                    required
                    disabled={Boolean(editingServerName)}
                    placeholder="e.g. github, terminal, notion"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-[#0c0c0c] border border-[#262626] text-xs font-mono text-slate-100 disabled:opacity-50 focus:outline-none focus:border-white/40"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Transport Type *</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-[#0c0c0c] border border-[#262626] text-xs font-mono text-slate-100 focus:outline-none focus:border-white/40"
                  >
                    <option value="stdio">stdio (Local Command Process)</option>
                    <option value="sse">sse (Remote SSE Endpoint)</option>
                  </select>
                </div>
              </div>

              {/* SSE Transport Fields */}
              {form.type === 'sse' && (
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">SSE URL *</label>
                  <input
                    type="url"
                    required
                    placeholder="http://localhost:3001/sse"
                    value={form.url}
                    onChange={(e) => setForm({ ...form, url: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-[#0c0c0c] border border-[#262626] text-xs font-mono text-slate-100 focus:outline-none focus:border-white/40"
                  />
                </div>
              )}

              {/* Stdio Transport Fields */}
              {form.type === 'stdio' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Command *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. npx, node, python3, uvx"
                      value={form.command}
                      onChange={(e) => setForm({ ...form, command: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-[#0c0c0c] border border-[#262626] text-xs font-mono text-slate-100 focus:outline-none focus:border-white/40"
                    />
                  </div>

                  {/* Arguments Array Editor */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-300">Command Arguments (`args`)</label>
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, args: [...form.args, ''] })}
                        className="text-[11px] text-slate-300 hover:text-white font-mono flex items-center space-x-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" /> <span>Add Arg</span>
                      </button>
                    </div>

                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {form.args.map((arg, idx) => (
                        <div key={idx} className="flex items-center space-x-2">
                          <input
                            type="text"
                            placeholder={`Argument #${idx + 1} (e.g. -y or package-name)`}
                            value={arg}
                            onChange={(e) => {
                              const newArgs = [...form.args];
                              newArgs[idx] = e.target.value;
                              setForm({ ...form, args: newArgs });
                            }}
                            className="flex-1 p-2 rounded-xl bg-[#0c0c0c] border border-[#262626] text-xs font-mono text-slate-100"
                          />
                          {form.args.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setForm({ ...form, args: form.args.filter((_, i) => i !== idx) })}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-[#212121]"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Environment Variables Key-Value Editor */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-300">Environment Variables (`env`)</label>
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, env: [...form.env, { key: '', value: '' }] })}
                        className="text-[11px] text-slate-300 hover:text-white font-mono flex items-center space-x-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" /> <span>Add Env Var</span>
                      </button>
                    </div>

                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {form.env.map((pair, idx) => (
                        <div key={idx} className="flex items-center space-x-2">
                          <input
                            type="text"
                            placeholder="KEY (e.g. API_KEY)"
                            value={pair.key}
                            onChange={(e) => {
                              const newEnv = [...form.env];
                              newEnv[idx].key = e.target.value;
                              setForm({ ...form, env: newEnv });
                            }}
                            className="w-1/2 p-2 rounded-xl bg-[#0c0c0c] border border-[#262626] text-xs font-mono text-slate-100"
                          />
                          <input
                            type="text"
                            placeholder="VALUE"
                            value={pair.value}
                            onChange={(e) => {
                              const newEnv = [...form.env];
                              newEnv[idx].value = e.target.value;
                              setForm({ ...form, env: newEnv });
                            }}
                            className="w-1/2 p-2 rounded-xl bg-[#0c0c0c] border border-[#262626] text-xs font-mono text-slate-100"
                          />
                          {form.env.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setForm({ ...form, env: form.env.filter((_, i) => i !== idx) })}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-[#212121]"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Enable / Disable Switch */}
              <div className="flex items-center justify-between pt-3 border-t border-[#262626]">
                <span className="text-xs font-semibold text-slate-300">Enable Server on Save</span>
                <input
                  type="checkbox"
                  checked={form.enabled}
                  onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
                  className="w-4 h-4 accent-white rounded cursor-pointer"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-[#262626]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#212121] hover:bg-[#2a2a2a] text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-white text-black font-semibold text-xs hover:bg-slate-200 shadow-md flex items-center space-x-1.5 cursor-pointer"
                >
                  {actionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>{editingServerName ? 'Update MCP Server' : 'Create MCP Server'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingServerName && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#141414] border border-[#2a2a2a] rounded-2xl p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center space-x-3 text-rose-400">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-white">Delete MCP Server</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to delete the MCP server configuration for{' '}
              <strong className="text-white font-mono">{deletingServerName}</strong>? This action will disconnect the process and remove its tool definitions.
            </p>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#262626]">
              <button
                onClick={() => setDeletingServerName(null)}
                className="px-4 py-2 rounded-xl bg-[#212121] text-slate-300 text-xs font-semibold hover:bg-[#2a2a2a] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md flex items-center space-x-1.5 cursor-pointer"
              >
                {actionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>Delete Server</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
