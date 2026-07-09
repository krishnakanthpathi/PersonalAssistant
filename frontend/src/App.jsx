import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Cpu, 
  Wrench, 
  Send, 
  Trash2, 
  RefreshCw, 
  Volume2, 
  FileText, 
  Calendar, 
  Globe,
  Check, 
  AlertCircle,
  LayoutDashboard,
  MessageSquare,
  ChevronRight,
  Clock,
  Code,
  FileCode,
  CheckCircle,
  XCircle,
  Activity,
  History,
  Timer
} from 'lucide-react';

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
    if (
      p.startsWith('<pre>') || 
      p.startsWith('<ul>') || 
      p.startsWith('<h3>') || 
      p.startsWith('<h2>') || 
      p.startsWith('<h1>')
    ) {
      return p;
    }
    return `<p>${p.replace(/\n/g, '<br/>')}</p>`;
  }).join('');
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
  const clearMetrics = async () => {
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

  useEffect(() => {
    fetchData();
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

        {/* Tools Section list */}
        <div className="flex flex-col flex-grow overflow-hidden">
          <div className="flex items-center gap-2 mb-3 text-gray-400">
            <Wrench size={16} />
            <h2 className="text-xs font-bold uppercase tracking-wider">Available Tools ({tools.length})</h2>
          </div>
          <div className="flex flex-col gap-2 overflow-y-auto pr-1 flex-grow">
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
        ) : (
          /* ADMIN METRICS DASHBOARD VIEW */
          <div className="flex flex-grow h-full overflow-hidden">
            {/* Left sidebar: Recent requests */}
            <div className="w-[300px] border-r border-border-color bg-bg-secondary/20 flex flex-col flex-shrink-0 h-full overflow-hidden">
              <div className="p-4 border-b border-border-color flex items-center justify-between bg-bg-secondary/40 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-accent-purple" />
                  <h3 className="text-sm font-semibold text-white">Recent Requests</h3>
                </div>
                <span className="px-2 py-0.5 bg-white/5 rounded-full font-mono text-[10px] text-gray-400">
                  {metrics.requests?.length || 0}
                </span>
              </div>
              <div className="flex-grow overflow-y-auto p-3 flex flex-col gap-2">
                {metrics.requests?.length === 0 ? (
                  <div className="text-center text-xs text-gray-500 py-12">No requests recorded yet.</div>
                ) : (
                  metrics.requests?.map((req) => (
                    <button
                      key={req.id}
                      onClick={() => setSelectedRequest(req)}
                      className={`p-3 text-left rounded-xl transition-all duration-200 border ${selectedRequest?.id === req.id ? 'bg-accent-blue/10 border-accent-blue/30 text-white' : 'bg-white/5 hover:bg-white/10 border-transparent text-gray-400 hover:text-white'}`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`text-[9px] font-bold font-mono px-1.5 py-0.5 rounded-full ${req.success ? 'bg-accent-emerald/10 text-accent-emerald' : 'bg-red-500/10 text-red-400'}`}>
                          {req.success ? 'SUCCESS' : 'FAILED'}
                        </span>
                        <span className="text-[10px] font-mono text-gray-500">
                          {req.totalDuration ? `${(req.totalDuration / 1000).toFixed(1)}s` : 'N/A'}
                        </span>
                      </div>
                      <p className="text-xs font-medium truncate mb-1 text-gray-200">{req.prompt}</p>
                      <div className="flex items-center justify-between text-[9px] text-gray-500">
                        <span>{new Date(req.timestamp).toLocaleTimeString()}</span>
                        {req.toolCalls?.length > 0 && (
                          <span className="font-semibold text-accent-purple">
                            {req.toolCalls.length} tool{req.toolCalls.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Right main area: Metrics aggregates or specific request drill-down */}
            <div className="flex-grow flex flex-col h-full overflow-y-auto bg-bg-primary/20 p-6">
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
                    <span className="font-mono text-xs text-gray-500">{selectedRequest.id}</span>
                  </div>

                  {/* Prompt Box */}
                  <div className="p-5 bg-bg-secondary/40 border border-border-color rounded-2xl">
                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Prompt</span>
                    <p className="text-md text-white font-medium">{selectedRequest.prompt}</p>
                    {selectedRequest.error && (
                      <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs flex gap-2 items-center">
                        <AlertCircle size={14} className="flex-shrink-0" />
                        <span>{selectedRequest.error}</span>
                      </div>
                    )}
                  </div>

                  {/* Summary performance metrics for this single request */}
                  <div className="grid grid-cols-4 gap-4">
                    <div className="p-4 bg-white/5 border border-white/5 rounded-2xl">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1.5">
                        <Timer className="w-3.5 h-3.5 text-accent-purple" />
                        Total Duration
                      </div>
                      <span className="font-mono text-xl font-bold text-white">
                        {selectedRequest.totalDuration} <span className="text-xs font-normal text-gray-500">ms</span>
                      </span>
                    </div>
                    <div className="p-4 bg-white/5 border border-white/5 rounded-2xl">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1.5">
                        <Globe className="w-3.5 h-3.5 text-accent-blue" />
                        Retrieval Time
                      </div>
                      <span className="font-mono text-xl font-bold text-white">
                        {selectedRequest.retrievalTime} <span className="text-xs font-normal text-gray-500">ms</span>
                      </span>
                    </div>
                    <div className="p-4 bg-white/5 border border-white/5 rounded-2xl">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1.5">
                        <Cpu className="w-3.5 h-3.5 text-accent-emerald" />
                        LLM Gen Time
                      </div>
                      <span className="font-mono text-xl font-bold text-white">
                        {selectedRequest.generationTime} <span className="text-xs font-normal text-gray-500">ms</span>
                      </span>
                    </div>
                    <div className="p-4 bg-white/5 border border-white/5 rounded-2xl">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1.5">
                        <Clock className="w-3.5 h-3.5 text-orange-400" />
                        Context Processing
                      </div>
                      <span className="font-mono text-xl font-bold text-white">
                        {selectedRequest.contextProcessingTime} <span className="text-xs font-normal text-gray-500">ms</span>
                      </span>
                    </div>
                  </div>

                  {/* Actions counts in this request */}
                  <div className="p-4 bg-white/5 border border-white/5 rounded-2xl">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-3">Targeted Action Telemetries</span>
                    <div className="grid grid-cols-4 gap-6">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-400">Screenshots Taken:</span>
                        <span className="font-mono font-bold text-white bg-white/5 px-2 py-0.5 rounded">{selectedRequest.screenshotCount || 0}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-400">Apple Scripts Executed:</span>
                        <span className="font-mono font-bold text-white bg-white/5 px-2 py-0.5 rounded">{selectedRequest.appleScriptCount || 0}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-400">Fetch UI elements:</span>
                        <span className="font-mono font-bold text-white bg-white/5 px-2 py-0.5 rounded">{selectedRequest.fetchUiCount || 0}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-400">Annotations:</span>
                        <span className="font-mono font-bold text-white bg-white/5 px-2 py-0.5 rounded">{selectedRequest.annotateCount || 0}</span>
                      </div>
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
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <FileCode className="w-4 h-4 text-accent-blue" />
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Given Context</h4>
                      </div>
                      <pre className="w-full h-80 overflow-auto bg-black/40 border border-white/5 rounded-2xl p-4 font-mono text-[10px] text-gray-300 whitespace-pre-wrap select-all">
                        {selectedRequest.givenContext || 'No context registered.'}
                      </pre>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Code className="w-4 h-4 text-accent-purple" />
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Generated Context</h4>
                      </div>
                      <pre className="w-full h-80 overflow-auto bg-black/40 border border-white/5 rounded-2xl p-4 font-mono text-[10px] text-gray-300 whitespace-pre-wrap select-all">
                        {selectedRequest.generatedContext || 'No context generated.'}
                      </pre>
                    </div>
                  </div>
                </div>
              ) : (
                /* SYSTEM AGGREGATE DASHBOARD */
                <div className="flex flex-col gap-6">
                  {/* Dashboard header */}
                  <div className="flex items-center justify-between pb-4 border-b border-border-color">
                    <div className="flex items-center gap-2.5">
                      <Activity className="w-5 h-5 text-accent-blue" />
                      <h2 className="text-md font-semibold text-white">System Diagnostics & Latency Averages</h2>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={fetchMetrics}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-lg text-xs font-medium transition"
                        title="Reload latest metrics"
                      >
                        <RefreshCw size={12} className={isLoadingMetrics ? 'animate-spin' : ''} /> Reload
                      </button>
                      <button 
                        onClick={clearMetrics}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/10 hover:border-red-500/20 rounded-lg text-xs font-medium text-red-400 transition"
                        title="Clear all stored logs"
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
                        <span className="text-3xl font-extrabold text-accent-purple">
                          {metrics.aggregates?.averageTotalDuration || 0}
                        </span>
                        <span className="text-xs text-gray-500">ms</span>
                      </div>
                      <div className="flex justify-between items-center text-xs border-t border-white/5 pt-2">
                        <span className="text-gray-400">RAG Tool Retrieval:</span>
                        <span className="font-semibold text-white">{metrics.aggregates?.averageRetrievalTime || 0} ms</span>
                      </div>
                    </div>

                    {/* Card 3: Context and evaluation durations */}
                    <div className="bg-white/5 border border-white/5 rounded-2xl p-5">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Model Latency Breakdown</span>
                      <div className="flex items-baseline gap-2 mb-2">
                        <span className="text-3xl font-extrabold text-accent-blue">
                          {metrics.aggregates?.averageGenerationTime || 0}
                        </span>
                        <span className="text-xs text-gray-500">ms (Gen)</span>
                      </div>
                      <div className="flex justify-between items-center text-xs border-t border-white/5 pt-2">
                        <span className="text-gray-400">Context Processing:</span>
                        <span className="font-semibold text-white">{metrics.aggregates?.averageContextProcessingTime || 0} ms</span>
                      </div>
                    </div>

                    {/* Card 4: Action tallies */}
                    <div className="bg-white/5 border border-white/5 rounded-2xl p-5">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-2">Special System Actions</span>
                      <div className="flex flex-col gap-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Screenshots:</span>
                          <span className="font-mono font-semibold text-white">{metrics.aggregates?.totalScreenshots || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Apple Scripts:</span>
                          <span className="font-mono font-semibold text-white">{metrics.aggregates?.totalAppleScripts || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Fetch UI (elements):</span>
                          <span className="font-mono font-semibold text-white">{metrics.aggregates?.totalFetchUis || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Annotations:</span>
                          <span className="font-mono font-semibold text-white">{metrics.aggregates?.totalAnnotations || 0}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tool latencies and success statistics table */}
                  <div className="bg-white/5 border border-white/5 rounded-2xl p-5">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-4">Detailed Tool Execution Performance</span>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-white/10 text-gray-400 pb-3">
                            <th className="font-semibold pb-3 pr-4">Tool Name</th>
                            <th className="font-semibold pb-3 text-center">Total Calls</th>
                            <th className="font-semibold pb-3 text-center">Response (Success) Rate</th>
                            <th className="font-semibold pb-3 text-right">Avg Execution Latency</th>
                            <th className="font-semibold pb-3 text-right">Avg Latency from request time (Reasoning)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {Object.keys(metrics.aggregates?.tools || {}).length === 0 ? (
                            <tr>
                              <td colSpan={5} className="text-center py-8 text-gray-500">No tools have been called yet.</td>
                            </tr>
                          ) : (
                            Object.entries(metrics.aggregates.tools).map(([name, data]) => (
                              <tr key={name} className="hover:bg-white/[0.02]">
                                <td className="py-3 font-mono font-bold text-white flex items-center gap-2">
                                  <span className="p-1 bg-white/5 rounded">
                                    {getToolIcon(name)}
                                  </span>
                                  {name}
                                </td>
                                <td className="py-3 text-center font-mono">{data.calls}</td>
                                <td className="py-3 text-center font-mono">
                                  <span className={`px-2 py-0.5 rounded font-bold ${data.successRate >= 0.9 ? 'bg-accent-emerald/10 text-accent-emerald' : data.successRate >= 0.5 ? 'bg-yellow-500/10 text-yellow-400' : 'bg-red-500/10 text-red-400'}`}>
                                    {(data.successRate * 100).toFixed(0)}%
                                  </span>
                                </td>
                                <td className="py-3 text-right font-mono text-white font-medium">{data.averageLatency} ms</td>
                                <td className="py-3 text-right font-mono text-accent-blue font-semibold">{data.averageLatencyFromRequestStart} ms</td>
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
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
