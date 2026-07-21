import React, { useState, useEffect } from 'react';
import { 
  Save, 
  AlertCircle, 
  CheckCircle, 
  Sparkles,
  Link2,
  Settings,
  Palette,
  RefreshCw,
  Loader2,
  Plus,
  Trash2,
  Edit,
  X
} from 'lucide-react';

export default function SettingsPanel({
  settingsForm,
  setSettingsForm,
  isSavingSettings,
  settingsSuccess,
  settingsError,
  handleSaveSettings,
  googleConnected,
  googleEmail,
  handleConnectGoogle,
  handleDisconnectGoogle,
  codeTheme,
  setCodeTheme,
  codeThemes = [],
  availableModels = [],
  fetchAvailableModels
}) {
  const [openaiModels, setOpenaiModels] = useState([]);
  const [grokModels, setGrokModels] = useState([]);
  const [ollamaModels, setOllamaModels] = useState([]);
  const [fetchingStatus, setFetchingStatus] = useState({ openai: false, grok: false, ollama: false });
  const [showManualInput, setShowManualInput] = useState({ openai: false, grok: false, ollama: false, multimedia: false });

  // Tab State
  const [settingsTab, setSettingsTab] = useState('general'); // 'general', 'mcp', 'env'

  // MCP State
  const [mcpServers, setMcpServers] = useState([]);
  const [isLoadingMcp, setIsLoadingMcp] = useState(false);
  const [mcpError, setMcpError] = useState('');
  const [mcpSuccess, setMcpSuccess] = useState('');
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingServer, setEditingServer] = useState(null); // null if adding
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('stdio');
  const [formUrl, setFormUrl] = useState('');
  const [formCommand, setFormCommand] = useState('');
  const [formArgs, setFormArgs] = useState('');
  const [formEnv, setFormEnv] = useState([{ key: '', value: '' }]);

  // Env State
  const [envContent, setEnvContent] = useState('');
  const [isLoadingEnv, setIsLoadingEnv] = useState(false);
  const [isSavingEnv, setIsSavingEnv] = useState(false);
  const [envError, setEnvError] = useState('');
  const [envSuccess, setEnvSuccess] = useState('');

  // Sync loaded/fetched models for the current active provider
  useEffect(() => {
    if (availableModels && availableModels.length > 0) {
      if (settingsForm.provider === 'openai') setOpenaiModels(availableModels);
      if (settingsForm.provider === 'grok') setGrokModels(availableModels);
      if (settingsForm.provider === 'ollama') setOllamaModels(availableModels);
    }
  }, [availableModels, settingsForm.provider]);

  // Load MCP servers and Env config on boot
  useEffect(() => {
    fetchMcpServers();
    fetchEnvConfig();
  }, []);

  const fetchEnvConfig = async () => {
    setIsLoadingEnv(true);
    setEnvError('');
    try {
      const response = await fetch('http://localhost:3000/api/env');
      const data = await response.json();
      if (response.ok) {
        setEnvContent(data.content || '');
      } else {
        setEnvError(data.error || 'Failed to load system environment settings.');
      }
    } catch (err) {
      setEnvError('Network error loading system environment settings.');
    } finally {
      setIsLoadingEnv(false);
    }
  };

  const handleSaveEnvConfig = async (e) => {
    e.preventDefault();
    setIsSavingEnv(true);
    setEnvError('');
    setEnvSuccess('');
    try {
      const response = await fetch('http://localhost:3000/api/env', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: envContent })
      });
      const data = await response.json();
      if (response.ok) {
        setEnvSuccess('System environment (.env) successfully saved and hot-reloaded.');
      } else {
        setEnvError(data.error || 'Failed to save environment settings.');
      }
    } catch (err) {
      setEnvError('Network error saving environment settings.');
    } finally {
      setIsSavingEnv(false);
    }
  };

  const fetchMcpServers = async () => {
    setIsLoadingMcp(true);
    setMcpError('');
    try {
      const response = await fetch('http://localhost:3000/api/mcp/config');
      const data = await response.json();
      if (response.ok) {
        setMcpServers(data.servers || []);
      } else {
        setMcpError(data.error || 'Failed to load MCP servers');
      }
    } catch (err) {
      setMcpError('Network error loading MCP servers');
    } finally {
      setIsLoadingMcp(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingServer(null);
    setFormName('');
    setFormType('stdio');
    setFormUrl('');
    setFormCommand('');
    setFormArgs('');
    setFormEnv([{ key: '', value: '' }]);
    setShowModal(true);
  };

  const handleOpenEditModal = (server) => {
    setEditingServer(server);
    setFormName(server.name);
    setFormType(server.type);
    setFormUrl(server.url || '');
    setFormCommand(server.command || '');
    setFormArgs(server.args ? server.args.join(' ') : '');
    
    // Map env object to key-value row array
    const mappedEnv = Object.entries(server.env || {}).map(([key, value]) => ({ key, value }));
    setFormEnv(mappedEnv.length > 0 ? mappedEnv : [{ key: '', value: '' }]);
    
    setShowModal(true);
  };

  const handleAddEnvRow = () => {
    setFormEnv(prev => [...prev, { key: '', value: '' }]);
  };

  const handleRemoveEnvRow = (index) => {
    setFormEnv(prev => prev.filter((_, i) => i !== index));
  };

  const handleEnvChange = (index, field, value) => {
    setFormEnv(prev => prev.map((row, i) => i === index ? { ...row, [field]: value } : row));
  };

  const handleSaveMcpServer = async (e) => {
    e.preventDefault();
    setMcpError('');
    setMcpSuccess('');

    // Reconstruct env object
    const envObj = {};
    formEnv.forEach(row => {
      if (row.key.trim()) {
        envObj[row.key.trim()] = row.value;
      }
    });

    // Parse command line arguments
    const parsedArgs = formArgs.trim() ? formArgs.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g).map(arg => {
      if ((arg.startsWith('"') && arg.endsWith('"')) || (arg.startsWith("'") && arg.endsWith("'"))) {
        return arg.slice(1, -1);
      }
      return arg;
    }) : [];

    const payload = {
      name: formName.trim(),
      type: formType,
      url: formType === 'sse' ? formUrl.trim() : undefined,
      command: formType === 'stdio' ? formCommand.trim() : undefined,
      args: formType === 'stdio' ? parsedArgs : undefined,
      env: formType === 'stdio' ? envObj : undefined
    };

    try {
      const response = await fetch('http://localhost:3000/api/mcp/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (response.ok) {
        setMcpSuccess(`Server "${formName}" successfully saved and hot-reloaded.`);
        setShowModal(false);
        fetchMcpServers();
      } else {
        setMcpError(data.error || 'Failed to save server');
      }
    } catch (err) {
      setMcpError('Network error saving MCP server');
    }
  };

  const handleDeleteServer = async (name) => {
    if (!window.confirm(`Are you sure you want to delete and stop MCP server "${name}"?`)) return;
    setMcpError('');
    setMcpSuccess('');
    try {
      const response = await fetch(`http://localhost:3000/api/mcp/config/${name}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (response.ok) {
        setMcpSuccess(`Server "${name}" successfully deleted.`);
        fetchMcpServers();
      } else {
        setMcpError(data.error || 'Failed to delete server');
      }
    } catch (err) {
      setMcpError('Network error deleting MCP server');
    }
  };

  const handleReconnectServer = async (name) => {
    setMcpError('');
    setMcpSuccess('');
    try {
      const response = await fetch(`http://localhost:3000/api/mcp/config/${name}/reconnect`, {
        method: 'POST'
      });
      const data = await response.json();
      if (response.ok) {
        setMcpSuccess(`Server "${name}" successfully reconnected.`);
        fetchMcpServers();
      } else {
        setMcpError(data.error || 'Failed to reconnect server');
      }
    } catch (err) {
      setMcpError('Network error reconnecting MCP server');
    }
  };

  const handleFetchModels = async (providerName) => {
    setFetchingStatus(prev => ({ ...prev, [providerName]: true }));
    try {
      const list = await fetchAvailableModels(providerName, settingsForm);
      if (providerName === 'openai') {
        setOpenaiModels(list || []);
        if (list && list.length > 0 && !showManualInput.openai) {
          if (!settingsForm.openaiModel) {
            setSettingsForm(prev => ({ ...prev, openaiModel: list[0] }));
          }
        }
      } else if (providerName === 'grok') {
        setGrokModels(list || []);
        if (list && list.length > 0 && !showManualInput.grok) {
          if (!settingsForm.grokModel) {
            setSettingsForm(prev => ({ ...prev, grokModel: list[0] }));
          }
        }
      } else if (providerName === 'ollama') {
        setOllamaModels(list || []);
        if (list && list.length > 0 && !showManualInput.ollama) {
          if (!settingsForm.ollamaModel) {
            setSettingsForm(prev => ({ ...prev, ollamaModel: list[0] }));
          }
        }
      }
    } catch (e) {
      console.error('Error fetching models for ' + providerName, e);
    } finally {
      setFetchingStatus(prev => ({ ...prev, [providerName]: false }));
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto p-6 relative">
      {/* Page Header */}
      <div className="flex items-center justify-between pb-4 border-b border-border-color mb-6 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <Settings className="w-5 h-5 text-accent-blue" />
          <div>
            <h2 className="text-md font-semibold text-white font-sans">Settings &amp; Configurations</h2>
            <p className="text-xs text-gray-400">Configure LLM active models, API endpoints, and third-party account integrations.</p>
          </div>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex gap-6 border-b border-white/10 mb-6 flex-shrink-0 select-none">
        <button
          type="button"
          onClick={() => setSettingsTab('general')}
          className={`pb-3 text-xs font-bold tracking-wider uppercase border-b-2 transition-all cursor-pointer ${
            settingsTab === 'general' ? 'border-accent-blue text-white' : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          General Settings
        </button>
        <button
          type="button"
          onClick={() => {
            setSettingsTab('mcp');
            fetchMcpServers();
          }}
          className={`pb-3 text-xs font-bold tracking-wider uppercase border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            settingsTab === 'mcp' ? 'border-accent-blue text-white' : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          MCP Servers
          <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-white/10 text-gray-300 font-bold">
            {mcpServers.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => {
            setSettingsTab('env');
            fetchEnvConfig();
          }}
          className={`pb-3 text-xs font-bold tracking-wider uppercase border-b-2 transition-all cursor-pointer ${
            settingsTab === 'env' ? 'border-accent-blue text-white' : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          System Environment (.env)
        </button>
      </div>

      {/* Dynamic Settings Tabs Rendering */}
      {settingsTab === 'general' ? (
        <>
          {settingsError && (
            <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs flex gap-2 items-center animate-fadeIn">
              <AlertCircle size={14} className="flex-shrink-0" />
              <span>{settingsError}</span>
            </div>
          )}
          {settingsSuccess && (
            <div className="mb-4 p-4 bg-accent-emerald/10 border border-accent-emerald/20 text-accent-emerald rounded-xl text-xs flex gap-2 items-center animate-fadeIn">
              <CheckCircle size={14} className="flex-shrink-0" />
              <span>{settingsSuccess}</span>
            </div>
          )}

          {/* Two Column Settings Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start animate-fadeIn">
            
            {/* Left Column: LLM configurations (Span 2) */}
            <div className="lg:col-span-2 space-y-6">
              <form onSubmit={handleSaveSettings} className="space-y-6">
                
                {/* Provider Selector */}
                <div className="bg-white/5 border border-white/5 rounded-2xl p-5 shadow-sm">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Active LLM Provider</label>
                  <select
                    value={settingsForm.provider}
                    onChange={(e) => setSettingsForm(prev => ({ ...prev, provider: e.target.value }))}
                    className="w-full md:w-1/2 p-3 bg-black/40 border border-white/10 rounded-xl text-xs text-gray-200 outline-none focus:border-accent-blue/50"
                  >
                    <option value="ollama">Ollama (Local API)</option>
                    <option value="openai">OpenAI SDK (Cloud / compatible API)</option>
                    <option value="grok">Grok API (x.ai)</option>
                  </select>
                  <p className="text-[10px] text-gray-500 mt-2">
                    Choosing Grok or OpenAI requires internet connectivity and API keys. Ollama runs fully offline.
                  </p>
                </div>

                {/* Provider Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  
                  {/* OpenAI Card */}
                  <div className={`bg-white/5 border rounded-2xl p-5 transition-all duration-200 ${settingsForm.provider === 'openai' ? 'border-accent-blue/40 bg-accent-blue/5 shadow-[0_0_15px_rgba(59,130,246,0.1)]' : 'border-white/5 opacity-60'}`}>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-bold uppercase tracking-wider text-white">OpenAI Settings</span>
                      {settingsForm.provider === 'openai' && <span className="px-2 py-0.5 rounded-full text-[8px] bg-accent-blue/20 text-accent-blue font-bold">ACTIVE</span>}
                    </div>
                    <div className="space-y-3 text-xs">
                      <div>
                        <label className="block text-gray-400 mb-1 text-[10px]">API Key</label>
                        <input type="password" placeholder="sk-..." value={settingsForm.openaiApiKey}
                          onChange={(e) => setSettingsForm(prev => ({ ...prev, openaiApiKey: e.target.value }))}
                          className="w-full p-2.5 bg-black/40 border border-white/10 rounded-xl outline-none focus:border-accent-blue/50 text-gray-200" />
                      </div>
                      <div>
                        <label className="block text-gray-400 mb-1 text-[10px]">Base URL</label>
                        <input type="text" placeholder="https://api.openai.com/v1" value={settingsForm.openaiBaseUrl}
                          onChange={(e) => setSettingsForm(prev => ({ ...prev, openaiBaseUrl: e.target.value }))}
                          className="w-full p-2.5 bg-black/40 border border-white/10 rounded-xl outline-none focus:border-accent-blue/50 text-gray-200" />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-gray-400 text-[10px]">Model Name</label>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleFetchModels('openai')}
                              disabled={fetchingStatus.openai}
                              className="text-[9px] text-accent-blue hover:underline flex items-center gap-0.5"
                              title="Fetch available models from OpenAI URL"
                            >
                              {fetchingStatus.openai ? (
                                <Loader2 className="w-2.5 h-2.5 animate-spin" />
                              ) : (
                                <RefreshCw className="w-2.5 h-2.5" />
                              )}
                              Fetch
                            </button>
                            {openaiModels.length > 0 && (
                              <button
                                type="button"
                                onClick={() => setShowManualInput(prev => ({ ...prev, openai: !prev.openai }))}
                                className="text-[9px] text-gray-400 hover:underline flex items-center gap-0.5"
                                title="Toggle manual input"
                              >
                                {showManualInput.openai ? 'Select List' : 'Type Name'}
                              </button>
                            )}
                          </div>
                        </div>
                        {(!showManualInput.openai && openaiModels.length > 0) ? (
                          <select
                            value={settingsForm.openaiModel}
                            onChange={(e) => setSettingsForm(prev => ({ ...prev, openaiModel: e.target.value }))}
                            className="w-full p-2.5 bg-black/40 border border-white/10 rounded-xl outline-none focus:border-accent-blue/50 text-gray-200 text-xs cursor-pointer"
                          >
                            {!openaiModels.includes(settingsForm.openaiModel) && settingsForm.openaiModel && (
                              <option value={settingsForm.openaiModel}>{settingsForm.openaiModel}</option>
                            )}
                            {openaiModels.map(m => (
                              <option key={m} value={m}>{m}</option>
                            ))}
                          </select>
                        ) : (
                          <input type="text" placeholder="gpt-4o" value={settingsForm.openaiModel}
                            onChange={(e) => setSettingsForm(prev => ({ ...prev, openaiModel: e.target.value }))}
                            className="w-full p-2.5 bg-black/40 border border-white/10 rounded-xl outline-none focus:border-accent-blue/50 text-gray-200" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Ollama Card */}
                  <div className={`bg-white/5 border rounded-2xl p-5 transition-all duration-200 ${settingsForm.provider === 'ollama' ? 'border-accent-blue/40 bg-accent-blue/5 shadow-[0_0_15px_rgba(59,130,246,0.1)]' : 'border-white/5 opacity-60'}`}>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-bold uppercase tracking-wider text-white">Ollama Settings</span>
                      {settingsForm.provider === 'ollama' && <span className="px-2 py-0.5 rounded-full text-[8px] bg-accent-blue/20 text-accent-blue font-bold">ACTIVE</span>}
                    </div>
                    <div className="space-y-3 text-xs">
                      <div>
                        <label className="block text-gray-400 mb-1 text-[10px]">Ollama URL</label>
                        <input type="text" placeholder="http://localhost:11434" value={settingsForm.ollamaUrl}
                          onChange={(e) => setSettingsForm(prev => ({ ...prev, ollamaUrl: e.target.value }))}
                          className="w-full p-2.5 bg-black/40 border border-white/10 rounded-xl outline-none focus:border-accent-blue/50 text-gray-200" />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-gray-400 text-[10px]">Model Name</label>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleFetchModels('ollama')}
                              disabled={fetchingStatus.ollama}
                              className="text-[9px] text-accent-blue hover:underline flex items-center gap-0.5"
                              title="Fetch locally running Ollama models"
                            >
                              {fetchingStatus.ollama ? (
                                <Loader2 className="w-2.5 h-2.5 animate-spin" />
                              ) : (
                                <RefreshCw className="w-2.5 h-2.5" />
                              )}
                              Fetch
                            </button>
                            {ollamaModels.length > 0 && (
                              <button
                                type="button"
                                onClick={() => setShowManualInput(prev => ({ ...prev, ollama: !prev.ollama }))}
                                className="text-[9px] text-gray-400 hover:underline flex items-center gap-0.5"
                                title="Toggle manual input"
                              >
                                {showManualInput.ollama ? 'Select List' : 'Type Name'}
                              </button>
                            )}
                          </div>
                        </div>
                        {(!showManualInput.ollama && ollamaModels.length > 0) ? (
                          <select
                            value={settingsForm.ollamaModel}
                            onChange={(e) => setSettingsForm(prev => ({ ...prev, ollamaModel: e.target.value }))}
                            className="w-full p-2.5 bg-black/40 border border-white/10 rounded-xl outline-none focus:border-accent-blue/50 text-gray-200 text-xs cursor-pointer"
                          >
                            {!ollamaModels.includes(settingsForm.ollamaModel) && settingsForm.ollamaModel && (
                              <option value={settingsForm.ollamaModel}>{settingsForm.ollamaModel}</option>
                            )}
                            {ollamaModels.map(m => (
                              <option key={m} value={m}>{m}</option>
                            ))}
                          </select>
                        ) : (
                          <input type="text" placeholder="llama3" value={settingsForm.ollamaModel}
                            onChange={(e) => setSettingsForm(prev => ({ ...prev, ollamaModel: e.target.value }))}
                            className="w-full p-2.5 bg-black/40 border border-white/10 rounded-xl outline-none focus:border-accent-blue/50 text-gray-200" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Grok Card */}
                  <div className={`bg-white/5 border rounded-2xl p-5 transition-all duration-200 ${settingsForm.provider === 'grok' ? 'border-accent-blue/40 bg-accent-blue/5 shadow-[0_0_15px_rgba(59,130,246,0.1)]' : 'border-white/5 opacity-60'}`}>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-bold uppercase tracking-wider text-white">Grok Settings</span>
                      {settingsForm.provider === 'grok' && <span className="px-2 py-0.5 rounded-full text-[8px] bg-accent-blue/20 text-accent-blue font-bold">ACTIVE</span>}
                    </div>
                    <div className="space-y-3 text-xs">
                      <div>
                        <label className="block text-gray-400 mb-1 text-[10px]">API Key</label>
                        <input type="password" placeholder="xai-..." value={settingsForm.grokApiKey}
                          onChange={(e) => setSettingsForm(prev => ({ ...prev, grokApiKey: e.target.value }))}
                          className="w-full p-2.5 bg-black/40 border border-white/10 rounded-xl outline-none focus:border-accent-blue/50 text-gray-200" />
                      </div>
                      <div>
                        <label className="block text-gray-400 mb-1 text-[10px]">Base URL</label>
                        <input type="text" placeholder="https://api.x.ai/v1" value={settingsForm.grokBaseUrl}
                          onChange={(e) => setSettingsForm(prev => ({ ...prev, grokBaseUrl: e.target.value }))}
                          className="w-full p-2.5 bg-black/40 border border-white/10 rounded-xl outline-none focus:border-accent-blue/50 text-gray-200" />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-gray-400 text-[10px]">Model Name</label>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleFetchModels('grok')}
                              disabled={fetchingStatus.grok}
                              className="text-[9px] text-accent-blue hover:underline flex items-center gap-0.5"
                              title="Fetch available models from x.ai"
                            >
                              {fetchingStatus.grok ? (
                                <Loader2 className="w-2.5 h-2.5 animate-spin" />
                              ) : (
                                <RefreshCw className="w-2.5 h-2.5" />
                              )}
                              Fetch
                            </button>
                            {grokModels.length > 0 && (
                              <button
                                type="button"
                                onClick={() => setShowManualInput(prev => ({ ...prev, grok: !prev.grok }))}
                                className="text-[9px] text-gray-400 hover:underline flex items-center gap-0.5"
                                title="Toggle manual input"
                              >
                                {showManualInput.grok ? 'Select List' : 'Type Name'}
                              </button>
                            )}
                          </div>
                        </div>
                        {(!showManualInput.grok && grokModels.length > 0) ? (
                          <select
                            value={settingsForm.grokModel}
                            onChange={(e) => setSettingsForm(prev => ({ ...prev, grokModel: e.target.value }))}
                            className="w-full p-2.5 bg-black/40 border border-white/10 rounded-xl outline-none focus:border-accent-blue/50 text-gray-200 text-xs cursor-pointer"
                          >
                            {!grokModels.includes(settingsForm.grokModel) && settingsForm.grokModel && (
                              <option value={settingsForm.grokModel}>{settingsForm.grokModel}</option>
                            )}
                            {grokModels.map(m => (
                              <option key={m} value={m}>{m}</option>
                            ))}
                          </select>
                        ) : (
                          <input type="text" placeholder="grok-2" value={settingsForm.grokModel}
                            onChange={(e) => setSettingsForm(prev => ({ ...prev, grokModel: e.target.value }))}
                            className="w-full p-2.5 bg-black/40 border border-white/10 rounded-xl outline-none focus:border-accent-blue/50 text-gray-200" />
                        )}
                      </div>
                    </div>
                  </div>

                </div>

                {/* Multimedia API Configuration */}
                <div className="bg-white/5 border border-white/5 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Vision / Multimedia LLM Settings</label>
                      <p className="text-[10px] text-gray-500 mt-1">Used exclusively for processing image attachments and desktop UI screenshot analysis.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="useMultimediaModel"
                        checked={!!settingsForm.useMultimediaModel}
                        onChange={(e) => setSettingsForm(prev => ({ ...prev, useMultimediaModel: e.target.checked }))}
                        className="w-4 h-4 rounded border-white/10 bg-black/40 outline-none text-accent-blue focus:ring-0 focus:ring-offset-0 cursor-pointer"
                      />
                      <label htmlFor="useMultimediaModel" className="text-xs text-white font-medium cursor-pointer select-none">Enable Vision model</label>
                    </div>
                  </div>

                  {settingsForm.useMultimediaModel && (
                    <div className="space-y-4 border-t border-white/5 pt-4 animate-slideDown text-xs">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Vision Provider</label>
                          <select
                            value={settingsForm.multimediaProvider || 'ollama'}
                            onChange={(e) => setSettingsForm(prev => ({ ...prev, multimediaProvider: e.target.value }))}
                            className="w-full p-2.5 bg-black/40 border border-white/10 rounded-xl outline-none focus:border-accent-blue/50 text-gray-200 text-xs"
                          >
                            <option value="ollama">Ollama (Local)</option>
                            <option value="openai">OpenAI (Cloud)</option>
                            <option value="grok">Grok (x.ai)</option>
                          </select>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Vision Model Name</label>
                            {((settingsForm.multimediaProvider === 'openai' && openaiModels.length > 0) ||
                              (settingsForm.multimediaProvider === 'grok' && grokModels.length > 0) ||
                              (settingsForm.multimediaProvider === 'ollama' && ollamaModels.length > 0)) && (
                              <button
                                type="button"
                                onClick={() => setShowManualInput(prev => ({ ...prev, multimedia: !prev.multimedia }))}
                                className="text-[9px] text-gray-400 hover:underline flex items-center gap-0.5"
                              >
                                {showManualInput.multimedia ? 'Select List' : 'Type Name'}
                              </button>
                            )}
                          </div>
                          {!showManualInput.multimedia && (
                            (settingsForm.multimediaProvider === 'openai' && openaiModels.length > 0) ||
                            (settingsForm.multimediaProvider === 'grok' && grokModels.length > 0) ||
                            (settingsForm.multimediaProvider === 'ollama' && ollamaModels.length > 0)
                          ) ? (
                            <select
                              value={settingsForm.multimediaModel || ''}
                              onChange={(e) => setSettingsForm(prev => ({ ...prev, multimediaModel: e.target.value }))}
                              className="w-full p-2.5 bg-black/40 border border-white/10 rounded-xl outline-none focus:border-accent-blue/50 text-gray-200 text-xs cursor-pointer"
                            >
                              {(() => {
                                const modelsList = 
                                  settingsForm.multimediaProvider === 'openai' ? openaiModels :
                                  settingsForm.multimediaProvider === 'grok' ? grokModels :
                                  ollamaModels;
                                return (
                                  <>
                                    {!modelsList.includes(settingsForm.multimediaModel) && settingsForm.multimediaModel && (
                                      <option value={settingsForm.multimediaModel}>{settingsForm.multimediaModel}</option>
                                    )}
                                    {modelsList.map(m => (
                                      <option key={m} value={m}>{m}</option>
                                    ))}
                                  </>
                                );
                              })()}
                            </select>
                          ) : (
                            <input
                              type="text"
                              placeholder="e.g., llama3.2-vision, llava"
                              value={settingsForm.multimediaModel || ''}
                              onChange={(e) => setSettingsForm(prev => ({ ...prev, multimediaModel: e.target.value }))}
                              className="w-full p-2.5 bg-black/40 border border-white/10 rounded-xl outline-none focus:border-accent-blue/50 text-gray-200 text-xs"
                            />
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">API Key (OpenAI / Grok Override)</label>
                          <input
                            type="password"
                            placeholder="sk-... (Leave empty to use main API Key)"
                            value={settingsForm.multimediaApiKey || ''}
                            onChange={(e) => setSettingsForm(prev => ({ ...prev, multimediaApiKey: e.target.value }))}
                            className="w-full p-2.5 bg-black/40 border border-white/10 rounded-xl outline-none focus:border-accent-blue/50 text-gray-200 text-xs"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Base URL (Override)</label>
                          <input
                            type="text"
                            placeholder="http://localhost:11434 (Leave empty to use default)"
                            value={settingsForm.multimediaBaseUrl || ''}
                            onChange={(e) => setSettingsForm(prev => ({ ...prev, multimediaBaseUrl: e.target.value }))}
                            className="w-full p-2.5 bg-black/40 border border-white/10 rounded-xl outline-none focus:border-accent-blue/50 text-gray-200 text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                  <button
                    type="submit"
                    disabled={isSavingSettings}
                    className="flex items-center gap-1.5 px-4 py-2 bg-accent-blue text-white rounded-xl text-xs font-semibold hover:bg-accent-blue/80 transition-all disabled:opacity-50 shadow-glow cursor-pointer"
                  >
                    <Save size={13} />
                    {isSavingSettings ? 'Saving...' : 'Save Configuration'}
                  </button>
                </div>
              </form>
            </div>

            {/* Right Column: Code Theme + Integrations */}
            <div className="space-y-6">

              {/* ── Code Highlight Theme Picker ── */}
              {codeThemes.length > 0 && (
                <div className="bg-white/5 border border-white/5 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4 text-xs font-bold text-white uppercase tracking-wider">
                    <Palette size={14} className="text-accent-blue" />
                    <span>Code Theme</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {codeThemes.map(theme => {
                      const isActive = codeTheme === theme.id;
                      return (
                        <button
                          key={theme.id}
                          onClick={() => setCodeTheme(theme.id)}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
                            isActive
                              ? 'border-accent-blue/50 bg-accent-blue/5 shadow-[0_0_12px_rgba(59,130,246,0.12)]'
                              : 'border-white/5 bg-black/20 hover:bg-white/5 hover:border-white/10'
                          }`}
                        >
                          {/* Colour swatch: bg on top, accent stripe on bottom */}
                          <div
                            className="flex-shrink-0 w-9 h-9 rounded-lg overflow-hidden border border-white/10 flex flex-col"
                            aria-hidden
                          >
                            <div className="flex-1" style={{ background: theme.bg }} />
                            <div className="h-2.5" style={{ background: theme.accent }} />
                          </div>
                          <div className="flex-grow min-w-0">
                            <p className={`text-xs font-semibold truncate ${isActive ? 'text-white' : 'text-gray-300'}`}>
                              {theme.label}
                            </p>
                            <p className="text-[10px] font-mono text-gray-500">{theme.bg}</p>
                          </div>
                          {isActive && (
                            <span className="flex-shrink-0 px-2 py-0.5 rounded-full text-[8px] bg-accent-blue/20 text-accent-blue font-bold border border-accent-blue/20">
                              ACTIVE
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-gray-500 mt-3 leading-relaxed">
                    Applied instantly to all code blocks. Saved locally in your browser.
                  </p>
                </div>
              )}

              {/* Google OAuth Card */}
              <div className="bg-white/5 border border-white/5 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4 text-xs font-bold text-white uppercase tracking-wider">
                  <Link2 size={14} className="text-accent-mono" />
                  <span>Integrations</span>
                </div>
                <div className="bg-black/20 border border-white/5 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3 text-xs font-semibold text-gray-300">
                    <span>Google Account</span>
                    <span className="flex items-center gap-1.5 normal-case text-gray-400 font-normal">
                      <span className={`w-2 h-2 rounded-full ${googleConnected ? 'bg-accent-emerald shadow-[0_0_8px_var(--color-accent-emerald)]' : 'bg-gray-500'}`}></span>
                      {googleConnected ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>
                  {googleConnected ? (
                    <div className="flex flex-col gap-2">
                      <div className="text-[10px] text-gray-400 truncate font-mono bg-white/5 p-2 rounded" title={googleEmail}>
                        {googleEmail}
                      </div>
                      <button
                        onClick={handleDisconnectGoogle}
                        className="w-full mt-2 py-1.5 px-2 border border-red-500/20 hover:border-red-500 text-[11px] font-semibold text-red-400 hover:text-red-300 rounded-lg hover:bg-red-500/5 transition-all text-center cursor-pointer"
                      >
                        Disconnect Google Account
                      </button>
                    </div>
                  ) : (
                    <div>
                      <p className="text-[10px] text-gray-500 mb-3 leading-relaxed">
                        Connect your Google account to allow the assistant to manage calendar events and draft emails.
                      </p>
                      <button
                        onClick={handleConnectGoogle}
                        className="w-full py-1.5 px-3 bg-accent-gradient hover:opacity-90 text-[11px] font-semibold text-white rounded-lg transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Sparkles size={12} /> Connect Account
                      </button>
                    </div>
                  )}
                </div>
              </div>

            </div>

          </div>
        </>
      ) : settingsTab === 'mcp' ? (
        /* MCP Config Tab view */
        <div className="space-y-6 flex-grow animate-fadeIn">
          {mcpError && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs flex gap-2 items-center">
              <AlertCircle size={14} className="flex-shrink-0" />
              <span>{mcpError}</span>
            </div>
          )}
          {mcpSuccess && (
            <div className="p-4 bg-accent-emerald/10 border border-accent-emerald/20 text-accent-emerald rounded-xl text-xs flex gap-2 items-center">
              <CheckCircle size={14} className="flex-shrink-0" />
              <span>{mcpSuccess}</span>
            </div>
          )}

          {/* Controls Bar */}
          <div className="flex justify-between items-center bg-white/5 border border-white/5 rounded-2xl p-4 shadow-sm">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Configured MCP Servers</h3>
              <p className="text-[10px] text-gray-400 mt-1">Manage, add, and reload model context protocol hosts dynamically.</p>
            </div>
            <button
              onClick={handleOpenAddModal}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-blue text-white rounded-xl text-xs font-semibold hover:bg-accent-blue/80 transition-all shadow-glow cursor-pointer"
            >
              <Plus size={13} />
              Add Server
            </button>
          </div>

          {/* Servers List */}
          {isLoadingMcp ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-xs text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin text-accent-blue" />
              <span>Fetching MCP servers configurations...</span>
            </div>
          ) : mcpServers.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-white/10 rounded-2xl text-gray-500 text-xs">
              No MCP servers configured yet. Add one to get started!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mcpServers.map(server => (
                <div
                  key={server.name}
                  className={`bg-white/5 border rounded-2xl p-5 border-white/5 hover:border-white/10 shadow-sm flex flex-col justify-between min-h-[170px] transition-all`}
                >
                  <div>
                    {/* Header: Status and Title */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-white truncate max-w-[150px]" title={server.name}>
                        {server.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold border ${
                          server.status === 'connected'
                            ? 'bg-accent-emerald/20 border-accent-emerald/20 text-accent-emerald'
                            : 'bg-gray-500/20 border-white/10 text-gray-400'
                        }`}>
                          {server.status === 'connected' ? 'ONLINE' : 'OFFLINE'}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[8px] bg-white/5 border border-white/5 text-gray-400 uppercase tracking-wider font-bold">
                          {server.type}
                        </span>
                      </div>
                    </div>

                    {/* Details */}
                    <div className="space-y-1.5 text-[10px] text-gray-400 font-mono mb-4">
                      {server.type === 'sse' ? (
                        <div className="truncate" title={server.url}>URL: {server.url}</div>
                      ) : (
                        <>
                          <div className="truncate" title={server.command}>CMD: {server.command}</div>
                          {server.args && server.args.length > 0 && (
                            <div className="truncate" title={server.args.join(' ')}>
                              ARGS: {server.args.join(' ')}
                            </div>
                          )}
                        </>
                      )}
                      {server.status === 'connected' && (
                        <div className="text-accent-blue font-semibold mt-1">
                          Tools Exposed: {server.toolsCount}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-2 border-t border-white/5 pt-3.5 mt-auto">
                    <button
                      onClick={() => handleReconnectServer(server.name)}
                      className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-all cursor-pointer"
                      title="Reconnect/Restart Server"
                    >
                      <RefreshCw size={13} />
                    </button>
                    <button
                      onClick={() => handleOpenEditModal(server)}
                      className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-all cursor-pointer"
                      title="Edit Configuration"
                    >
                      <Edit size={13} />
                    </button>
                    <button
                      onClick={() => handleDeleteServer(server.name)}
                      className="p-1.5 text-gray-500 hover:text-red-400 rounded-lg hover:bg-white/5 transition-all cursor-pointer"
                      title="Delete Server"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* System Environment (.env) tab */
        <div className="space-y-6 flex-grow flex flex-col min-h-0 animate-fadeIn">
          {envError && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs flex gap-2 items-center flex-shrink-0">
              <AlertCircle size={14} className="flex-shrink-0" />
              <span>{envError}</span>
            </div>
          )}
          {envSuccess && (
            <div className="p-4 bg-accent-emerald/10 border border-accent-emerald/20 text-accent-emerald rounded-xl text-xs flex gap-2 items-center flex-shrink-0">
              <CheckCircle size={14} className="flex-shrink-0" />
              <span>{envSuccess}</span>
            </div>
          )}

          {/* Config editor card */}
          <form onSubmit={handleSaveEnvConfig} className="bg-white/5 border border-white/5 rounded-2xl p-5 shadow-sm flex flex-col flex-grow min-h-0">
            <div className="flex justify-between items-center mb-4 flex-shrink-0">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">System Environment Configurations</h3>
                <p className="text-[10px] text-gray-400 mt-1">Directly edit the backend server environment variables (.env). Changes will automatically hot-reload.</p>
              </div>
            </div>

            {isLoadingEnv ? (
              <div className="flex flex-col items-center justify-center flex-grow py-20 gap-3 text-xs text-gray-400">
                <Loader2 className="w-6 h-6 animate-spin text-accent-blue" />
                <span>Reading system configuration files...</span>
              </div>
            ) : (
              <div className="flex flex-col flex-grow min-h-[300px] border border-white/10 rounded-xl overflow-hidden bg-black/40 mb-4">
                <textarea
                  value={envContent}
                  onChange={(e) => setEnvContent(e.target.value)}
                  className="w-full h-full p-4 bg-transparent text-xs font-mono text-emerald-400 outline-none resize-none overflow-y-auto leading-relaxed"
                  placeholder="# Enter environment variables in KEY=VALUE format"
                />
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-white/5 flex-shrink-0">
              <button
                type="submit"
                disabled={isSavingEnv || isLoadingEnv}
                className="flex items-center gap-1.5 px-4 py-2 bg-accent-blue text-white rounded-xl text-xs font-semibold hover:bg-accent-blue/80 transition-all disabled:opacity-50 shadow-glow cursor-pointer"
              >
                <Save size={13} />
                {isSavingEnv ? 'Saving and Reloading...' : 'Save & Reload Environment'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-bg-secondary border border-white/10 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 shadow-glow animate-scaleIn">
            <div className="flex justify-between items-center pb-4 border-b border-white/10 mb-4">
              <h3 className="text-sm font-semibold text-white">
                {editingServer ? `Edit MCP Server: ${formName}` : 'Add New MCP Server'}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            
            <form onSubmit={handleSaveMcpServer} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Server Name</label>
                <input
                  type="text"
                  required
                  disabled={!!editingServer}
                  placeholder="e.g. weather-mcp"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full p-2.5 bg-black/40 border border-white/10 rounded-xl outline-none focus:border-accent-blue/50 text-gray-200 text-xs disabled:opacity-50 font-sans"
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Transport Type</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  className="w-full p-2.5 bg-black/40 border border-white/10 rounded-xl outline-none focus:border-accent-blue/50 text-gray-200 text-xs"
                >
                  <option value="stdio">stdio (Local Command)</option>
                  <option value="sse">SSE (Web URL)</option>
                </select>
              </div>

              {formType === 'sse' ? (
                /* SSE URL */
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">SSE URL</label>
                  <input
                    type="url"
                    required
                    placeholder="http://localhost:8000/sse"
                    value={formUrl}
                    onChange={(e) => setFormUrl(e.target.value)}
                    className="w-full p-2.5 bg-black/40 border border-white/10 rounded-xl outline-none focus:border-accent-blue/50 text-gray-200 text-xs font-sans"
                  />
                </div>
              ) : (
                /* Stdio command, args, env */
                <>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Command</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. npx, python, node"
                      value={formCommand}
                      onChange={(e) => setFormCommand(e.target.value)}
                      className="w-full p-2.5 bg-black/40 border border-white/10 rounded-xl outline-none focus:border-accent-blue/50 text-gray-200 text-xs font-sans"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Arguments</label>
                    <input
                      type="text"
                      placeholder="e.g. -y @modelcontextprotocol/server-filesystem /path/to/folder"
                      value={formArgs}
                      onChange={(e) => setFormArgs(e.target.value)}
                      className="w-full p-2.5 bg-black/40 border border-white/10 rounded-xl outline-none focus:border-accent-blue/50 text-gray-200 text-xs font-sans"
                    />
                    <p className="text-[9px] text-gray-500 mt-1">Separate command-line arguments by spaces.</p>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Environment Variables</label>
                      <button
                        type="button"
                        onClick={handleAddEnvRow}
                        className="text-[9px] text-accent-blue hover:underline flex items-center gap-0.5 cursor-pointer"
                      >
                        <Plus size={10} /> Add Variable
                      </button>
                    </div>
                    
                    <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                      {formEnv.map((env, index) => (
                        <div key={index} className="flex gap-2 items-center">
                          <input
                            type="text"
                            placeholder="KEY"
                            value={env.key}
                            onChange={(e) => handleEnvChange(index, 'key', e.target.value)}
                            className="w-1/2 p-2 bg-black/40 border border-white/10 rounded-lg outline-none focus:border-accent-blue/50 text-gray-200 text-xs font-mono"
                          />
                          <input
                            type="text"
                            placeholder="VALUE"
                            value={env.value}
                            onChange={(e) => handleEnvChange(index, 'value', e.target.value)}
                            className="w-1/2 p-2 bg-black/40 border border-white/10 rounded-lg outline-none focus:border-accent-blue/50 text-gray-200 text-xs font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveEnvRow(index)}
                            className="p-2 text-gray-500 hover:text-red-400 rounded hover:bg-white/5 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-white/10 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-white/10 hover:border-white/20 text-gray-300 rounded-xl text-xs font-semibold hover:bg-white/5 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-accent-blue hover:bg-accent-blue/80 text-white rounded-xl text-xs font-semibold transition-all shadow-glow cursor-pointer"
                >
                  Save Configuration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
