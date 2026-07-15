import React, { useRef, useEffect } from 'react';
import {
  Volume2,
  Sparkles,
  MessageSquare,
  FileText,
  Calendar,
  Globe,
  Mic,
  MicOff,
  Send,
  Terminal
} from 'lucide-react';

export default function ChatPanel({
  messages,
  isProcessing,
  interimSpeech,
  currentStatusLog,
  currentlySpeakingId,
  speakText,
  prompt,
  setPrompt,
  handleSend,
  isListening,
  toggleListening,
  parseMarkdown
}) {
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentStatusLog]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (prompt.trim() && !isProcessing) {
        handleSend();
      }
    }
  };

  const starterPrompts = [];

  const handleMarkdownClick = (e) => {
    // Event delegation: handle copy button clicks inside dangerouslySetInnerHTML
    const btn = e.target.closest('[data-copy-btn]');
    if (!btn) return;
    const wrapper = btn.closest('.code-block-wrapper');
    const codeEl = wrapper?.querySelector('code');
    if (!codeEl) return;

    navigator.clipboard.writeText(codeEl.innerText).then(() => {
      btn.classList.add('copied');
      btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Copied!`;
      setTimeout(() => {
        btn.classList.remove('copied');
        btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Copy code`;
      }, 2000);
    }).catch(() => {
      // Fallback for non-HTTPS
      const ta = document.createElement('textarea');
      ta.value = codeEl.innerText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      btn.classList.add('copied');
      btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Copied!`;
      setTimeout(() => {
        btn.classList.remove('copied');
        btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Copy code`;
      }, 2000);
    });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Messages list */}
      <div className="flex-grow overflow-y-auto px-3 sm:px-6 py-4 sm:py-6 flex flex-col gap-4 sm:gap-6">
        {messages.length === 0 ? (
          <div className="m-auto w-full max-w-xl text-center py-8 sm:py-12 px-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-accent-gradient flex items-center justify-center m-auto mb-5 shadow-glow">
              <Sparkles className="text-white w-6 h-6 sm:w-8 sm:h-8" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight mb-2">Personal AI Assistant</h2>
            <p className="text-xs sm:text-sm text-gray-400 leading-relaxed mb-6 sm:mb-8">
              Interact with your system volume, Notion pages, local file system, Google calendar, and Gmail.
              The assistant reasoning loop will call local and remote tools dynamically to satisfy your prompt.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 sm:mb-8">
              <div className="p-3 sm:p-4 bg-white/5 border border-white/5 rounded-2xl text-left hover:bg-white/10 transition-all">
                <div className="flex items-center gap-2 text-xs font-bold text-white mb-1">
                  <Volume2 size={14} className="text-accent-blue" />
                  System Audio
                </div>
                <span className="text-xs text-gray-500 leading-relaxed">Controls system volume levels directly on your Mac.</span>
              </div>
              <div className="p-3 sm:p-4 bg-white/5 border border-white/5 rounded-2xl text-left hover:bg-white/10 transition-all">
                <div className="flex items-center gap-2 text-xs font-bold text-white mb-1">
                  <FileText size={14} className="text-accent-mono" />
                  Notion Notes
                </div>
                <span className="text-xs text-gray-500 leading-relaxed">Read notes, search pages, and append content to your workspace.</span>
              </div>
              <div className="p-3 sm:p-4 bg-white/5 border border-white/5 rounded-2xl text-left hover:bg-white/10 transition-all">
                <div className="flex items-center gap-2 text-xs font-bold text-white mb-1">
                  <Calendar size={14} className="text-accent-emerald" />
                  Google Apps
                </div>
                <span className="text-xs text-gray-500 leading-relaxed">Manage Google Calendar events and read/compose Gmail messages.</span>
              </div>
              <div className="p-3 sm:p-4 bg-white/5 border border-white/5 rounded-2xl text-left hover:bg-white/10 transition-all">
                <div className="flex items-center gap-2 text-xs font-bold text-white mb-1">
                  <Globe size={14} className="text-blue-400" />
                  Web Scraper
                </div>
                <span className="text-xs text-gray-500 leading-relaxed">Automate browser queries, search the web, and scrape details.</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 justify-center">
              {starterPrompts.map((p, i) => (
                <button
                  key={i}
                  className="px-3.5 py-2 bg-white/5 hover:bg-white/10 rounded-full text-xs font-medium transition-all border border-white/5 hover:border-white/10 text-gray-300"
                  onClick={() => handleSend(p.text)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} className={`flex flex-col gap-1 w-full ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className="text-[10px] text-gray-500 font-semibold tracking-wider px-1 flex items-center justify-between w-full gap-2">
                <span>{msg.role === 'user' ? 'YOU' : 'ASSISTANT'}</span>
                {msg.role === 'assistant' && (
                  <button
                    onClick={() => speakText(msg.content, idx)}
                    className={`p-1 rounded-md transition-all ${currentlySpeakingId === idx ? 'text-accent-blue bg-accent-blue/10' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
                    title={currentlySpeakingId === idx ? "Stop speaking" : "Read response out loud"}
                  >
                    <Volume2 size={12} className={currentlySpeakingId === idx ? 'animate-pulse' : ''} />
                  </button>
                )}
              </div>
              <div className={`max-w-[92%] sm:max-w-[85%] p-3 sm:p-4 rounded-2xl border text-sm leading-relaxed ${msg.role === 'user' ? 'bg-accent-mono/10 border-accent-mono/20 text-white rounded-tr-none' : 'bg-bg-secondary/40 border-white/5 rounded-tl-none'}`}>
                {msg.role === 'user' ? (
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                ) : !msg.content && !msg.isError && isProcessing && idx === messages.length - 1 ? (
                  <div className="flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-accent-blue animate-pulse shadow-[0_0_8px_var(--color-accent-blue)]"></span>
                    <span className="text-xs text-gray-400 font-mono">{currentStatusLog || 'Thinking...'}</span>
                  </div>
                ) : (
                  <div className="markdown-body min-w-0" onClick={handleMarkdownClick} dangerouslySetInnerHTML={{ __html: parseMarkdown(msg.content) || (msg.isError ? 'An error occurred' : 'Thinking...') }} />
                )}
              </div>

              {msg.role === 'assistant' && msg.speech && (
                <button
                  onClick={() => speakText(msg.speech, `bubble-${idx}`)}
                  className={`speech-bubble-container text-left transition-all hover:bg-white/10 cursor-pointer outline-none max-w-[92%] sm:max-w-[85%] ${currentlySpeakingId === `bubble-${idx}`
                      ? 'border-accent-blue/40 bg-accent-blue/[0.04] shadow-[0_0_12px_rgba(59,130,246,0.15)]'
                      : ''
                    }`}
                  title={currentlySpeakingId === `bubble-${idx}` ? "Click to stop reading" : "Click to read out loud"}
                >
                  <Volume2
                    className={`speech-icon ${currentlySpeakingId === `bubble-${idx}` ? 'text-accent-blue animate-pulse' : 'text-gray-400'}`}
                    size={14}
                  />
                  <span className="speech-text">"{msg.speech}"</span>
                </button>
              )}

              {/* Active loop status display */}
              {msg.role === 'assistant' && msg.logs && msg.logs.length > 0 && (
                <div className="mt-2.5 max-w-full">
                  <details className="text-[11px] font-mono text-gray-400 border border-white/10 rounded-xl bg-white/[0.02] overflow-hidden group">
                    <summary className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-white/[0.04] select-none transition-colors">
                      <div className="flex items-center gap-2">
                        <Terminal className="w-3.5 h-3.5 text-accent-blue" />
                        <span className="font-semibold text-gray-300">Tool Execution Logs ({msg.logs.length} events)</span>
                      </div>
                      <span className="text-[10px] text-gray-500 group-open:rotate-180 transition-transform">▼</span>
                    </summary>
                    <div className="px-3 pb-3 pt-2 border-t border-white/5 flex flex-col gap-2 max-h-60 overflow-y-auto bg-black/20">
                      {msg.logs.map((log, lIdx) => {
                        let badgeColor = 'bg-white/5 text-gray-400';
                        let textColor = 'text-gray-300';
                        
                        if (log.includes('succeeded')) {
                          badgeColor = 'bg-accent-emerald/10 text-accent-emerald border border-accent-emerald/20';
                        } else if (log.includes('failed')) {
                          badgeColor = 'bg-red-500/10 text-red-400 border border-red-500/20';
                          textColor = 'text-red-300';
                        } else if (log.startsWith('Calling tool:')) {
                          badgeColor = 'bg-accent-blue/10 text-accent-blue border border-accent-blue/20';
                        }
                        
                        return (
                          <div key={lIdx} className="flex gap-2 items-start leading-relaxed border-b border-white/[0.02] pb-1.5 last:border-b-0 last:pb-0">
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider shrink-0 mt-0.5 border ${badgeColor}`}>
                              {log.startsWith('Calling tool:') ? 'Call' : log.includes('succeeded') ? 'Success' : log.includes('failed') ? 'Failure' : 'Info'}
                            </span>
                            <span className={`break-all ${textColor}`}>{log}</span>
                          </div>
                        );
                      })}
                    </div>
                  </details>
                </div>
              )}
            </div>
          ))
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input box area */}
      <div className="p-3 sm:p-6 bg-gradient-to-t from-bg-primary via-bg-primary to-transparent flex-shrink-0">
        <div className="max-w-3xl mx-auto animate-fadeIn">
          {isListening && (
            <div className="flex items-center gap-2 mb-2.5 px-3 py-2 bg-red-500/5 border border-red-500/20 rounded-xl text-xs text-red-300 animate-fadeIn">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              <span className="font-semibold tracking-wide uppercase text-[9px] text-red-400">Listening:</span>
              <span className="italic opacity-85 truncate">{interimSpeech || "Speak now..."}</span>
            </div>
          )}
          <div className="flex items-end gap-2 p-2 bg-bg-secondary border border-border-color rounded-2xl shadow-md focus-within:border-accent-mono/50 transition-all">
            <textarea
              className="flex-grow bg-transparent border-0 ring-0 focus:ring-0 focus:outline-none text-sm text-gray-200 placeholder-gray-500 resize-none max-h-36 py-2 px-2 sm:px-3 leading-relaxed min-w-0"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isListening ? "Listening... Speak clearly" : "Ask anything..."}
              disabled={isProcessing}
              rows={1}
            />
            <button
              className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all shadow-sm shrink-0 ${isListening
                  ? 'bg-red-500 hover:bg-red-600 text-white mic-active-glow'
                  : 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/5'
                }`}
              onClick={toggleListening}
              disabled={isProcessing}
              title="Toggle speech recognition"
            >
              {isListening ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
            <button
              className="w-9 h-9 flex items-center justify-center bg-accent-mono hover:bg-neutral-200 text-black rounded-xl disabled:opacity-50 transition-all shadow-sm shrink-0"
              onClick={() => handleSend()}
              disabled={!prompt.trim() || isProcessing}
            >
              <Send size={16} />
            </button>
          </div>
          {messages.length > 0 && starterPrompts.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {starterPrompts.map((p, i) => (
                <button
                  key={i}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-full text-xs transition-all text-gray-400 hover:text-white"
                  onClick={() => handleSend(p.text)}
                  disabled={isProcessing}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
