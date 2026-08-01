import React, { useState } from 'react';
import { Eye, Code, Maximize2, Minimize2, Copy, Check, RefreshCw } from 'lucide-react';

function prepareSandboxHtml(code) {
  if (!code || typeof code !== 'string') return '';
  let html = code.trim();

  // If unclosed <style> tag during streaming/truncation, auto-close it
  const openStyles = (html.match(/<style[^>]*>/gi) || []).length;
  const closeStyles = (html.match(/<\/style>/gi) || []).length;
  if (openStyles > closeStyles) {
    html += '\n</style>';
  }

  // If unclosed <script> tag during streaming/truncation, auto-close it
  const openScripts = (html.match(/<script[^>]*>/gi) || []).length;
  const closeScripts = (html.match(/<\/script>/gi) || []).length;
  if (openScripts > closeScripts) {
    html += '\n</script>';
  }

  // Ensure valid HTML shell wrapper if missing
  if (!html.toLowerCase().includes('<html')) {
    html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body style="margin:0;padding:16px;background:#ffffff;color:#111827;font-family:sans-serif;">
${html}
</body>
</html>`;
  }

  return html;
}

export default function HtmlSandboxCard({ codeContent, title = 'Interactive HTML/CSS Preview', isStreaming = false }) {
  const [activeTab, setActiveTab] = useState('preview'); // 'preview' | 'code'
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(codeContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const preparedHtml = prepareSandboxHtml(codeContent);

  return (
    <div className="my-3 rounded-2xl bg-[#141414] border border-[#2a2a2a] overflow-hidden shadow-xl font-sans">
      {/* Top Header & Tab Controls */}
      <div className="px-4 py-2.5 bg-[#1c1c1c] border-b border-[#262626] flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center space-x-2">
          {isStreaming ? (
            <RefreshCw className="w-3.5 h-3.5 text-white animate-spin" />
          ) : (
            <div className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
          )}
          <span className="text-xs font-mono font-semibold text-slate-200 tracking-wide">
            {title} {isStreaming && <span className="text-[10px] text-slate-400 font-normal italic">(Generating...)</span>}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Tab buttons */}
          <div className="flex items-center p-0.5 rounded-xl bg-[#121212] border border-[#2a2a2a]">
            <button
              onClick={() => setActiveTab('preview')}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                activeTab === 'preview' ? 'bg-[#262626] text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview</span>
            </button>
            <button
              onClick={() => setActiveTab('code')}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                activeTab === 'code' ? 'bg-[#262626] text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>Code</span>
            </button>
          </div>

          <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#262626] transition-colors cursor-pointer"
            title="Copy HTML Code"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#262626] transition-colors cursor-pointer"
            title={isExpanded ? 'Exit Fullscreen' : 'Fullscreen Canvas'}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-[#121212] min-h-[280px]">
        {activeTab === 'preview' ? (
          <iframe
            title="HTML Live Sandbox"
            srcDoc={preparedHtml}
            className="w-full h-80 border-none bg-white rounded-b-2xl"
            sandbox="allow-scripts allow-modals allow-same-origin"
          />
        ) : (
          <pre className="p-4 m-0 overflow-x-auto text-xs font-mono text-slate-200 bg-[#121212] max-h-96">
            <code>{codeContent}</code>
          </pre>
        )}
      </div>

      {/* Fullscreen Canvas Modal */}
      {isExpanded && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col p-4 sm:p-8 overflow-hidden">
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-white" />
              <span className="text-sm font-mono font-bold text-white uppercase tracking-wider">
                Full-Page Interactive Canvas Preview
              </span>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="p-2 rounded-xl bg-[#212121] text-slate-300 hover:text-white hover:bg-[#333333] transition-colors cursor-pointer"
            >
              <Minimize2 className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 my-4 rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-white">
            <iframe
              title="Full-Page HTML Sandbox"
              srcDoc={preparedHtml}
              className="w-full h-full border-none"
              sandbox="allow-scripts allow-modals allow-same-origin"
            />
          </div>
        </div>
      )}
    </div>
  );
}
