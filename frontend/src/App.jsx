import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Wrench, 
  Send, 
  Trash2, 
  RefreshCw, 
  Volume2, 
  FileText, 
  Calendar, 
  Globe,
  AlertCircle,
  LayoutDashboard,
  MessageSquare,
  CheckCircle,
  History,
  Settings,
  Edit3,
  Save,
  Copy
} from 'lucide-react';

// Helper to parse markdown tables into premium HTML tables
const parseTables = (text) => {
  if (!text) return '';
  const lines = text.split('\n');
  let inTable = false;
  let tableHtml = '';
  const outputLines = [];
  let headers = [];
  let columnAlignments = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // A table separator line matches pattern of dashes, colons, pipes, and whitespace
    const isSeparator = line.includes('|') && line.match(/^[\s:-|]+$/);
    // A table content line has at least one pipe
    const isTableLine = line.includes('|');

    if (isTableLine) {
      let cells = line.split('|').map(c => c.trim());
      if (line.startsWith('|') && cells[0] === '') cells.shift();
      if (line.endsWith('|') && cells[cells.length - 1] === '') cells.pop();

      if (!inTable) {
        // Look ahead to see if the next line is a separator row
        const nextLine = lines[i + 1] ? lines[i + 1].trim() : '';
        const nextIsSeparator = nextLine.includes('|') && nextLine.match(/^[\s:-|]+$/);
        
        if (nextIsSeparator) {
          inTable = true;
          headers = cells;
          columnAlignments = [];
          
          // Skip the next line since it is the separator
          i++; 
          
          // Parse alignments from separator line
          let sepCells = nextLine.split('|').map(c => c.trim());
          if (nextLine.startsWith('|') && sepCells[0] === '') sepCells.shift();
          if (nextLine.endsWith('|') && sepCells[sepCells.length - 1] === '') sepCells.pop();
          
          columnAlignments = sepCells.map(cell => {
            if (cell.startsWith(':') && cell.endsWith(':')) return 'center';
            if (cell.endsWith(':')) return 'right';
            return 'left';
          });

          tableHtml = '<div class="overflow-x-auto my-4"><table class="w-full text-left text-xs border-collapse border border-white/10 rounded-xl overflow-hidden shadow-sm">';
          tableHtml += '<thead class="bg-white/[0.02] border-b border-white/10 text-gray-300 font-semibold">';
          tableHtml += '<tr>';
          headers.forEach((header, idx) => {
            const alignClass = columnAlignments[idx] === 'center' ? 'text-center' : columnAlignments[idx] === 'right' ? 'text-right' : 'text-left';
            tableHtml += `<th class="py-2.5 px-3 font-semibold ${alignClass}">${header}</th>`;
          });
          tableHtml += '</tr></thead>';
          tableHtml += '<tbody class="divide-y divide-white/5">';
        } else {
          // Not a table start, treat as normal text line
          outputLines.push(lines[i]);
        }
      } else {
        // Inside a table, append row
        if (isSeparator) {
          continue;
        }
        tableHtml += '<tr class="hover:bg-white/[0.02] border-b border-white/5 transition-all">';
        cells.forEach((cell, idx) => {
          const alignClass = columnAlignments[idx] === 'center' ? 'text-center' : columnAlignments[idx] === 'right' ? 'text-right' : 'text-left';
          tableHtml += `<td class="py-2 px-3 font-mono text-[11px] text-gray-300 ${alignClass}">${cell}</td>`;
        });
        if (cells.length < headers.length) {
          for (let j = cells.length; j < headers.length; j++) {
            tableHtml += '<td class="py-2 px-3"></td>';
          }
        }
        tableHtml += '</tr>';
      }
    } else {
      if (inTable) {
        tableHtml += '</tbody></table></div>';
        outputLines.push('\n\n' + tableHtml + '\n\n');
        inTable = false;
        tableHtml = '';
      }
      outputLines.push(lines[i]);
    }
  }

  if (inTable) {
    tableHtml += '</tbody></table></div>';
    outputLines.push('\n\n' + tableHtml + '\n\n');
  }

  return outputLines.join('\n');
};

