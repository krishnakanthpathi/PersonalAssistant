import React, { useState } from 'react';
import { Check, ChevronDown, ChevronUp, AlertCircle, Wrench, Clock, Zap } from 'lucide-react';

export default function ToolCard({ toolExecutions = [] }) {
  const [expanded, setExpanded] = useState(false);

  const executions = Array.isArray(toolExecutions) 
    ? toolExecutions 
    : (toolExecutions ? [toolExecutions] : []);

  if (executions.length === 0) return null;

  const formatDuration = (ms) => {
    if (ms === null || ms === undefined || isNaN(ms)) return null;
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const totalLatency = executions.reduce((sum, exec) => {
    const lat = exec.latency || exec.duration || 0;
    return sum + (typeof lat === 'number' ? lat : 0);
  }, 0);

  const formattedTotal = totalLatency > 0 ? formatDuration(totalLatency) : null;

  return (
    <div className="mt-2.5 mb-1 rounded-xl bg-[#141414]/90 border border-[#2a2a2a] overflow-hidden text-xs font-sans shadow-sm transition-all duration-200">
      {/* Footer Pill Header */}
      <div 
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-[#1a1a1a] transition-colors select-none"
      >
        <div className="flex items-center space-x-2 min-w-0 flex-1 mr-2">
          <Zap className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 animate-pulse" />
          <span className="font-mono text-slate-300 text-[11px] font-medium flex-shrink-0">
            {executions.length} {executions.length === 1 ? 'tool executed' : 'tools executed'}
          </span>

          {formattedTotal && (
            <span className="px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 text-[10px] font-mono border border-amber-500/20 flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" />
              {formattedTotal}
            </span>
          )}

          {/* Flexible Tool Badges */}
          <div className="hidden sm:flex flex-wrap gap-1 overflow-hidden max-h-6">
            {executions.map((t, idx) => {
              const name = t.toolName || t.name || 'tool';
              const lat = t.latency || t.duration;
              const timeStr = formatDuration(lat);
              return (
                <span key={idx} className="px-1.5 py-0.5 rounded bg-[#212121] text-[10px] font-mono text-slate-300 border border-[#2a2a2a] truncate max-w-[160px] flex items-center space-x-1">
                  <span>{name}</span>
                  {timeStr && <span className="text-slate-400 font-normal">({timeStr})</span>}
                </span>
              );
            })}
          </div>
        </div>

        <div className="flex items-center space-x-1.5 text-slate-400 hover:text-white flex-shrink-0">
          <span className="text-[10px] font-mono text-slate-500">{expanded ? 'Hide details' : 'Show details'}</span>
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </div>
      </div>

      {/* Expanded Accordion Body */}
      {expanded && (
        <div className="p-3 bg-[#0c0c0c] border-t border-[#262626] space-y-3 font-mono text-[11px]">
          {executions.map((exec, idx) => {
            const name = exec.toolName || exec.name || 'Tool';
            const params = exec.params || exec.arguments || exec.args || exec.toolArgs;
            const result = exec.result || exec.output;
            const isError = exec.isError || exec.error || exec.status === 'failed';
            const lat = exec.latency || exec.duration;
            const timeStr = formatDuration(lat);

            return (
              <div key={idx} className="space-y-1.5 border-b border-[#212121] pb-2.5 last:border-b-0 last:pb-0">
                <div className="flex items-center justify-between text-slate-300">
                  <div className="flex items-center space-x-2 font-semibold text-white truncate">
                    <Wrench className="w-3 h-3 text-slate-400 flex-shrink-0" />
                    <span className="truncate">{name}</span>
                  </div>

                  <div className="flex items-center space-x-2 flex-shrink-0">
                    {timeStr && (
                      <span className="text-slate-400 text-[10px] font-mono flex items-center bg-[#1a1a1a] px-1.5 py-0.5 rounded border border-[#2a2a2a]">
                        <Clock className="w-2.5 h-2.5 mr-1 text-slate-400" /> {timeStr}
                      </span>
                    )}

                    {isError ? (
                      <span className="text-red-400 text-[10px] flex items-center bg-red-950/30 px-1.5 py-0.5 rounded border border-red-900/40">
                        <AlertCircle className="w-3 h-3 mr-1" /> Failed
                      </span>
                    ) : (
                      <span className="text-emerald-400 text-[10px] flex items-center bg-emerald-950/30 px-1.5 py-0.5 rounded border border-emerald-900/40">
                        <Check className="w-3 h-3 mr-1" /> Executed
                      </span>
                    )}
                  </div>
                </div>

                {params && (
                  <div>
                    <div className="text-[10px] uppercase text-slate-500 font-semibold mb-0.5">Parameters</div>
                    <pre className="p-2 rounded-lg bg-[#141414] text-slate-300 overflow-x-auto border border-[#262626] text-[10px] max-w-full">
                      {typeof params === 'string' ? params : JSON.stringify(params, null, 2)}
                    </pre>
                  </div>
                )}

                {result && (
                  <div>
                    <div className="text-[10px] uppercase text-slate-500 font-semibold mb-0.5">Output</div>
                    <pre className="p-2 rounded-lg bg-[#141414] text-slate-200 overflow-x-auto border border-[#262626] text-[10px] max-h-48 max-w-full">
                      {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
