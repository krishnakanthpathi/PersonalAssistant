import React from 'react';
import { 
  Save, 
  AlertCircle, 
  CheckCircle, 
  Sparkles,
  Link2,
  Settings,
  Palette
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
  codeThemes = []
}) {
  return (
    <div className="flex flex-col h-full overflow-y-auto p-6">
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
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
                    <label className="block text-gray-400 mb-1 text-[10px]">Model Name</label>
                    <input type="text" placeholder="gpt-4o" value={settingsForm.openaiModel}
                      onChange={(e) => setSettingsForm(prev => ({ ...prev, openaiModel: e.target.value }))}
                      className="w-full p-2.5 bg-black/40 border border-white/10 rounded-xl outline-none focus:border-accent-blue/50 text-gray-200" />
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
                    <label className="block text-gray-400 mb-1 text-[10px]">Model Name</label>
                    <input type="text" placeholder="llama3.1" value={settingsForm.ollamaModel}
                      onChange={(e) => setSettingsForm(prev => ({ ...prev, ollamaModel: e.target.value }))}
                      className="w-full p-2.5 bg-black/40 border border-white/10 rounded-xl outline-none focus:border-accent-blue/50 text-gray-200" />
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
                    <label className="block text-gray-400 mb-1 text-[10px]">Grok API Key</label>
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
                    <label className="block text-gray-400 mb-1 text-[10px]">Model Name</label>
                    <input type="text" placeholder="grok-2-1218" value={settingsForm.grokModel}
                      onChange={(e) => setSettingsForm(prev => ({ ...prev, grokModel: e.target.value }))}
                      className="w-full p-2.5 bg-black/40 border border-white/10 rounded-xl outline-none focus:border-accent-blue/50 text-gray-200" />
                  </div>
                </div>
              </div>

            </div>

            {/* RAG Embeddings Warning */}
            <div className="bg-white/5 border border-white/5 rounded-2xl p-4 text-[11px] text-gray-400 leading-relaxed">
              <strong className="text-yellow-400/90 block mb-1">RAG Embeddings Note:</strong>
              Since Grok does not natively generate embeddings, when using Grok or OpenAI as the LLM provider:
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>The system will automatically use the OpenAI embeddings API if a valid <strong>OpenAI API Key</strong> is provided.</li>
                <li>If no OpenAI API key is present, it will fallback to Ollama to generate embeddings locally.</li>
              </ul>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
              <button
                type="submit"
                disabled={isSavingSettings}
                className="flex items-center gap-1.5 px-4 py-2 bg-accent-blue text-white rounded-xl text-xs font-semibold hover:bg-accent-blue/80 transition-all disabled:opacity-50 shadow-glow"
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
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all duration-200 ${
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
                    className="w-full mt-2 py-1.5 px-2 border border-red-500/20 hover:border-red-500 text-[11px] font-semibold text-red-400 hover:text-red-300 rounded-lg hover:bg-red-500/5 transition-all text-center"
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
                    className="w-full py-1.5 px-3 bg-accent-gradient hover:opacity-90 text-[11px] font-semibold text-white rounded-lg transition-all text-center flex items-center justify-center gap-1.5"
                  >
                    <Sparkles size={12} /> Connect Account
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
