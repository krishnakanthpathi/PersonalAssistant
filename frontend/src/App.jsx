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
  AlertCircle 
} from 'lucide-react';
import './App.css';

// Markdown parser with simple regex
const parseMarkdown = (text) => {
  if (!text) return '';
  
  // Escape HTML entities to prevent XSS
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
    
  // Headers
  html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');

  // Code blocks
  html = html.replace(/```([\s\S]*?)```/g, (match, code) => {
    return `<pre><code>${code.trim()}</code></pre>`;
  });
  
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  // Bold
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  
  // Bullet lists
  html = html.replace(/^\s*[-*]\s+(.+)$/gm, '<li>$1</li>');
  // Wrap consecutive <li> elements in <ul>
  html = html.replace(/(<li>.*<\/li>)/g, '<ul>$1</ul>');
  // Fix double <ul> wrapping
  html = html.replace(/<\/ul>\s*<ul>/g, '');
  
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
  if (lowercase.includes('volume')) return <Volume2 className="feature-icon" />;
  if (lowercase.includes('notion') || lowercase.includes('file')) return <FileText className="feature-icon" />;
  if (lowercase.includes('calendar') || lowercase.includes('event')) return <Calendar className="feature-icon" />;
  if (lowercase.includes('puppeteer') || lowercase.includes('browser') || lowercase.includes('web')) return <Globe className="feature-icon" />;
  return <Wrench className="feature-icon" />;
};

function App() {
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

  useEffect(() => {
    fetchData();
  }, []);

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
                    updated[assistantMsgIndex].content = content;
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
    <div className="dashboard-container">
      {/* Sidebar Panel */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo-container">
            <Sparkles className="logo-icon" />
          </div>
          <h1 className="sidebar-title">Antigravity Hub</h1>
        </div>

        {/* Status indicator Card */}
        <div className="status-card">
          <div className="status-header">
            System status
            <span className="status-indicator">
              <span className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`}></span>
              {isConnected ? 'Online' : 'Offline'}
            </span>
          </div>
          <div className="status-details">
            <div className="status-row">
              <span className="status-label">LLM Provider:</span>
              <span className="status-value">{config.provider.toUpperCase()}</span>
            </div>
            <div className="status-row">
              <span className="status-label">Active Model:</span>
              <span className="status-value" style={{ fontSize: '0.8rem' }}>{config.model}</span>
            </div>
            <div className="status-row">
              <span className="status-label">Port:</span>
              <span className="status-value">{config.port}</span>
            </div>
          </div>
        </div>

        {/* Tools Section list */}
        <div className="tools-section">
          <div className="tools-title-container">
            <Wrench size={16} />
            <h2 className="tools-title">Available Tools ({tools.length})</h2>
          </div>
          <div className="tools-list">
            {tools.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '16px 0' }}>
                No active tools found.
              </div>
            ) : (
              tools.map((tool, idx) => {
                const toolName = tool.function?.name || tool.name;
                const toolDesc = tool.function?.description || tool.description || 'No description provided';
                return (
                  <div key={idx} className="tool-item" title={toolName}>
                    <div className="tool-header">
                      <span className="tool-icon-wrapper">
                        {getToolIcon(toolName)}
                      </span>
                      <span className="tool-name">{toolName}</span>
                    </div>
                    <span className="tool-desc">{toolDesc}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </aside>

      {/* Main Chat Panel */}
      <main className="chat-container">
        {/* Chat header area */}
        <div className="chat-header">
          <div className="chat-header-info">
            <h2 className="chat-header-title">Personal Assistant Agent</h2>
            <span className="model-badge">
              {config.provider === 'openai' ? 'OpenAI SDK' : 'Ollama API'}
            </span>
          </div>
          <div className="chat-actions">
            <button className="btn-secondary" onClick={fetchData} title="Sync backend connection state">
              <RefreshCw size={14} /> Sync
            </button>
            <button className="btn-secondary" onClick={clearChat} disabled={messages.length === 0} title="Clear chat history">
              <Trash2 size={14} /> Clear Chat
            </button>
          </div>
        </div>

        {/* Messages list */}
        <div className="chat-messages">
          {messages.length === 0 ? (
            <div className="welcome-container">
              <div className="welcome-logo-outer">
                <Sparkles className="welcome-logo" />
              </div>
              <h2 className="welcome-title">Personal AI Assistant</h2>
              <p className="welcome-subtitle">
                Interact with your system volume, Notion pages, local file system, and Google calendar.
                The assistant reasoning loop will call local tools dynamically to satisfy your prompt.
              </p>
              
              <div className="features-grid">
                <div className="feature-card">
                  <div className="feature-title">
                    <Volume2 size={16} className="feature-icon" />
                    System Audio
                  </div>
                  <span className="feature-desc">Controls system volume levels directly on your Mac.</span>
                </div>
                <div className="feature-card">
                  <div className="feature-title">
                    <FileText size={16} className="feature-icon" />
                    Notion Notes
                  </div>
                  <span className="feature-desc">Read notes, search pages, and append content to your workspace.</span>
                </div>
                <div className="feature-card">
                  <div className="feature-title">
                    <Calendar size={16} className="feature-icon" />
                    Google Calendar
                  </div>
                  <span className="feature-desc">View meetings, create events, and manage calendars.</span>
                </div>
                <div className="feature-card">
                  <div className="feature-title">
                    <Globe size={16} className="feature-icon" />
                    Web Scraper
                  </div>
                  <span className="feature-desc">Automate browser queries, search the web, and scrape details.</span>
                </div>
              </div>

              <div className="starter-chips" style={{ justifyContent: 'center' }}>
                {starterPrompts.map((p, i) => (
                  <button key={i} className="chip" onClick={() => handleSend(p.text)}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} className={`message-wrapper ${msg.role}`}>
                <div className="message-sender">
                  {msg.role === 'user' ? 'You' : 'Assistant'}
                </div>
                <div 
                  className={`message-card`}
                  dangerouslySetInnerHTML={{ __html: parseMarkdown(msg.content) || (msg.isError ? 'An error occurred' : 'Thinking...') }}
                />
                
                {/* Active loop status display */}
                {msg.role === 'assistant' && msg.logs && msg.logs.length > 0 && (
                  <div className="process-logs">
                    {isProcessing && idx === messages.length - 1 && <span className="spinner"></span>}
                    <div>
                      <strong>Reasoning path:</strong>{' '}
                      {msg.logs.map((log, lIdx) => (
                        <span key={lIdx}>
                          {lIdx > 0 && ' → '}{log}
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
            <div className="message-wrapper assistant">
              <div className="message-sender">Assistant</div>
              <div className="message-card" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="spinner"></span>
                <span>{currentStatusLog}</span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input box area */}
        <div className="chat-input-area">
          <div className="input-container">
            <textarea
              className="text-input"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything (e.g. Set volume to 30%, draft a note...)"
              disabled={isProcessing}
              rows={1}
            />
            <button 
              className="send-button"
              onClick={() => handleSend()}
              disabled={!prompt.trim() || isProcessing}
            >
              <Send size={18} />
            </button>
          </div>
          {messages.length > 0 && (
            <div className="starter-chips">
              {starterPrompts.slice(0, 3).map((p, i) => (
                <button key={i} className="chip" onClick={() => handleSend(p.text)} disabled={isProcessing}>
                  {p.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
