import React, { useState, useEffect } from 'react';
import { 
  Sliders, 
  Terminal, 
  Database, 
  Cpu, 
  RefreshCw, 
  Save, 
  Trash2, 
  Check, 
  Search,
  Activity,
  Wrench,
  Play,
  Layers,
  Star,
  Globe
} from 'lucide-react';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('cards'); // 'cards', 'prompts', 'mcp', 'rag', 'metrics'

  // Action Cards State
  const [forms, setForms] = useState([]);

  // System Prompts State
  const [promptInput, setPromptInput] = useState('');
  const [promptLoading, setPromptLoading] = useState(false);
  const [promptMsg, setPromptMsg] = useState('');

  // MCP Servers State
  const [mcpConfig, setMcpConfig] = useState({ mcpServers: {} });
  const [mcpTools, setMcpTools] = useState([]);
  const [mcpSearch, setMcpSearch] = useState('');

  // Tool Test State
  const [testToolName, setTestToolName] = useState('');
  const [testToolArgs, setTestToolArgs] = useState('{}');
  const [testToolResult, setTestToolResult] = useState(null);
  const [testingTool, setTestingTool] = useState(false);

  // RAG State
  const [ragQuery, setRagQuery] = useState('');
  const [ragResults, setRagResults] = useState(null);
  const [ragLoading, setRagLoading] = useState(false);

  // Metrics & Google
  const [metrics, setMetrics] = useState(null);
  const [googleStatus, setGoogleStatus] = useState({ connected: false, email: '' });

  useEffect(() => {
    fetchActionCards();
    fetchPrompts();
    fetchMcpData();
    fetchMetrics();
    fetchGoogleStatus();
  }, []);

  const fetchActionCards = async () => {
    try {
      const res = await fetch('/api/prebuilt-forms');
      const data = await res.json();
      if (data.success && Array.isArray(data.forms)) setForms(data.forms);
    } catch (e) {}
  };

  const handleToggleFavorite = async (id) => {
    try {
      const res = await fetch(`/api/prebuilt-forms/${id}/toggle-favorite`, { method: 'POST' });
      const data = await res.json();
      if (data.success) fetchActionCards();
    } catch (e) {}
  };

  const handleDeleteCard = async (id) => {
    try {
      const res = await fetch(`/api/prebuilt-forms/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) fetchActionCards();
    } catch (e) {}
  };

  const fetchPrompts = async () => {
    try {
      const res = await fetch('/api/system-prompt');
      const data = await res.json();
      if (data.success && data.activePrompt) setPromptInput(data.activePrompt.prompt);
    } catch (e) {}
  };

  const handleSavePrompt = async () => {
    if (!promptInput.trim()) return;
    try {
      setPromptLoading(true);
      const res = await fetch('/api/system-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptInput })
      });
      const data = await res.json();
      if (data.success) {
        setPromptMsg('System prompt saved!');
        setTimeout(() => setPromptMsg(''), 3000);
      }
    } catch (e) {} finally { setPromptLoading(false); }
  };

  const fetchMcpData = async () => {
    try {
      const [configRes, toolsRes] = await Promise.all([
        fetch('/api/mcp/config'),
        fetch('/api/tools')
      ]);
      const configData = await configRes.json();
      const toolsData = await toolsRes.json();
      if (configData.success) setMcpConfig(configData.config || { mcpServers: {} });
      if (toolsData.success) setMcpTools(toolsData.tools || []);
    } catch (e) {}
  };

  const handleRunToolTest = async () => {
    if (!testToolName.trim()) return;
    try {
      setTestingTool(true);
      setTestToolResult(null);
      let parsedArgs = {};
      try { parsedArgs = JSON.parse(testToolArgs); } catch (e) {}

      const res = await fetch('/api/tools/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: testToolName, args: parsedArgs })
      });
      const data = await res.json();
      setTestToolResult(data);
    } catch (e) {
      setTestToolResult({ success: false, error: e.message });
    } finally { setTestingTool(false); }
  };

  const fetchGoogleStatus = async () => {
    try {
      const res = await fetch('/api/auth/google/status');
      const data = await res.json();
      if (data.success) setGoogleStatus({ connected: data.connected, email: data.email || '' });
    } catch (e) {}
  };

  const fetchMetrics = async () => {
    try {
      const res = await fetch('/api/metrics');
      const data = await res.json();
      if (data.success) setMetrics(data);
    } catch (e) {}
  };

  const filteredTools = mcpTools.filter(t => 
    (t.name || t.function?.name || '').toLowerCase().includes(mcpSearch.toLowerCase()) ||
    (t.description || t.function?.description || '').toLowerCase().includes(mcpSearch.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6 font-sans text-slate-100 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#262626] pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center space-x-2">
            <Sliders className="w-5 h-5 text-white" />
            <span>Enterprise Systems & Admin Panel</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">Management for action cards, MCP tools, system prompts, Google OAuth, and memory</p>
        </div>

        <button
          onClick={() => { fetchActionCards(); fetchPrompts(); fetchMcpData(); fetchMetrics(); }}
          className="px-3 py-1.5 rounded-xl bg-[#212121] hover:bg-[#2a2a2a] text-xs font-medium flex items-center space-x-1.5 transition-colors border border-white/5 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh All</span>
        </button>
      </div>

      {/* Navigation */}
      <div className="flex space-x-2 border-b border-[#262626] pb-1 overflow-x-auto">
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
          onClick={() => setActiveTab('prompts')}
          className={`px-4 py-2 rounded-xl text-xs font-medium flex items-center space-x-2 transition-all cursor-pointer ${
            activeTab === 'prompts' ? 'bg-white text-black font-semibold shadow' : 'text-slate-400 hover:text-white hover:bg-[#212121]'
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>System Prompts</span>
        </button>

        <button
          onClick={() => setActiveTab('mcp')}
          className={`px-4 py-2 rounded-xl text-xs font-medium flex items-center space-x-2 transition-all cursor-pointer ${
            activeTab === 'mcp' ? 'bg-white text-black font-semibold shadow' : 'text-slate-400 hover:text-white hover:bg-[#212121]'
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>MCP Tools</span>
        </button>

        <button
          onClick={() => setActiveTab('rag')}
          className={`px-4 py-2 rounded-xl text-xs font-medium flex items-center space-x-2 transition-all cursor-pointer ${
            activeTab === 'rag' ? 'bg-white text-black font-semibold shadow' : 'text-slate-400 hover:text-white hover:bg-[#212121]'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>RAG Memory</span>
        </button>

        <button
          onClick={() => setActiveTab('metrics')}
          className={`px-4 py-2 rounded-xl text-xs font-medium flex items-center space-x-2 transition-all cursor-pointer ${
            activeTab === 'metrics' ? 'bg-white text-black font-semibold shadow' : 'text-slate-400 hover:text-white hover:bg-[#212121]'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Metrics & Integrations</span>
        </button>
      </div>

      {/* Tab 1: Cards */}
      {activeTab === 'cards' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Configured Action Cards ({forms.length})</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {forms.map((form) => {
              const id = form._id || form.id;
              return (
                <div key={id} className="p-4 rounded-2xl bg-[#141414] border border-[#2a2a2a] flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-xs text-white">{form.title}</span>
                      {form.isFavorite && <Star className="w-3.5 h-3.5 text-white fill-current" />}
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-1">{form.description || form.promptTemplate}</p>
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleToggleFavorite(id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#212121]"
                    >
                      <Star className={`w-3.5 h-3.5 ${form.isFavorite ? 'text-white fill-current' : ''}`} />
                    </button>
                    <button
                      onClick={() => handleDeleteCard(id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#212121]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 2: System Prompts */}
      {activeTab === 'prompts' && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-[#141414] border border-[#2a2a2a] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Active System Prompt</h3>
              {promptMsg && <span className="text-xs text-white flex items-center"><Check className="w-3.5 h-3.5 mr-1" /> {promptMsg}</span>}
            </div>

            <textarea
              rows={12}
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              className="w-full p-4 rounded-xl bg-[#0c0c0c] border border-[#262626] text-xs font-mono text-slate-200 focus:outline-none focus:border-[#555555] leading-relaxed"
            />

            <div className="flex justify-end">
              <button
                onClick={handleSavePrompt}
                disabled={promptLoading}
                className="px-4 py-2 rounded-xl bg-white text-black hover:bg-slate-200 font-semibold text-xs flex items-center space-x-2 shadow transition-all cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Save Prompt</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: MCP Tools & Sandbox */}
      {activeTab === 'mcp' && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-[#141414] border border-[#2a2a2a] space-y-3">
            <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
              <Wrench className="w-4 h-4 text-white" />
              <span>Direct Tool Execution Sandbox</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Select Tool</label>
                <select
                  value={testToolName}
                  onChange={(e) => setTestToolName(e.target.value)}
                  className="w-full p-2 rounded-xl bg-[#0c0c0c] border border-[#262626] text-xs font-mono text-slate-200"
                >
                  <option value="">Select a tool to test...</option>
                  {mcpTools.map((t, idx) => {
                    const name = t.name || t.function?.name;
                    return <option key={idx} value={name}>{name}</option>;
                  })}
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">JSON Arguments</label>
                <input
                  type="text"
                  value={testToolArgs}
                  onChange={(e) => setTestToolArgs(e.target.value)}
                  className="w-full p-2 rounded-xl bg-[#0c0c0c] border border-[#262626] text-xs font-mono text-slate-200"
                  placeholder='{"query": "test"}'
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleRunToolTest}
                disabled={testingTool || !testToolName}
                className="px-4 py-2 rounded-xl bg-white text-black font-semibold text-xs hover:bg-slate-200 shadow flex items-center space-x-1.5 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-black" />
                <span>Test Tool Call</span>
              </button>
            </div>

            {testToolResult && (
              <pre className="p-3 rounded-xl bg-[#0c0c0c] border border-[#262626] text-xs font-mono text-slate-200 max-h-60 overflow-y-auto">
                {JSON.stringify(testToolResult, null, 2)}
              </pre>
            )}
          </div>

          <div className="p-5 rounded-2xl bg-[#141414] border border-[#2a2a2a] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Registered MCP Tools ({mcpTools.length})</h3>
              </div>

              <div className="relative w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search tools..."
                  value={mcpSearch}
                  onChange={(e) => setMcpSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#0c0c0c] border border-[#262626] text-xs text-slate-200 focus:outline-none placeholder-slate-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
              {filteredTools.map((tool, idx) => {
                const name = tool.name || tool.function?.name;
                const desc = tool.description || tool.function?.description;
                return (
                  <div key={idx} className="p-3 rounded-xl bg-[#1c1c1c] border border-[#2a2a2a]">
                    <div className="font-mono font-semibold text-xs text-white">{name}</div>
                    <div className="text-[11px] text-slate-400 mt-1 line-clamp-2">{desc}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: RAG Memory */}
      {activeTab === 'rag' && (
        <div className="p-5 rounded-2xl bg-[#141414] border border-[#2a2a2a] space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-white">RAG Memory Search</h3>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="text"
              placeholder="Search vector database..."
              value={ragQuery}
              onChange={(e) => setRagQuery(e.target.value)}
              className="flex-1 px-4 py-2 rounded-xl bg-[#0c0c0c] border border-[#262626] text-xs text-slate-200 focus:outline-none"
            />
            <button
              onClick={async () => {
                if (!ragQuery.trim()) return;
                setRagLoading(true);
                try {
                  const res = await fetch(`/api/personal-db/search?query=${encodeURIComponent(ragQuery)}`);
                  const data = await res.json();
                  setRagResults(data);
                } catch (e) {} finally { setRagLoading(false); }
              }}
              disabled={ragLoading}
              className="px-4 py-2 rounded-xl bg-white text-black font-semibold text-xs hover:bg-slate-200 cursor-pointer"
            >
              Search
            </button>
          </div>

          {ragResults && (
            <pre className="p-4 rounded-xl bg-[#0c0c0c] border border-[#262626] overflow-x-auto text-xs font-mono text-slate-300 max-h-80">
              {JSON.stringify(ragResults, null, 2)}
            </pre>
          )}
        </div>
      )}

      {/* Tab 5: Metrics & Integrations */}
      {activeTab === 'metrics' && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-[#141414] border border-[#2a2a2a] flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-[#212121] text-white">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-white">Google Integration</h4>
                <p className="text-[11px] text-slate-400">{googleStatus.connected ? `Connected: ${googleStatus.email}` : 'Not connected'}</p>
              </div>
            </div>

            {googleStatus.connected ? (
              <button
                onClick={async () => {
                  await fetch('/api/auth/google/disconnect', { method: 'POST' });
                  fetchGoogleStatus();
                }}
                className="px-3 py-1.5 rounded-xl bg-[#212121] text-slate-300 border border-[#2a2a2a] text-xs font-medium hover:text-white cursor-pointer"
              >
                Disconnect
              </button>
            ) : (
              <a
                href="/api/auth/google/url"
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-xl bg-white text-black font-semibold text-xs hover:bg-slate-200 cursor-pointer"
              >
                Connect Google
              </a>
            )}
          </div>

          {metrics && (
            <div className="p-5 rounded-2xl bg-[#141414] border border-[#2a2a2a] space-y-3">
              <h3 className="text-sm font-semibold text-white">Metrics Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-4 rounded-xl bg-[#1c1c1c] border border-[#2a2a2a] text-center">
                  <div className="text-[10px] uppercase text-slate-500 font-semibold font-mono">Total Requests</div>
                  <div className="text-lg font-bold font-mono text-white mt-1">{metrics.aggregates?.totalRequests || 0}</div>
                </div>
                <div className="p-4 rounded-xl bg-[#1c1c1c] border border-[#2a2a2a] text-center">
                  <div className="text-[10px] uppercase text-slate-500 font-semibold font-mono">Success Rate</div>
                  <div className="text-lg font-bold font-mono text-white mt-1">
                    {metrics.aggregates?.totalRequests ? Math.round((metrics.aggregates.successfulRequests / metrics.aggregates.totalRequests) * 100) : 100}%
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-[#1c1c1c] border border-[#2a2a2a] text-center">
                  <div className="text-[10px] uppercase text-slate-500 font-semibold font-mono">Avg Latency</div>
                  <div className="text-lg font-bold font-mono text-white mt-1">{Math.round(metrics.aggregates?.averageTotalDuration || 0)} ms</div>
                </div>
                <div className="p-4 rounded-xl bg-[#1c1c1c] border border-[#2a2a2a] text-center">
                  <div className="text-[10px] uppercase text-slate-500 font-semibold font-mono">Retrieval Avg</div>
                  <div className="text-lg font-bold font-mono text-white mt-1">{Math.round(metrics.aggregates?.averageRetrievalTime || 0)} ms</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