// Markdown parser with simple regex
const parseMarkdown = (text) => {
  if (!text) return '';
  
  // Strip XML tags like <action>, </action>, <speech>, </speech>
  const cleanedText = text
    .replace(/<\/?action>/gi, '')
    .replace(/<\/?speech>/gi, '');

  // Escape HTML entities to prevent XSS
  let html = cleanedText
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Extract and stash code blocks to prevent parsing links/markdown inside code elements
  const codeBlocks = [];
  html = html.replace(/```([\s\S]*?)```/g, (match, code) => {
    const id = `__CODE_BLOCK_${codeBlocks.length}__`;
    codeBlocks.push(`<pre><code>${code.trim()}</code></pre>`);
    return id;
  });
  
  // Extract and stash inline code blocks
  const inlineCodes = [];
  html = html.replace(/`([^`]+)`/g, (match, code) => {
    const id = `__INLINE_CODE_${inlineCodes.length}__`;
    inlineCodes.push(`<code>${code}</code>`);
    return id;
  });

  // Parse raw HTML tables: match escaped table tags, decode them, and inject premium Tailwind classes
  html = html.replace(/&lt;table([\s\S]*?)&lt;\/table&gt;/gi, (match) => {
    let unescaped = match
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
    
    unescaped = unescaped.replace(/<table([^>]*)>/gi, '<div class="overflow-x-auto my-4"><table class="w-full text-left text-xs border-collapse border border-white/10 rounded-xl overflow-hidden shadow-sm"$1>');
    unescaped = unescaped.replace(/<\/table>/gi, '</table></div>');
    unescaped = unescaped.replace(/<thead([^>]*)>/gi, '<thead class="bg-white/[0.02] border-b border-white/10 text-gray-300 font-semibold"$1>');
    unescaped = unescaped.replace(/<tbody([^>]*)>/gi, '<tbody class="divide-y divide-white/5"$1>');
    unescaped = unescaped.replace(/<tr([^>]*)>/gi, '<tr class="hover:bg-white/[0.02] border-b border-white/5 transition-all"$1>');
    unescaped = unescaped.replace(/<th([^>]*)>/gi, '<th class="py-2.5 px-3 font-semibold text-left text-gray-300"$1>');
    unescaped = unescaped.replace(/<td([^>]*)>/gi, '<td class="py-2 px-3 font-mono text-[11px] text-gray-300 text-left"$1>');
    
    return '\n\n' + unescaped + '\n\n';
  });

  // Also support the <tabular> markdown wrapper as a legacy parse
  html = html.replace(/(?:&lt;|<)tabular(?:&gt;|>)([\s\S]*?)(?:&lt;|<)\/tabular(?:&gt;|>)/gi, (match, tableText) => {
    const decodedText = tableText
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
    return '\n\n' + parseTables(decodedText) + '\n\n';
  });
  
  // Also parse standard markdown tables globally (fallback)
  html = parseTables(html);
    
  // Headers
  html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');

  // Bold
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  
  // Bullet lists
  html = html.replace(/^\s*[-*]\s+(.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/g, '<ul>$1</ul>');
  html = html.replace(/<\/ul>\s*<ul>/g, '');

  // Markdown links: [Text](Url)
  html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-accent-blue hover:underline font-medium">$1</a>');

  // Raw URLs (excluding ones already converted or starting with href= or inside tags)
  html = html.replace(/(?<!href=")(?<!">)(https?:\/\/[^\s<]+)/g, (url) => {
    // Strip trailing punctuation from the url text for clean link boundaries
    const cleanUrl = url.replace(/[.,;:)]$^/, '');
    return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" class="text-accent-blue hover:underline font-medium">${cleanUrl}</a>`;
  });

  // Restore inline codes
  inlineCodes.forEach((code, idx) => {
    html = html.replace(`__INLINE_CODE_${idx}__`, code);
  });

  // Restore code blocks
  codeBlocks.forEach((code, idx) => {
    html = html.replace(`__CODE_BLOCK_${idx}__`, code);
  });
  
  // Paragraphs and Line Breaks
  const paragraphs = html.split(/\n\n+/);
  return paragraphs.map(p => {
    const trimmed = p.trim();
    if (!trimmed) return '';
    if (
      trimmed.startsWith('<pre>') || 
      trimmed.startsWith('<ul>') || 
      trimmed.startsWith('<h3>') || 
      trimmed.startsWith('<h2>') || 
      trimmed.startsWith('<h1>') ||
      trimmed.startsWith('<div') ||
      trimmed.startsWith('<table')
    ) {
      return trimmed;
    }
    return `<p>${trimmed.replace(/\n/g, '<br/>')}</p>`;
  }).filter(Boolean).join('');
};

// Helper to get tool icons dynamically
const getToolIcon = (name) => {
  const lowercase = name.toLowerCase();
  if (lowercase.includes('volume')) return <Volume2 className="w-4 h-4 text-accent-blue" />;
  if (lowercase.includes('notion') || lowercase.includes('file')) return <FileText className="w-4 h-4 text-accent-purple" />;
  if (lowercase.includes('calendar') || lowercase.includes('event')) return <Calendar className="w-4 h-4 text-accent-emerald" />;
  if (lowercase.includes('puppeteer') || lowercase.includes('browser') || lowercase.includes('web')) return <Globe className="w-4 h-4 text-blue-400" />;
  return <Wrench className="w-4 h-4 text-gray-400" />;
};

