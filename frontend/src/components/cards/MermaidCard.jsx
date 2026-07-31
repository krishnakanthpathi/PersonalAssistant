import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { Maximize2, Minimize2, Copy, Check, RefreshCw } from 'lucide-react';

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  themeVariables: {
    darkMode: true,
    background: '#141414',
    primaryColor: '#262626',
    primaryTextColor: '#ececec',
    primaryBorderColor: '#404040',
    lineColor: '#a3a3a3',
    secondaryColor: '#1c1c1c',
    tertiaryColor: '#212121',
  },
  securityLevel: 'loose',
});

function sanitizeMermaidCode(code) {
  if (!code) return '';
  let trimmed = code.trim();
  // Strip %%{init: ...}%% directive lines if present
  trimmed = trimmed.replace(/%%\{[\s\S]*?\}%%/gi, '').trim();
  // Replace invalid barChart or lineChart keywords globally with xychart-beta
  trimmed = trimmed.replace(/\b(barChart|lineChart)\b/gi, 'xychart-beta');
  return trimmed;
}

export default function MermaidCard({ chartCode }) {
  const containerRef = useRef(null);
  const [svgContent, setSvgContent] = useState('');
  const [error, setError] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const chartIdRef = useRef(`mermaid-${Math.random().toString(36).substring(2, 9)}`);

  useEffect(() => {
    let isMounted = true;
    const renderDiagram = async () => {
      const sanitized = sanitizeMermaidCode(chartCode);
      if (!sanitized) return;
      try {
        setError(null);
        const { svg } = await mermaid.render(chartIdRef.current, sanitized);
        if (isMounted) {
          setSvgContent(svg);
        }
      } catch (err) {
        console.error('Mermaid render error:', err);
        if (isMounted) {
          setError('Could not render diagram format. Displaying raw code fallback below.');
        }
      }
    };

    renderDiagram();
    return () => {
      isMounted = false;
    };
  }, [chartCode]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(chartCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 rounded-2xl bg-[#141414] border border-[#2a2a2a] overflow-hidden shadow-xl font-sans">
      {/* Top Header */}
      <div className="px-4 py-3 bg-[#1c1c1c] border-b border-[#262626] flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
          <span className="text-xs font-mono font-semibold text-slate-200 uppercase tracking-wider">
            Mermaid Diagram
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleCopyCode}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#262626] transition-colors cursor-pointer"
            title="Copy Mermaid Code"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#262626] transition-colors cursor-pointer"
            title={isExpanded ? 'Exit Fullscreen' : 'Expand Fullscreen'}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Rendered SVG Content */}
      <div className="p-4 overflow-x-auto flex justify-center bg-[#141414] min-h-[160px] items-center">
        {error ? (
          <div className="w-full space-y-2">
            <div className="text-xs font-mono text-slate-400 p-2.5 rounded-xl bg-[#1c1c1c] border border-white/10">
              {error}
            </div>
            <pre className="p-3 rounded-xl bg-[#121212] border border-[#262626] text-xs font-mono text-slate-300 overflow-x-auto">
              <code>{chartCode}</code>
            </pre>
          </div>
        ) : svgContent ? (
          <div
            ref={containerRef}
            className="mermaid-svg-wrapper max-w-full"
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        ) : (
          <div className="flex items-center space-x-2 text-xs font-mono text-slate-500">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>Rendering diagram...</span>
          </div>
        )}
      </div>

      {/* Fullscreen Modal */}
      {isExpanded && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col p-4 sm:p-8 overflow-hidden">
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-white" />
              <span className="text-sm font-mono font-bold text-white uppercase tracking-wider">
                Mermaid Diagram Viewer
              </span>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="p-2 rounded-xl bg-[#212121] text-slate-300 hover:text-white hover:bg-[#333333] transition-colors cursor-pointer"
            >
              <Minimize2 className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-auto flex items-center justify-center p-6 bg-[#121212] my-4 rounded-2xl border border-white/10">
            {svgContent ? (
              <div
                className="mermaid-svg-wrapper scale-110 max-w-full max-h-full"
                dangerouslySetInnerHTML={{ __html: svgContent }}
              />
            ) : (
              <pre className="p-4 rounded-xl bg-[#141414] border border-[#262626] text-xs font-mono text-slate-300">
                <code>{chartCode}</code>
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
