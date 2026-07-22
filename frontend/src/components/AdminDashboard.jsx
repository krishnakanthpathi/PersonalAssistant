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
  Play,
  Save,
  Database,
  Code,
  Plus,
  PlusCircle,
  Trash,
  PlayCircle,
  Edit3,
  Star
} from 'lucide-react';
import SkillsPanel from './SkillsPanel.jsx';

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
    port: 3000,
    ollamaUrl: 'http://localhost:11434'
  });

  const [embeddingForm, setEmbeddingForm] = useState({
    embeddingProvider: 'ollama',
    embeddingApiKey: '',
    embeddingBaseUrl: '',
    openaiEmbeddingModel: '',
    ollamaEmbeddingModel: ''
  });
  const [isSavingEmbedding, setIsSavingEmbedding] = useState(false);
  const [embeddingSuccess, setEmbeddingSuccess] = useState('');
  const [embeddingError, setEmbeddingError] = useState('');
  
  const [isCheckingLatency, setIsCheckingLatency] = useState(false);
  const [latencyResult, setLatencyResult] = useState(null);

  const [activeView, setActiveView] = useState(() => {
    return location.state?.activeView || 'overview';
  }); // 'overview' or 'logs'
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

  // Prebuilt action cards state
  const [prebuiltForms, setPrebuiltForms] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingFormId, setEditingFormId] = useState(null);
  const [newFormTitle, setNewFormTitle] = useState('');
  const [newFormDesc, setNewFormDesc] = useState('');
  const [newFormPrompt, setNewFormPrompt] = useState('');
  const [newFormInputs, setNewFormInputs] = useState([]);
  const [formInputsValues, setFormInputsValues] = useState({});
  const [newInputName, setNewInputName] = useState('');
  const [newInputLabel, setNewInputLabel] = useState('');

  const fetchPrebuiltForms = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/prebuilt-forms');
      const data = await res.json();
      if (data.success) {
        setPrebuiltForms(data.forms || []);
        const initialValues = {};
        (data.forms || []).forEach(form => {
          initialValues[form._id] = {};
          (form.inputs || []).forEach(input => {
            initialValues[form._id][input.name] = input.defaultValue || '';
          });
        });
        setFormInputsValues(initialValues);
      }
    } catch (e) {
      console.error('Failed to fetch prebuilt forms:', e);
    }
  };

  const handleEditPrebuiltForm = (card) => {
    setEditingFormId(card._id);
    setNewFormTitle(card.title);
    setNewFormDesc(card.description);
    setNewFormPrompt(card.prompt);
    setNewFormInputs(card.inputs || []);
    setShowAddForm(true);
  };

  const handleCreatePrebuiltForm = async (e) => {
    e.preventDefault();
    if (!newFormTitle.trim() || !newFormDesc.trim() || !newFormPrompt.trim()) {
      alert('Title, Description, and Prompt template are required.');
      return;
    }
    const isEdit = !!editingFormId;
    const url = isEdit 
      ? `http://localhost:3000/api/prebuilt-forms/${editingFormId}` 
      : 'http://localhost:3000/api/prebuilt-forms';
    const method = isEdit ? 'PUT' : 'POST';
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newFormTitle,
          description: newFormDesc,
          prompt: newFormPrompt,
          inputs: newFormInputs
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowAddForm(false);
        setEditingFormId(null);
        setNewFormTitle('');
        setNewFormDesc('');
        setNewFormPrompt('');
        setNewFormInputs([]);
        fetchPrebuiltForms();
      } else {
        alert('Failed to save card: ' + data.error);
      }
    } catch (error) {
      console.error('Error saving action card:', error);
    }
  };

  const handleDeletePrebuiltForm = async (id) => {
    if (!window.confirm('Are you sure you want to delete this action card?')) return;
    try {
      const res = await fetch(`http://localhost:3000/api/prebuilt-forms/${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        fetchPrebuiltForms();
      } else {
        alert('Failed to delete card: ' + data.error);
      }
    } catch (error) {
      console.error('Error deleting card:', error);
    }
  };

  const handleAddInputVariable = () => {
    if (!newInputName.trim() || !newInputLabel.trim()) {
      alert('Input variable name and user label are required.');
      return;
    }
    setNewFormInputs(prev => [
      ...prev,
      { name: newInputName.trim(), label: newInputLabel.trim(), type: 'text', defaultValue: '' }
    ]);
    setNewInputName('');
    setNewInputLabel('');
  };

  const handleRemoveInputVariable = (index) => {
    setNewFormInputs(prev => prev.filter((_, i) => i !== index));
  };

  const handleInputChange = (cardId, name, value) => {
    setFormInputsValues(prev => ({
      ...prev,
      [cardId]: {
        ...(prev[cardId] || {}),
        [name]: value
      }
    }));
  };

  const handleRunActionCard = (card) => {
    let interpolatedPrompt = card.prompt;
    const cardValues = formInputsValues[card._id] || {};
    
    (card.inputs || []).forEach(input => {
      const val = cardValues[input.name] !== undefined ? cardValues[input.name] : (input.defaultValue || '');
      interpolatedPrompt = interpolatedPrompt.replace(new RegExp(`{{\\s*${input.name}\\s*}}`, 'g'), val);
    });

    navigate('/', { 
      state: { 
        activeTab: 'chat', 
        executePrompt: interpolatedPrompt 
      } 
    });
  };

  const handleToggleFavorite = async (id) => {
    try {
      const res = await fetch(`http://localhost:3000/api/prebuilt-forms/${id}/toggle-favorite`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.success) {
        fetchPrebuiltForms();
      } else {
        alert('Failed to toggle favorite: ' + data.error);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  // OKF Retrieval Tester state
  const [okfTestQuery, setOkfTestQuery] = useState('');
  const [okfMatchedDocs, setOkfMatchedDocs] = useState([]);
  const [okfSelectedTools, setOkfSelectedTools] = useState([]);
  const [isTestingOkf, setIsTestingOkf] = useState(false);
  const [okfTestError, setOkfTestError] = useState('');

  // States for Test Center
  const [isTestingRag, setIsTestingRag] = useState(false);
  const [ragTestOutput, setRagTestOutput] = useState('');
  const [manualToolName, setManualToolName] = useState('');
  const [manualToolArgs, setManualToolArgs] = useState('{\n  \n}');
  const [manualToolResult, setManualToolResult] = useState('');
  const [isExecutingTool, setIsExecutingTool] = useState(false);

  const handleRunRagTests = async () => {
    setIsTestingRag(true);
    setRagTestOutput('Executing "node src/rag/test_rag_tools.js" on backend...\n');
    try {
      const res = await fetch('http://localhost:3000/api/tools/run-tests', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setRagTestOutput(data.stdout || 'Tests finished successfully with no stdout output.');
      } else {
        setRagTestOutput(`Test run failed!\nError: ${data.error || 'unknown'}\n\nSTDOUT:\n${data.stdout}\n\nSTDERR:\n${data.stderr}`);
      }
    } catch (error) {
      setRagTestOutput(`Failed to trigger test suite: ${error.message}`);
    } finally {
      setIsTestingRag(false);
    }
  };

  const handleStopRagTests = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/tools/stop-tests', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setRagTestOutput(prev => prev + '\n\n[Test execution stopped by user.]');
      } else {
        alert(`Failed to stop tests: ${data.error}`);
      }
    } catch (error) {
      alert(`Error stopping tests: ${error.message}`);
    } finally {
      setIsTestingRag(false);
    }
  };

  const handleSelectManualTool = (e) => {
    const name = e.target.value;
    setManualToolName(name);
    
    // Automatically generate sample schema if available
    const selected = tools.find(t => (t.function?.name || t.name) === name);
    if (selected) {
      const params = selected.function?.parameters || selected.inputSchema || {};
      const template = {};
      if (params.properties) {
        for (const [k, prop] of Object.entries(params.properties)) {
          template[k] = prop.type === 'array' ? [] : prop.type === 'integer' || prop.type === 'number' ? 0 : prop.type === 'boolean' ? false : '';
        }
      }
      setManualToolArgs(JSON.stringify(template, null, 2));
    } else {
      setManualToolArgs('{\n  \n}');
    }
  };

  const handleExecuteTool = async () => {
    if (!manualToolName) return;
    setIsExecutingTool(true);
    setManualToolResult(`Sending execution call to backend for tool "${manualToolName}"...`);
    try {
      let parsedArgs = {};
      try {
        parsedArgs = JSON.parse(manualToolArgs);
      } catch (err) {
        setManualToolResult(`Error parsing JSON Arguments: ${err.message}`);
        setIsExecutingTool(false);
        return;
      }

      const res = await fetch('http://localhost:3000/api/tools/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: manualToolName, args: parsedArgs })
      });
      const data = await res.json();
      if (data.success) {
        const output = typeof data.result === 'object' ? JSON.stringify(data.result, null, 2) : data.result;
        setManualToolResult(output || 'Tool executed successfully (returned empty/null).');
      } else {
        setManualToolResult(`Tool Execution Failed!\nError: ${data.error || 'unknown'}`);
      }
    } catch (error) {
      setManualToolResult(`Network/Server error during execution: ${error.message}`);
    } finally {
      setIsExecutingTool(false);
    }
  };

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
            function: t.function || t,
            score: t.score
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

  const handleTestOkf = async (e) => {
    if (e) e.preventDefault();
    if (!okfTestQuery.trim()) return;
    
    setIsTestingOkf(true);
    setOkfTestError('');
    try {
      const res = await fetch(`http://localhost:3000/api/okf/test-retrieval?q=${encodeURIComponent(okfTestQuery)}`);
      const data = await res.json();
      if (data.success) {
        setOkfMatchedDocs(data.matchedDocs || []);
        setOkfSelectedTools(data.selectedTools || []);
      } else {
        setOkfTestError(data.error || 'Failed to retrieve OKF data');
      }
    } catch (err) {
      console.error('Failed to run OKF retrieval test:', err);
      setOkfTestError(`Error: ${err.message}`);
    } finally {
      setIsTestingOkf(false);
    }
  };

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
          port: configData.port,
          ollamaUrl: configData.settings?.ollamaUrl || 'http://localhost:11434'
        });
        if (configData.settings) {
          setEmbeddingForm({
            embeddingProvider: configData.settings.embeddingProvider || 'ollama',
            embeddingApiKey: configData.settings.embeddingApiKey || '',
            embeddingBaseUrl: configData.settings.embeddingBaseUrl || '',
            openaiEmbeddingModel: configData.settings.openaiEmbeddingModel || '',
            ollamaEmbeddingModel: configData.settings.ollamaEmbeddingModel || ''
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch tools or config:', error);
    } finally {
      setIsFetchingTools(false);
    }
  };

  const handleSaveEmbedding = async (e) => {
    if (e) e.preventDefault();
    setIsSavingEmbedding(true);
    setEmbeddingSuccess('');
    setEmbeddingError('');
    try {
      const response = await fetch('http://localhost:3000/api/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(embeddingForm),
      });
      const data = await response.json();
      if (data.success) {
        setEmbeddingSuccess('Embedding configuration saved and applied dynamically!');
        // Refresh local settings to ensure sync
        fetchToolsAndConfig();
      } else {
        setEmbeddingError(data.error || 'Failed to save embedding configuration.');
      }
    } catch (err) {
      setEmbeddingError(err.message || 'An error occurred while saving.');
    } finally {
      setIsSavingEmbedding(false);
    }
  };

  const handleCheckToolLatency = async () => {
    if (!selectedExplorerTool) return;
    setIsCheckingLatency(true);
    setLatencyResult(null);
    try {
      // Construct dummy arguments based on the tool parameters schema
      const params = selectedExplorerTool.parameters || {};
      const mockArgs = {};
      if (params.properties) {
        for (const [key, prop] of Object.entries(params.properties)) {
          if (prop.enum && prop.enum.length > 0) {
            mockArgs[key] = prop.enum[0];
          } else if (prop.type === 'array') {
            mockArgs[key] = [];
          } else if (prop.type === 'integer' || prop.type === 'number') {
            mockArgs[key] = 1;
          } else if (prop.type === 'boolean') {
            mockArgs[key] = false;
          } else {
            mockArgs[key] = 'test';
          }
        }
      }

      const response = await fetch('http://localhost:3000/api/tools/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: selectedExplorerTool.name,
          args: mockArgs
        })
      });
      const data = await response.json();
      if (data.success) {
        setLatencyResult({
          success: true,
          latency: data.latency !== undefined ? data.latency : 0
        });
      } else {
        setLatencyResult({
          success: false,
          latency: 0,
          error: data.error || 'Execution failed.'
        });
      }
    } catch (err) {
      setLatencyResult({
        success: false,
        latency: 0,
        error: err.message || 'An error occurred during call.'
      });
    } finally {
      setIsCheckingLatency(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    fetchToolsAndConfig();
    fetchPrebuiltForms();
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
                  <span className="text-[9px] font-semibold text-gray-500 uppercase block mb-1">OKF Retrieval</span>
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
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-3 flex-shrink-0">OKF Context Given</span>
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
                  <button
                    onClick={() => { setActiveView('personal-db'); setSelectedRequest(null); }}
                    className={`flex items-center gap-2 px-5 py-3 text-xs font-semibold border-b-2 transition-all duration-200 cursor-pointer ${
                      activeView === 'personal-db'
                        ? 'border-accent-blue text-white font-bold'
                        : 'border-transparent text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    <Database size={13} />
                    OKF Retrieval Tester
                  </button>
                  <button
                    onClick={() => { setActiveView('test'); setSelectedRequest(null); }}
                    className={`flex items-center gap-2 px-5 py-3 text-xs font-semibold border-b-2 transition-all duration-200 cursor-pointer ${
                      activeView === 'test'
                        ? 'border-accent-blue text-white font-bold'
                        : 'border-transparent text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    <Play size={13} />
                    Test Center
                  </button>
                  <button
                    onClick={() => { setActiveView('skills'); setSelectedRequest(null); }}
                    className={`flex items-center gap-2 px-5 py-3 text-xs font-semibold border-b-2 transition-all duration-200 cursor-pointer ${
                      activeView === 'skills'
                        ? 'border-accent-blue text-white font-bold'
                        : 'border-transparent text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    <Code size={13} />
                    Custom Skills
                  </button>
                  <button
                    onClick={() => { setActiveView('quick-actions'); setSelectedRequest(null); }}
                    className={`flex items-center gap-2 px-5 py-3 text-xs font-semibold border-b-2 transition-all duration-200 cursor-pointer ${
                      activeView === 'quick-actions'
                        ? 'border-accent-blue text-white font-bold'
                        : 'border-transparent text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    <PlayCircle size={13} />
                    Quick Actions Cards
                  </button>
                </div>
              </div>

              {activeView === 'quick-actions' ? (
                <div className="flex flex-col gap-6 w-full">
                  {/* Action Cards Header */}
                  <div className="flex items-center justify-between pb-4 border-b border-border-color">
                    <div>
                      <h2 className="text-md font-semibold text-white font-sans flex items-center gap-2">
                        <PlayCircle size={16} className="text-accent-emerald" />
                        Quick Actions & Action Cards ({prebuiltForms.length})
                      </h2>
                      <p className="text-xs text-gray-400">
                        Create, manage, and run reusable prompt templates with custom input variables.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowAddForm(!showAddForm)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-emerald hover:bg-accent-emerald/90 text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-glow"
                      title="Create a new Prebuilt Action Card"
                    >
                      <Plus size={12} />
                      {showAddForm ? 'Close Form' : 'Add Action Card'}
                    </button>
                  </div>

                  {/* Creation / Edit Form */}
                  {showAddForm && (
                    <form onSubmit={handleCreatePrebuiltForm} className="p-5 bg-white/5 border border-accent-emerald/30 rounded-2xl flex flex-col gap-4 animate-fadeIn max-w-2xl">
                      <span className="text-xs font-bold text-accent-emerald uppercase tracking-wider block">
                        {editingFormId ? 'Edit Action Card' : 'New Action Card'}
                      </span>
                      
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] text-gray-400 font-semibold uppercase">Title</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Open SSH Terminal"
                          value={newFormTitle}
                          onChange={e => setNewFormTitle(e.target.value)}
                          className="px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none focus:border-accent-emerald/50"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] text-gray-400 font-semibold uppercase">Description</label>
                        <textarea
                          required
                          placeholder="Short description of this action"
                          value={newFormDesc}
                          onChange={e => setNewFormDesc(e.target.value)}
                          rows={2}
                          className="px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none focus:border-accent-emerald/50 resize-none"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] text-gray-400 font-semibold uppercase">Prompt Template</label>
                        <textarea
                          required
                          placeholder="Prebuilt prompt. Use {{var_name}} for variables."
                          value={newFormPrompt}
                          onChange={e => setNewFormPrompt(e.target.value)}
                          rows={3}
                          className="px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white font-mono placeholder-gray-600 focus:outline-none focus:border-accent-emerald/50 resize-none"
                        />
                      </div>

                      {/* Variable inputs definition */}
                      <div className="border-t border-white/10 pt-3 flex flex-col gap-2">
                        <label className="text-[10px] text-gray-400 font-semibold uppercase block">Variables Setup</label>
                        
                        {newFormInputs.length > 0 && (
                          <div className="flex flex-col gap-2 mb-1">
                            {newFormInputs.map((input, idx) => (
                              <div key={idx} className="flex justify-between items-center bg-black/30 px-3 py-1.5 rounded-lg text-xs font-mono border border-white/10">
                                <span className="text-gray-200">{"{{" + input.name + "}}"}</span>
                                <span className="text-gray-400 font-sans">({input.label})</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveInputVariable(idx)}
                                  className="text-red-400 hover:text-red-300 p-1"
                                >
                                  <XCircle size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Variable key (e.g. host)"
                            value={newInputName}
                            onChange={e => setNewInputName(e.target.value)}
                            className="px-3 py-1.5 bg-black/40 border border-white/10 rounded-lg text-xs text-white placeholder-gray-600 focus:outline-none focus:border-accent-emerald/50 flex-1 font-mono"
                          />
                          <input
                            type="text"
                            placeholder="Label (e.g. Host Name)"
                            value={newInputLabel}
                            onChange={e => setNewInputLabel(e.target.value)}
                            className="px-3 py-1.5 bg-black/40 border border-white/10 rounded-lg text-xs text-white placeholder-gray-600 focus:outline-none focus:border-accent-emerald/50 flex-1"
                          />
                          <button
                            type="button"
                            onClick={handleAddInputVariable}
                            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                          >
                            <Plus size={12} /> Add Var
                          </button>
                        </div>
                      </div>

                      <div className="flex gap-2 justify-end border-t border-white/10 pt-3 mt-1">
                        <button
                          type="button"
                          onClick={() => { setShowAddForm(false); setEditingFormId(null); setNewFormInputs([]); }}
                          className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs font-medium transition cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 bg-accent-emerald hover:bg-accent-emerald/90 text-white font-bold rounded-xl text-xs transition cursor-pointer"
                        >
                          {editingFormId ? 'Update Card' : 'Save Card'}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {prebuiltForms.length === 0 ? (
                      <div className="col-span-full text-center py-12 text-gray-500 text-xs border border-dashed border-white/10 rounded-2xl">
                        No Action Cards available yet. Click "+ Add Action Card" above to create your first shortcut card.
                      </div>
                    ) : (
                      prebuiltForms.map((card) => (
                        <div
                          key={card._id}
                          className="p-4 bg-white/5 border border-white/10 hover:border-white/20 rounded-2xl flex flex-col justify-between gap-3 transition-all group shadow-sm"
                        >
                          <div className="flex flex-col gap-2">
                            <div className="flex justify-between items-start gap-2">
                              <div>
                                <h3 className="font-bold text-sm text-white">{card.title}</h3>
                                <p className="text-xs text-gray-400 mt-1 leading-relaxed">{card.description}</p>
                              </div>
                              <div className="flex gap-1 items-center flex-shrink-0">
                                <button
                                  onClick={() => handleToggleFavorite(card._id)}
                                  className={`p-1.5 rounded transition cursor-pointer ${card.isFavorite ? 'text-amber-400 hover:text-amber-300' : 'text-gray-500 hover:text-gray-300'}`}
                                  title={card.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
                                >
                                  <Star size={14} fill={card.isFavorite ? 'currentColor' : 'none'} />
                                </button>
                                <button
                                  onClick={() => handleEditPrebuiltForm(card)}
                                  className="text-gray-500 hover:text-accent-blue p-1.5 rounded transition cursor-pointer"
                                  title="Edit Card"
                                >
                                  <Edit3 size={14} />
                                </button>
                                {!card.isPredefined && (
                                  <button
                                    onClick={() => handleDeletePrebuiltForm(card._id)}
                                    className="text-gray-500 hover:text-red-400 p-1.5 rounded transition cursor-pointer"
                                    title="Delete Card"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            </div>

                            {card.inputs && card.inputs.length > 0 && (
                              <div className="flex flex-col gap-2 bg-black/30 p-3 rounded-xl border border-white/5 mt-2">
                                {card.inputs.map(input => (
                                  <div key={input.name} className="flex flex-col gap-1 text-xs">
                                    <label className="text-gray-400 font-medium">{input.label}</label>
                                    <input
                                      type={input.type || 'text'}
                                      value={formInputsValues[card._id]?.[input.name] ?? ''}
                                      onChange={e => handleInputChange(card._id, input.name, e.target.value)}
                                      placeholder={input.defaultValue || ''}
                                      className="px-2.5 py-1.5 bg-black/40 border border-white/10 rounded-lg text-xs text-white placeholder-gray-600 focus:outline-none focus:border-accent-emerald/40 font-mono"
                                    />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          <button
                            onClick={() => handleRunActionCard(card)}
                            className="mt-2 flex items-center justify-center gap-1.5 px-4 py-2 bg-accent-emerald hover:bg-accent-emerald/90 text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-sm"
                          >
                            <PlayCircle size={14} />
                            Run Action
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : activeView === 'overview' ? (
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
                          <span className="text-gray-400">Avg OKF Duration:</span>
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
              ) : activeView === 'tools' ? (
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
                        <span className={useSemanticSearch ? 'text-accent-blue font-bold' : ''}>Smart Tool Selection (OKF)</span>
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
                              onClick={() => {
                                setSelectedExplorerTool({
                                  name: toolName,
                                  description: toolDesc,
                                  parameters: tool.function?.parameters || tool.inputSchema || {}
                                });
                                setLatencyResult(null);
                              }}
                              className={`p-3 text-left rounded-xl transition-all duration-200 border text-xs flex flex-col gap-1.5 cursor-pointer ${
                                isSelected
                                  ? 'bg-accent-blue/10 border-accent-blue/30 text-white font-semibold'
                                  : 'bg-white/5 hover:bg-white/10 border-transparent text-gray-400 hover:text-white'
                              }`}
                            >
                               <div className="flex items-center gap-2 w-full">
                                 <span className="p-1 bg-white/5 rounded-lg">
                                   {getToolIcon(toolName)}
                                 </span>
                                 <span className="font-mono font-bold truncate">{toolName}</span>
                                 {tool.score !== undefined && (
                                   <span className="ml-auto text-[9px] px-1.5 py-0.5 bg-accent-blue/15 border border-accent-blue/30 text-accent-blue font-mono font-bold rounded-md whitespace-nowrap">
                                     {tool.score.toFixed(3)}
                                   </span>
                                 )}
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

                          {metrics.aggregates?.tools?.[selectedExplorerTool.name] ? (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white/[0.02] border border-white/5 rounded-xl p-4 mt-1">
                              <div className="flex flex-col gap-0.5">
                                <span className="text-[9px] font-bold text-gray-500 uppercase">Database Average</span>
                                <span className="font-mono text-xs font-bold text-white">
                                  {metrics.aggregates.tools[selectedExplorerTool.name].averageLatency} ms
                                </span>
                              </div>
                              <div className="flex flex-col gap-0.5">
                                <span className="text-[9px] font-bold text-gray-500 uppercase">Database Avg (Start)</span>
                                <span className="font-mono text-xs font-bold text-accent-blue">
                                  {metrics.aggregates.tools[selectedExplorerTool.name].averageLatencyFromRequestStart} ms
                                </span>
                              </div>
                              <div className="flex flex-col gap-0.5">
                                <span className="text-[9px] font-bold text-gray-500 uppercase">Total Calls</span>
                                <span className="font-mono text-xs font-bold text-gray-300">
                                  {metrics.aggregates.tools[selectedExplorerTool.name].calls}
                                </span>
                              </div>
                              <div className="flex flex-col gap-0.5">
                                <span className="text-[9px] font-bold text-gray-500 uppercase">Success Rate</span>
                                <span className={`font-mono text-xs font-bold ${
                                  metrics.aggregates.tools[selectedExplorerTool.name].successRate >= 0.9 ? 'text-accent-emerald' : 'text-yellow-400'
                                }`}>
                                  {(metrics.aggregates.tools[selectedExplorerTool.name].successRate * 100).toFixed(0)}%
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="text-[10px] text-gray-500 italic bg-white/[0.01] border border-white/5 border-dashed rounded-xl p-3 mt-1">
                              No execution metrics recorded for this tool yet.
                            </div>
                          )}

                          <div className="border-t border-white/5 pt-4">
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-2">Parameters Schema</span>
                            <pre className="text-[10px] bg-black/40 border border-white/5 p-3 rounded-lg text-accent-mono font-mono overflow-x-auto whitespace-pre leading-relaxed select-text">
                              {JSON.stringify(selectedExplorerTool.parameters, null, 2)}
                            </pre>
                          </div>

                          <div className="border-t border-white/5 pt-4">
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-2">Tool Latency Checker</span>
                            <div className="flex flex-col gap-3 bg-white/[0.02] border border-white/5 rounded-xl p-4 mt-1">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <span className="text-xs text-gray-400">Trigger a trial call to this tool to measure execution latency.</span>
                                <button
                                  type="button"
                                  onClick={handleCheckToolLatency}
                                  disabled={isCheckingLatency}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-blue/10 hover:bg-accent-blue/20 border border-accent-blue/30 hover:border-accent-blue/50 text-accent-blue font-bold rounded-lg text-[10px] transition cursor-pointer disabled:opacity-50 flex-shrink-0"
                                >
                                  {isCheckingLatency ? (
                                    <>
                                      <RefreshCw size={11} className="animate-spin" />
                                      Checking...
                                    </>
                                  ) : (
                                    <>
                                      <Activity size={11} />
                                      Check Latency
                                    </>
                                  )}
                                </button>
                              </div>
                              {latencyResult && (
                                <div className="border-t border-white/5 pt-3 mt-1 flex flex-col gap-2 animate-fadeIn">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-gray-400">Result Status:</span>
                                    <span className={`font-bold flex items-center gap-1.5 ${latencyResult.success ? 'text-accent-emerald' : 'text-red-400'}`}>
                                      {latencyResult.success ? (
                                        <>
                                          <CheckCircle2 size={12} /> Success
                                        </>
                                      ) : (
                                        <>
                                          <XCircle size={12} /> Error
                                        </>
                                      )}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-gray-400">Measured Latency:</span>
                                    <span className="font-mono font-bold text-white bg-white/5 px-2 py-0.5 rounded">{latencyResult.latency} ms</span>
                                  </div>
                                  {!latencyResult.success && latencyResult.error && (
                                    <div className="text-[10px] text-red-400 bg-red-500/5 border border-red-500/10 p-3 rounded-xl font-mono mt-1 leading-relaxed select-text">
                                      {latencyResult.error}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
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
              ) : activeView === 'personal-db' ? (
                /* ================= OKF RETRIEVAL TESTER VIEW ================= */
                <div className="bg-white/5 border border-white/5 rounded-2xl p-5 flex flex-col h-[calc(100vh-210px)] min-h-[450px] w-full overflow-hidden">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/5 flex-shrink-0">
                    <div>
                      <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                        <Database size={16} className="text-accent-blue" />
                        OKF Retrieval & Memory Tester
                      </h3>
                      <p className="text-[11px] text-gray-500">Test how the OKF Engine retrieves matching user profiles and active tools for any given user prompt.</p>
                    </div>
                  </div>

                  {/* Input Form */}
                  <form onSubmit={handleTestOkf} className="flex gap-3 mt-4 flex-shrink-0">
                    <div className="relative flex-grow">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                      <input
                        type="text"
                        placeholder="Type a test prompt (e.g. 'go to my files and view everything' or 'what is my car model?')..."
                        value={okfTestQuery}
                        onChange={(e) => setOkfTestQuery(e.target.value)}
                        className="w-full pl-9 pr-7 py-2.5 bg-black/40 border border-white/5 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-accent-blue/50 transition-all"
                      />
                      {okfTestQuery && (
                        <button
                          type="button"
                          onClick={() => setOkfTestQuery('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs font-bold font-mono cursor-pointer"
                        >
                          ×
                        </button>
                      )}
                    </div>
                    <button
                      type="submit"
                      disabled={isTestingOkf || !okfTestQuery.trim()}
                      className="px-5 py-2.5 bg-accent-blue hover:bg-accent-blue/90 disabled:bg-accent-blue/40 disabled:text-white/40 text-white font-semibold rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer"
                    >
                      {isTestingOkf ? <RefreshCw size={12} className="animate-spin" /> : <Play size={12} />}
                      Test OKF Retrieval
                    </button>
                  </form>

                  {okfTestError && (
                    <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs flex-shrink-0 animate-fadeIn">
                      {okfTestError}
                    </div>
                  )}

                  {/* Results Panel */}
                  <div className="flex-grow flex gap-4 overflow-hidden mt-4">
                    {/* Left Panel: Profile / Memory Documents */}
                    <div className="w-1/2 flex flex-col bg-black/20 border border-white/5 rounded-xl p-4 overflow-hidden">
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5 flex-shrink-0">
                        <span>Profile & Memories Retrieved</span>
                        {okfMatchedDocs.length > 0 && (
                          <span className="bg-accent-blue/10 text-accent-blue px-2 py-0.5 rounded-full text-[9px] font-bold font-mono">
                            {okfMatchedDocs.length}
                          </span>
                        )}
                      </h4>
                      
                      <div className="flex-grow overflow-y-auto pr-1 flex flex-col gap-2.5">
                        {isTestingOkf ? (
                          <div className="text-gray-500 text-xs text-center py-12 m-auto">
                            <RefreshCw size={14} className="animate-spin inline mr-2 text-accent-blue" />
                            Matching profiles...
                          </div>
                        ) : okfMatchedDocs.length > 0 ? (
                          okfMatchedDocs.map((doc, idx) => (
                            <div key={idx} className="bg-white/[0.02] border border-white/5 p-3 rounded-lg flex flex-col gap-2">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-semibold text-xs text-white truncate">{doc.title}</span>
                                <span className="bg-white/5 text-gray-400 px-1.5 py-0.5 rounded text-[9px] uppercase font-mono flex-shrink-0">
                                  {doc.type}
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {doc.tags.map((tag, tagIdx) => (
                                  <span key={tagIdx} className="bg-accent-blue/5 text-accent-blue/70 border border-accent-blue/10 px-1.5 py-0.2 rounded text-[8px] font-mono">
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                              <pre className="text-[10px] text-gray-400 bg-black/30 border border-white/5 p-2 rounded max-h-36 overflow-y-auto font-mono whitespace-pre-wrap leading-relaxed select-text mt-1">
                                {doc.content}
                              </pre>
                            </div>
                          ))
                        ) : (
                          <div className="text-[11px] text-gray-500 text-center py-12 m-auto max-w-[200px]">
                            {okfTestQuery.trim() ? "No matched profile documents for this prompt." : "Run a test prompt to see matched OKF profiles."}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Panel: Tools Loaded */}
                    <div className="w-1/2 flex flex-col bg-black/20 border border-white/5 rounded-xl p-4 overflow-hidden">
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5 flex-shrink-0">
                        <span>Tools retrieved for prompt</span>
                        {okfSelectedTools.length > 0 && (
                          <span className="bg-accent-emerald/10 text-accent-emerald px-2 py-0.5 rounded-full text-[9px] font-bold font-mono">
                            {okfSelectedTools.length}
                          </span>
                        )}
                      </h4>

                      <div className="flex-grow overflow-y-auto pr-1 flex flex-col gap-2">
                        {isTestingOkf ? (
                          <div className="text-gray-500 text-xs text-center py-12 m-auto">
                            <RefreshCw size={14} className="animate-spin inline mr-2 text-accent-emerald" />
                            Loading tools...
                          </div>
                        ) : okfSelectedTools.length > 0 ? (
                          okfSelectedTools.map((tool, idx) => (
                            <div key={idx} className="bg-white/[0.02] border border-white/5 p-2.5 rounded-lg flex flex-col gap-1 hover:border-white/10 transition-colors">
                              <div className="flex items-center gap-2">
                                <span className="px-1.5 py-0.5 bg-accent-emerald/10 border border-accent-emerald/20 text-accent-emerald rounded text-[10px] font-mono font-bold">
                                  {tool.name}
                                </span>
                              </div>
                              {tool.description && (
                                <p className="text-[10px] text-gray-400 leading-normal line-clamp-2 mt-0.5">{tool.description}</p>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="text-[11px] text-gray-500 text-center py-12 m-auto max-w-[200px]">
                            {okfTestQuery.trim() ? "No tools selected for this prompt." : "Run a test prompt to see active toolset."}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : activeView === 'skills' ? (
                <SkillsPanel 
                  generatedFromChart={location.state?.generatedFromChart}
                  chatHistory={location.state?.chatHistory}
                  generateFromChatOnly={location.state?.generateFromChatOnly}
                  onClearGeneratedState={() => {
                    navigate('/admin', { state: { ...location.state, generatedFromChart: null, chatHistory: null, generateFromChatOnly: null }, replace: true });
                  }}
                />
              ) : (
                /* ================= TEST CENTER VIEW ================= */
                <div className="bg-white/5 border border-white/5 rounded-2xl p-5 flex flex-col h-[calc(100vh-210px)] min-h-[450px] w-full overflow-hidden">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/5 flex-shrink-0">
                    <div>
                      <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                        Test Center
                      </h3>
                      <p className="text-[11px] text-gray-500">Run the OKF tool selection test suite or test-execute individual tools manually.</p>
                    </div>
                  </div>

                  <div className="flex-grow flex gap-6 overflow-hidden mt-4">
                    {/* Left Pane: OKF Test suite */}
                    <div className="w-1/2 flex flex-col gap-4 border-r border-white/5 pr-6 h-full overflow-hidden">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">OKF Test Runner</span>
                        <div className="flex gap-2">
                          <button
                            onClick={handleRunRagTests}
                            disabled={isTestingRag}
                            className="flex items-center gap-1.5 px-4 py-2 bg-accent-blue/15 hover:bg-accent-blue/35 text-accent-blue font-bold rounded-lg text-xs transition cursor-pointer disabled:opacity-50"
                          >
                            <Activity size={12} className={isTestingRag ? 'animate-spin' : ''} />
                            {isTestingRag ? 'Running Tests...' : 'Run OKF Test Suite'}
                          </button>
                          {isTestingRag && (
                            <button
                              onClick={handleStopRagTests}
                              className="flex items-center gap-1.5 px-4 py-2 bg-red-500/15 hover:bg-red-500/35 text-red-400 font-bold rounded-lg text-xs transition cursor-pointer"
                            >
                              Stop Tests
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="flex-grow bg-black/40 border border-white/5 rounded-xl p-4 font-mono text-[10px] text-gray-400 overflow-y-auto whitespace-pre-wrap select-text">
                        {ragTestOutput || 'Click "Run OKF Test Suite" to verify tool OKF indexes and execute automated tests.'}
                      </div>
                    </div>

                    {/* Right Pane: Manual Tool execution */}
                    <div className="w-1/2 flex flex-col gap-4 h-full overflow-y-auto pl-2">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Manual Tool Tester</span>
                      
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] text-gray-500 font-bold uppercase">Select Tool</label>
                        <select
                          value={manualToolName}
                          onChange={handleSelectManualTool}
                          className="w-full px-3 py-2 bg-black/40 border border-white/5 rounded-lg text-xs text-gray-300 focus:outline-none focus:border-accent-blue/50 transition-all cursor-pointer"
                        >
                          <option value="">-- Choose a tool to test --</option>
                          {tools.map((t, idx) => {
                            const name = t.function?.name || t.name;
                            return <option key={idx} value={name}>{name}</option>;
                          })}
                        </select>
                      </div>

                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] text-gray-500 font-bold uppercase">JSON Arguments</label>
                        <textarea
                          value={manualToolArgs}
                          onChange={(e) => setManualToolArgs(e.target.value)}
                          rows={6}
                          className="w-full px-3 py-2 bg-black/40 border border-white/5 rounded-lg text-xs text-accent-mono font-mono focus:outline-none focus:border-accent-blue/50 transition-all"
                        />
                      </div>

                      <button
                        onClick={handleExecuteTool}
                        disabled={isExecutingTool || !manualToolName}
                        className="w-full py-2.5 bg-accent-emerald/15 hover:bg-accent-emerald/35 text-accent-emerald font-bold rounded-lg text-xs transition cursor-pointer disabled:opacity-50"
                      >
                        {isExecutingTool ? 'Executing Tool...' : 'Execute Tool'}
                      </button>

                      <div className="flex flex-col gap-2 flex-grow">
                        <label className="text-[10px] text-gray-500 font-bold uppercase">Execution Output</label>
                        <div className="bg-black/40 border border-white/5 rounded-xl p-4 font-mono text-[10px] text-gray-300 overflow-y-auto whitespace-pre-wrap select-text leading-relaxed">
                          {manualToolResult || 'Execution result will be displayed here.'}
                        </div>
                      </div>
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
