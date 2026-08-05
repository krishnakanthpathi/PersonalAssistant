import React, { useState, useEffect } from 'react';
import { Trash2, ChevronDown, PanelLeft, LayoutDashboard, Settings, Check } from 'lucide-react';

export default function Header({ 
  onClearMessages, 
  onOpenAdminDashboard,
  onOpenSettings,
  sidebarOpen,
  onToggleSidebar 
}) {
  const [runningConfig, setRunningConfig] = useState({ provider: 'loading...', model: 'loading...' });
  const [availableModels, setAvailableModels] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [changingModel, setChangingModel] = useState(false);

  useEffect(() => {
    fetchRunningConfig();
  }, []);

  const fetchRunningConfig = async () => {
    try {
      const res = await fetch('/api/config');
      const data = await res.json();
      if (data.success) {
        setRunningConfig({
          provider: data.provider || 'grok',
          model: data.model || 'qwen3.6-27b'
        });
        fetchModelsForProvider(data.provider || 'grok');
      }
    } catch (e) {
      console.error('Failed to fetch running config:', e);
    }
  };

  const fetchModelsForProvider = async (provider) => {
    try {
      const res = await fetch(`/api/models?provider=${provider}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.models)) {
        setAvailableModels(data.models);
      }
    } catch (e) {
      // Ignore
    }
  };

  const handleSelectModel = async (newModel) => {
    try {
      setChangingModel(true);
      setDropdownOpen(false);
      const updatePayload = {};
      if (runningConfig.provider === 'openai') updatePayload.openaiModel = newModel;
      if (runningConfig.provider === 'grok') updatePayload.grokModel = newModel;
      if (runningConfig.provider === 'gemini') updatePayload.geminiModel = newModel;
      if (runningConfig.provider === 'ollama') updatePayload.ollamaModel = newModel;

      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: runningConfig.provider, ...updatePayload })
      });
      const data = await res.json();
      if (data.success) {
        setRunningConfig(prev => ({ ...prev, model: newModel }));
      }
    } catch (e) {
      console.error('Failed to update running model:', e);
    } finally {
      setChangingModel(false);
    }
  };

  return (
    <header className="h-14 px-4 flex items-center justify-between select-none text-slate-200 border-b border-[#262626] bg-[#171717]">
      <div className="flex items-center space-x-2 relative">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#212121] transition-colors cursor-pointer"
          title="Toggle sidebar"
        >
          <PanelLeft className="w-5 h-5" />
        </button>

        {/* Running Model Selector Pill */}
        <div className="relative">
          <div 
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-xl hover:bg-[#212121] cursor-pointer transition-colors border border-white/5"
          >
            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-200">
              <span className="uppercase text-[10px] bg-[#212121] px-1.5 py-0.5 rounded font-mono text-slate-300">
                {runningConfig.provider}
              </span>
              <span className="truncate max-w-[160px] sm:max-w-[220px] font-mono">{runningConfig.model}</span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </div>

          {/* Model Selection Dropdown */}
          {dropdownOpen && (
            <div className="absolute top-11 left-0 z-50 w-72 bg-[#121212] border border-[#2a2a2a] rounded-2xl shadow-2xl p-2 space-y-1">
              <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-slate-500 font-mono">
                Available {runningConfig.provider} Models ({availableModels.length})
              </div>

              <div className="max-h-60 overflow-y-auto space-y-0.5">
                {availableModels.map((m) => {
                  const isSelected = m === runningConfig.model;
                  return (
                    <div
                      key={m}
                      onClick={() => handleSelectModel(m)}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer font-mono transition-colors ${
                        isSelected ? 'bg-[#212121] text-white font-semibold' : 'text-slate-300 hover:bg-[#1a1a1a]'
                      }`}
                    >
                      <span className="truncate">{m}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Clean Navigation Controls */}
      <div className="flex items-center space-x-2">
        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className="px-3 py-1.5 rounded-xl bg-[#212121] hover:bg-[#2a2a2a] text-xs text-slate-200 font-medium flex items-center space-x-1.5 transition-colors border border-white/5 cursor-pointer"
            title="Settings"
          >
            <Settings className="w-3.5 h-3.5 text-slate-300" />
            <span className="hidden sm:inline">Settings</span>
          </button>
        )}

        {onOpenAdminDashboard && (
          <button
            onClick={onOpenAdminDashboard}
            className="px-3 py-1.5 rounded-xl bg-[#212121] hover:bg-[#2a2a2a] text-xs text-slate-200 font-medium flex items-center space-x-1.5 transition-colors border border-white/5 cursor-pointer"
            title="Admin Systems Dashboard"
          >
            <LayoutDashboard className="w-3.5 h-3.5 text-slate-300" />
            <span className="hidden sm:inline">Admin Panel</span>
          </button>
        )}

        <button
          onClick={onClearMessages}
          className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[#212121] transition-colors cursor-pointer"
          title="New chat"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
