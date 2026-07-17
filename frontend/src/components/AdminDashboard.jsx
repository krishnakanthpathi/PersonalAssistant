import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  History,
  ArrowLeft,
  RefreshCw,
  Trash2,
  Volume2,
  FileText,
  Calendar,
  Globe,
  Wrench,
  AlertCircle,
  Activity,
  Cpu,
  Clock,
  CheckCircle2,
  XCircle,
  Sliders,
  Terminal,
  Search,
  Pause,
  Play
} from 'lucide-react';

// Helper to get tool icons dynamically
const getToolIcon = (name) => {
  const lowercase = name.toLowerCase();
  if (lowercase.includes('volume')) return <Volume2 className="w-4 h-4 text-accent-blue" />;
  if (lowercase.includes('notion') || lowercase.includes('file')) return <FileText className="w-4 h-4 text-accent-mono" />;
  if (lowercase.includes('calendar') || lowercase.includes('event')) return <Calendar className="w-4 h-4 text-accent-emerald" />;
  if (lowercase.includes('puppeteer') || lowercase.includes('browser') || lowercase.includes('web')) return <Globe className="w-4 h-4 text-blue-400" />;
  return <Wrench className="w-4 h-4 text-gray-400" />;
};

export default function AdminDashboard() {
  const location = useLocation();
  const navigate = useNavigate();

  const handleBack = () => {
    const previousTab = location.state?.fromTab || 'chat';
    navigate('/', { state: { activeTab: previousTab } });
  };

  const [metrics, setMetrics] = useState({
    requests: [],
    aggregates: {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageTotalDuration: 0,
      averageRetrievalTime: 0,
      averageGenerationTime: 0,
      averageContextProcessingTime: 0,
      totalScreenshots: 0,
      totalAppleScripts: 0,
      tools: {}
    }
  });

  const [tools, setTools] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);
  const [isFetchingTools, setIsFetchingTools] = useState(false);
  const [config, setConfig] = useState({
    provider: 'ollama',
    model: 'loading...',
    port: 3000
  });

  const [activeView, setActiveView] = useState('overview'); // 'overview' or 'logs'
  const [logs, setLogs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [toolsSearchQuery, setToolsSearchQuery] = useState('');
  const [selectedExplorerTool, setSelectedExplorerTool] = useState(null);
  const [useSemanticSearch, setUseSemanticSearch] = useState(true);
  const [semanticResults, setSemanticResults] = useState([]);
  const [isSearchingTools, setIsSearchingTools] = useState(false);

  // Debounced semantic search effect
  useEffect(() => {
    if (!useSemanticSearch || !toolsSearchQuery.trim()) {
      setSemanticResults([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setIsSearchingTools(true);
      try {
        const res = await fetch(`http://localhost:3000/api/tools/search?q=${encodeURIComponent(toolsSearchQuery)}`);
        const data = await res.json();
        if (data.success) {
          // Map backend schema matching OpenAI/Ollama tool call style
          const mappedTools = (data.tools || []).map(t => ({
            name: t.function?.name || t.name,
            description: t.function?.description || t.description,
            function: t.function || t
          }));
          setSemanticResults(mappedTools);
        }
      } catch (error) {
        console.error('Failed to search tools semantically:', error);
      } finally {
        setIsSearchingTools(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [toolsSearchQuery, useSemanticSearch]);

  // Load request from navigation state if present
  useEffect(() => {
    if (location.state?.initialRequest) {
      setSelectedRequest(location.state.initialRequest);
    }
  }, [location.state]);

  const fetchMetrics = async () => {
    setIsLoadingMetrics(true);
    try {
      const res = await fetch('http://localhost:3000/api/metrics');
      const data = await res.json();
      if (data.success) {
        setMetrics(data.metrics);
        if (selectedRequest) {
          const updated = data.metrics.requests.find(r => r.id === selectedRequest.id);
          if (updated) {
            setSelectedRequest(updated);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    } finally {
      setIsLoadingMetrics(false);
    }
  };

  const fetchToolsAndConfig = async () => {
    setIsFetchingTools(true);
    try {
      // Fetch Tools
      const toolsRes = await fetch('http://localhost:3000/api/tools');
      const toolsData = await toolsRes.json();
      if (toolsData.success) {
        setTools(toolsData.tools || []);
      }

      // Fetch Config
      const configRes = await fetch('http://localhost:3000/api/config');
      const configData = await configRes.json();
      if (configData.success) {
        setConfig({
          provider: configData.provider,
          model: configData.model,
          port: configData.port
        });
      }
    } catch (error) {
      console.error('Failed to fetch tools or config:', error);
    } finally {
      setIsFetchingTools(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    fetchToolsAndConfig();
  }, []);

  // Poll metrics every 5 seconds
  useEffect(() => {
    fetchMetrics(); // initial fetch
    const interval = setInterval(() => {
      fetchMetrics();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const consoleContainerRef = React.useRef(null);

  // Live log streaming connection
  useEffect(() => {
    setConnectionStatus('connecting');
    const eventSource = new EventSource('http://localhost:3000/api/logs/stream');

    eventSource.onopen = () => {
      setConnectionStatus('connected');
    };

    eventSource.onmessage = (event) => {
      try {
        const { type, data } = JSON.parse(event.data);
        if (type === 'history') {
          setLogs(data);
        } else if (type === 'log') {
          setIsPaused((paused) => {
            if (paused) return paused;
            setLogs((prev) => {
              const isDuplicate = prev.slice(-25).some(
                (l) => l.timestamp === data.timestamp && l.message === data.message && l.level === data.level
              );
              if (isDuplicate) return prev;
              return [...prev, data].slice(-1000);
            });
            return paused;
          });
        }
      } catch (e) {
        console.error('Error parsing log event:', e);
      }
    };

    eventSource.onerror = (err) => {
      console.error('Log SSE connection failed, retrying...', err);
      setConnectionStatus('disconnected');
    };

    return () => {
      eventSource.close();
      setConnectionStatus('disconnected');
    };
  }, []);

  // Auto-scroll to bottom of console logs
  useEffect(() => {
    if (autoScroll && consoleContainerRef.current) {
      consoleContainerRef.current.scrollTop = consoleContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  // Log filter helpers
  const filteredLogs = logs.filter((log) => {
    const matchesLevel =
      levelFilter === 'all' || log.level?.toLowerCase() === levelFilter.toLowerCase();
    
    const messageStr = typeof log.message === 'string' ? log.message : JSON.stringify(log.message || '');
    const matchesSearch =
      searchQuery === '' ||
      messageStr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.level?.toLowerCase().includes(searchQuery.toLowerCase());
      
    return matchesLevel && matchesSearch;
  });

  const formatTime = (isoString) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch (e) {
      return '00:00:00';
    }
  };

  const getLevelBadgeStyles = (level) => {
    const lvl = level?.toLowerCase();
    if (lvl === 'error') return 'bg-red-500/10 text-red-400 border border-red-500/20';
    if (lvl === 'warn' || lvl === 'warning') return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
    if (lvl === 'info') return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
    if (lvl === 'debug') return 'bg-purple-500/10 text-purple-400 border border-purple-500/20';
    return 'bg-gray-500/10 text-gray-400 border border-gray-500/20';
  };

  const handleClearTelemetry = async () => {
    if (!window.confirm('Are you sure you want to clear all telemetry data?')) return;
    try {
      const res = await fetch('http://localhost:3000/api/metrics', { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchMetrics();
        setSelectedRequest(null);
      }
    } catch (error) {
      console.error('Failed to clear metrics:', error);
    }
  };

  const totalToolCalls = Object.values(metrics.aggregates?.tools || {}).reduce((sum, t) => sum + t.calls, 0);
  const successfulToolCalls = Object.values(metrics.aggregates?.tools || {}).reduce((sum, t) => sum + t.successes, 0);
  const failedToolCalls = Object.values(metrics.aggregates?.tools || {}).reduce((sum, t) => sum + t.failures, 0);

  return (
    <div className="flex flex-col h-screen w-screen bg-bg-primary overflow-hidden text-gray-200 font-sans">
      {/* Header */}
      <header className="flex-shrink-0 h-16 border-b border-border-color bg-bg-secondary/40 backdrop-blur-md px-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-lg text-xs font-semibold text-gray-400 hover:text-white transition"
          >
            <ArrowLeft size={14} /> Back to Chat
          </button>
          <div className="h-4 w-px bg-white/10" />
          <div className="flex items-center gap-2">
            <LayoutDashboard className="w-5 h-5 text-accent-blue" />
            <h1 className="text-lg font-bold bg-accent-gradient bg-clip-text text-transparent">Antigravity Telemetry</h1>
          </div>
        </div>

        {/* Server & Config indicators */}
        <div className="hidden md:flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/5 border border-white/5 rounded-full text-gray-400">
            <Cpu size={12} className="text-accent-mono" />
            <span className="font-semibold">{config.provider.toUpperCase()} : {config.model}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/5 border border-white/5 rounded-full text-gray-400">
            <Activity size={12} className="text-accent-emerald" />
            <span>Port: <span className="font-mono font-bold text-white">{config.port}</span></span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex flex-grow h-[calc(100vh-64px)] overflow-hidden">

        {/* Left Sidebar: Recent Request History List */}
        <aside className="w-80 flex-shrink-0 border-r border-border-color bg-bg-secondary/20 flex flex-col h-full overflow-hidden">
          <div className="p-4 border-b border-border-color bg-bg-secondary/10 flex items-center gap-2">
            <History size={15} className="text-accent-mono" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">Recent Requests ({metrics.requests?.length || 0})</h2>
          </div>

          <div className="flex-grow overflow-y-auto p-3 flex flex-col gap-2">
            {metrics.requests?.length === 0 ? (
              <div className="text-gray-500 text-xs text-center py-8 border border-dashed border-white/5 rounded-xl">
                No history recorded yet.
              </div>
            ) : (
              metrics.requests?.map((req) => {
                const isSelected = selectedRequest?.id === req.id;
                return (
                  <button
                    key={req.id}
                    onClick={() => setSelectedRequest(req)}
                    className={`p-3 text-left rounded-xl transition-all duration-200 border text-xs ${isSelected
                      ? 'bg-accent-blue/10 border-accent-blue/30 text-white font-semibold shadow-glow'
                      : 'bg-white/5 hover:bg-white/10 border-transparent text-gray-400 hover:text-white'
                      }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-[8px] font-bold font-mono px-1.5 py-0.5 rounded-full ${req.success ? 'bg-accent-emerald/10 text-accent-emerald' : 'bg-red-500/10 text-red-400'}`}>
                        {req.success ? 'SUCCESS' : 'FAILED'}
                      </span>
                      <span className="text-[9px] font-mono text-gray-500">
                        {req.totalDuration ? `${(req.totalDuration / 1000).toFixed(1)}s` : 'N/A'}
                      </span>
                    </div>
                    <p className="font-medium truncate mb-1.5 text-gray-200">{req.prompt}</p>
                    <div className="flex items-center justify-between text-[8px] text-gray-500">
                      <span>{new Date(req.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                      {req.toolCalls?.length > 0 && (
                        <span className="font-semibold text-accent-mono bg-accent-mono/5 px-1.5 py-0.5 rounded">
                          {req.toolCalls.length} tool{req.toolCalls.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-grow flex flex-col h-full overflow-y-auto bg-bg-primary/10 p-6">
          {selectedRequest ? (
            /* ================= REQUEST DETAIL VIEW ================= */
            <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full">
              {/* Detail Header */}
              <div className="flex items-center justify-between pb-4 border-b border-border-color">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedRequest(null)}
                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-lg text-xs font-semibold text-gray-300 hover:text-white transition"
                  >
                    ← Back to Aggregates
                  </button>
                  <span className="text-sm font-semibold text-gray-400">Request Diagnostics</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-gray-500 font-mono">
                  <span>ID: {selectedRequest.id}</span>
                  <span>•</span>
                  <span>{new Date(selectedRequest.timestamp).toLocaleString()}</span>
                </div>
              </div>

              {/* Prompt Box */}
              <div className="bg-white/5 border border-white/5 rounded-2xl p-5 shadow-sm">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-2">User Prompt</span>
                <p className="text-sm text-white font-medium select-text font-sans leading-relaxed">{selectedRequest.prompt}</p>
              </div>

              {/* Summary performance metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                  <span className="text-[9px] font-semibold text-gray-500 uppercase block mb-1">Status</span>
                  <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${selectedRequest.success ? 'bg-accent-emerald/10 text-accent-emerald' : 'bg-red-500/10 text-red-400'}`}>
                    {selectedRequest.success ? 'SUCCESS' : 'FAILED'}
                  </span>
                </div>
                <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                  <span className="text-[9px] font-semibold text-gray-500 uppercase block mb-1">Total Duration</span>
                  <span className="font-mono text-sm font-bold text-white">{selectedRequest.totalDuration} ms</span>
                </div>
                <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                  <span className="text-[9px] font-semibold text-gray-500 uppercase block mb-1">RAG Retrieval</span>
                  <span className="font-mono text-sm font-bold text-accent-mono">{selectedRequest.retrievalTime || 0} ms</span>
                </div>
                <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                  <span className="text-[9px] font-semibold text-gray-500 uppercase block mb-1">Tools Executed</span>
                  <span className="font-mono text-sm font-bold text-accent-blue">{selectedRequest.toolCalls?.length || 0} calls</span>
                </div>
              </div>

              {/* Targeted Action Telemetries */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex justify-between items-center text-xs">
                  <span className="text-gray-400">Screenshots:</span>
                  <span className="font-mono font-bold text-white bg-white/5 px-2 py-0.5 rounded">{selectedRequest.screenshotCount || 0}</span>
                </div>
                <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex justify-between items-center text-xs">
                  <span className="text-gray-400">Apple Scripts:</span>
                  <span className="font-mono font-bold text-white bg-white/5 px-2 py-0.5 rounded">{selectedRequest.appleScriptCount || 0}</span>
                </div>
              </div>

              {/* Visual Step Timeline */}
              <div className="flex flex-col gap-3">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Execution Steps & Latency Breakdown</h4>
                {selectedRequest.toolCalls?.length === 0 ? (
                  <div className="text-xs text-gray-500 py-6 bg-white/5 border border-white/5 border-dashed rounded-2xl text-center">
                    No tools were executed during this reasoning run.
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {selectedRequest.toolCalls.map((step, idx) => (
                      <div key={idx} className="bg-bg-secondary/40 border border-white/5 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-start gap-3 flex-grow min-w-0">
                          <span className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-bold text-gray-400 flex-shrink-0 mt-0.5">{idx + 1}</span>
                          <div className="flex-grow min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="font-mono text-xs font-bold text-white">{step.name}</span>
                              <span className={`text-[8px] font-bold font-mono px-1.5 rounded ${step.success ? 'bg-accent-emerald/10 text-accent-emerald' : 'bg-red-500/10 text-red-400'}`}>
                                {step.success ? 'SUCCESS' : 'FAILED'}
                              </span>
                            </div>
                            <span className="text-[10px] text-gray-500 block font-mono mb-2 break-all">Args: {JSON.stringify(step.args)}</span>
                            {step.error && (
                              <span className="text-[10px] text-red-400 block font-mono">Error: {step.error}</span>
                            )}
                            {step.resultSummary && (
                              <div className="text-[10px] text-gray-400 bg-black/20 p-2.5 rounded border border-white/5 font-mono max-h-24 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                                Result: {step.resultSummary}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-row md:flex-col items-end gap-4 md:gap-1.5 shrink-0 border-t md:border-t-0 border-white/5 pt-2 md:pt-0">
                          <div className="text-right">
                            <span className="text-[9px] text-gray-500 block">Tool Execution Latency</span>
                            <span className="font-mono text-xs font-semibold text-white">{step.latency} ms</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[9px] text-gray-500 block">Start from request time</span>
                            <span className="font-mono text-xs font-semibold text-accent-blue">{step.latencyFromRequestStart} ms</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Given Context & Generated Context */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white/5 border border-white/5 rounded-2xl p-5 flex flex-col h-72 overflow-hidden">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-3 flex-shrink-0">RAG Context Given</span>
                  <div className="flex-grow bg-black/20 border border-white/5 rounded-xl p-3 font-mono text-[10px] text-gray-400 overflow-y-auto whitespace-pre-wrap leading-relaxed select-text">
                    {selectedRequest.givenContext || 'No additional context loaded.'}
                  </div>
                </div>
                <div className="bg-white/5 border border-white/5 rounded-2xl p-5 flex flex-col h-72 overflow-hidden">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-3 flex-shrink-0">Assistant Output & Action Logs</span>
                  <div className="flex-grow bg-black/20 border border-white/5 rounded-xl p-3 font-mono text-[10px] text-gray-400 overflow-y-auto whitespace-pre-wrap leading-relaxed select-text">
                    {selectedRequest.generatedContext || 'No assistant logs recorded.'}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ================= METRICS AGGREGATES VIEW ================= */
            <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full flex-grow overflow-hidden">
              {/* Tab Header Selector */}
              <div className="flex border-b border-white/5 pb-0 items-center justify-between flex-shrink-0">
                <div className="flex gap-1">
                  <button
                    onClick={() => { setActiveView('overview'); setSelectedRequest(null); }}
                    className={`flex items-center gap-2 px-5 py-3 text-xs font-semibold border-b-2 transition-all duration-200 cursor-pointer ${
                      activeView === 'overview'
                        ? 'border-accent-blue text-white font-bold'
                        : 'border-transparent text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    <Sliders size={13} />
                    Overview & Telemetry
                  </button>
                  <button
                    onClick={() => { setActiveView('logs'); setSelectedRequest(null); }}
                    className={`flex items-center gap-2 px-5 py-3 text-xs font-semibold border-b-2 transition-all duration-200 cursor-pointer ${
                      activeView === 'logs'
                        ? 'border-accent-blue text-white font-bold'
                        : 'border-transparent text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    <Terminal size={13} />
                    Live Server Logs
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      connectionStatus === 'connected' ? 'bg-accent-emerald animate-pulse' : 'bg-red-500'
                    }`} />
                  </button>
                  <button
                    onClick={() => { setActiveView('tools'); setSelectedRequest(null); }}
                    className={`flex items-center gap-2 px-5 py-3 text-xs font-semibold border-b-2 transition-all duration-200 cursor-pointer ${
                      activeView === 'tools'
                        ? 'border-accent-blue text-white font-bold'
                        : 'border-transparent text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    <Wrench size={13} />
                    Tools Explorer
                  </button>
                </div>
              </div>

              {activeView === 'overview' ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start w-full">
                  {/* Left Column (2/3 width): Aggregate charts and statistics */}
                  <div className="lg:col-span-2 flex flex-col gap-6">
                    <div className="flex items-center justify-between pb-4 border-b border-border-color">
                      <div>
                        <h2 className="text-md font-semibold text-white font-sans">Diagnostics & Performance</h2>
                        <p className="text-xs text-gray-400">Review aggregates, API runtimes, and tool latencies in real time.</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={fetchMetrics}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-lg text-xs font-medium transition cursor-pointer"
                          title="Refresh statistics"
                        >
                          <RefreshCw size={12} className={isLoadingMetrics ? 'animate-spin' : ''} /> Refresh
                        </button>
                        <button
                          onClick={handleClearTelemetry}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 rounded-lg text-xs font-semibold transition cursor-pointer"
                          title="Delete logs history"
                        >
                          <Trash2 size={12} /> Clear Telemetry
                        </button>
                      </div>
                    </div>

                    {/* Summary cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                      {/* Card 1: Total runs & success */}
                      <div className="bg-white/5 border border-white/5 rounded-2xl p-5 shadow-sm">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Agent Requests</span>
                        <div className="flex items-baseline gap-2 mb-2">
                          <span className="text-3xl font-extrabold text-white">{metrics.aggregates?.totalRequests || 0}</span>
                          <span className="text-xs text-gray-500">runs</span>
                        </div>
                        <div className="flex justify-between items-center text-xs border-t border-white/5 pt-2">
                          <span className="text-gray-400">Success Rate:</span>
                          <span className="font-semibold text-accent-emerald">
                            {metrics.aggregates?.totalRequests ? `${((metrics.aggregates.successfulRequests / metrics.aggregates.totalRequests) * 100).toFixed(0)}%` : '0%'}
                          </span>
                        </div>
                      </div>

                      {/* Card 2: Average latencies */}
                      <div className="bg-white/5 border border-white/5 rounded-2xl p-5 shadow-sm">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Average Latency</span>
                        <div className="flex items-baseline gap-2 mb-2">
                          <span className="text-3xl font-extrabold text-accent-mono">
                            {metrics.aggregates?.averageTotalDuration ? `${(metrics.aggregates.averageTotalDuration / 1000).toFixed(1)}s` : '0.0s'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-xs border-t border-white/5 pt-2">
                          <span className="text-gray-400">Avg RAG Duration:</span>
                          <span className="font-semibold text-accent-mono">{metrics.aggregates?.averageRetrievalTime || 0} ms</span>
                        </div>
                      </div>

                      {/* Card 3: Execution metrics */}
                      <div className="bg-white/5 border border-white/5 rounded-2xl p-5 shadow-sm">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Tools Execution</span>
                        <div className="flex items-baseline gap-2 mb-2">
                          <span className="text-3xl font-extrabold text-accent-blue">{totalToolCalls}</span>
                          <span className="text-xs text-gray-500">calls</span>
                        </div>
                        <div className="flex justify-between items-center text-xs border-t border-white/5 pt-2">
                          <span className="text-gray-400">Avg Calls/Run:</span>
                          <span className="font-semibold text-accent-blue">
                            {metrics.aggregates?.totalRequests ? (totalToolCalls / metrics.aggregates.totalRequests).toFixed(1) : '0.0'}
                          </span>
                        </div>
                      </div>

                      {/* Card 4: Accuracy Metrics */}
                      <div className="bg-white/5 border border-white/5 rounded-2xl p-5 shadow-sm">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Agent Reliability</span>
                        <div className="flex items-baseline gap-2 mb-2">
                          <span className="text-3xl font-extrabold text-accent-emerald">
                            {totalToolCalls ? `${((successfulToolCalls / totalToolCalls) * 100).toFixed(0)}%` : '100%'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-xs border-t border-white/5 pt-2">
                          <span className="text-gray-400">Failed tool runs:</span>
                          <span className="font-semibold text-red-400">{failedToolCalls}</span>
                        </div>
                      </div>
                    </div>

                    {/* Cumulative telemetries */}
                    <div className="bg-white/5 border border-white/5 rounded-2xl p-5">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-4">Total Interaction Breakdown</span>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-black/20 p-4 rounded-xl border border-white/5 text-xs flex flex-col gap-1.5">
                          <span className="text-gray-400">Screenshots:</span>
                          <span className="font-mono font-semibold text-white">{metrics.aggregates?.totalScreenshots || 0}</span>
                        </div>
                        <div className="bg-black/20 p-4 rounded-xl border border-white/5 text-xs flex flex-col gap-1.5">
                          <span className="text-gray-400">Apple Scripts:</span>
                          <span className="font-mono font-semibold text-white">{metrics.aggregates?.totalAppleScripts || 0}</span>
                        </div>
                      </div>
                    </div>

                    {/* Tool latencies and success statistics table */}
                    <div className="bg-white/5 border border-white/5 rounded-2xl p-5">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-4">Detailed Tool Execution Performance</span>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-white/[0.02] text-gray-400 border-b border-white/10">
                              <th className="font-semibold py-3 px-4 rounded-l-xl pr-4 text-left">Tool Name</th>
                              <th className="font-semibold py-3 px-4 text-center">Total Calls</th>
                              <th className="font-semibold py-3 px-4 text-center">Response (Success) Rate</th>
                              <th className="font-semibold py-3 px-4 text-right">Avg Execution Latency</th>
                              <th className="font-semibold py-3 px-4 rounded-r-xl text-right">Avg Latency (Reasoning)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {Object.keys(metrics.aggregates?.tools || {}).length === 0 ? (
                              <tr>
                                <td colSpan={5} className="text-center py-8 text-gray-500">No tools have been called yet.</td>
                              </tr>
                            ) : (
                              Object.entries(metrics.aggregates.tools).map(([name, data]) => (
                                <tr key={name} className="hover:bg-white/[0.03] border-b border-white/5 transition-all">
                                  <td className="py-3 px-4 font-mono font-bold text-white flex items-center gap-2">
                                    <span className="p-1 bg-white/5 rounded">
                                      {getToolIcon(name)}
                                    </span>
                                    {name}
                                  </td>
                                  <td className="py-3 px-4 text-center font-mono text-gray-300">{data.calls}</td>
                                  <td className="py-3 px-4 font-mono">
                                    <div className="flex items-center gap-3 justify-center">
                                      <span className={`text-xs font-bold ${data.successRate >= 0.9 ? 'text-accent-emerald' : data.successRate >= 0.5 ? 'text-yellow-400' : 'text-red-400'}`}>
                                        {(data.successRate * 100).toFixed(0)}%
                                      </span>
                                      <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden hidden sm:block border border-white/5">
                                        <div
                                          className={`h-full rounded-full ${data.successRate >= 0.9 ? 'bg-accent-emerald' : data.successRate >= 0.5 ? 'bg-yellow-400' : 'bg-red-500'}`}
                                          style={{ width: `${(data.successRate * 100).toFixed(0)}%` }}
                                        />
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-3 px-4 text-right font-mono text-white font-medium">{data.averageLatency} ms</td>
                                  <td className="py-3 px-4 text-right font-mono text-accent-blue font-semibold">{data.averageLatencyFromRequestStart} ms</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Right Column (1/3 width): Available Tools list card */}
                  <div className="flex flex-col gap-6 lg:sticky lg:top-6">
                    <div className="bg-white/5 border border-white/5 rounded-2xl p-5 flex flex-col max-h-[calc(100vh-80px)] overflow-hidden">
                      <div className="flex items-center gap-2 mb-4 text-gray-200">
                        <Wrench className="w-4 h-4 text-accent-mono" />
                        <span className="text-xs font-bold uppercase tracking-wider">Active Tools ({tools.length})</span>
                      </div>
                      <div className="flex flex-col gap-2 overflow-y-auto pr-1">
                        {tools.length === 0 ? (
                          <div className="text-gray-500 text-xs text-center py-4 border border-dashed border-white/5 rounded-xl">
                            No active tools found.
                          </div>
                        ) : (
                          tools.map((tool, idx) => {
                            const toolName = tool.function?.name || tool.name;
                            const toolDesc = tool.function?.description || tool.description || 'No description provided';
                            return (
                              <div key={idx} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all duration-200 border border-white/5 hover:border-white/10" title={toolName}>
                                <div className="flex items-center gap-2 mb-1.5">
                                  <span className="p-1 bg-white/5 rounded-lg">
                                    {getToolIcon(toolName)}
                                  </span>
                                  <span className="font-mono text-xs font-bold text-gray-200 truncate">{toolName}</span>
                                </div>
                                <span className="text-[10px] text-gray-500 line-clamp-2 leading-relaxed">{toolDesc}</span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : activeView === 'logs' ? (
                /* ================= LIVE LOGS VIEW ================= */
                <div className="bg-white/5 border border-white/5 rounded-2xl p-5 flex flex-col h-[calc(100vh-210px)] min-h-[450px] w-full overflow-hidden">
                  {/* Header / Toolbar */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/5 flex-shrink-0">
                    <div>
                      <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                        System Event Stream
                        <span className={`px-2.5 py-0.5 text-[9px] rounded-full font-mono font-bold ${
                          connectionStatus === 'connected'
                            ? 'bg-accent-emerald/10 text-accent-emerald border border-accent-emerald/20'
                            : connectionStatus === 'connecting'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                          {connectionStatus.toUpperCase()}
                        </span>
                      </h3>
                      <p className="text-[11px] text-gray-500">Real-time standard output and action logs from your personal assistant backend.</p>
                    </div>

                    {/* Filter controls */}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {/* Search bar */}
                      <div className="relative">
                        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                          type="text"
                          placeholder="Search logs..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-8 pr-7 py-1.5 bg-black/40 border border-white/5 rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-accent-blue/50 w-44 transition-all"
                        />
                        {searchQuery && (
                          <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs font-bold font-mono cursor-pointer"
                          >
                            ×
                          </button>
                        )}
                      </div>

                      {/* Level selector */}
                      <select
                        value={levelFilter}
                        onChange={(e) => setLevelFilter(e.target.value)}
                        className="px-2.5 py-1.5 bg-black/40 border border-white/5 rounded-lg text-xs text-gray-300 focus:outline-none focus:border-accent-blue/50 transition-all cursor-pointer"
                      >
                        <option value="all">All Levels</option>
                        <option value="info">Info</option>
                        <option value="warn">Warning</option>
                        <option value="error">Error</option>
                        <option value="debug">Debug</option>
                      </select>

                      <div className="h-4 w-px bg-white/10 mx-1" />

                      {/* Pause/Resume stream */}
                      <button
                        onClick={() => setIsPaused(!isPaused)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          isPaused
                            ? 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20'
                            : 'bg-white/5 border-white/5 text-gray-300 hover:bg-white/10 hover:text-white'
                        }`}
                        title={isPaused ? 'Resume live log stream' : 'Pause live log stream'}
                      >
                        {isPaused ? <Play size={12} /> : <Pause size={12} />}
                        {isPaused ? 'Resume' : 'Pause'}
                      </button>

                      {/* Auto-scroll */}
                      <label className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-lg cursor-pointer transition-all text-xs text-gray-300 select-none">
                        <input
                          type="checkbox"
                          checked={autoScroll}
                          onChange={(e) => setAutoScroll(e.target.checked)}
                          className="rounded border-white/10 text-accent-blue bg-black/40 focus:ring-0 cursor-pointer"
                        />
                        <span>Auto-scroll</span>
                      </label>

                      {/* Clear Console */}
                      <button
                        onClick={() => setLogs([])}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-lg text-gray-300 hover:text-white transition-all cursor-pointer text-xs"
                        title="Clear console view"
                      >
                        <Trash2 size={12} />
                        Clear
                      </button>
                    </div>
                  </div>

                  {/* Terminal Console View */}
                  <div
                    ref={consoleContainerRef}
                    className="flex-grow bg-black/40 border border-white/5 rounded-xl mt-4 p-4 font-mono text-[11px] overflow-y-auto flex flex-col gap-1.5 select-text scroll-smooth"
                  >
                    {filteredLogs.length === 0 ? (
                      <div className="text-gray-500 text-center py-20 italic">
                        {logs.length === 0
                          ? 'No events received yet.'
                          : 'No logs match the current search filters.'}
                      </div>
                    ) : (
                      filteredLogs.map((log, index) => {
                        const messageStr = typeof log.message === 'string' ? log.message : JSON.stringify(log.message);
                        return (
                          <div key={index} className="flex items-start gap-2 hover:bg-white/[0.02] py-0.5 px-1 rounded transition-colors group">
                            <span className="text-gray-600 font-medium select-none flex-shrink-0">
                              [{formatTime(log.timestamp)}]
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider select-none flex-shrink-0 leading-none mt-0.5 ${getLevelBadgeStyles(log.level)}`}>
                              {log.level || 'info'}
                            </span>
                            <span className="text-gray-300 break-all leading-relaxed whitespace-pre-wrap flex-grow">
                              {messageStr}
                            </span>
                            {Object.keys(log).some(k => !['timestamp', 'level', 'message'].includes(k)) && (
                              <span className="text-[10px] text-gray-600 bg-white/5 px-1 rounded select-all group-hover:text-gray-400 transition-colors flex-shrink-0 font-mono">
                                JSON
                              </span>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Footer status summary */}
                  <div className="flex items-center justify-between text-[10px] text-gray-500 font-mono pt-3 mt-1 border-t border-white/5 flex-shrink-0">
                    <div>
                      Showing {filteredLogs.length} of {logs.length} events
                    </div>
                    {isPaused && (
                      <div className="text-amber-400 font-semibold animate-pulse">
                        [STREAM PAUSED - {logs.length - filteredLogs.length} updates buffered]
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* ================= TOOLS EXPLORER VIEW ================= */
                <div className="bg-white/5 border border-white/5 rounded-2xl p-5 flex flex-col h-[calc(100vh-210px)] min-h-[450px] w-full overflow-hidden">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/5 flex-shrink-0">
                    <div>
                      <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                        Tools Explorer
                      </h3>
                      <p className="text-[11px] text-gray-500">Search and explore the assistant's capability registry in real-time.</p>
                    </div>

                    <div className="flex items-center gap-4 text-xs">
                      <label className="flex items-center gap-1.5 cursor-pointer text-gray-400 select-none">
                        <input
                          type="checkbox"
                          checked={useSemanticSearch}
                          onChange={(e) => setUseSemanticSearch(e.target.checked)}
                          className="rounded border-white/10 text-accent-blue bg-black/40 focus:ring-0 cursor-pointer"
                        />
                        <span className={useSemanticSearch ? 'text-accent-blue font-bold' : ''}>Semantic Search (RAG)</span>
                      </label>

                      <div className="relative">
                        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                          type="text"
                          placeholder={useSemanticSearch ? "Type a capability to search (e.g. 'capture screen')..." : "Search tools by name/description..."}
                          value={toolsSearchQuery}
                          onChange={(e) => setToolsSearchQuery(e.target.value)}
                          className="pl-8 pr-7 py-1.5 bg-black/40 border border-white/5 rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-accent-blue/50 w-72 transition-all"
                        />
                        {toolsSearchQuery && (
                          <button
                            onClick={() => setToolsSearchQuery('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs font-bold font-mono cursor-pointer"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex-grow flex gap-6 overflow-hidden mt-4">
                    {/* Left Pane: Tools list */}
                    <div className="w-1/3 flex flex-col gap-2 overflow-y-auto pr-1">
                      {isSearchingTools ? (
                        <div className="text-gray-500 text-xs text-center py-8">
                          <RefreshCw size={14} className="animate-spin inline mr-2 text-accent-blue" /> Searching ChromaDB...
                        </div>
                      ) : (
                        (useSemanticSearch && toolsSearchQuery.trim() ? semanticResults : tools.filter(t => {
                          const name = t.function?.name || t.name || '';
                          const desc = t.function?.description || t.description || '';
                          return name.toLowerCase().includes(toolsSearchQuery.toLowerCase()) || 
                                 desc.toLowerCase().includes(toolsSearchQuery.toLowerCase());
                        })).map((tool, idx) => {
                          const toolName = tool.function?.name || tool.name;
                          const toolDesc = tool.function?.description || tool.description || 'No description provided';
                          const isSelected = selectedExplorerTool?.name === toolName;
                          return (
                            <button
                              key={idx}
                              onClick={() => setSelectedExplorerTool({
                                name: toolName,
                                description: toolDesc,
                                parameters: tool.function?.parameters || tool.inputSchema || {}
                              })}
                              className={`p-3 text-left rounded-xl transition-all duration-200 border text-xs flex flex-col gap-1.5 cursor-pointer ${
                                isSelected
                                  ? 'bg-accent-blue/10 border-accent-blue/30 text-white font-semibold'
                                  : 'bg-white/5 hover:bg-white/10 border-transparent text-gray-400 hover:text-white'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="p-1 bg-white/5 rounded-lg">
                                  {getToolIcon(toolName)}
                                </span>
                                <span className="font-mono font-bold">{toolName}</span>
                              </div>
                              <span className="text-[10px] text-gray-500 line-clamp-2 leading-relaxed">{toolDesc}</span>
                            </button>
                          );
                        })
                      )}
                    </div>

                    {/* Right Pane: Selected Tool Details */}
                    <div className="w-2/3 bg-black/20 border border-white/5 rounded-xl p-5 overflow-y-auto flex flex-col gap-4">
                      {selectedExplorerTool ? (
                        <>
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="p-1.5 bg-white/5 rounded-lg">
                                {getToolIcon(selectedExplorerTool.name)}
                              </span>
                              <h4 className="font-mono text-base font-bold text-white">{selectedExplorerTool.name}</h4>
                            </div>
                            <p className="text-xs text-gray-300 leading-relaxed font-sans">{selectedExplorerTool.description}</p>
                          </div>

                          <div className="border-t border-white/5 pt-4">
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-2">Parameters Schema</span>
                            <pre className="text-[10px] bg-black/40 border border-white/5 p-3 rounded-lg text-accent-mono font-mono overflow-x-auto whitespace-pre leading-relaxed select-text">
                              {JSON.stringify(selectedExplorerTool.parameters, null, 2)}
                            </pre>
                          </div>
                        </>
                      ) : (
                        <div className="flex-grow flex flex-col items-center justify-center text-center text-gray-500 py-10">
                          <Wrench className="w-8 h-8 text-white/10 mb-2" />
                          <p className="text-xs">Select a tool from the list to view its parameters and description.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>

      </div>
    </div>
  );
}
