import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Cpu, 
  Database, 
  Key, 
  Check, 
  RefreshCw, 
  Save, 
  AlertCircle,
  Eye,
  ToggleLeft,
  ToggleRight,
  Layers,
  Star,
  Trash2,
  Plus,
  Edit3
} from 'lucide-react';

export default function SettingsPanel({ onConfigUpdated }) {
  const [activeTab, setActiveTab] = useState('models'); // 'models', 'cards', 'multimedia', 'embeddings', 'env'
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  // Settings state
  const [form, setForm] = useState({
    provider: 'grok',
    openaiApiKey: '',
    openaiBaseUrl: '',
    openaiModel: '',
    ollamaUrl: 'http://localhost:11434',
    ollamaModel: '',
    grokApiKey: '',
    grokBaseUrl: '',
    grokModel: '',
    useMultimediaModel: false,
    multimediaProvider: 'ollama',
    multimediaModel: '',
    multimediaApiKey: '',
    multimediaBaseUrl: '',
    embeddingProvider: 'ollama',
    embeddingApiKey: '',
    embeddingBaseUrl: '',
    openaiEmbeddingModel: '',
    ollamaEmbeddingModel: ''
  });

  const [availableModels, setAvailableModels] = useState([]);
  const [multimediaModels, setMultimediaModels] = useState([]);
  const [fetchingModels, setFetchingModels] = useState(false);

  // Action Cards state
  const [actionCards, setActionCards] = useState([]);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [newCardPrompt, setNewCardPrompt] = useState('');

  // Env state
  const [envContent, setEnvContent] = useState('');
  const [envLoading, setEnvLoading] = useState(false);

  useEffect(() => {
    fetchConfig();
    fetchActionCards();
  }, []);

  useEffect(() => {
    fetchModelsForProvider(form.provider, false);
  }, [form.provider]);

  useEffect(() => {
    if (form.useMultimediaModel) {
      fetchModelsForProvider(form.multimediaProvider, true);
    }
  }, [form.multimediaProvider, form.useMultimediaModel]);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/config');
      const data = await res.json();
      if (data.success && data.settings) {
        setForm(prev => ({
          ...prev,
          provider: data.provider || 'grok',
          ...data.settings
        }));
      }
    } catch (e) {
      console.error('Failed to fetch config:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchActionCards = async () => {
    try {
      const res = await fetch('/api/prebuilt-forms');
      const data = await res.json();
      if (data.success && Array.isArray(data.forms)) setActionCards(data.forms);
    } catch (e) {}
  };

  const [editingCardId, setEditingCardId] = useState(null);

  const handleCreateOrUpdateActionCard = async (e) => {
    e.preventDefault();
    if (!newCardTitle.trim() || !newCardPrompt.trim()) return;
    try {
      const isEdit = Boolean(editingCardId);
      const url = isEdit ? `/api/prebuilt-forms/${editingCardId}` : '/api/prebuilt-forms';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newCardTitle, promptTemplate: newCardPrompt, prompt: newCardPrompt, category: 'General' })
      });
      const data = await res.json();
      if (data.success) {
        setNewCardTitle('');
        setNewCardPrompt('');
        setEditingCardId(null);
        fetchActionCards();
      }
    } catch (e) {}
  };

  const handleStartEditCard = (card) => {
    const id = card._id || card.id;
    setEditingCardId(id);
    setNewCardTitle(card.title || '');
    setNewCardPrompt(card.promptTemplate || card.prompt || '');
  };

  const handleDeleteCard = async (id) => {
    try {
      const res = await fetch(`/api/prebuilt-forms/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) fetchActionCards();
    } catch (e) {}
  };

  const fetchModelsForProvider = async (targetProvider, isMultimedia = false) => {
    try {
      setFetchingModels(true);
      const res = await fetch(`/api/models?provider=${targetProvider}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.models)) {
        if (isMultimedia) setMultimediaModels(data.models);
        else setAvailableModels(data.models);
      }
    } catch (e) {
      if (isMultimedia) setMultimediaModels([]);
      else setAvailableModels([]);
    } finally {
      setFetchingModels(false);
    }
  };

  const handleSaveConfig = async () => {
    try {
      setLoading(true);
      setMsg('');
      setErr('');
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (data.success) {
        setMsg('Configuration saved successfully!');
        setTimeout(() => setMsg(''), 3000);
        if (onConfigUpdated) onConfigUpdated(data.config);
      } else {
        setErr(data.error || 'Failed to update configuration');
      }
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchEnv = async () => {
    try {
      setEnvLoading(true);
      const res = await fetch('/api/env');
      const data = await res.json();
      if (data.content) setEnvContent(data.content);
    } catch (e) {} finally { setEnvLoading(false); }
  };

  const handleSaveEnv = async () => {
    try {
      setEnvLoading(true);
      const res = await fetch('/api/env', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: envContent })
      });
      const data = await res.json();
      if (data.success) {
        setMsg('System .env updated!');
        setTimeout(() => setMsg(''), 3000);
      }
    } catch (e) {
      setErr('Failed to save environment file');
    } finally {
      setEnvLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans text-slate-100 pb-12">
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b border-[#262626] pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center space-x-2">
            <Settings className="w-5 h-5 text-white" />
            <span>Settings & Control Panel</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">Configure LLM models, action cards, vision models, and system environment</p>
        </div>

        <button
          onClick={handleSaveConfig}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-white text-black font-semibold text-xs flex items-center space-x-2 shadow hover:bg-slate-200 transition-all cursor-pointer"
        >
          <Save className="w-4 h-4" />
          <span>Save Settings</span>
        </button>
      </div>

      {msg && <div className="p-3 rounded-xl bg-[#212121] border border-[#2a2a2a] text-white text-xs flex items-center"><Check className="w-4 h-4 mr-2" /> {msg}</div>}
      {err && <div className="p-3 rounded-xl bg-[#212121] border border-[#2a2a2a] text-slate-300 text-xs flex items-center"><AlertCircle className="w-4 h-4 mr-2" /> {err}</div>}

      {/* Tabs Header */}
      <div className="flex space-x-2 border-b border-[#262626] pb-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('models')}
          className={`px-4 py-2 rounded-xl text-xs font-medium flex items-center space-x-2 transition-all cursor-pointer ${
            activeTab === 'models' ? 'bg-white text-black font-semibold shadow' : 'text-slate-400 hover:text-white hover:bg-[#212121]'
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>LLM Models</span>
        </button>

        <button
          onClick={() => setActiveTab('cards')}
          className={`px-4 py-2 rounded-xl text-xs font-medium flex items-center space-x-2 transition-all cursor-pointer ${
            activeTab === 'cards' ? 'bg-white text-black font-semibold shadow' : 'text-slate-400 hover:text-white hover:bg-[#212121]'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Action Cards</span>
        </button>

        <button
          onClick={() => setActiveTab('multimedia')}
          className={`px-4 py-2 rounded-xl text-xs font-medium flex items-center space-x-2 transition-all cursor-pointer ${
            activeTab === 'multimedia' ? 'bg-white text-black font-semibold shadow' : 'text-slate-400 hover:text-white hover:bg-[#212121]'
          }`}
        >
          <Eye className="w-4 h-4" />
          <span>Vision & Multimedia</span>
        </button>

        <button
          onClick={() => setActiveTab('embeddings')}
          className={`px-4 py-2 rounded-xl text-xs font-medium flex items-center space-x-2 transition-all cursor-pointer ${
            activeTab === 'embeddings' ? 'bg-white text-black font-semibold shadow' : 'text-slate-400 hover:text-white hover:bg-[#212121]'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Embeddings</span>
        </button>

        <button
          onClick={() => { setActiveTab('env'); fetchEnv(); }}
          className={`px-4 py-2 rounded-xl text-xs font-medium flex items-center space-x-2 transition-all cursor-pointer ${
            activeTab === 'env' ? 'bg-white text-black font-semibold shadow' : 'text-slate-400 hover:text-white hover:bg-[#212121]'
          }`}
        >
          <Key className="w-4 h-4" />
          <span>Environment (.env)</span>
        </button>
      </div>

      {/* Tab 1: Primary LLM Models */}
      {activeTab === 'models' && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-[#141414] border border-[#2a2a2a] space-y-4">
            <h3 className="text-sm font-semibold text-white">Primary LLM Provider</h3>

            <div className="grid grid-cols-3 gap-3">
              {['grok', 'openai', 'ollama'].map((p) => (
                <div
                  key={p}
                  onClick={() => setForm({ ...form, provider: p })}
                  className={`p-4 rounded-xl border cursor-pointer transition-all text-center ${
                    form.provider === p ? 'bg-[#212121] border-white text-white font-semibold' : 'bg-[#1c1c1c] border-[#2a2a2a] text-slate-400 hover:bg-[#212121]'
                  }`}
                >
                  <div className="text-xs font-bold uppercase font-mono">{p}</div>
                  <div className="text-[10px] mt-1 text-slate-400">
                    {p === 'grok' ? 'Groq / Grok API' : p === 'openai' ? 'OpenAI / Compatible' : 'Local Ollama'}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-[#262626] space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-300">Active Running Model</label>
                <button
                  type="button"
                  onClick={() => fetchModelsForProvider(form.provider, false)}
                  className="text-[11px] text-slate-300 hover:text-white hover:underline flex items-center cursor-pointer font-mono"
                >
                  <RefreshCw className={`w-3 h-3 mr-1 ${fetchingModels ? 'animate-spin' : ''}`} /> Refresh Models
                </button>
              </div>

              {availableModels.length > 0 ? (
                <select
                  value={form.provider === 'openai' ? form.openaiModel : form.provider === 'grok' ? form.grokModel : form.ollamaModel}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (form.provider === 'openai') setForm({ ...form, openaiModel: val });
                    if (form.provider === 'grok') setForm({ ...form, grokModel: val });
                    if (form.provider === 'ollama') setForm({ ...form, ollamaModel: val });
                  }}
                  className="w-full p-2.5 rounded-xl bg-[#0c0c0c] border border-[#262626] text-xs font-mono text-slate-100 focus:outline-none"
                >
                  {availableModels.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder="Enter model name..."
                  value={form.provider === 'openai' ? form.openaiModel : form.provider === 'grok' ? form.grokModel : form.ollamaModel}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (form.provider === 'openai') setForm({ ...form, openaiModel: val });
                    if (form.provider === 'grok') setForm({ ...form, grokModel: val });
                    if (form.provider === 'ollama') setForm({ ...form, ollamaModel: val });
                  }}
                  className="w-full p-2.5 rounded-xl bg-[#0c0c0c] border border-[#262626] text-xs font-mono text-slate-100 focus:outline-none"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Action Cards Manager */}
      {activeTab === 'cards' && (
        <div className="space-y-4">
          <form onSubmit={handleCreateOrUpdateActionCard} className="p-5 rounded-2xl bg-[#141414] border border-[#2a2a2a] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">
                {editingCardId ? 'Edit Action Card' : 'Create New Action Card'}
              </h3>
              {editingCardId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingCardId(null);
                    setNewCardTitle('');
                    setNewCardPrompt('');
                  }}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                required
                placeholder="Card Title (e.g. Code Reviewer)"
                value={newCardTitle}
                onChange={(e) => setNewCardTitle(e.target.value)}
                className="p-2.5 rounded-xl bg-[#0c0c0c] border border-[#262626] text-xs text-slate-100"
              />
              <input
                type="text"
                required
                placeholder="Prompt Template..."
                value={newCardPrompt}
                onChange={(e) => setNewCardPrompt(e.target.value)}
                className="p-2.5 rounded-xl bg-[#0c0c0c] border border-[#262626] text-xs text-slate-100"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-white text-black font-semibold text-xs hover:bg-slate-200 shadow cursor-pointer"
              >
                {editingCardId ? 'Update Action Card' : 'Add Action Card'}
              </button>
            </div>
          </form>

          <div className="p-5 rounded-2xl bg-[#141414] border border-[#2a2a2a] space-y-3">
            <h3 className="text-sm font-semibold text-white">Configured Action Cards ({actionCards.length})</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {actionCards.map((card) => {
                const id = card._id || card.id;
                return (
                  <div key={id} className="p-3.5 rounded-xl bg-[#1c1c1c] border border-[#2a2a2a] flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-white">{card.title}</div>
                      <div className="text-[11px] text-slate-400 line-clamp-1">{card.promptTemplate || card.prompt || card.description}</div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleStartEditCard(card)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#262626] cursor-pointer"
                        title="Edit Card"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteCard(id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#262626] cursor-pointer"
                        title="Delete Card"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Vision & Multimedia Settings */}
      {activeTab === 'multimedia' && (
        <div className="p-5 rounded-2xl bg-[#141414] border border-[#2a2a2a] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Dedicated Vision & Multimedia Model</h3>
              <p className="text-xs text-slate-400">Use a specialized model for processing images and keyframe extractions</p>
            </div>

            <button
              onClick={() => setForm({ ...form, useMultimediaModel: !form.useMultimediaModel })}
              className="flex items-center space-x-2 text-xs font-semibold cursor-pointer"
            >
              {form.useMultimediaModel ? (
                <ToggleRight className="w-8 h-8 text-white" />
              ) : (
                <ToggleLeft className="w-8 h-8 text-slate-600" />
              )}
            </button>
          </div>

          {form.useMultimediaModel && (
            <div className="space-y-4 pt-3 border-t border-[#262626]">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Multimedia Provider</label>
                <select
                  value={form.multimediaProvider}
                  onChange={(e) => setForm({ ...form, multimediaProvider: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-[#0c0c0c] border border-[#262626] text-xs font-mono text-slate-100"
                >
                  <option value="ollama">Local Ollama Vision (llava / qwen-vl)</option>
                  <option value="openai">OpenAI Vision (gpt-4o / gpt-4-turbo)</option>
                  <option value="grok">Grok Vision (grok-2-vision)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Multimedia Model Name</label>
                {multimediaModels.length > 0 ? (
                  <select
                    value={form.multimediaModel}
                    onChange={(e) => setForm({ ...form, multimediaModel: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-[#0c0c0c] border border-[#262626] text-xs font-mono text-slate-100"
                  >
                    {multimediaModels.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="e.g. llava:latest or gpt-4o"
                    value={form.multimediaModel}
                    onChange={(e) => setForm({ ...form, multimediaModel: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-[#0c0c0c] border border-[#262626] text-xs font-mono text-slate-100"
                  />
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Embeddings */}
      {activeTab === 'embeddings' && (
        <div className="p-5 rounded-2xl bg-[#141414] border border-[#2a2a2a] space-y-3">
          <h3 className="text-sm font-semibold text-white">Embedding Provider for RAG</h3>
          <div className="grid grid-cols-2 gap-3">
            <select
              value={form.embeddingProvider}
              onChange={(e) => setForm({ ...form, embeddingProvider: e.target.value })}
              className="p-2.5 rounded-xl bg-[#0c0c0c] border border-[#262626] text-xs font-mono text-slate-200"
            >
              <option value="ollama">Local Ollama Embeddings (nomic-embed-text)</option>
              <option value="openai">OpenAI Text Embeddings (text-embedding-3-small)</option>
            </select>
          </div>
        </div>
      )}

      {/* Tab 5: Environment (.env) */}
      {activeTab === 'env' && (
        <div className="p-5 rounded-2xl bg-[#141414] border border-[#2a2a2a] space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">System Environment Configuration (.env)</h3>
            <button
              onClick={handleSaveEnv}
              disabled={envLoading}
              className="px-3 py-1.5 rounded-xl bg-white text-black font-semibold text-xs hover:bg-slate-200 cursor-pointer"
            >
              Save .env
            </button>
          </div>

          <textarea
            rows={14}
            value={envContent}
            onChange={(e) => setEnvContent(e.target.value)}
            className="w-full p-4 rounded-xl bg-[#0c0c0c] border border-[#262626] text-xs font-mono text-slate-200 focus:outline-none"
          />
        </div>
      )}
    </div>
  );
}
