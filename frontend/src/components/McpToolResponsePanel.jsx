import React, { useState } from 'react';
import { 
  Wrench, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Clock, 
  Terminal, 
  Copy, 
  Check, 
  Code2
} from 'lucide-react';

export default function McpToolResponsePanel({ toolExecutions = [], logs = [], isProcessing = false }) {
  const [hoveredToolId, setHoveredToolId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const handleCopyResult = (text, id, e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Helper to extract tool items from toolExecutions AND logs (string or object format)
  const getToolItems = () => {
    if (toolExecutions && toolExecutions.length > 0) {
      return toolExecutions;
    }

    if (!logs || logs.length === 0) return [];

    const steps = [];
    logs.forEach((log, index) => {
      if (!log) return;

      // Handle structured object log entry
      if (typeof log === 'object' && log.type === 'tool_execution' && log.data) {
        const exec = log.data;
        const existingIdx = steps.findIndex(s => s.id === exec.id || (s.toolName === exec.toolName && s.status === 'running'));
        if (existingIdx >= 0) {
          steps[existingIdx] = { ...steps[existingIdx], ...exec };
        } else {
          steps.push({ ...exec });
        }
        return;
      }

      // Handle string log entry
      if (typeof log === 'string') {
        const callMatch = log.match(/Calling tool:\s*([a-zA-Z0-9_-]+)(?:\s*\(Args:\s*([\s\S]+)\))?/i);
        const successMatch = log.match(/Tool\s*([a-zA-Z0-9_-]+)\s*succeeded\s*\(([^)]+)\)/i);
        const failMatch = log.match(/Tool\s*([a-zA-Z0-9_-]+)\s*failed:\s*([^(]+)\s*\(([^)]+)\)/i);

        if (callMatch) {
          let toolArgs = null;
          if (callMatch[2]) {
            try {
              let rawArgsStr = callMatch[2].trim();
              if (rawArgsStr.endsWith(')')) rawArgsStr = rawArgsStr.slice(0, -1).trim();
              toolArgs = JSON.parse(rawArgsStr);
            } catch {
              toolArgs = { raw: callMatch[2] };
            }
          }
          steps.push({
            id: `log-step-${index}-${callMatch[1]}`,
            toolName: callMatch[1],
            toolArgs,
            status: 'running',
            logText: log
          });
        } else if (successMatch) {
          const existing = steps.slice().reverse().find(s => s.toolName === successMatch[1] && s.status === 'running');
          if (existing) {
            existing.status = 'success';
            existing.latency = successMatch[2];
          } else {
            steps.push({
              id: `log-step-${index}-${successMatch[1]}`,
              toolName: successMatch[1],
              status: 'success',
              latency: successMatch[2]
            });
          }
        } else if (failMatch) {
          const existing = steps.slice().reverse().find(s => s.toolName === failMatch[1] && s.status === 'running');
          if (existing) {
            existing.status = 'failed';
            existing.error = failMatch[2].trim();
            existing.latency = failMatch[3];
          } else {
            steps.push({
              id: `log-step-${index}-${failMatch[1]}`,
              toolName: failMatch[1],
              status: 'failed',
              error: failMatch[2].trim(),
              latency: failMatch[3]
            });
          }
        }
      }
    });

    // When loading from HTTP (isProcessing is false), ensure finished steps reflect success state
    if (!isProcessing) {
      steps.forEach(s => {
        if (s.status === 'running') s.status = 'success';
      });
    }

    return steps;
  };

  const itemsToRender = getToolItems();

  if (itemsToRender.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t border-white/10 w-full animate-fadeIn font-sans">
      {/* Panel Header */}
      <div className="flex items-center justify-between mb-2 text-[11px] text-gray-400 font-medium">
        <div className="flex items-center gap-1.5">
          <Wrench size={13} className="text-accent-blue" />
          <span className="text-white font-semibold">MCP Tool Responses & Thinking Steps</span>
          <span className="px-1.5 py-0.5 rounded-full bg-white/10 text-[9px] font-mono text-gray-300">
            {itemsToRender.length} {itemsToRender.length === 1 ? 'call' : 'calls'}
          </span>
        </div>
        <span className="text-[10px] text-gray-500 italic">Hover items for MCP result details</span>
      </div>

      {/* Tool Call Cards / Pills Grid */}
      <div className="flex flex-wrap gap-2 relative">
        {itemsToRender.map((tool, idx) => {
          const id = tool.id || `tool-${idx}`;
          const isSuccess = tool.status === 'success';
          const isFailed = tool.status === 'failed';
          const isRunning = tool.status === 'running';

          // Status colors
          // Success: Green (#10b981 / emerald)
          // Failed: Red (#ef4444 / red)
          // Running: Blue (#3b82f6 / blue pulsing)
          const badgeClass = isSuccess
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
            : isFailed
            ? 'bg-red-500/10 border-red-500/30 text-red-300 hover:bg-red-500/20'
            : 'bg-blue-500/10 border-blue-500/30 text-blue-300 hover:bg-blue-500/20 animate-pulse';

          const statusDotClass = isSuccess
            ? 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.6)]'
            : isFailed
            ? 'bg-red-400 shadow-[0_0_8px_rgba(239,68,68,0.6)]'
            : 'bg-blue-400 animate-ping shadow-[0_0_8px_rgba(59,130,246,0.6)]';

          // Extract thought number summary if sequentialthinking
          let summaryLabel = tool.toolName;
          if (tool.toolArgs?.thoughtNumber && tool.toolArgs?.totalThoughts) {
            summaryLabel = `${tool.toolName} (#${tool.toolArgs.thoughtNumber}/${tool.toolArgs.totalThoughts})`;
          }

          const isHovered = hoveredToolId === id;

          return (
            <div
              key={id}
              className="relative inline-block"
              onMouseEnter={() => setHoveredToolId(id)}
              onMouseLeave={() => setHoveredToolId(null)}
            >
              {/* Main Badge / Card */}
              <div className={`flex items-center gap-2 px-3 py-1.5 border rounded-xl text-xs transition-all cursor-pointer shadow-sm ${badgeClass}`}>
                <span className={`w-2 h-2 rounded-full shrink-0 ${statusDotClass}`}></span>
                <span className="font-mono font-semibold tracking-tight">{summaryLabel}</span>

                {isSuccess && <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />}
                {isFailed && <XCircle size={12} className="text-red-400 shrink-0" />}
                {isRunning && <Loader2 size={12} className="animate-spin text-blue-400 shrink-0" />}

                {tool.latency && (
                  <span className="text-[10px] opacity-75 font-mono">
                    {typeof tool.latency === 'number' ? `${tool.latency}ms` : tool.latency}
                  </span>
                )}
              </div>

              {/* On-Hover Popover Details Window */}
              {isHovered && (
                <div 
                  className="absolute bottom-full left-0 mb-2 w-80 sm:w-96 p-3.5 bg-[#0f1117]/95 backdrop-blur-md border border-white/15 rounded-2xl shadow-2xl z-50 text-xs text-gray-200 animate-fadeIn"
                  style={{ minWidth: '280px' }}
                >
                  {/* Popover Header */}
                  <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <Terminal size={14} className="text-accent-blue" />
                      <span className="font-mono font-bold text-white text-xs">{tool.toolName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                        isSuccess ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                        isFailed ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
                        'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      }`}>
                        {isSuccess ? 'Succeeded' : isFailed ? 'Failed' : 'Running...'}
                      </span>
                      {tool.latency && (
                        <span className="text-[10px] text-gray-400 font-mono flex items-center gap-1">
                          <Clock size={10} />
                          {typeof tool.latency === 'number' ? `${tool.latency}ms` : tool.latency}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Input Arguments Section */}
                  {tool.toolArgs && (
                    <div className="mb-2.5">
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1 font-mono">
                        <Code2 size={11} className="text-accent-blue" /> Input Arguments
                      </div>
                      <pre className="bg-black/60 border border-white/10 p-2 rounded-lg text-[11px] font-mono text-gray-300 overflow-x-auto max-h-28">
                        {JSON.stringify(tool.toolArgs, null, 2)}
                      </pre>
                    </div>
                  )}

                  {/* MCP Tool Response Output Section */}
                  <div>
                    <div className="flex items-center justify-between text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 font-mono">
                      <span className="flex items-center gap-1">
                        <Terminal size={11} className={isFailed ? 'text-red-400' : 'text-emerald-400'} />
                        {isFailed ? 'Error Details' : 'MCP Response Output'}
                      </span>
                      {(tool.result || tool.error) && (
                        <button
                          onClick={(e) => handleCopyResult(tool.result || tool.error, id, e)}
                          className="px-1.5 py-0.5 bg-white/10 hover:bg-white/20 rounded text-[9px] text-gray-300 flex items-center gap-1 transition-all"
                          title="Copy response text"
                        >
                          {copiedId === id ? (
                            <>
                              <Check size={10} className="text-emerald-400" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy size={10} />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    <div className={`bg-black/70 border p-2.5 rounded-xl text-[11px] font-mono leading-relaxed overflow-y-auto max-h-48 whitespace-pre-wrap break-words ${
                      isFailed ? 'border-red-500/30 text-red-300' : 'border-white/10 text-gray-200'
                    }`}>
                      {tool.result ? (
                        tool.result
                      ) : tool.error ? (
                        <span className="text-red-400 font-semibold">{tool.error}</span>
                      ) : isRunning ? (
                        <span className="text-blue-400 italic">Tool execution in progress...</span>
                      ) : (
                        <span className="text-gray-500 italic font-mono">No detailed output returned (Status colors shown)</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
