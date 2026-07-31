import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  Paperclip, 
  Sparkles, 
  FileText, 
  Image as ImageIcon, 
  X, 
  Copy, 
  Check, 
  ArrowUp,
  Brain,
  Code2,
  BarChart2,
  Compass,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Square,
  MessageSquareQuote,
  Layers
} from 'lucide-react';
import ToolCard from './cards/ToolCard';
import ChartCard from './cards/ChartCard';
import MermaidCard from './cards/MermaidCard';
import HtmlSandboxCard from './cards/HtmlSandboxCard';
import PrebuiltFormsModal from './cards/PrebuiltFormsModal';

function extractChartFromContent(content) {
  if (!content || typeof content !== 'string') return null;
  const match = content.match(/```json\s*chart\s*([\s\S]*?)```/i) || content.match(/```json\s*([\s\S]*?)```/i);
  if (match) {
    try {
      const parsed = JSON.parse(match[1].trim());
      if (parsed && Array.isArray(parsed.data) && parsed.data.length > 0) {
        return {
          chartData: parsed.data,
          chartType: parsed.type || 'bar',
          chartTitle: parsed.title || 'Analytics Chart'
        };
      }
    } catch (e) {
      // Ignore non-chart json blocks
    }
  }
  return null;
}

export default function ChatPanel({ activeSessionId, onSessionCreated }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [copiedIdx, setCopiedIdx] = useState(null);
  const [isCardsModalOpen, setIsCardsModalOpen] = useState(false);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Voice Mode State
  const [isListening, setIsListening] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (activeSessionId) {
      loadSessionMessages(activeSessionId);
    } else {
      setMessages([]);
    }
  }, [activeSessionId]);

  const loadSessionMessages = async (sessionId) => {
    try {
      const res = await fetch(`/api/chats/${sessionId}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.messages)) {
        setMessages(data.messages);
      }
    } catch (err) {
      console.error('Error loading messages:', err);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, statusMessage, isStreaming]);

  // Voice Dictation setup
  const toggleSpeechRecognition = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in your browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setInput(transcript);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
    recognitionRef.current = recognition;
    setIsListening(true);
  };

  // Text-to-Speech output
  const speakText = (text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/<[^>]*>/g, '').replace(/```[\s\S]*?```/g, '').substring(0, 300);
    const utterance = new SpeechSynthesisUtterance(cleanText);
    window.speechSynthesis.speak(utterance);
  };

  // Stop Generation Handler
  const handleStopGeneration = async () => {
    try {
      await fetch('/api/chat/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: activeSessionId })
      });
    } catch (err) {
      console.error('Failed to stop generation:', err);
    } finally {
      setIsStreaming(false);
      setStatusMessage('');
    }
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        setAttachments((prev) => [
          ...prev,
          {
            name: file.name,
            type: file.type,
            data: event.target.result,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCopy = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const handleSubmit = async (e, overridePrompt = null) => {
    if (e) e.preventDefault();
    const promptToSend = overridePrompt !== null ? overridePrompt : input;
    if (!promptToSend.trim() && attachments.length === 0) return;

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }

    const userMsg = {
      role: 'user',
      content: promptToSend,
      attachments: [...attachments],
      createdAt: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setAttachments([]);
    setIsStreaming(true);
    setStatusMessage('Thinking...');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptToSend,
          history: messages,
          sessionId: activeSessionId,
          attachments,
        }),
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMsg = {
        role: 'assistant',
        content: '',
        speech: '',
        toolExecutions: [],
        createdAt: new Date(),
      };

      setMessages((prev) => [...prev, assistantMsg]);

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.replace('data: ', ''));
              if (data.type === 'status') {
                if (typeof data.content === 'string') {
                  setStatusMessage(data.content);
                } else if (data.content && data.content.type === 'tool_execution') {
                  const toolExec = data.content.data;
                  setMessages((prev) => {
                    const updated = [...prev];
                    const lastIdx = updated.length - 1;
                    const existingTools = updated[lastIdx].toolExecutions || [];
                    const foundIdx = existingTools.findIndex(t => t.id === toolExec.id || t.toolName === toolExec.toolName);
                    let newTools;
                    if (foundIdx >= 0) {
                      newTools = [...existingTools];
                      newTools[foundIdx] = toolExec;
                    } else {
                      newTools = [...existingTools, toolExec];
                    }
                    updated[lastIdx] = {
                      ...updated[lastIdx],
                      toolExecutions: newTools
                    };
                    return updated;
                  });
                }
              } else if (data.type === 'result') {
                const resObj = data.content;
                const rawContent = resObj.content || (typeof resObj === 'string' ? resObj : '');
                const speechContent = resObj.speech || '';
                const chartInfo = extractChartFromContent(rawContent);

                if (ttsEnabled && (speechContent || rawContent)) {
                  speakText(speechContent || rawContent);
                }

                setMessages((prev) => {
                  const updated = [...prev];
                  const lastIdx = updated.length - 1;
                  updated[lastIdx] = {
                    role: 'assistant',
                    content: rawContent,
                    speech: speechContent,
                    toolExecutions: resObj.toolExecutions || updated[lastIdx].toolExecutions || [],
                    ragFacts: resObj.ragFacts || [],
                    chartData: chartInfo?.chartData || null,
                    chartType: chartInfo?.chartType || 'bar',
                    chartTitle: chartInfo?.chartTitle || '',
                    createdAt: new Date(),
                  };
                  return updated;
                });
                if (resObj.sessionId && !activeSessionId && onSessionCreated) {
                  onSessionCreated(resObj.sessionId);
                }
              }
            } catch (err) {
              // Ignore line parse glitch
            }
          }
        }
      }
    } catch (err) {
      console.error('Chat error:', err);
    } finally {
      setIsStreaming(false);
      setStatusMessage('');
    }
  };

  const quickPrompts = [
    { icon: Compass, title: 'Explore Ideas', subtitle: 'Brainstorm creative concepts' },
    { icon: Code2, title: 'Write Code', subtitle: 'Generate scripts & functions' },
    { icon: BarChart2, title: 'Analyze Data', subtitle: 'Create charts and tables' },
    { icon: Brain, title: 'Summarize Document', subtitle: 'Extract key takeaways' },
  ];

  return (
    <div className="flex-1 flex flex-col h-full chatgpt-main overflow-hidden relative font-sans">
      {/* Scrollable Chat Feed */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.length === 0 ? (
            /* ChatGPT Welcome Screen */
            <div className="pt-20 pb-12 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-full border border-white/10 bg-[#212121] flex items-center justify-center text-white mb-6 shadow-xl">
                <Sparkles className="w-6 h-6 text-slate-200" />
              </div>
              <h1 className="text-2xl font-bold text-slate-100 mb-8 tracking-tight">
                What can I help with today?
              </h1>

              {/* Quick suggestion cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl">
                {quickPrompts.map((item, qIdx) => (
                  <button
                    key={qIdx}
                    onClick={() => handleSubmit(null, item.title)}
                    className="p-4 rounded-2xl bg-[#212121] hover:bg-[#2a2a2a] border border-white/5 text-left transition-colors group cursor-pointer"
                  >
                    <item.icon className="w-5 h-5 text-slate-400 group-hover:text-white mb-2" />
                    <div className="text-xs font-semibold text-slate-200">{item.title}</div>
                    <div className="text-[11px] text-slate-400">{item.subtitle}</div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Message Thread */
            messages.map((msg, idx) => {
              const chartInfo = extractChartFromContent(msg.content);
              const chartData = msg.chartData || chartInfo?.chartData;
              const chartType = msg.chartType || chartInfo?.chartType || 'bar';
              const chartTitle = msg.chartTitle || chartInfo?.chartTitle || 'Analytics Chart';

              return (
                <div key={idx} className="flex flex-col space-y-2 group">
                  {/* User Message */}
                  {msg.role === 'user' ? (
                    <div className="flex justify-end">
                      <div className="max-w-[85%] sm:max-w-[80%] px-4 py-3 rounded-3xl bg-[#212121] text-slate-100 text-sm leading-relaxed shadow-sm border border-white/5">
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-2">
                            {msg.attachments.map((att, aIdx) => (
                              <div key={aIdx} className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-[#171717] text-xs text-slate-300">
                                {att.type?.startsWith('image/') ? <ImageIcon className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                                <span className="truncate max-w-[140px]">{att.name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        <div>{msg.content}</div>
                      </div>
                    </div>
                  ) : (
                    /* Assistant Message */
                    <div className="flex space-x-3 sm:space-x-4 pt-2">
                      <div className="w-8 h-8 rounded-full border border-white/10 bg-[#212121] flex items-center justify-center text-white flex-shrink-0">
                        <Sparkles className="w-4 h-4 text-white" />
                      </div>

                      <div className="flex-1 space-y-3 text-sm text-slate-200 leading-relaxed pr-2 sm:pr-6 overflow-hidden">
                        {/* Executed Tools Accordion Dropdown */}
                        {msg.toolExecutions && msg.toolExecutions.length > 0 && (
                          <ToolCard toolExecutions={msg.toolExecutions} />
                        )}

                        {/* Speech Transcript Banner */}
                        {msg.speech && (
                          <div className="p-3.5 rounded-2xl bg-[#141414] border border-[#2a2a2a] flex items-start space-x-3 shadow-inner">
                            <MessageSquareQuote className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />
                            <div className="flex-1 space-y-1">
                              <div className="text-[10px] uppercase font-bold text-slate-500 font-mono tracking-wider">Assistant Spoken Speech</div>
                              <p className="text-xs italic text-slate-100 leading-relaxed font-sans">{msg.speech}</p>
                            </div>
                            <button
                              onClick={() => speakText(msg.speech)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#212121] cursor-pointer"
                              title="Play Speech Audio"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}

                        {/* ReactMarkdown Parser with Mermaid & HTML Live Sandbox Support */}
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            p: ({ children }) => <p className="mb-2 leading-relaxed text-slate-200">{children}</p>,
                            h1: ({ children }) => <h1 className="text-xl font-bold text-slate-100 mt-4 mb-2">{children}</h1>,
                            h2: ({ children }) => <h2 className="text-lg font-bold text-slate-100 mt-3 mb-2">{children}</h2>,
                            h3: ({ children }) => <h3 className="text-base font-semibold text-slate-100 mt-2 mb-1">{children}</h3>,
                            ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mb-2 text-slate-200">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-2 text-slate-200">{children}</ol>,
                            li: ({ children }) => <li className="text-slate-200">{children}</li>,
                            strong: ({ children }) => <strong className="font-semibold text-slate-100">{children}</strong>,
                            code: ({ node, className, children, ...props }) => {
                              const contentStr = String(children || '').trim();
                              const hasNewline = contentStr.includes('\n');
                              const isMermaid = className?.includes('language-mermaid') && 
                                (contentStr.startsWith('graph ') || 
                                 contentStr.startsWith('flowchart ') || 
                                 contentStr.startsWith('sequenceDiagram') || 
                                 contentStr.startsWith('classDiagram') || 
                                 contentStr.startsWith('stateDiagram') || 
                                 contentStr.startsWith('erDiagram') || 
                                 contentStr.startsWith('gantt') || 
                                 contentStr.startsWith('mindmap') || 
                                 contentStr.startsWith('pie'));
                                
                              const isHtml = className?.includes('language-html') && (contentStr.includes('<html') || contentStr.includes('<div') || contentStr.includes('<style'));

                              if (isMermaid) {
                                return <MermaidCard chartCode={contentStr} />;
                              }

                              if (isHtml && hasNewline) {
                                return <HtmlSandboxCard codeContent={contentStr} />;
                              }

                              const isBlockCode = hasNewline || (className && className.startsWith('language-'));

                              if (!isBlockCode) {
                                return (
                                  <span className="font-mono text-slate-100 text-xs font-medium px-1 bg-[#242424] rounded">
                                    {children}
                                  </span>
                                );
                              }

                              return (
                                <pre className="p-3 my-2 rounded-xl bg-[#121212] border border-[#2a2a2a] overflow-x-auto text-xs font-mono text-slate-200">
                                  <code className={className} {...props}>
                                    {children}
                                  </code>
                                </pre>
                              );
                            },
                            table: ({ children }) => (
                              <div className="my-3 overflow-x-auto rounded-xl border border-[#2a2a2a] bg-[#141414] shadow-lg">
                                <table className="w-full text-left text-xs border-collapse">{children}</table>
                              </div>
                            ),
                            thead: ({ children }) => <thead className="bg-[#1c1c1c] text-slate-200 border-b border-[#2a2a2a] font-semibold">{children}</thead>,
                            th: ({ children }) => <th className="px-4 py-3 font-semibold text-slate-200 border-r border-[#262626] last:border-r-0">{children}</th>,
                            tbody: ({ children }) => <tbody className="divide-y divide-[#262626]">{children}</tbody>,
                            tr: ({ children }) => <tr className="hover:bg-[#1c1c1c] transition-colors">{children}</tr>,
                            td: ({ children }) => <td className="px-4 py-3 text-slate-300 border-r border-[#262626] last:border-r-0 leading-normal">{children}</td>,
                            a: ({ href, children }) => (
                              <a href={href} target="_blank" rel="noreferrer" className="text-white underline underline-offset-2 hover:text-slate-300 font-medium">
                                {children}
                              </a>
                            )
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>

                        {chartData && (
                          <ChartCard chartData={chartData} title={chartTitle} type={chartType} />
                        )}

                        {/* Action buttons */}
                        <div className="flex items-center space-x-3 pt-1 text-xs text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleCopy(msg.content, idx)}
                            className="flex items-center space-x-1 hover:text-slate-200 cursor-pointer"
                          >
                            {copiedIdx === idx ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedIdx === idx ? 'Copied' : 'Copy'}</span>
                          </button>

                          <button
                            onClick={() => speakText(msg.speech || msg.content)}
                            className="flex items-center space-x-1 hover:text-slate-200 cursor-pointer"
                            title="Read Aloud"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                            <span>Listen</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Minimalist Pulsing Dim-Dip Loader */}
          {isStreaming && (
            <div className="flex items-center space-x-3 pt-2">
              <div className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
              <span className="text-xs font-mono text-slate-400 animate-pulse">{statusMessage || 'Thinking...'}</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Floating ChatGPT Input Box */}
      <div className="p-4 bg-gradient-to-t from-[#171717] via-[#171717] to-transparent">
        <div className="max-w-3xl mx-auto space-y-2">
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 px-2">
              {attachments.map((att, idx) => (
                <div key={idx} className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#212121] text-xs text-slate-200 border border-white/10">
                  <FileText className="w-3.5 h-3.5 text-slate-300" />
                  <span className="truncate max-w-[150px]">{att.name}</span>
                  <button onClick={() => removeAttachment(idx)} className="text-slate-400 hover:text-white">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="chatgpt-input-box rounded-3xl px-4 py-3 flex items-center space-x-3">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              multiple
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-[#2f2f2f] transition-colors cursor-pointer"
              title="Attach files"
            >
              <Paperclip className="w-5 h-5" />
            </button>

            {/* Quick Cards & Actions Extension Launcher */}
            <button
              type="button"
              onClick={() => setIsCardsModalOpen(true)}
              className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-[#2f2f2f] transition-colors cursor-pointer"
              title="Action Cards & Quick Library"
            >
              <Layers className="w-5 h-5 text-slate-300 hover:text-white" />
            </button>

            {/* Mic Dictation Toggle Button */}
            <button
              type="button"
              onClick={toggleSpeechRecognition}
              className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                isListening ? 'bg-white text-black animate-pulse' : 'text-slate-400 hover:text-white hover:bg-[#2f2f2f]'
              }`}
              title={isListening ? 'Stop Listening' : 'Voice Dictation'}
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            {/* Read Aloud Toggle */}
            <button
              type="button"
              onClick={() => setTtsEnabled(!ttsEnabled)}
              className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                ttsEnabled ? 'text-white bg-[#2f2f2f]' : 'text-slate-400 hover:text-white hover:bg-[#2f2f2f]'
              }`}
              title={ttsEnabled ? 'Voice Response Enabled' : 'Enable Voice Response'}
            >
              {ttsEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>

            <input
              type="text"
              placeholder={isListening ? 'Listening to your voice...' : 'Message Personal Assistant...'}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isStreaming}
              className="flex-1 bg-transparent text-slate-100 text-sm focus:outline-none placeholder-slate-500 disabled:opacity-50"
            />

            {isStreaming ? (
              <button
                type="button"
                onClick={handleStopGeneration}
                className="w-8 h-8 rounded-full bg-[#2f2f2f] text-white hover:bg-white hover:text-black flex items-center justify-center transition-all shadow-md flex-shrink-0 cursor-pointer"
                title="Stop Generating"
              >
                <Square className="w-4 h-4 fill-current" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim() && attachments.length === 0}
                className="w-8 h-8 rounded-full bg-white text-black hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-white flex items-center justify-center transition-all shadow-md flex-shrink-0 cursor-pointer"
              >
                <ArrowUp className="w-5 h-5 stroke-[2.5]" />
              </button>
            )}
          </form>

          <p className="text-[11px] text-center text-slate-500 font-sans">
            Personal Assistant can make mistakes. Check important info.
          </p>
        </div>
      </div>

      {/* Action Cards Library Modal Launcher */}
      <PrebuiltFormsModal
        isOpen={isCardsModalOpen}
        onClose={() => setIsCardsModalOpen(false)}
        onSelectForm={(form) => {
          handleSubmit(null, form.promptTemplate || form.prompt);
        }}
      />
    </div>
  );
}