function App() {
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'dashboard'
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStatusLog, setCurrentStatusLog] = useState('');
  const [tools, setTools] = useState([]);
  const [config, setConfig] = useState({
    provider: 'ollama',
    model: 'loading...',
    openaiBaseUrl: 'default',
    port: 3000
  });

  // Metrics Dashboard States
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
      totalFetchUis: 0,
      totalAnnotations: 0,
      tools: {}
    }
  });
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);

  // System Prompt States
  const [systemPrompts, setSystemPrompts] = useState({ activePrompt: null, history: [] });
  const [editPromptText, setEditPromptText] = useState('');
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);
  const [isSavingPrompt, setIsSavingPrompt] = useState(false);
  const [isFetchingPrompt, setIsFetchingPrompt] = useState(false);
  const [promptError, setPromptError] = useState(null);
  const [promptSuccessMessage, setPromptSuccessMessage] = useState(null);
  const [selectedHistoryPrompt, setSelectedHistoryPrompt] = useState(null);

  const chatEndRef = useRef(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentStatusLog]);

  // Fetch backend status and config on mount
  const fetchData = async () => {
    try {
      const configRes = await fetch('http://localhost:3000/api/config');
      const configData = await configRes.json();
      if (configData.success) {
        setConfig({
          provider: configData.provider,
          model: configData.model,
          openaiBaseUrl: configData.openaiBaseUrl,
          port: configData.port
        });
        setIsConnected(true);
      }

      const toolsRes = await fetch('http://localhost:3000/api/tools');
      const toolsData = await toolsRes.json();
      if (toolsData.success) {
        setTools(toolsData.tools || []);
      }
    } catch (error) {
      console.error('Failed to connect to backend:', error);
      setIsConnected(false);
      setConfig(c => ({ ...c, model: 'Offline' }));
    }
  };

  // Fetch Telemetry metrics
  const fetchMetrics = async () => {
    setIsLoadingMetrics(true);
    try {
      const res = await fetch('http://localhost:3000/api/metrics');
      const data = await res.json();
      if (data.success) {
        setMetrics(data.metrics);
        // Refresh selectedRequest if it's currently open
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

  // Clear Telemetry metrics
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

  // System Prompt Operations
  const fetchSystemPrompt = async () => {
    setIsFetchingPrompt(true);
    setPromptError(null);
    try {
      const res = await fetch('http://localhost:3000/api/system-prompt');
      const data = await res.json();
      if (data.success) {
        setSystemPrompts(data);
        setEditPromptText(data.activePrompt?.prompt || '');
      } else {
        setPromptError(data.error || 'Failed to fetch system prompt');
      }
    } catch (err) {
      setPromptError(err.message || 'Network error fetching system prompt');
    } finally {
      setIsFetchingPrompt(false);
    }
  };

  const handleSavePrompt = async () => {
    if (!editPromptText.trim()) return;
    setIsSavingPrompt(true);
    setPromptError(null);
    setPromptSuccessMessage(null);
    try {
      const res = await fetch('http://localhost:3000/api/system-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: editPromptText })
      });
      const data = await res.json();
      if (data.success) {
        setPromptSuccessMessage('System prompt updated successfully!');
        setIsEditingPrompt(false);
        await fetchSystemPrompt();
      } else {
        setPromptError(data.error || 'Failed to save system prompt');
      }
    } catch (err) {
      setPromptError(err.message || 'Network error saving system prompt');
    } finally {
      setIsSavingPrompt(false);
    }
  };

  const handleActivatePrompt = async (id) => {
    setPromptError(null);
    setPromptSuccessMessage(null);
    try {
      const res = await fetch('http://localhost:3000/api/system-prompt/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (data.success) {
        setPromptSuccessMessage('Prompt version activated successfully!');
        await fetchSystemPrompt();
      } else {
        setPromptError(data.error || 'Failed to activate prompt');
      }
    } catch (err) {
      setPromptError(err.message || 'Network error activating prompt');
    }
  };

  const handleDeletePrompt = async (id) => {
    if (!window.confirm('Are you sure you want to delete this prompt revision from history?')) return;
    setPromptError(null);
    setPromptSuccessMessage(null);
    try {
      const res = await fetch(`http://localhost:3000/api/system-prompt/${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setPromptSuccessMessage('Prompt revision deleted successfully.');
        if (selectedHistoryPrompt?.id === id) {
          setSelectedHistoryPrompt(null);
        }
        await fetchSystemPrompt();
      } else {
        setPromptError(data.error || 'Failed to delete prompt');
      }
    } catch (err) {
      setPromptError(err.message || 'Network error deleting prompt');
    }
  };

  useEffect(() => {
    fetchData();
    fetchSystemPrompt();
    fetchMetrics();
  }, []);

  // Poll metrics every 5 seconds when dashboard is active or processing a chat request
  useEffect(() => {
    let interval = null;
    if (activeTab === 'dashboard' || isProcessing) {
      fetchMetrics(); // initial fetch
      interval = setInterval(() => {
        fetchMetrics();
      }, 5000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeTab, isProcessing]);

  const handleSend = async (textToSend) => {
    const inputMsg = textToSend || prompt;
    if (!inputMsg.trim() || isProcessing) return;

    if (!textToSend) setPrompt('');

    // Append user message
    const userMessage = { role: 'user', content: inputMsg };
    setMessages(prev => [...prev, userMessage]);
    setIsProcessing(true);
    setCurrentStatusLog('Initializing connection...');

    // Prepare container for assistant message streaming
    const assistantMsgIndex = messages.length + 1;
    setMessages(prev => [...prev, { role: 'assistant', content: '', logs: [] }]);

    try {
      const response = await fetch('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: inputMsg, history: messages })
      });

      if (!response.body) {
        throw new Error('ReadableStream not supported by response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        // Keep the last incomplete line
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const rawData = line.slice(6).trim();
            if (!rawData) continue;

            try {
              const { type, content } = JSON.parse(rawData);

              if (type === 'status') {
                setCurrentStatusLog(content);
                setMessages(prev => {
                  const updated = [...prev];
                  if (updated[assistantMsgIndex]) {
                    const currentLogs = updated[assistantMsgIndex].logs || [];
                    if (!currentLogs.includes(content)) {
                      updated[assistantMsgIndex].logs = [...currentLogs, content];
                    }
                  }
                  return updated;
                });
              } else if (type === 'result') {
                setMessages(prev => {
                  const updated = [...prev];
                  if (updated[assistantMsgIndex]) {
                    if (content && typeof content === 'object') {
                      updated[assistantMsgIndex].content = content.content || '';
                      updated[assistantMsgIndex].speech = content.speech || '';
                    } else {
                      updated[assistantMsgIndex].content = content;
                    }
                  }
                  return updated;
                });
                setCurrentStatusLog('');
              } else if (type === 'error') {
                setMessages(prev => {
                  const updated = [...prev];
                  if (updated[assistantMsgIndex]) {
                    updated[assistantMsgIndex].content = `Error: ${content}`;
                    updated[assistantMsgIndex].isError = true;
                  }
                  return updated;
                });
                setCurrentStatusLog('');
              }
            } catch (e) {
              console.error('Error parsing line:', line, e);
            }
          }
        }
      }
    } catch (err) {
      console.error('Stream processing failed:', err);
      setMessages(prev => {
        const updated = [...prev];
        if (updated[assistantMsgIndex]) {
          updated[assistantMsgIndex].content = `Failed to connect or stream from backend assistant. Make sure the backend server is running.`;
          updated[assistantMsgIndex].isError = true;
        }
        return updated;
      });
      setCurrentStatusLog('');
    } finally {
      setIsProcessing(false);
      // Fetch latest metrics after run completes
      fetchMetrics();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  // Preset prompts
  const starterPrompts = [
    { label: "🔊 Set volume to 50%", text: "Set volume to 50%" },
    { label: "📝 Create a Notion Note", text: "Create a note in Notion with the title 'Quick Ideas' and contents '1. Build React Web App\n2. Add OpenAI integration'" },
    { label: "📅 List Calendar Events", text: "What do I have on my calendar for today?" },
    { label: "🌐 Scrape Website", text: "Search the web for local weather and give me a summary" }
  ];

  return (
    <div className="flex w-screen h-screen bg-bg-primary overflow-hidden text-gray-200">
      {/* Sidebar Panel */}
      <aside className="w-80 bg-bg-secondary border-r border-border-color flex flex-col p-6 h-full flex-shrink-0">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-accent-gradient flex items-center justify-center shadow-glow">
            <Sparkles className="text-white w-[22px] h-[22px]" />
          </div>
          <h1 className="text-xl font-bold bg-accent-gradient bg-clip-text text-transparent tracking-tight">Antigravity Hub</h1>
        </div>

        {/* Sidebar Navigation Tabs */}
        <div className="flex flex-col gap-1 mb-6">
          <button 
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${activeTab === 'chat' ? 'bg-accent-purple/10 text-accent-purple border border-accent-purple/20' : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'}`}
          >
            <MessageSquare className="w-4 h-4" />
            Chat Assistant
          </button>
          <button 
            onClick={() => {
              setActiveTab('dashboard');
              fetchMetrics();
            }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${activeTab === 'dashboard' ? 'bg-accent-blue/10 text-accent-blue border border-accent-blue/20' : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'}`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Admin Dashboard
          </button>
          <button 
            onClick={() => {
              setActiveTab('system-prompt');
              fetchSystemPrompt();
            }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${activeTab === 'system-prompt' ? 'bg-accent-emerald/10 text-accent-emerald border border-accent-emerald/20' : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'}`}
          >
            <Settings className="w-4 h-4" />
            System Prompt
          </button>
        </div>

        {/* Status indicator Card */}
        <div className="bg-bg-card border border-border-color rounded-2xl p-4 mb-6 shadow-sm backdrop-blur-md">
          <div className="flex items-center justify-between mb-3 text-xs uppercase tracking-wider text-gray-400 font-semibold">
            System status
            <span className="flex items-center gap-1.5 font-bold normal-case text-gray-200">
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-accent-emerald shadow-[0_0_10px_var(--color-accent-emerald)] animate-pulse' : 'bg-red-500 shadow-[0_0_10px_#ef4444]'}`}></span>
              {isConnected ? 'Online' : 'Offline'}
            </span>
          </div>
          <div className="flex flex-col gap-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">LLM Provider:</span>
              <span className="font-mono text-gray-200 font-semibold uppercase">{config.provider}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Active Model:</span>
              <span className="font-mono text-gray-200 font-semibold text-[10px] max-w-[150px] truncate" title={config.model}>{config.model}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Port:</span>
              <span className="font-mono text-gray-200 font-semibold">{config.port}</span>
            </div>
          </div>
        </div>

        {/* Recent Requests / Chart History */}
        <div className="flex flex-col flex-grow overflow-hidden mt-2">
          <div className="flex items-center gap-2 mb-3 text-gray-400">
            <History size={16} className="text-accent-purple" />
            <h2 className="text-xs font-bold uppercase tracking-wider">Recent Requests ({metrics.requests?.length || 0})</h2>
          </div>
          <div className="flex flex-col gap-2 overflow-y-auto pr-1 flex-grow">
            {metrics.requests?.length === 0 ? (
              <div className="text-gray-500 text-xs text-center py-4 border border-dashed border-white/5 rounded-xl">
                No history recorded yet.
              </div>
            ) : (
              metrics.requests?.map((req) => {
                const isSelected = selectedRequest?.id === req.id;
                return (
                  <button
                    key={req.id}
                    onClick={() => {
                      setSelectedRequest(req);
                      setActiveTab('dashboard');
                    }}
                    className={`p-3 text-left rounded-xl transition-all duration-200 border text-xs ${
                      isSelected
                        ? 'bg-accent-blue/10 border-accent-blue/30 text-white font-semibold'
                        : 'bg-white/5 hover:bg-white/10 border-transparent text-gray-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-[8px] font-bold font-mono px-1.5 py-0.5 rounded-full ${req.success ? 'bg-accent-emerald/10 text-accent-emerald' : 'bg-red-500/10 text-red-400'}`}>
                        {req.success ? 'SUCCESS' : 'FAILED'}
                      </span>
                      <span className="text-[9px] font-mono text-gray-500">
                        {req.totalDuration ? `${(req.totalDuration / 1000).toFixed(1)}s` : 'N/A'}
                      </span>
                    </div>
                    <p className="font-medium truncate mb-1 text-gray-200">{req.prompt}</p>
                    <div className="flex items-center justify-between text-[8px] text-gray-500">
                      <span>{new Date(req.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {req.toolCalls?.length > 0 && (
                        <span className="font-semibold text-accent-purple">
                          {req.toolCalls.length} tool{req.toolCalls.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </aside>

      {/* Main Panel Content */}
      <main className="flex-grow flex flex-col h-full bg-transparent overflow-hidden">
        {activeTab === 'chat' ? (
          /* CHAT INTERFACE */
          <div className="flex flex-col h-full overflow-hidden">
            {/* Chat header area */}
            <div className="h-16 px-6 border-b border-border-color flex items-center justify-between backdrop-blur-md bg-bg-secondary/40 z-10 flex-shrink-0">
              <div className="flex items-center gap-3">
                <h2 className="text-md font-semibold text-white">Personal Assistant Agent</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/5 text-accent-purple font-mono uppercase tracking-wider border border-accent- purple/10">
                  {config.provider === 'openai' ? 'OpenAI SDK' : 'Ollama API'}
                </span>
              </div>
              <div className="flex gap-2">
                <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-lg text-xs font-medium transition-all" onClick={fetchData} title="Sync backend connection state">
                  <RefreshCw size={12} /> Sync
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-lg text-xs font-medium transition-all text-red-400 hover:text-red-300 disabled:opacity-50" onClick={clearChat} disabled={messages.length === 0} title="Clear chat history">
                  <Trash2 size={12} /> Clear Chat
                </button>
              </div>
            </div>

            {/* Messages list */}
            <div className="flex-grow overflow-y-auto px-6 py-6 flex flex-col gap-6">
              {messages.length === 0 ? (
                <div className="m-auto max-w-xl text-center py-12">
                  <div className="w-16 h-16 rounded-2xl bg-accent-gradient flex items-center justify-center m-auto mb-6 shadow-glow">
                    <Sparkles className="text-white w-8 h-8" />
                  </div>
                  <h2 className="text-2xl font-bold text-white tracking-tight mb-2">Personal AI Assistant</h2>
                  <p className="text-sm text-gray-400 leading-relaxed mb-8">
                    Interact with your system volume, Notion pages, local file system, and Google calendar.
                    The assistant reasoning loop will call local tools dynamically to satisfy your prompt.
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="p-4 bg-white/5 border border-white/5 rounded-2xl text-left hover:bg-white/10 transition-all">
                      <div className="flex items-center gap-2 text-xs font-bold text-white mb-1">
                        <Volume2 size={14} className="text-accent-blue" />
                        System Audio
                      </div>
                      <span className="text-xs text-gray-500 leading-relaxed">Controls system volume levels directly on your Mac.</span>
                    </div>
                    <div className="p-4 bg-white/5 border border-white/5 rounded-2xl text-left hover:bg-white/10 transition-all">
                      <div className="flex items-center gap-2 text-xs font-bold text-white mb-1">
                        <FileText size={14} className="text-accent-purple" />
                        Notion Notes
                      </div>
                      <span className="text-xs text-gray-500 leading-relaxed">Read notes, search pages, and append content to your workspace.</span>
                    </div>
                    <div className="p-4 bg-white/5 border border-white/5 rounded-2xl text-left hover:bg-white/10 transition-all">
                      <div className="flex items-center gap-2 text-xs font-bold text-white mb-1">
                        <Calendar size={14} className="text-accent-emerald" />
                        Google Calendar
                      </div>
                      <span className="text-xs text-gray-500 leading-relaxed">View meetings, create events, and manage calendars.</span>
                    </div>
                    <div className="p-4 bg-white/5 border border-white/5 rounded-2xl text-left hover:bg-white/10 transition-all">
                      <div className="flex items-center gap-2 text-xs font-bold text-white mb-1">
                        <Globe size={14} className="text-blue-400" />
                        Web Scraper
                      </div>
                      <span className="text-xs text-gray-500 leading-relaxed">Automate browser queries, search the web, and scrape details.</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 justify-center">
                    {starterPrompts.map((p, i) => (
                      <button key={i} className="px-3.5 py-2 bg-white/5 hover:bg-white/10 rounded-full text-xs font-medium transition-all border border-white/5 hover:border-white/10 text-gray-300" onClick={() => handleSend(p.text)}>
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div key={idx} className={`flex flex-col gap-1 max-w-[85%] ${msg.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
                    <div className="text-[10px] text-gray-500 font-semibold tracking-wider px-1">
                      {msg.role === 'user' ? 'YOU' : 'ASSISTANT'}
                    </div>
                    <div className={`p-4 rounded-2xl border text-sm leading-relaxed ${msg.role === 'user' ? 'bg-accent-purple/10 border-accent-purple/20 text-white rounded-tr-none' : 'bg-bg-secondary/40 border-white/5 rounded-tl-none'}`}>
                      {msg.role === 'user' ? (
                        <p>{msg.content}</p>
                      ) : (
                        <div className="markdown-body" dangerouslySetInnerHTML={{ __html: parseMarkdown(msg.content) || (msg.isError ? 'An error occurred' : 'Thinking...') }} />
                      )}
                    </div>
                    
                    {msg.role === 'assistant' && msg.speech && (
                      <div className="speech-bubble-container">
                        <Volume2 className="speech-icon" size={14} />
                        <span className="speech-text">"{msg.speech}"</span>
                      </div>
                    )}
                    
                    {/* Active loop status display */}
                    {msg.role === 'assistant' && msg.logs && msg.logs.length > 0 && (
                      <div className="flex items-center gap-2 mt-2 px-1 text-[11px] text-gray-500 font-mono">
                        {isProcessing && idx === messages.length - 1 && <span className="w-1.5 h-1.5 rounded-full bg-accent-purple animate-ping"></span>}
                        <div>
                          <strong className="text-gray-400 font-medium">Reasoning path:</strong>{' '}
                          {msg.logs.map((log, lIdx) => (
                            <span key={lIdx}>
                              {lIdx > 0 && ' → '}<span className="text-accent-blue font-bold">{log}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}

              {/* Running indicator for current action */}
              {isProcessing && currentStatusLog && (
                <div className="flex flex-col gap-1 mr-auto items-start max-w-[85%]">
                  <div className="text-[10px] text-gray-500 font-semibold tracking-wider px-1">ASSISTANT</div>
                  <div className="p-4 rounded-2xl border bg-bg-secondary/40 border-white/5 rounded-tl-none flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-accent-blue animate-pulse shadow-[0_0_8px_var(--color-accent-blue)]"></span>
                    <span className="text-xs text-gray-400 font-mono">{currentStatusLog}</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input box area */}
            <div className="p-6 bg-gradient-to-t from-bg-primary via-bg-primary to-transparent flex-shrink-0">
              <div className="max-w-3xl m-auto">
                <div className="flex items-end gap-2 p-2 bg-bg-secondary border border-border-color rounded-2xl shadow-md focus-within:border-accent-purple/50 transition-all">
                  <textarea
                    className="flex-grow bg-transparent border-0 ring-0 focus:ring-0 focus:outline-none text-sm text-gray-200 placeholder-gray-500 resize-none max-h-36 py-2 px-3 leading-relaxed"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask anything (e.g. Set volume to 30%, draft a note...)"
                    disabled={isProcessing}
                    rows={1}
                  />
                  <button 
                    className="w-9 h-9 flex items-center justify-center bg-accent-purple hover:bg-accent-purple/80 text-white rounded-xl disabled:opacity-50 transition-all shadow-sm"
                    onClick={() => handleSend()}
                    disabled={!prompt.trim() || isProcessing}
                  >
                    <Send size={16} />
                  </button>
                </div>
                {messages.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {starterPrompts.slice(0, 3).map((p, i) => (
                      <button key={i} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-full text-xs transition-all text-gray-400 hover:text-white" onClick={() => handleSend(p.text)} disabled={isProcessing}>
                        {p.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : activeTab === 'dashboard' ? (
          /* ADMIN METRICS DASHBOARD VIEW */
          <div className="flex flex-grow h-full overflow-hidden">
            {/* Dashboard main content area */}
            <div className="flex-grow flex flex-col h-full overflow-y-auto bg-bg-primary/20 p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                
                {/* Left Area (2/3 width): Telemetry drill-down or diagnostics aggregates */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                  {selectedRequest ? (
                    /* REQUEST DETAIL VIEW */
                    <div className="flex flex-col gap-6">
                      {/* Detail Header */}
                      <div className="flex items-center justify-between pb-4 border-b border-border-color">
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => setSelectedRequest(null)}
                            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-lg text-xs font-semibold text-gray-400 hover:text-white transition"
                          >
                            ← Back to Aggregates
                          </button>
                          <span className="text-sm font-semibold text-gray-400">Request Details</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-gray-500">
                          <span>ID: {selectedRequest.id}</span>
                          <span>•</span>
                          <span>{new Date(selectedRequest.timestamp).toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Prompt Box */}
                      <div className="bg-white/5 border border-white/5 rounded-2xl p-5">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-2">User Prompt</span>
                        <p className="text-sm text-white font-medium select-text">{selectedRequest.prompt}</p>
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
                          <span className="font-mono text-sm font-bold text-accent-purple">{selectedRequest.retrievalDuration || 0} ms</span>
                        </div>
                        <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                          <span className="text-[9px] font-semibold text-gray-500 uppercase block mb-1">Tools Executed</span>
                          <span className="font-mono text-sm font-bold text-accent-blue">{selectedRequest.toolCalls?.length || 0} calls</span>
                        </div>
                      </div>

                      {/* Targeted Action Telemetries */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex justify-between items-center text-xs">
                          <span className="text-gray-400">Screenshots:</span>
                          <span className="font-mono font-bold text-white bg-white/5 px-2 py-0.5 rounded">{selectedRequest.screenshotCount || 0}</span>
                        </div>
                        <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex justify-between items-center text-xs">
                          <span className="text-gray-400">Apple Scripts:</span>
                          <span className="font-mono font-bold text-white bg-white/5 px-2 py-0.5 rounded">{selectedRequest.appleScriptCount || 0}</span>
                        </div>
                        <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex justify-between items-center text-xs">
                          <span className="text-gray-400">Fetch UI:</span>
                          <span className="font-mono font-bold text-white bg-white/5 px-2 py-0.5 rounded">{selectedRequest.fetchUiCount || 0}</span>
                        </div>
                        <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex justify-between items-center text-xs">
                          <span className="text-gray-400">Annotations:</span>
                          <span className="font-mono font-bold text-white bg-white/5 px-2 py-0.5 rounded">{selectedRequest.annotateCount || 0}</span>
                        </div>
                      </div>

                      {/* Visual Step Timeline */}
                      <div>
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Execution Steps & Latency Breakdown</h4>
                        {selectedRequest.toolCalls?.length === 0 ? (
                          <div className="text-xs text-gray-500 py-4 bg-white/5 border border-white/5 border-dashed rounded-2xl text-center">
                            No tools were executed during this reasoning run.
                          </div>
                        ) : (
                          <div className="flex flex-col gap-3">
                            {selectedRequest.toolCalls.map((step, idx) => (
                              <div key={idx} className="bg-bg-secondary/40 border border-white/5 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-start gap-3">
                                  <span className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-bold text-gray-400 flex-shrink-0 mt-0.5">{idx + 1}</span>
                                  <div>
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                      <span className="font-mono text-xs font-bold text-white">{step.name}</span>
                                      <span className={`text-[8px] font-bold font-mono px-1 rounded ${step.success ? 'bg-accent-emerald/10 text-accent-emerald' : 'bg-red-500/10 text-red-400'}`}>
                                        {step.success ? 'SUCCESS' : 'FAILED'}
                                      </span>
                                    </div>
                                    <span className="text-[10px] text-gray-500 block font-mono mb-2">Args: {JSON.stringify(step.args)}</span>
                                    {step.error && (
                                      <span className="text-[10px] text-red-400 block font-mono">Error: {step.error}</span>
                                    )}
                                    {step.resultSummary && (
                                      <div className="text-[10px] text-gray-400 bg-black/20 p-2 rounded border border-white/5 font-mono max-h-24 overflow-y-auto whitespace-pre-wrap leading-relaxed">
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
                    /* METRICS AGGREGATES VIEW */
                    <div className="flex flex-col gap-6">
                      {/* Dashboard Title Header */}
                      <div className="flex items-center justify-between pb-4 border-b border-border-color">
                        <div>
                          <h2 className="text-md font-semibold text-white font-sans">Diagnostics & Performance</h2>
                          <p className="text-xs text-gray-400">Review metrics, API diagnostics, and tool latencies in real time.</p>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={fetchMetrics}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-lg text-xs font-medium transition"
                            title="Refresh statistics"
                          >
                            <RefreshCw size={12} className={isLoadingMetrics ? 'animate-spin' : ''} /> Refresh
                          </button>
                          <button 
                            onClick={handleClearTelemetry}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 rounded-lg text-xs font-semibold transition"
                            title="Delete logs history"
                          >
                            <Trash2 size={12} /> Clear Telemetry
                          </button>
                        </div>
                      </div>

                      {/* Summary metrics cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Card 1: Total requests & Success rate */}
                        <div className="bg-white/5 border border-white/5 rounded-2xl p-5">
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
                        <div className="bg-white/5 border border-white/5 rounded-2xl p-5">
                          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Average Latency</span>
                          <div className="flex items-baseline gap-2 mb-2">
                            <span className="text-3xl font-extrabold text-accent-purple">{metrics.aggregates?.averageDuration ? `${(metrics.aggregates.averageDuration / 1000).toFixed(1)}s` : '0.0s'}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs border-t border-white/5 pt-2">
                            <span className="text-gray-400">Avg RAG Duration:</span>
                            <span className="font-semibold text-accent-purple">{metrics.aggregates?.averageRetrievalDuration || 0} ms</span>
                          </div>
                        </div>

                        {/* Card 3: Execution metrics */}
                        <div className="bg-white/5 border border-white/5 rounded-2xl p-5">
                          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Tools Execution</span>
                          <div className="flex items-baseline gap-2 mb-2">
                            <span className="text-3xl font-extrabold text-accent-blue">{metrics.aggregates?.totalToolCalls || 0}</span>
                            <span className="text-xs text-gray-500">calls</span>
                          </div>
                          <div className="flex justify-between items-center text-xs border-t border-white/5 pt-2">
                            <span className="text-gray-400">Avg Calls/Run:</span>
                            <span className="font-semibold text-accent-blue">
                              {metrics.aggregates?.totalRequests ? (metrics.aggregates.totalToolCalls / metrics.aggregates.totalRequests).toFixed(1) : '0.0'}
                            </span>
                          </div>
                        </div>

                        {/* Card 4: Accuracy Metrics */}
                        <div className="bg-white/5 border border-white/5 rounded-2xl p-5">
                          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Agent Reliability</span>
                          <div className="flex items-baseline gap-2 mb-2">
                            <span className="text-3xl font-extrabold text-accent-emerald">
                              {metrics.aggregates?.totalToolCalls ? `${((metrics.aggregates.successfulToolCalls / metrics.aggregates.totalToolCalls) * 100).toFixed(0)}%` : '100%'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-xs border-t border-white/5 pt-2">
                            <span className="text-gray-400">Failed tool runs:</span>
                            <span className="font-semibold text-red-400">{metrics.aggregates?.failedToolCalls || 0}</span>
                          </div>
                        </div>
                      </div>

                      {/* Cumulative telemetries */}
                      <div className="bg-white/5 border border-white/5 rounded-2xl p-5">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-4">Total Interaction Breakdown</span>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="bg-black/20 p-4 rounded-xl border border-white/5 text-xs flex flex-col gap-1.5">
                            <span className="text-gray-400">Screenshots:</span>
                            <span className="font-mono font-semibold text-white">{metrics.aggregates?.totalScreenshots || 0}</span>
                          </div>
                          <div className="bg-black/20 p-4 rounded-xl border border-white/5 text-xs flex flex-col gap-1.5">
                            <span className="text-gray-400">Apple Scripts:</span>
                            <span className="font-mono font-semibold text-white">{metrics.aggregates?.totalAppleScripts || 0}</span>
                          </div>
                          <div className="bg-black/20 p-4 rounded-xl border border-white/5 text-xs flex flex-col gap-1.5">
                            <span className="text-gray-400">Fetch UI (elements):</span>
                            <span className="font-mono font-semibold text-white">{metrics.aggregates?.totalFetchUis || 0}</span>
                          </div>
                          <div className="bg-black/20 p-4 rounded-xl border border-white/5 text-xs flex flex-col gap-1.5">
                            <span className="text-gray-400">Annotations:</span>
                            <span className="font-mono font-semibold text-white">{metrics.aggregates?.totalAnnotations || 0}</span>
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
                  )}
                </div>

                {/* Right Area (1/3 width): Available Tools list card */}
                <div className="flex flex-col gap-6 lg:sticky lg:top-6">
                  <div className="bg-white/5 border border-white/5 rounded-2xl p-5 flex flex-col max-h-[calc(100vh-80px)] overflow-hidden">
                    <div className="flex items-center gap-2 mb-4 text-gray-200">
                      <Wrench className="w-4 h-4 text-accent-purple" />
                      <span className="text-xs font-bold uppercase tracking-wider">Available Tools ({tools.length})</span>
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
                              <div className="flex items-center gap-2 mb-1">
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
            </div>
          </div>
        ) : (
          /* SYSTEM PROMPT MANAGER VIEW */
          <div className="flex flex-grow h-full overflow-hidden p-6 flex-col">
            {/* System Prompt Header */}
            <div className="flex items-center justify-between pb-4 border-b border-border-color mb-6 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <Settings className="w-5 h-5 text-accent-emerald" />
                <div>
                  <h2 className="text-md font-semibold text-white font-sans">System Prompt Manager</h2>
                  <p className="text-xs text-gray-400">Configure instructions and rules that control the AI assistant's personality and tools.</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={fetchSystemPrompt}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-lg text-xs font-medium transition"
                  title="Reload prompts from database"
                >
                  <RefreshCw size={12} className={isFetchingPrompt ? 'animate-spin' : ''} /> Reload
                </button>
              </div>
            </div>

            {/* Alert Logs */}
            {promptError && (
              <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs flex gap-2 items-center flex-shrink-0 animate-fadeIn">
                <AlertCircle size={14} className="flex-shrink-0" />
                <span>{promptError}</span>
              </div>
            )}
            {promptSuccessMessage && (
              <div className="mb-4 p-4 bg-accent-emerald/10 border border-accent-emerald/20 text-accent-emerald rounded-xl text-xs flex gap-2 items-center flex-shrink-0 animate-fadeIn">
                <CheckCircle size={14} className="flex-shrink-0" />
                <span>{promptSuccessMessage}</span>
              </div>
            )}

            {/* Side-by-Side Prompt layout */}
            <div className="flex-grow grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden h-full">
              {/* Left Side: Revision History */}
              <div className="flex flex-col bg-white/5 border border-white/5 rounded-2xl p-5 overflow-hidden h-full">
                <div className="flex items-center gap-2 mb-4 flex-shrink-0">
                  <History className="w-4 h-4 text-accent-purple" />
                  <span className="text-xs font-bold text-gray-200 uppercase tracking-wider">Revision History</span>
                  <span className="ml-auto px-2 py-0.5 bg-white/5 rounded-full font-mono text-[10px] text-gray-400">
                    {systemPrompts.history?.length || 0}
                  </span>
                </div>

                <div className="flex-grow overflow-y-auto overflow-x-auto pr-1">
                  {isFetchingPrompt && systemPrompts.history?.length === 0 ? (
                    <div className="text-center text-xs text-gray-500 py-12 flex flex-col items-center gap-2">
                      <RefreshCw size={16} className="animate-spin text-accent-purple" />
                      Loading revisions...
                    </div>
                  ) : systemPrompts.history?.length === 0 ? (
                    <div className="text-center text-xs text-gray-500 py-12">No history recorded yet.</div>
                  ) : (
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-white/[0.02] text-gray-400 border-b border-white/10">
                          <th className="font-semibold py-3 px-3 rounded-l-xl text-left">Revision</th>
                          <th className="font-semibold py-3 px-3 text-left">Preview</th>
                          <th className="font-semibold py-3 px-3 text-left">Status</th>
                          <th className="font-semibold py-3 px-3 text-left">Date</th>
                          <th className="font-semibold py-3 px-3 rounded-r-xl text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {systemPrompts.history.map((item) => {
                          const isActive = item.is_active === 1;
                          const dateStr = new Date(item.created_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          });
                          return (
                            <tr key={item.id} className={`hover:bg-white/[0.02] border-b border-white/5 transition-all ${isActive ? 'bg-accent-emerald/[0.02]' : ''}`}>
                              <td className="py-3 px-3 font-mono font-bold text-white">#{item.id}</td>
                              <td className="py-3 px-3 text-gray-400 max-w-[150px] truncate" title={item.prompt}>{item.prompt}</td>
                              <td className="py-3 px-3">
                                <span className={`text-[8px] font-bold font-mono px-1.5 py-0.5 rounded-full ${isActive ? 'bg-accent-emerald/10 text-accent-emerald border border-accent-emerald/20' : 'bg-white/5 text-gray-400 border border-white/5'}`}>
                                  {isActive ? 'ACTIVE' : 'INACTIVE'}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-gray-500 text-[10px] whitespace-nowrap">{dateStr}</td>
                              <td className="py-3 px-3 text-right">
                                <div className="flex gap-2.5 justify-end">
                                  <button
                                    onClick={() => setSelectedHistoryPrompt(item)}
                                    className="text-accent-blue hover:underline font-semibold bg-transparent border-0 cursor-pointer p-0 text-[11px]"
                                  >
                                    Details
                                  </button>
                                  {!isActive && (
                                    <>
                                      <button
                                        onClick={() => handleActivatePrompt(item.id)}
                                        className="text-accent-emerald hover:underline font-semibold bg-transparent border-0 cursor-pointer p-0 text-[11px]"
                                      >
                                        Activate
                                      </button>
                                      <button
                                        onClick={() => handleDeletePrompt(item.id)}
                                        className="text-red-400 hover:text-red-300 font-semibold bg-transparent border-0 cursor-pointer p-0 text-[11px]"
                                      >
                                        Delete
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* Right Side: Active Prompt Editor */}
              <div className="lg:col-span-2 flex flex-col bg-white/5 border border-white/5 rounded-2xl p-5 overflow-hidden h-full">
                <div className="flex items-center justify-between mb-4 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-accent-emerald shadow-[0_0_8px_var(--color-accent-emerald)] animate-pulse"></span>
                    <span className="text-xs font-bold text-gray-200 uppercase tracking-wider">Active System Prompt</span>
                  </div>
                  {!isEditingPrompt ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(systemPrompts.activePrompt?.prompt || '');
                          alert('System prompt copied to clipboard!');
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-lg text-xs font-medium transition text-gray-300 hover:text-white"
                      >
                        <Copy size={12} /> Copy Prompt
                      </button>
                      <button
                        onClick={() => {
                          setEditPromptText(systemPrompts.activePrompt?.prompt || '');
                          setIsEditingPrompt(true);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-emerald/10 text-accent-emerald border border-accent-emerald/20 hover:bg-accent-emerald/20 rounded-lg text-xs font-semibold transition"
                      >
                        <Edit3 size={12} /> Edit Prompt
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setIsEditingPrompt(false)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-lg text-xs font-medium transition text-gray-400 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSavePrompt}
                        disabled={isSavingPrompt || !editPromptText.trim()}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-emerald text-white rounded-lg text-xs font-semibold transition hover:bg-accent-emerald/80 disabled:opacity-50"
                      >
                        <Save size={12} /> {isSavingPrompt ? 'Saving...' : 'Save as New Revision'}
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex-grow overflow-hidden flex flex-col">
                  {isEditingPrompt ? (
                    <textarea
                      value={editPromptText}
                      onChange={(e) => setEditPromptText(e.target.value)}
                      className="w-full flex-grow p-4 bg-black/40 border border-white/10 rounded-xl font-mono text-xs text-gray-200 outline-none focus:border-accent-emerald/50 resize-none overflow-y-auto leading-relaxed"
                      placeholder="Enter system prompt guidelines here..."
                    />
                  ) : (
                    <div className="w-full flex-grow p-4 bg-black/30 border border-white/5 rounded-xl font-mono text-xs text-gray-300 overflow-y-auto whitespace-pre-wrap leading-relaxed select-text">
                      {systemPrompts.activePrompt?.prompt || 'No active system prompt found.'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Historical Prompt Details Modal */}
      {selectedHistoryPrompt && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-bg-secondary border border-border-color rounded-2xl w-full max-w-3xl h-[80vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-border-color flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="text-md font-semibold text-white">Revision #{selectedHistoryPrompt.id} Details</h3>
                <span className="text-[10px] text-gray-400 font-mono">Created on {new Date(selectedHistoryPrompt.created_at).toLocaleString()}</span>
              </div>
              <span className={`text-[9px] font-bold font-mono px-2 py-0.5 rounded-full ${selectedHistoryPrompt.is_active === 1 ? 'bg-accent-emerald/10 text-accent-emerald' : 'bg-white/5 text-gray-400'}`}>
                {selectedHistoryPrompt.is_active === 1 ? 'ACTIVE' : 'INACTIVE'}
              </span>
            </div>
            
            <div className="flex-grow overflow-y-auto p-6 font-mono text-xs text-gray-300 whitespace-pre-wrap select-text leading-relaxed bg-black/20">
              {selectedHistoryPrompt.prompt}
            </div>
            
            <div className="p-4 border-t border-border-color flex justify-between items-center bg-bg-secondary/80 flex-shrink-0">
              <div className="flex gap-2">
                {selectedHistoryPrompt.is_active !== 1 && (
                  <button
                    onClick={() => {
                      handleActivatePrompt(selectedHistoryPrompt.id);
                      setSelectedHistoryPrompt(null);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-emerald text-white rounded-lg text-xs font-semibold transition hover:bg-accent-emerald/80"
                  >
                    Activate Revision
                  </button>
                )}
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(selectedHistoryPrompt.prompt);
                    alert('Revision copied to clipboard!');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-lg text-xs font-medium text-gray-300 hover:text-white transition"
                >
                  <Copy size={12} /> Copy
                </button>
              </div>
              <button
                onClick={() => setSelectedHistoryPrompt(null)}
                className="px-4 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-lg text-xs font-medium text-gray-300 hover:text-white transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
