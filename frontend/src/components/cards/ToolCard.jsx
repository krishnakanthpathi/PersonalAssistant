import React, { useState } from 'react';
import { Check, ChevronDown, ChevronUp, AlertCircle, Wrench } from 'lucide-react';

export default function ToolCard({ toolExecutions = [] }) {
  const [expanded, setExpanded] = useState(false);

  const executions = Array.isArray(toolExecutions) 
    ? toolExecutions 
    : (toolExecutions ? [toolExecutions] : []);

  if (executions.length === 0) return null;

  return (
    <div className="my-2 rounded-xl bg-[#141414] border border-[#2a2a2a] overflow-hidden text-xs font-sans">
      {/* Header Pill with Clean Wrapping Badges */}
      <div 
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between px-3.5 py-2.5 cursor-pointer hover:bg-[#1a1a1a] transition-colors select-none"
      >
        <div className="flex items-center space-x-2 min-w-0 flex-1 mr-2">
          <div className="w-2 h-2 rounded-full bg-white animate-pulse flex-shrink-0" />
          <span className="font-mono text-slate-300 text-[11px] font-medium flex-shrink-0">
            Used {executions.length} {executions.length === 1 ? 'tool' : 'tools'}
          </span>

          {/* Flexible Wrapping Tool Badges */}
          <div className="hidden sm:flex flex-wrap gap-1 overflow-hidden max-h-6">
            {executions.map((t, idx) => (
              <span key={idx} className="px-1.5 py-0.5 rounded bg-[#212121] text-[10px] font-mono text-slate-300 border border-[#2a2a2a] truncate max-w-[120px]">
                {t.toolName || t.name || 'tool'}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center space-x-2 flex-shrink-0">
          {expanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
        </div>
      </div>

      {/* Expanded Accordion Body */}
      {expanded && (
        <div className="p-3 bg-[#0c0c0c] border-t border-[#262626] space-y-3 font-mono text-[11px]">
          {executions.map((exec, idx) => {
            const name = exec.toolName || exec.name || 'Tool';
            const params = exec.params || exec.arguments || exec.args;
            const result = exec.result || exec.output;
            const isError = exec.isError || exec.error;

            return (
              <div key={idx} className="space-y-1.5 border-b border-[#212121] pb-2 last:border-b-0 last:pb-0">
                <div className="flex items-center justify-between text-slate-300">
                  <div className="flex items-center space-x-1.5 font-semibold text-white truncate">
                    <Wrench className="w-3 h-3 text-slate-400 flex-shrink-0" />
                    <span className="truncate">{name}</span>
                  </div>

                  {isError ? (
                    <span className="text-slate-400 text-[10px] flex items-center flex-shrink-0">
                      <AlertCircle className="w-3 h-3 mr-1" /> Failed
                    </span>
                  ) : (
                    <span className="text-slate-400 text-[10px] flex items-center flex-shrink-0">
                      <Check className="w-3 h-3 mr-1 text-white" /> Executed
                    </span>
                  )}
                </div>

                {params && (
                  <div>
                    <div className="text-[10px] uppercase text-slate-500 font-semibold mb-0.5">Parameters</div>
                    <pre className="p-2 rounded-lg bg-[#141414] text-slate-400 overflow-x-auto border border-[#262626] text-[10px] max-w-full">
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
