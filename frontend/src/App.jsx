import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
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
  Copy,
  Loader2,
  Mic,
  MicOff,
  Menu
} from 'lucide-react';
import AdminDashboard from './components/AdminDashboard.jsx';
import Sidebar from './components/Sidebar.jsx';
import ChatPanel from './components/ChatPanel.jsx';
import SystemPromptPanel from './components/SystemPromptPanel.jsx';
import SettingsPanel from './components/SettingsPanel.jsx';
import hljs from 'highlight.js';

// --- Code Syntax Highlight Themes (loaded as raw CSS strings via Vite) ---
import monokaiCss from 'highlight.js/styles/monokai.css?inline';
import githubDarkCss from 'highlight.js/styles/github-dark.css?inline';
import draculaCss from 'highlight.js/styles/base16/dracula.css?inline';
import atomOneDarkCss from 'highlight.js/styles/atom-one-dark.css?inline';
import tokyoNightCss from 'highlight.js/styles/tokyo-night-dark.css?inline';

export const CODE_THEMES = [
  { id: 'monokai',       label: 'Monokai',       bg: '#272822', accent: '#f92672', css: monokaiCss },
  { id: 'github-dark',   label: 'GitHub Dark',   bg: '#0d1117', accent: '#79c0ff', css: githubDarkCss },
  { id: 'dracula',       label: 'Dracula',       bg: '#282a36', accent: '#bd93f9', css: draculaCss },
  { id: 'atom-one-dark', label: 'Atom One Dark', bg: '#282c34', accent: '#e06c75', css: atomOneDarkCss },
  { id: 'tokyo-night',   label: 'Tokyo Night',   bg: '#1a1b26', accent: '#7aa2f7', css: tokyoNightCss },
];

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
    const isSeparator = line.includes('|') && line.match(/^[\s:\-|]+$/);
    // A table content line has at least one pipe
    const isTableLine = line.includes('|');

    if (isTableLine) {
      let cells = line.split('|').map(c => c.trim());
      if (line.startsWith('|') && cells[0] === '') cells.shift();
      if (line.endsWith('|') && cells[cells.length - 1] === '') cells.pop();

      if (!inTable) {
        // Look ahead to see if the next line is a separator row
        const nextLine = lines[i + 1] ? lines[i + 1].trim() : '';
        const nextIsSeparator = nextLine.includes('|') && nextLine.match(/^[\s:\-|]+$/);
        
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

          tableHtml = '<div class="overflow-x-auto my-4 shadow-md rounded-xl border border-white/10"><table class="w-full text-left border-collapse overflow-hidden">';
          tableHtml += '<thead class="bg-white/[0.04] border-b border-white/10 text-white font-medium text-xs tracking-wider uppercase">';
          tableHtml += '<tr>';
          headers.forEach((header, idx) => {
            const alignClass = columnAlignments[idx] === 'center' ? 'text-center' : columnAlignments[idx] === 'right' ? 'text-right' : 'text-left';
            tableHtml += `<th class="py-3.5 px-4 font-semibold text-white/90 ${alignClass}">${header}</th>`;
          });
          tableHtml += '</tr></thead>';
          tableHtml += '<tbody class="divide-y divide-white/5 bg-white/[0.01]">';
        } else {
          // Not a table start, treat as normal text line
          outputLines.push(lines[i]);
        }
      } else {
        // Inside a table, append row
        if (isSeparator) {
          continue;
        }
        tableHtml += '<tr class="hover:bg-white/[0.03] border-b border-white/5 transition-all">';
        cells.forEach((cell, idx) => {
          const alignClass = columnAlignments[idx] === 'center' ? 'text-center' : columnAlignments[idx] === 'right' ? 'text-right' : 'text-left';
          tableHtml += `<td class="py-3 px-4 text-sm text-gray-200 ${alignClass}">${cell}</td>`;
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
  // Ensure text is always a string — msg.content can sometimes be an object
  if (typeof text !== 'string') text = JSON.stringify(text);
  
  // Strip XML tags like <action>, </action>, <speech>, </speech>
  const cleanedText = text
    .replace(/<\/?action>/gi, '')
    .replace(/<\/?speech>/gi, '');

  // Extract and stash mermaid blocks (do this on cleanedText BEFORE escaping HTML to preserve characters like > and <)
  const mermaidBlocks = [];
  let html = cleanedText.replace(/```mermaid([\s\S]*?)```/g, (match, code) => {
    const id = `__MERMAID_BLOCK_${mermaidBlocks.length}__`;
    mermaidBlocks.push(`<div class="mermaid-chart my-4 flex justify-center bg-black/10 p-4 rounded-xl border border-white/5 overflow-x-auto" data-code="${encodeURIComponent(code.trim())}"></div>`);
    return id;
  });

  // Escape HTML entities to prevent XSS
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Extract and stash code blocks — apply highlight.js Monokai coloring
  const codeBlocks = [];
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (match, lang, code) => {
    const id = `__CODE_BLOCK_${codeBlocks.length}__`;
    const rawCode = code.trimEnd();
    const langLabel = lang ? lang.toLowerCase() : '';
    const displayLang = langLabel
      ? langLabel.charAt(0).toUpperCase() + langLabel.slice(1)
      : 'Text';

    // Run highlight.js — fall back to plaintext if lang unknown
    let highlighted;
    try {
      highlighted = langLabel && hljs.getLanguage(langLabel)
        ? hljs.highlight(rawCode, { language: langLabel, ignoreIllegals: true }).value
        : hljs.highlightAuto(rawCode).value;
    } catch {
      highlighted = rawCode
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    }

    codeBlocks.push(
      `<div class="code-block-wrapper">
        <div class="code-block-header">
          <span class="code-lang-label">${displayLang}</span>
          <button class="code-copy-btn" data-copy-btn title="Copy code">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            Copy code
          </button>
        </div>
        <pre class="code-block-pre"><code class="code-block-code hljs">${highlighted}</code></pre>
      </div>`
    );
    return id;
  });
  
  // Extract and stash inline code blocks
  const inlineCodes = [];
  html = html.replace(/`([^`]+)`/g, (match, code) => {
    const id = `__INLINE_CODE_${inlineCodes.length}__`;
    inlineCodes.push(`<code class="inline-code">${code}</code>`);
    return id;
  });

  // Parse raw HTML tables: match escaped table tags, decode them, and inject premium Tailwind classes
  html = html.replace(/&lt;table([\s\S]*?)&lt;\/table&gt;/gi, (match) => {
    let unescaped = match
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
    
    unescaped = unescaped.replace(/<table([^>]*)>/gi, '<div class="overflow-x-auto my-4 shadow-md rounded-xl border border-white/10"><table class="w-full text-left border-collapse overflow-hidden"$1>');
    unescaped = unescaped.replace(/<\/table>/gi, '</table></div>');
    unescaped = unescaped.replace(/<thead([^>]*)>/gi, '<thead class="bg-white/[0.04] border-b border-white/10 text-white font-medium text-xs tracking-wider uppercase"$1>');
    unescaped = unescaped.replace(/<tbody([^>]*)>/gi, '<tbody class="divide-y divide-white/5 bg-white/[0.01]"$1>');
    unescaped = unescaped.replace(/<tr([^>]*)>/gi, '<tr class="hover:bg-white/[0.03] border-b border-white/5 transition-all"$1>');
    unescaped = unescaped.replace(/<th([^>]*)>/gi, '<th class="py-3.5 px-4 font-semibold text-left text-white/90"$1>');
    unescaped = unescaped.replace(/<td([^>]*)>/gi, '<td class="py-3 px-4 text-sm text-gray-200 text-left"$1>');
    
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

  // Blockquotes (quote blocks starting with >)
  html = html.replace(/^\s*&gt;\s+(.+)$/gm, '<blockquote>$1</blockquote>');
  html = html.replace(/<\/blockquote>\s*<blockquote>/g, '<br/>');
  html = html.replace(/<blockquote>([\s\S]*?)<\/blockquote>/g, '<blockquote class="border border-white/10 bg-white/[0.02] p-4 my-4 rounded-xl text-gray-200 font-sans">$1</blockquote>');
    
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

  // Markdown images: ![Alt](Url)
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, url) => {
    let resolvedUrl = url.trim();
    if (resolvedUrl.includes('data/screenshots/')) {
      const parts = resolvedUrl.split('data/screenshots/');
      resolvedUrl = `http://localhost:3000/screenshots/${parts[parts.length - 1]}`;
    } else if (resolvedUrl.startsWith('data/')) {
      const parts = resolvedUrl.split('data/');
      resolvedUrl = `http://localhost:3000/screenshots/${parts[parts.length - 1]}`;
    }
    return `<div class="my-3 rounded-xl overflow-hidden border border-white/10 shadow-lg max-w-full lg:max-w-xl bg-black/20">
      <img src="${resolvedUrl}" alt="${alt || 'Screenshot'}" class="w-full object-contain cursor-zoom-in" onclick="window.open(this.src, '_blank')" />
    </div>`;
  });

  // Auto-render plain text screenshot paths
  html = html.replace(/(?<![\w/="(:])(?:data\/screenshots\/|data\/)?(screenshot_[a-zA-Z0-9_-]+\.png|blueprint_[a-zA-Z0-9_-]+\.png)/gi, (match, fileName) => {
    return `<div class="my-3 rounded-xl overflow-hidden border border-white/10 shadow-lg max-w-full lg:max-w-xl bg-black/20">
      <img src="http://localhost:3000/screenshots/${fileName}" alt="Screenshot" class="w-full object-contain cursor-zoom-in" onclick="window.open(this.src, '_blank')" />
    </div>`;
  });

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

  // Restore mermaid blocks
  mermaidBlocks.forEach((code, idx) => {
    html = html.replace(`__MERMAID_BLOCK_${idx}__`, code);
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
      trimmed.startsWith('<table') ||
      trimmed.startsWith('<blockquote')
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
  if (lowercase.includes('notion') || lowercase.includes('file')) return <FileText className="w-4 h-4 text-accent-mono" />;
  if (lowercase.includes('calendar') || lowercase.includes('event')) return <Calendar className="w-4 h-4 text-accent-emerald" />;
  if (lowercase.includes('puppeteer') || lowercase.includes('browser') || lowercase.includes('web')) return <Globe className="w-4 h-4 text-blue-400" />;
  return <Wrench className="w-4 h-4 text-gray-400" />;
};

function MainApp() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'system-prompt' | 'settings'
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
      // Clear navigation state to prevent restoring it on future navigations
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname]);
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStatusLog, setCurrentStatusLog] = useState('');
  const [tools, setTools] = useState([]);
  const [config, setConfig] = useState({
    provider: 'ollama',
    model: 'loading...',
    openaiBaseUrl: 'default',
    port: 3000
  });
  const [availableModels, setAvailableModels] = useState([]);
  const [isFetchingModels, setIsFetchingModels] = useState(false);

  // MCP Background Tasks state
  const [mcpTasks, setMcpTasks] = useState([]);

  // Chat Sessions States
  const [chats, setChats] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(() => {
    return localStorage.getItem('currentSessionId') || null;
  });

  useEffect(() => {
    if (currentSessionId) {
      localStorage.setItem('currentSessionId', currentSessionId);
    } else {
      localStorage.removeItem('currentSessionId');
    }
  }, [currentSessionId]);

  // System Prompt States
  const [systemPrompts, setSystemPrompts] = useState({ activePrompt: null, history: [] });
  const [editPromptText, setEditPromptText] = useState('');
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);
  const [isSavingPrompt, setIsSavingPrompt] = useState(false);
  const [isFetchingPrompt, setIsFetchingPrompt] = useState(false);
  const [promptError, setPromptError] = useState(null);
  const [promptSuccessMessage, setPromptSuccessMessage] = useState(null);
  const [selectedHistoryPrompt, setSelectedHistoryPrompt] = useState(null);

  // Dynamic LLM Settings state
  const [settingsForm, setSettingsForm] = useState({
    provider: 'ollama',
    openaiApiKey: '',
    openaiBaseUrl: '',
    openaiModel: '',
    ollamaUrl: '',
    ollamaModel: '',
    grokApiKey: '',
    grokBaseUrl: '',
    grokModel: ''
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState('');
  const [settingsError, setSettingsError] = useState('');

  // Code syntax highlight theme
  const [codeTheme, setCodeTheme] = useState(
    () => localStorage.getItem('codeTheme') || 'monokai'
  );

  // Swap the injected highlight.js theme CSS whenever codeTheme changes
  useEffect(() => {
    const theme = CODE_THEMES.find(t => t.id === codeTheme) || CODE_THEMES[0];
    const styleId = 'hljs-theme-style';
    let el = document.getElementById(styleId);
    if (!el) {
      el = document.createElement('style');
      el.id = styleId;
      document.head.appendChild(el);
    }
    el.textContent = theme.css;
    localStorage.setItem('codeTheme', codeTheme);
    // Update code block wrapper bg to match the theme
    document.documentElement.style.setProperty('--hljs-bg', theme.bg);
  }, [codeTheme]);

  const chatEndRef = useRef(null);

  // Speech Synthesis (Text-to-Speech) States
  const [currentlySpeakingId, setCurrentlySpeakingId] = useState(null);
  const [autoTtsEnabled, setAutoTtsEnabled] = useState(false);
  const autoTtsEnabledRef = useRef(false);
  const utteranceRef = useRef(null);

  // Sync autoTtsEnabledRef
  useEffect(() => {
    autoTtsEnabledRef.current = autoTtsEnabled;
  }, [autoTtsEnabled]);

  // Render Mermaid diagrams whenever messages change or activeTab changes
  useEffect(() => {
    let active = true;
    const renderMermaid = async () => {
      const elements = document.querySelectorAll('.mermaid-chart');
      if (elements.length === 0) return;

      try {
        const { default: mermaid } = await import('mermaid');
        mermaid.initialize({
          startOnLoad: false,
          theme: 'dark',
          securityLevel: 'loose',
        });

        for (let i = 0; i < elements.length; i++) {
          const el = elements[i];
          if (!active) break;
          // If already rendered, skip
          if (el.getAttribute('data-processed')) continue;
          
          const code = decodeURIComponent(el.getAttribute('data-code'));
          const id = `mermaid-svg-${Math.random().toString(36).substring(2, 9)}`;
          try {
            const { svg } = await mermaid.render(id, code);
            if (active) {
              el.innerHTML = svg;
              el.setAttribute('data-processed', 'true');
            }
          } catch (err) {
            console.error('Failed to render mermaid chart:', err);
            if (active) {
              el.innerHTML = `<div class="text-xs text-red-400 p-2 border border-red-500/20 bg-red-500/5 rounded">Error rendering chart: ${err.message}</div>`;
              el.setAttribute('data-processed', 'true');
            }
          }
        }
      } catch (err) {
        console.error('Failed to load mermaid:', err);
      }
    };

    renderMermaid();
    return () => {
      active = false;
    };
  }, [messages, activeTab]);

  // Speech Recognition (Speech-to-Text) States
  const [isListening, setIsListening] = useState(false);
  const [interimSpeech, setInterimSpeech] = useState('');
  const recognitionRef = useRef(null);
  const baseTextRef = useRef('');
  const lastShiftTimeRef = useRef(0);

  // Speech Synthesis Function
  const speakText = (text, id) => {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      if (currentlySpeakingId === id) {
        setCurrentlySpeakingId(null);
        return;
      }
    }

    // Strip HTML/markdown/XML tags for cleaner TTS
    const cleanText = text
      .replace(/<[^>]*>/g, '')
      .replace(/[*_`#]/g, '')
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.onend = () => {
      setCurrentlySpeakingId(null);
    };
    utterance.onerror = () => {
      setCurrentlySpeakingId(null);
    };

    utteranceRef.current = utterance;
    setCurrentlySpeakingId(id);
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
    setCurrentlySpeakingId(null);
  };

  // Speech Recognition Functions
  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please use Google Chrome.');
      return;
    }
    
    // Stop any active TTS before listening
    stopSpeaking();
    
    if (!recognitionRef.current) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';

      rec.onresult = (event) => {
        let accumulatedFinal = '';
        let interim = '';
        for (let i = 0; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            accumulatedFinal += transcript;
          } else {
            interim += transcript;
          }
        }
        
        const text = (baseTextRef.current + ' ' + accumulatedFinal).trim();
        setPrompt(text);
        setInterimSpeech(interim);
      };

      rec.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        if (event.error === 'not-allowed') {
          alert('Microphone permission denied. Please allow microphone access in your browser settings.');
        }
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
        setInterimSpeech('');
      };

      recognitionRef.current = rec;
    }

    baseTextRef.current = prompt;
    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch (err) {
      console.error('Failed to start recognition:', err);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const toggleListeningRef = useRef(null);
  toggleListeningRef.current = toggleListening;

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Check for Cmd+Shift+S (Mac) or Ctrl+Shift+S (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        toggleListeningRef.current?.();
        return;
      }

      // Check for double Shift tap
      if (e.key === 'Shift') {
        const now = Date.now();
        if (now - lastShiftTimeRef.current < 350) {
          e.preventDefault();
          toggleListeningRef.current?.();
          lastShiftTimeRef.current = 0;
        } else {
          lastShiftTimeRef.current = now;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentStatusLog]);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setIsSavingSettings(true);
    setSettingsSuccess('');
    setSettingsError('');
    try {
      const response = await fetch('http://localhost:3000/api/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settingsForm),
      });
      const data = await response.json();
      if (data.success) {
        setSettingsSuccess('Configuration saved successfully and updated dynamically!');
        setConfig({
          provider: data.config.provider,
          model: data.config.model,
          openaiBaseUrl: data.config.openaiBaseUrl,
          port: data.config.port
        });
      } else {
        setSettingsError(data.error || 'Failed to save configuration.');
      }
    } catch (err) {
      setSettingsError(err.message || 'An error occurred while saving.');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const fetchAvailableModels = async (provider, customSettings = null) => {
    setIsFetchingModels(true);
    try {
      let url = `http://localhost:3000/api/models?provider=${provider}`;
      const settings = customSettings || settingsForm;
      if (provider === 'openai') {
        const apiKey = settings.openaiApiKey;
        const baseUrl = settings.openaiBaseUrl;
        if (apiKey) url += `&apiKey=${encodeURIComponent(apiKey)}`;
        if (baseUrl) url += `&baseUrl=${encodeURIComponent(baseUrl)}`;
      } else if (provider === 'grok') {
        const apiKey = settings.grokApiKey;
        const baseUrl = settings.grokBaseUrl;
        if (apiKey) url += `&apiKey=${encodeURIComponent(apiKey)}`;
        if (baseUrl) url += `&baseUrl=${encodeURIComponent(baseUrl)}`;
      } else if (provider === 'ollama') {
        const baseUrl = settings.ollamaUrl;
        if (baseUrl) url += `&baseUrl=${encodeURIComponent(baseUrl)}`;
      }

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setAvailableModels(data.models || []);
        return data.models || [];
      } else {
        console.warn('Failed to fetch available models:', data.error);
        setAvailableModels([]);
        return [];
      }
    } catch (err) {
      console.error('Error fetching available models:', err);
      setAvailableModels([]);
      return [];
    } finally {
      setIsFetchingModels(false);
    }
  };

  const handleSelectModel = async (newModelName) => {
    try {
      const updatedConfig = { ...config, model: newModelName };
      setConfig(updatedConfig);
      
      const payload = {
        ...settingsForm,
        provider: config.provider,
        openaiModel: config.provider === 'openai' ? newModelName : settingsForm.openaiModel,
        grokModel: config.provider === 'grok' ? newModelName : settingsForm.grokModel,
        ollamaModel: config.provider === 'ollama' ? newModelName : settingsForm.ollamaModel
      };

      const res = await fetch('http://localhost:3000/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setSettingsForm(prev => ({
          ...prev,
          openaiModel: config.provider === 'openai' ? newModelName : prev.openaiModel,
          grokModel: config.provider === 'grok' ? newModelName : prev.grokModel,
          ollamaModel: config.provider === 'ollama' ? newModelName : prev.ollamaModel
        }));
      } else {
        console.error('Failed to auto-save selected model configuration on backend:', data.error);
      }
    } catch (err) {
      console.error('Error auto-saving selected model:', err);
    }
  };

  useEffect(() => {
    if (config.provider && isConnected) {
      fetchAvailableModels(config.provider);
    }
  }, [config.provider, isConnected]);

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
        if (configData.settings) {
          const loadedSettings = {
            provider: configData.settings.provider || 'ollama',
            openaiApiKey: configData.settings.openaiApiKey || '',
            openaiBaseUrl: configData.settings.openaiBaseUrl || '',
            openaiModel: configData.settings.openaiModel || '',
            ollamaUrl: configData.settings.ollamaUrl || '',
            ollamaModel: configData.settings.ollamaModel || '',
            grokApiKey: configData.settings.grokApiKey || '',
            grokBaseUrl: configData.settings.grokBaseUrl || '',
            grokModel: configData.settings.grokModel || ''
          };
          setSettingsForm(loadedSettings);
          fetchAvailableModels(configData.provider, loadedSettings);
        }
      }

      const toolsRes = await fetch('http://localhost:3000/api/tools');
      const toolsData = await toolsRes.json();
      if (toolsData.success) {
        setTools(toolsData.tools || []);
      }

      // Fetch Google connection status
      try {
        const googleRes = await fetch('http://localhost:3000/api/auth/google/status');
        const googleData = await googleRes.json();
        if (googleData.success) {
          setGoogleConnected(googleData.connected);
          setGoogleEmail(googleData.email || '');
        }
      } catch (err) {
        console.error('Failed to fetch Google auth status:', err);
      }
    } catch (error) {
      console.error('Failed to connect to backend:', error);
      setIsConnected(false);
      setConfig(c => ({ ...c, model: 'Offline' }));
    }
  };

  // Fetch MCP background task status
  const fetchMcpStatus = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/mcp/status');
      const data = await res.json();
      setMcpTasks(data.tasks || []);
    } catch (error) {
      console.error('Failed to fetch MCP task status:', error);
    }
  };

  // Fetch Chat sessions list
  const fetchChats = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/chats');
      const data = await res.json();
      if (data.success) {
        setChats(data.chats || []);
      }
    } catch (error) {
      console.error('Failed to fetch chats:', error);
    }
  };

  // Load a chat session and its message history
  const loadChatSession = async (sessionId) => {
    if (isProcessing) return;
    try {
      const res = await fetch(`http://localhost:3000/api/chats/${sessionId}`);
      const data = await res.json();
      if (data.success) {
        setMessages(data.messages || []);
        setCurrentSessionId(sessionId);
      }
    } catch (error) {
      console.error('Failed to load chat messages:', error);
    }
  };

  // Delete a chat session
  const handleDeleteChat = async (e, sessionId) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this chat session?')) return;
    try {
      const res = await fetch(`http://localhost:3000/api/chats/${sessionId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        await fetchChats();
        if (currentSessionId === sessionId) {
          setMessages([]);
          setCurrentSessionId(null);
        }
      }
    } catch (error) {
      console.error('Failed to delete chat session:', error);
    }
  };

  const startNewChat = () => {
    if (isProcessing) return;
    setMessages([]);
    setCurrentSessionId(null);
  };

  const handleConnectGoogle = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/auth/google/url');
      const data = await res.json();
      if (data.success && data.url) {
        window.location.href = data.url;
      } else {
        alert('Failed to get Google authorization URL: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error connecting Google account:', error);
      alert('Connection error. Is the backend running?');
    }
  };

  const handleDisconnectGoogle = async () => {
    if (!window.confirm('Are you sure you want to disconnect your Google account?')) return;
    try {
      const res = await fetch('http://localhost:3000/api/auth/google/disconnect', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setGoogleConnected(false);
        setGoogleEmail('');
        alert('Disconnected Google account successfully.');
      } else {
        alert('Failed to disconnect Google account: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error disconnecting Google account:', error);
      alert('Connection error. Is the backend running?');
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
    fetchChats();
    fetchMcpStatus();

    const cachedSessionId = localStorage.getItem('currentSessionId');
    if (cachedSessionId) {
      loadChatSession(cachedSessionId);
    }

    // Check if redirect query parameters exist
    const params = new URLSearchParams(window.location.search);
    if (params.get('connected') === 'google') {
      window.history.replaceState({}, document.title, window.location.pathname);
      alert('Successfully connected Google Account!');
    }

    const interval = setInterval(fetchMcpStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  // Sync chats when activeTab changes back to chat
  useEffect(() => {
    if (activeTab === 'chat') {
      fetchChats();
    }
  }, [activeTab]);

  const handleSend = async (textToSend) => {
    const inputMsg = textToSend || prompt;
    if (!inputMsg.trim() || isProcessing) return;

    stopSpeaking();
    stopListening();

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
        body: JSON.stringify({ prompt: inputMsg, history: messages, sessionId: currentSessionId })
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
                let speechText = '';
                setMessages(prev => {
                  const updated = [...prev];
                  if (updated[assistantMsgIndex]) {
                    if (content && typeof content === 'object') {
                      updated[assistantMsgIndex].content = content.content || '';
                      updated[assistantMsgIndex].speech = content.speech || '';
                      speechText = content.speech || content.content || '';
                      if (content.sessionId) {
                        setCurrentSessionId(content.sessionId);
                      }
                    } else {
                      updated[assistantMsgIndex].content = content;
                      speechText = content || '';
                    }
                  }
                  return updated;
                });

                if (autoTtsEnabledRef.current && speechText) {
                  speakText(speechText, assistantMsgIndex);
                }

                setCurrentStatusLog('');
                fetchChats();
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
      // Fetch latest chats after run completes
      fetchChats();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    stopSpeaking();
    stopListening();
    startNewChat();
  };

  return (
    <div className="flex w-screen h-screen bg-bg-primary overflow-hidden text-gray-200">
      {/* Sidebar Component */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isConnected={isConnected}
        config={config}
        mcpTasks={mcpTasks}
        chats={chats}
        currentSessionId={currentSessionId}
        isProcessing={isProcessing}
        startNewChat={startNewChat}
        loadChatSession={loadChatSession}
        handleDeleteChat={handleDeleteChat}
        fetchSystemPrompt={fetchSystemPrompt}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      {/* Main Panel Content */}
      <main className="flex-grow flex flex-col h-full bg-transparent overflow-hidden min-w-0">
        {/* Global Top Bar Header */}
        <div className="h-14 sm:h-16 px-3 sm:px-6 border-b border-border-color flex items-center justify-between backdrop-blur-md bg-bg-secondary/40 z-10 flex-shrink-0 gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Mobile hamburger */}
            <button
              className="lg:hidden p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all flex-shrink-0"
              onClick={() => setMobileSidebarOpen(true)}
              title="Open sidebar"
            >
              <Menu size={16} />
            </button>
            <h2 className="text-sm sm:text-md font-semibold text-white truncate">
              {activeTab === 'chat' ? 'Chat Assistant' : activeTab === 'system-prompt' ? 'System Prompt' : 'Settings'}
            </h2>
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline px-2 py-0.5 rounded-full text-[10px] bg-white/5 text-accent-mono font-mono uppercase tracking-wider border border-accent-mono/10 flex-shrink-0">
                {config.provider === 'openai' ? 'OpenAI SDK' : config.provider === 'grok' ? 'Grok API' : 'Ollama API'}
              </span>
              {activeTab === 'chat' && (
                <div className="relative flex items-center">
                  <select
                    value={config.model}
                    onChange={(e) => handleSelectModel(e.target.value)}
                    disabled={isFetchingModels || isProcessing}
                    className="appearance-none bg-black/40 border border-white/10 hover:border-accent-blue/40 text-gray-200 text-xs rounded-xl pl-3 pr-8 py-1.5 outline-none transition-all duration-200 cursor-pointer min-w-[120px] max-w-[180px] sm:max-w-[220px] truncate disabled:opacity-50"
                  >
                    {isFetchingModels ? (
                      <option disabled>Loading models...</option>
                    ) : availableModels.length > 0 ? (
                      <>
                        {!availableModels.includes(config.model) && config.model !== 'loading...' && (
                          <option value={config.model}>{config.model}</option>
                        )}
                        {availableModels.map((model) => (
                          <option key={model} value={model}>
                            {model}
                          </option>
                        ))}
                      </>
                    ) : (
                      <option value={config.model}>{config.model || 'No models found'}</option>
                    )}
                  </select>
                  <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center text-gray-400">
                    {isFetchingModels ? (
                      <Loader2 className="w-3 h-3 animate-spin text-accent-blue" />
                    ) : (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                      </svg>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
            {/* Context-specific Top Bar buttons */}
            {activeTab === 'chat' && (
              <div className="flex gap-1 sm:gap-2">
                <button 
                  onClick={() => setAutoTtsEnabled(prev => !prev)}
                  className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                    autoTtsEnabled 
                      ? 'bg-accent-blue/10 border-accent-blue/30 text-accent-blue shadow-[0_0_8px_rgba(59,130,246,0.15)] font-semibold' 
                      : 'bg-white/5 hover:bg-white/10 border-white/5 text-gray-400 hover:text-white'
                  }`}
                  title="Toggle automatic text-to-speech for assistant responses"
                >
                  <Volume2 size={12} className={autoTtsEnabled ? 'animate-pulse' : ''} />
                  <span className="hidden sm:inline">Auto Speak</span>
                </button>
                <button className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-lg text-xs font-medium transition-all" onClick={fetchData} title="Sync backend connection state">
                  <RefreshCw size={12} />
                  <span className="hidden sm:inline">Sync</span>
                </button>
                <button className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-lg text-xs font-medium transition-all text-red-400 hover:text-red-300 disabled:opacity-50" onClick={clearChat} disabled={messages.length === 0} title="Clear chat history">
                  <Trash2 size={12} />
                  <span className="hidden sm:inline">Clear</span>
                </button>
              </div>
            )}

            <div className="h-4 w-px bg-white/10 hidden sm:block" />

            {/* Global Prominent Telemetry Chart Button */}
            <Link 
              to="/admin"
              state={{ fromTab: activeTab }}
              className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-4 py-1.5 bg-accent-blue text-white rounded-lg text-xs font-semibold shadow-glow transition-all hover:bg-accent-blue/80"
              title="Open Telemetry Dashboard and Charts"
            >
              <LayoutDashboard size={12} />
              <span className="hidden sm:inline">Telemetry</span>
            </Link>
          </div>
        </div>

        {/* Tab Switching Panel Content */}
        <div className="flex-grow overflow-hidden">
          {activeTab === 'chat' ? (
            <ChatPanel
              messages={messages}
              isProcessing={isProcessing}
              interimSpeech={interimSpeech}
              currentStatusLog={currentStatusLog}
              currentlySpeakingId={currentlySpeakingId}
              speakText={speakText}
              prompt={prompt}
              setPrompt={setPrompt}
              handleSend={handleSend}
              isListening={isListening}
              toggleListening={toggleListening}
              parseMarkdown={parseMarkdown}
            />
          ) : activeTab === 'system-prompt' ? (
            <SystemPromptPanel
              systemPrompts={systemPrompts}
              isFetchingPrompt={isFetchingPrompt}
              isSavingPrompt={isSavingPrompt}
              promptError={promptError}
              promptSuccessMessage={promptSuccessMessage}
              selectedHistoryPrompt={selectedHistoryPrompt}
              setSelectedHistoryPrompt={setSelectedHistoryPrompt}
              isEditingPrompt={isEditingPrompt}
              setIsEditingPrompt={setIsEditingPrompt}
              editPromptText={editPromptText}
              setEditPromptText={setEditPromptText}
              handleSavePrompt={handleSavePrompt}
              handleActivatePrompt={handleActivatePrompt}
              handleDeletePrompt={handleDeletePrompt}
              fetchSystemPrompt={fetchSystemPrompt}
            />
          ) : (
            <SettingsPanel
              settingsForm={settingsForm}
              setSettingsForm={setSettingsForm}
              isSavingSettings={isSavingSettings}
              settingsSuccess={settingsSuccess}
              settingsError={settingsError}
              handleSaveSettings={handleSaveSettings}
              googleConnected={googleConnected}
              googleEmail={googleEmail}
              handleConnectGoogle={handleConnectGoogle}
              handleDisconnectGoogle={handleDisconnectGoogle}
              codeTheme={codeTheme}
              setCodeTheme={setCodeTheme}
              codeThemes={CODE_THEMES}
              availableModels={availableModels}
              fetchAvailableModels={fetchAvailableModels}
            />
          )}
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<MainApp />} />
      <Route path="/admin" element={<AdminDashboard />} />
    </Routes>
  );
}

export default App;
