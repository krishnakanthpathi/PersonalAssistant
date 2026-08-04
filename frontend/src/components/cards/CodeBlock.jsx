import React, { useState, useMemo, useEffect } from 'react';
import { Copy, Check, Code2, Terminal, Palette } from 'lucide-react';
import hljs from 'highlight.js';

const LANGUAGE_NAMES = {
  python: 'Python',
  py: 'Python',
  css: 'CSS',
  javascript: 'JavaScript',
  js: 'JavaScript',
  jsx: 'JSX',
  typescript: 'TypeScript',
  ts: 'TypeScript',
  tsx: 'TSX',
  java: 'Java',
  html: 'HTML',
  htm: 'HTML',
  xml: 'XML',
  svg: 'SVG',
  json: 'JSON',
  cpp: 'C++',
  'c++': 'C++',
  c: 'C',
  cs: 'C#',
  csharp: 'C#',
  bash: 'Bash',
  sh: 'Shell',
  zsh: 'Zsh',
  shell: 'Shell',
  sql: 'SQL',
  rust: 'Rust',
  rs: 'Rust',
  go: 'Go',
  golang: 'Go',
  php: 'PHP',
  ruby: 'Ruby',
  rb: 'Ruby',
  swift: 'Swift',
  kotlin: 'Kotlin',
  kt: 'Kotlin',
  yaml: 'YAML',
  yml: 'YAML',
  markdown: 'Markdown',
  md: 'Markdown',
  dockerfile: 'Dockerfile',
  docker: 'Dockerfile',
};

const THEMES = [
  { id: 'monokai', name: 'Monokai' },
  { id: 'monokai-fire', name: 'Monokai Fire 🔥' },
  { id: 'tokyo-night', name: 'Tokyo Night' },
  { id: 'atom-one-dark', name: 'Atom One Dark' },
  { id: 'github-dark', name: 'GitHub Dark' },
  { id: 'dracula', name: 'Dracula' },
  { id: 'night-owl', name: 'Night Owl' },
  { id: 'cyberpunk', name: 'Cyberpunk ⚡' },
];

function formatLanguageName(lang) {
  if (!lang) return 'Code';
  const cleanLang = lang.toLowerCase().trim();
  return LANGUAGE_NAMES[cleanLang] || (cleanLang.charAt(0).toUpperCase() + cleanLang.slice(1));
}

function getLanguageIcon(lang) {
  const clean = (lang || '').toLowerCase();
  if (['bash', 'sh', 'zsh', 'shell', 'terminal'].includes(clean)) {
    return <Terminal className="w-3.5 h-3.5 opacity-80" />;
  }
  return <Code2 className="w-3.5 h-3.5 opacity-80" />;
}

export default function CodeBlock({ className, children, rawCode }) {
  const [copied, setCopied] = useState(false);
  const [showLineNumbers, setShowLineNumbers] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState(() => {
    return localStorage.getItem('personal_assistant_code_theme') || 'monokai';
  });

  const handleThemeChange = (newTheme) => {
    setSelectedTheme(newTheme);
    localStorage.setItem('personal_assistant_code_theme', newTheme);
  };

  // Extract raw code string
  const codeString = useMemo(() => {
    if (typeof rawCode === 'string') return rawCode.replace(/\n$/, '');
    if (typeof children === 'string') return children.replace(/\n$/, '');
    if (Array.isArray(children)) {
      return children.map(c => (typeof c === 'string' ? c : '')).join('').replace(/\n$/, '');
    }
    return String(children || '').replace(/\n$/, '');
  }, [children, rawCode]);

  // Extract language identifier from className (e.g., "language-python")
  const langMatch = /language-(\w+)/.exec(className || '');
  const rawLang = langMatch ? langMatch[1] : '';
  const displayLang = formatLanguageName(rawLang);

  // Perform syntax highlighting via highlight.js
  const highlightedHtml = useMemo(() => {
    if (!codeString) return '';
    try {
      const validLanguage = rawLang && hljs.getLanguage(rawLang) ? rawLang : null;
      if (validLanguage) {
        return hljs.highlight(codeString, { language: validLanguage, ignoreIllegals: true }).value;
      }
      return hljs.highlightAuto(codeString).value;
    } catch (err) {
      return codeString
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    }
  }, [codeString, rawLang]);

  const handleCopy = () => {
    if (!codeString) return;
    navigator.clipboard.writeText(codeString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = useMemo(() => codeString.split('\n'), [codeString]);
  const isMultiLine = lines.length > 1;

  return (
    <div className={`my-3 rounded-xl border overflow-hidden shadow-lg transition-colors duration-200 font-sans code-theme-${selectedTheme}`}>
      {/* Code Header Bar */}
      <div className="px-4 py-2 code-header flex items-center justify-between select-none border-b">
        {/* Left: Language & line count */}
        <div className="flex items-center space-x-2">
          {getLanguageIcon(rawLang)}
          <span className="text-xs font-mono font-bold tracking-wider uppercase opacity-90">
            {displayLang}
          </span>
          {isMultiLine && (
            <span className="text-[11px] font-mono opacity-50">
              ({lines.length} lines)
            </span>
          )}
        </div>

        {/* Right controls: Theme Dropdown -> Line # Toggle -> Copy Button */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Theme Selector Dropdown (placed BEFORE the copy button) */}
          <div className="flex items-center space-x-1.5 bg-black/20 px-2 py-1 rounded-lg border border-white/10">
            <Palette className="w-3.5 h-3.5 opacity-70" />
            <select
              value={selectedTheme}
              onChange={(e) => handleThemeChange(e.target.value)}
              className="bg-transparent text-[11px] font-mono opacity-90 outline-none cursor-pointer focus:ring-0 text-slate-200 [&>option]:bg-[#1e1e24] [&>option]:text-slate-200"
              title="Select Code Panel Theme"
            >
              {THEMES.map((theme) => (
                <option key={theme.id} value={theme.id}>
                  {theme.name}
                </option>
              ))}
            </select>
          </div>

          {/* Line Numbers Toggle */}
          {isMultiLine && (
            <button
              onClick={() => setShowLineNumbers(!showLineNumbers)}
              className={`px-2 py-1 rounded-lg text-[11px] font-mono transition-colors cursor-pointer border ${
                showLineNumbers
                  ? 'bg-white/15 text-white border-white/20'
                  : 'bg-black/20 opacity-60 hover:opacity-100 border-white/10'
              }`}
              title="Toggle line numbers"
            >
              #
            </button>
          )}

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer border ${
              copied
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                : 'bg-black/20 opacity-80 hover:opacity-100 hover:bg-white/10 border-white/10'
            }`}
            title="Copy code to clipboard"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-sans text-[11px] font-semibold text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 opacity-70" />
                <span className="font-sans text-[11px]">Copy code</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code Body - Seamlessly integrated without nested box artifacts while strictly preserving indentation */}
      <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed flex whitespace-pre m-0 border-none bg-transparent">
        {showLineNumbers && (
          <div className="select-none pr-4 mr-4 text-right border-r border-white/10 opacity-40 font-mono text-xs leading-relaxed flex flex-col whitespace-pre">
            {lines.map((_, idx) => (
              <span key={idx}>{idx + 1}</span>
            ))}
          </div>
        )}
        <code
          className={`hljs flex-1 whitespace-pre ${rawLang ? `language-${rawLang}` : ''}`}
          dangerouslySetInnerHTML={{ __html: highlightedHtml }}
        />
      </pre>
    </div>
  );
}
