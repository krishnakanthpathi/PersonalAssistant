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
  Globe,
  Clock,
  Zap,
  AlertCircle
} from 'lucide-react';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('prompts'); // 'prompts', 'mcp', 'rag', 'metrics'

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
  const [metricsLimit, setMetricsLimit] = useState(20);
  const [googleStatus, setGoogleStatus] = useState({ connected: false, email: '' });

  useEffect(() => {
    fetchPrompts();
    fetchMcpData();
    fetchMetrics(metricsLimit);
    fetchGoogleStatus();
  }, []);

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
        setPromptMsg('System prompt updated successfully.');
        setTimeout(() => setPromptMsg(''), 3000);
      }
    } catch (e) {
      setPromptMsg('Failed to update system prompt.');
    } finally {
      setPromptLoading(false);
    }
  };

  const fetchMcpData = async () => {
    try {
      const resConfig = await fetch('/api/mcp/config');
      const dataConfig = await resConfig.json();
      if (dataConfig.success && dataConfig.config) setMcpConfig(dataConfig.config);

      const resTools = await fetch('/api/tools');
      const dataTools = await resTools.json();
      if (dataTools.success && Array.isArray(dataTools.tools)) setMcpTools(dataTools.tools);
    } catch (e) {}
  };

  const handleRunToolTest = async () => {
    if (!testToolName.trim()) return;
    try {
      setTestingTool(true);
      setTestToolResult(null);
      let parsedArgs = {};
      try {
        parsedArgs = JSON.parse(testToolArgs);
      } catch (err) {
        setTestToolResult({ error: 'Invalid JSON arguments format.' });
        setTestingTool(false);
        return;
      }

      const res = await fetch('/api/tools/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toolName: testToolName, args: parsedArgs })
      });
      const data = await res.json();
      setTestToolResult(data);
    } catch (err) {
      setTestToolResult({ error: err.message });
    } finally {
      setTestingTool(false);
    }
  };

  const handleRunRagTest = async () => {
    if (!ragQuery.trim()) return;
    try {
      setRagLoading(true);
      const res = await fetch(`/api/okf/test-retrieval?query=${encodeURIComponent(ragQuery)}`);
      const data = await res.json();
      setRagResults(data);
    } catch (e) {} finally {
      setRagLoading(false);
    }
  };

  const fetchGoogleStatus = async () => {
    try {
      const res = await fetch('/api/auth/google/status');
      const data = await res.json();
      if (data.success) setGoogleStatus(data);
    } catch (e) {}
  };

  const fetchMetrics = async (overrideLimit) => {
    try {
      const l = overrideLimit || metricsLimit;
      const res = await fetch(`/api/metrics?limit=${l}`);
      const data = await res.json();
      if (data.success && data.metrics) setMetrics(data.metrics);
    } catch (e) {}
  };

  const handleClearMetrics = async () => {
    if (!window.confirm('Are you sure you want to clear telemetry logs?')) return;
    try {
      await fetch('/api/metrics', { method: 'DELETE' });
      fetchMetrics(metricsLimit);
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
          <p className="text-xs text-slate-400 mt-1">Management for MCP tools, system prompts, Google OAuth, memory, and telemetry</p>
        </div>

        <button
          onClick={() => { fetchPrompts(); fetchMcpData(); fetchMetrics(); }}
          className="px-3 py-1.5 rounded-xl bg-[#212121] hover:bg-[#2a2a2a] text-xs font-medium flex items-center space-x-1.5 transition-colors border border-white/5 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh All</span>
        </button>
      </div>

      {/* Navigation */}
      <div className="flex space-x-2 border-b border-[#262626] pb-1 overflow-x-auto">
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
          <span>MCP Tools Sandbox</span>
        </button>

        <button
          onClick={() => setActiveTab('rag')}
          className={`px-4 py-2 rounded-xl text-xs font-medium flex items-center space-x-2 transition-all cursor-pointer ${
            activeTab === 'rag' ? 'bg-white text-black font-semibold shadow' : 'text-slate-400 hover:text-white hover:bg-[#212121]'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>OKF RAG Search</span>
        </button>

        <button
          onClick={() => setActiveTab('metrics')}
          className={`px-4 py-2 rounded-xl text-xs font-medium flex items-center space-x-2 transition-all cursor-pointer ${
            activeTab === 'metrics' ? 'bg-white text-black font-semibold shadow' : 'text-slate-400 hover:text-white hover:bg-[#212121]'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Metrics & Telemetry</span>
        </button>
      </div>

      {/* Tab 1: System Prompt Manager */}
      {activeTab === 'prompts' && (
        <div className="p-5 rounded-2xl bg-[#141414] border border-[#2a2a2a] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Active System Prompt</h3>
              <p className="text-xs text-slate-400">Master directive prompt passed to LLM reasoning engine</p>
            </div>

            <button
              onClick={handleSavePrompt}
              disabled={promptLoading}
              className="px-4 py-2 rounded-xl bg-white text-black font-semibold text-xs hover:bg-slate-200 shadow flex items-center space-x-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save System Prompt</span>
            </button>
          </div>

          {promptMsg && (
            <div className="p-3 rounded-xl bg-[#212121] border border-white/10 text-xs font-medium text-white">
              {promptMsg}
            </div>
          )}

          <textarea
            rows={14}
            value={promptInput}
            onChange={(e) => setPromptInput(e.target.value)}
            className="w-full p-4 rounded-xl bg-[#0c0c0c] border border-[#262626] text-xs font-mono text-slate-200 focus:outline-none focus:border-white leading-relaxed"
          />
        </div>
      )}

      {/* Tab 2: MCP Tools Sandbox */}
      {activeTab === 'mcp' && (
        <div className="space-y-6">
          {/* Direct Tool Execution Tester */}
          <div className="p-5 rounded-2xl bg-[#141414] border border-[#2a2a2a] space-y-4">
            <div className="flex items-center space-x-2">
              <Wrench className="w-4 h-4 text-white" />
              <h3 className="text-sm font-semibold text-white">Direct MCP Tool Execution Sandbox</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Select Registered Tool</label>
                <select
                  value={testToolName}
                  onChange={(e) => setTestToolName(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#0c0c0c] border border-[#262626] text-xs font-mono text-slate-100"
                >
                  <option value="">Select tool...</option>
                  {mcpTools.map((t, idx) => {
                    const name = t.name || t.function?.name;
                    return <option key={idx} value={name}>{name}</option>;
                  })}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">JSON Arguments</label>
                <input
                  type="text"
                  value={testToolArgs}
                  onChange={(e) => setTestToolArgs(e.target.value)}
                  placeholder='{"query": "test"}'
                  className="w-full p-2.5 rounded-xl bg-[#0c0c0c] border border-[#262626] text-xs font-mono text-slate-100"
                />
              </div>
            </div>

            <button
              onClick={handleRunToolTest}
              disabled={testingTool || !testToolName}
              className="px-4 py-2 rounded-xl bg-white text-black font-semibold text-xs hover:bg-slate-200 shadow flex items-center space-x-1.5 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-black" />
              <span>Execute Tool</span>
            </button>

            {testToolResult && (
              <pre className="p-3 rounded-xl bg-[#0c0c0c] border border-[#262626] overflow-x-auto text-xs font-mono text-slate-300 max-h-60">
                {JSON.stringify(testToolResult, null, 2)}
              </pre>
            )}
          </div>

          {/* Registered Tools Catalog List */}
          <div className="p-5 rounded-2xl bg-[#141414] border border-[#2a2a2a] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Registered Tools Catalog ({filteredTools.length})</h3>
              <div className="relative w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Filter tool by name..."
                  value={mcpSearch}
                  onChange={(e) => setMcpSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#0c0c0c] border border-[#262626] text-xs text-slate-200"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
              {filteredTools.map((tool, idx) => {
                const name = tool.name || tool.function?.name;
                const desc = tool.description || tool.function?.description;
                return (
                  <div key={idx} className="p-3.5 rounded-xl bg-[#1c1c1c] border border-[#2a2a2a] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold font-mono text-white">{name}</span>
                      {tool.serverName && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#262626] text-slate-300 border border-white/5">
                          {tool.serverName}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-2">{desc || 'No description available.'}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: OKF RAG Tester */}
      {activeTab === 'rag' && (
        <div className="p-5 rounded-2xl bg-[#141414] border border-[#2a2a2a] space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Open Knowledge Format (OKF) Memory Retrieval Test</h3>
            <p className="text-xs text-slate-400">Test keyword and semantic matching against loaded catalog documents</p>
          </div>

          <div className="flex space-x-2">
            <input
              type="text"
              placeholder="Enter search query (e.g. gmail, notion, ssh terminal)..."
              value={ragQuery}
              onChange={(e) => setRagQuery(e.target.value)}
              className="flex-1 p-2.5 rounded-xl bg-[#0c0c0c] border border-[#262626] text-xs text-slate-100"
            />
            <button
              onClick={handleRunRagTest}
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

      {/* Tab 4: Metrics & Telemetry */}
      {activeTab === 'metrics' && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-[#141414] border border-[#2a2a2a] flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-[#212121] text-white">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-white">Google Workspace Integration</h4>
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

          {/* System Telemetry Statistics */}
          <div className="p-5 rounded-2xl bg-[#141414] border border-[#2a2a2a] space-y-6">
            {/* Header & Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#262626] pb-4">
              <div className="flex items-center space-x-2">
                <Activity className="w-5 h-5 text-white" />
                <div>
                  <h3 className="text-sm font-semibold text-white">System Performance Statistics</h3>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                    Calculated telemetry across {metrics?.totalLogs || 0} request records
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {/* Limit Selector */}
                <div className="flex items-center space-x-1 p-1 rounded-xl bg-[#1f1f1f] border border-[#2a2a2a] text-xs">
                  <span className="px-2 text-[11px] text-slate-400 font-mono">Limit:</span>
                  {[10, 20, 50].map((l) => (
                    <button
                      key={l}
                      onClick={() => {
                        setMetricsLimit(l);
                        fetchMetrics(l);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold font-mono transition-colors cursor-pointer ${
                        metricsLimit === l ? 'bg-[#2a2a2a] text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => fetchMetrics(metricsLimit)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#212121] hover:bg-[#2a2a2a] text-xs text-slate-200 border border-[#2a2a2a] cursor-pointer transition-colors"
                  title="Refresh stats"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                  <span>Refresh</span>
                </button>

                <button
                  onClick={handleClearMetrics}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#212121] hover:bg-red-950/40 text-xs text-red-400 border border-red-900/30 cursor-pointer transition-colors"
                  title="Clear telemetry logs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear Data</span>
                </button>
              </div>
            </div>

            {/* Calculated KPI Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="p-3.5 rounded-xl bg-[#1c1c1c] border border-[#2a2a2a] text-center">
                <div className="text-[10px] uppercase text-slate-500 font-semibold font-mono">Total Requests</div>
                <div className="text-xl font-bold font-mono text-white mt-1">{metrics?.aggregates?.totalRequests || 0}</div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#1c1c1c] border border-[#2a2a2a] text-center">
                <div className="text-[10px] uppercase text-slate-500 font-semibold font-mono">Success Rate</div>
                <div className="text-xl font-bold font-mono text-white mt-1">
                  {metrics?.aggregates?.successRate ?? 100}%
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#1c1c1c] border border-[#2a2a2a] text-center">
                <div className="text-[10px] uppercase text-slate-500 font-semibold font-mono">Avg Latency</div>
                <div className="text-xl font-bold font-mono text-white mt-1">{metrics?.aggregates?.averageTotalDuration || 0} ms</div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#1c1c1c] border border-[#2a2a2a] text-center">
                <div className="text-[10px] uppercase text-slate-500 font-semibold font-mono">RAG Retrieval</div>
                <div className="text-xl font-bold font-mono text-white mt-1">{metrics?.aggregates?.averageRetrievalTime || 0} ms</div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#1c1c1c] border border-[#2a2a2a] text-center">
                <div className="text-[10px] uppercase text-slate-500 font-semibold font-mono">LLM Generation</div>
                <div className="text-xl font-bold font-mono text-white mt-1">{metrics?.aggregates?.averageGenerationTime || 0} ms</div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#1c1c1c] border border-[#2a2a2a] text-center">
                <div className="text-[10px] uppercase text-slate-500 font-semibold font-mono">Tool Call Avg</div>
                <div className="text-xl font-bold font-mono text-white mt-1">{metrics?.aggregates?.averageToolExecutionTime || 0} ms</div>
              </div>
            </div>

            {/* Tool Performance Breakdown Table */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-semibold text-white flex items-center space-x-2">
                  <Wrench className="w-3.5 h-3.5 text-slate-400" />
                  <span>Tool Performance Breakdown</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">
                  {Object.keys(metrics?.aggregates?.tools || {}).length} tools recorded
                </span>
              </div>

              {metrics?.aggregates?.tools && Object.keys(metrics.aggregates.tools).length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-[#2a2a2a] bg-[#171717]">
                  <table className="w-full text-left text-xs border-collapse font-sans">
                    <thead className="bg-[#1f1f1f] text-slate-300 font-mono text-[11px] border-b border-[#2a2a2a]">
                      <tr>
                        <th className="px-4 py-2.5 font-semibold">Tool Name</th>
                        <th className="px-4 py-2.5 font-semibold text-center">Total Calls</th>
                        <th className="px-4 py-2.5 font-semibold text-center">Successes / Failures</th>
                        <th className="px-4 py-2.5 font-semibold text-center">Success Rate</th>
                        <th className="px-4 py-2.5 font-semibold text-right">Avg Latency</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#262626]">
                      {Object.entries(metrics.aggregates.tools).map(([toolName, stats]) => (
                        <tr key={toolName} className="hover:bg-[#1c1c1c] transition-colors">
                          <td className="px-4 py-2.5 font-mono text-white font-medium flex items-center space-x-2">
                            <span className="w-2 h-2 rounded-full bg-white/70" />
                            <span>{toolName}</span>
                          </td>
                          <td className="px-4 py-2.5 font-mono text-center text-slate-300">{stats.calls}</td>
                          <td className="px-4 py-2.5 font-mono text-center text-slate-400">
                            <span className="text-white font-medium">{stats.successes}</span> / <span className="text-slate-500">{stats.failures}</span>
                          </td>
                          <td className="px-4 py-2.5 font-mono text-center">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                              stats.successRate >= 90 ? 'bg-white/10 text-white' : 'bg-red-950/50 text-red-400'
                            }`}>
                              {stats.successRate}%
                            </span>
                          </td>
                          <td className="px-4 py-2.5 font-mono text-right text-slate-200">{stats.averageLatency} ms</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-4 text-center rounded-xl bg-[#171717] border border-[#2a2a2a] text-xs text-slate-500 font-mono">
                  No tool execution statistics logged yet.
                </div>
              )}
            </div>

            {/* Recent Telemetry Request Feed */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-semibold text-white flex items-center space-x-2">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Recent Telemetry Requests</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  Showing {metrics?.requests?.length || 0} of {metrics?.totalLogs || 0}
                </span>
              </div>

              {metrics?.requests && metrics.requests.length > 0 ? (
                <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                  {metrics.requests.map((req) => (
                    <div key={req.id} className="p-3.5 rounded-xl bg-[#171717] border border-[#262626] space-y-2 text-xs">
                      {/* Top Bar */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className={`w-2 h-2 rounded-full ${req.success ? 'bg-emerald-400' : 'bg-red-400'}`} />
                          <span className="font-mono text-[11px] text-slate-400">{req.timestamp ? new Date(req.timestamp).toLocaleTimeString() : ''}</span>
                          <span className="font-mono text-[10px] text-slate-500 bg-[#212121] px-1.5 py-0.5 rounded">{req.id}</span>
                        </div>

                        <div className="flex items-center space-x-2 font-mono text-[11px]">
                          <span className="text-slate-300">Total: <strong className="text-white">{req.totalDuration}ms</strong></span>
                          {req.retrievalTime > 0 && <span className="text-slate-400">• RAG: {req.retrievalTime}ms</span>}
                          {req.generationTime > 0 && <span className="text-slate-400">• LLM: {req.generationTime}ms</span>}
                        </div>
                      </div>

                      {/* Prompt */}
                      {req.prompt && (
                        <div className="text-slate-300 font-sans text-xs bg-[#121212] p-2 rounded-lg border border-[#212121] truncate">
                          "{req.prompt}"
                        </div>
                      )}

                      {/* Tool Executions Badge List */}
                      {req.toolCalls && req.toolCalls.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                          <span className="text-[10px] font-mono text-slate-500 uppercase font-semibold">Tools ({req.toolCalls.length}):</span>
                          {req.toolCalls.map((tc, tcIdx) => (
                            <span 
                              key={tcIdx}
                              className={`px-2 py-0.5 rounded-md text-[10px] font-mono flex items-center space-x-1 border ${
                                tc.success ? 'bg-[#212121] text-slate-200 border-[#2a2a2a]' : 'bg-red-950/40 text-red-300 border-red-900/40'
                              }`}
                            >
                              <span>{tc.name}</span>
                              <span className="text-slate-400">({tc.latency}ms)</span>
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Error details */}
                      {req.error && (
                        <div className="p-2 rounded-lg bg-red-950/30 border border-red-900/40 text-red-300 text-[11px] font-mono flex items-start space-x-2">
                          <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                          <span>{req.error}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center rounded-xl bg-[#171717] border border-[#2a2a2a] text-xs text-slate-500 font-mono">
                  No telemetry requests recorded yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
