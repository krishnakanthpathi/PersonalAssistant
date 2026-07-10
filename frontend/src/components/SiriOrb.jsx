import React, { useState, useEffect, useRef } from 'react';
import { Mic, X, CheckCircle, Volume2, Loader2, AlertCircle } from 'lucide-react';

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

export default function SiriOrb({ 
  isProcessing, 
  currentStatusLog, 
  messages, 
  onSendPrompt 
}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [orbState, setOrbState] = useState('idle'); // 'idle' | 'listening' | 'thinking' | 'completed'
  const [showCard, setShowCard] = useState(false);
  const [completedAction, setCompletedAction] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const recognitionRef = useRef(null);
  const prevIsProcessingRef = useRef(isProcessing);
  const onSendPromptRef = useRef(onSendPrompt);
  const transcriptRef = useRef('');
  const submittedRef = useRef(false);

  onSendPromptRef.current = onSendPrompt;

  // Initialize Speech Recognition once; use refs for callbacks to avoid duplicate sends
  useEffect(() => {
    if (!SpeechRecognition) {
      console.warn("Speech recognition is not supported in this browser.");
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = 'en-US';

    rec.onstart = () => {
      submittedRef.current = false;
      transcriptRef.current = '';
      setIsListening(true);
      setOrbState('listening');
      setTranscript('');
      setInterimTranscript('');
      setErrorMsg('');
      setCompletedAction('');
      setShowCard(true);
    };

    rec.onresult = (event) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      if (final) {
        transcriptRef.current += final;
        setTranscript(transcriptRef.current);
      }
      setInterimTranscript(interim);
    };

    rec.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      if (event.error === 'not-allowed') {
        setErrorMsg('Microphone access denied. Enable permissions in your browser settings.');
      } else if (event.error !== 'no-speech') {
        setErrorMsg(`Speech recognition error: ${event.error}`);
      }
      setIsListening(false);
      setOrbState('idle');
    };

    rec.onend = () => {
      setIsListening(false);
      if (submittedRef.current) return;

      const finalPrompt = transcriptRef.current.trim();
      if (finalPrompt) {
        submittedRef.current = true;
        onSendPromptRef.current(finalPrompt);
        setOrbState('thinking');
      } else {
        setOrbState('idle');
      }
    };

    recognitionRef.current = rec;

    navigator.mediaDevices?.getUserMedia({ audio: true }).catch(() => {});

    return () => {
      rec.onstart = null;
      rec.onresult = null;
      rec.onerror = null;
      rec.onend = null;
      try {
        rec.abort?.();
      } catch {
        try { rec.stop(); } catch { /* already stopped */ }
      }
      if (recognitionRef.current === rec) {
        recognitionRef.current = null;
      }
    };
  }, []);

  // Monitor backend execution (isProcessing) changes
  useEffect(() => {
    if (prevIsProcessingRef.current && !isProcessing) {
      const assistantMsgs = messages.filter(m => m.role === 'assistant');
      if (assistantMsgs.length > 0) {
        const lastMsg = assistantMsgs[assistantMsgs.length - 1];
        if (lastMsg.isError) {
          setErrorMsg(lastMsg.content || 'An error occurred during execution.');
          setOrbState('idle');
        } else {
          setCompletedAction(lastMsg.speech || lastMsg.content || 'Action completed successfully.');
          setOrbState('completed');
          setShowCard(true);

          const timer = setTimeout(() => {
            setOrbState(prev => prev === 'completed' ? 'idle' : prev);
          }, 8000);
          return () => clearTimeout(timer);
        }
      } else {
        setOrbState('idle');
      }
    } else if (!prevIsProcessingRef.current && isProcessing) {
      setOrbState('thinking');
      setCompletedAction('');
      setErrorMsg('');
      setShowCard(true);
    }
    prevIsProcessingRef.current = isProcessing;
  }, [isProcessing, messages]);

  const handleOrbClick = () => {
    if (!SpeechRecognition) {
      alert("Voice commands require a browser with Web Speech API support (e.g. Google Chrome).");
      return;
    }

    if (orbState === 'listening' || isListening) {
      recognitionRef.current?.stop();
    } else if (isProcessing) {
      setShowCard(true);
    } else {
      try {
        recognitionRef.current?.start();
      } catch (err) {
        console.error("Failed to start speech recognition:", err);
        recognitionRef.current?.stop();
      }
    }
  };

  const getOrbStateClass = () => {
    switch (orbState) {
      case 'listening': return 'siri-orb-listening';
      case 'thinking': return 'siri-orb-thinking';
      case 'completed': return 'siri-orb-completed';
      default: return 'siri-orb-idle';
    }
  };

  const getStatusText = () => {
    switch (orbState) {
      case 'listening': return 'Listening...';
      case 'thinking': return 'Thinking...';
      case 'completed': return 'Done';
      default: return 'Voice Assistant';
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {showCard && (
        <div className="absolute bottom-20 right-0 w-80 bg-bg-secondary/90 border border-white/10 rounded-2xl p-4 shadow-xl z-50 flex flex-col gap-2.5 transition-all duration-300 transform scale-100 origin-bottom-right backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${
                orbState === 'listening' ? 'bg-red-500 animate-ping' :
                orbState === 'thinking' ? 'bg-accent-blue animate-pulse' :
                orbState === 'completed' ? 'bg-accent-emerald' : 'bg-gray-500'
              }`}></span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                {getStatusText()}
              </span>
            </div>
            <button 
              onClick={() => setShowCard(false)}
              className="text-gray-500 hover:text-white p-0.5 rounded-lg hover:bg-white/5 transition"
            >
              <X size={14} />
            </button>
          </div>

          <div className="text-sm text-gray-200">
            {orbState === 'listening' && (
              <div className="flex flex-col gap-1.5">
                <p className="text-xs text-gray-400 font-medium">Try: "Set volume to 50%"</p>
                <div className="bg-black/25 rounded-xl p-3 border border-white/5 min-h-[50px] flex items-center justify-center">
                  {(transcript || interimTranscript) ? (
                    <p className="text-xs italic leading-relaxed text-white font-medium">
                      {transcript} <span className="text-cyan-400">{interimTranscript}</span>
                    </p>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Mic className="w-3.5 h-3.5 animate-pulse text-red-400" />
                      <span>Waiting for speech...</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {orbState === 'thinking' && (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-gray-400">Working on your request...</p>
                <div className="flex items-center gap-2.5 bg-black/20 rounded-xl p-3 border border-white/5 text-xs text-accent-blue font-mono">
                  <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                  <span className="truncate">{currentStatusLog || 'Thinking...'}</span>
                </div>
              </div>
            )}

            {orbState === 'completed' && completedAction && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-accent-emerald font-semibold text-xs mb-1">
                  <CheckCircle size={14} />
                  <span>Done</span>
                </div>
                <div className="bg-accent-emerald/5 border border-accent-emerald/10 rounded-xl p-3 flex gap-2">
                  <Volume2 size={16} className="text-accent-emerald shrink-0 mt-0.5" />
                  <p className="text-xs text-emerald-100 italic leading-relaxed">
                    "{completedAction}"
                  </p>
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-3 flex gap-2 items-start text-xs">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {orbState === 'idle' && !errorMsg && !completedAction && (
              <p className="text-xs text-gray-400 leading-relaxed text-center py-2">
                Tap the orb and speak a command to control your Mac, Notion, or Calendar.
              </p>
            )}
          </div>
        </div>
      )}

      <button
        onClick={handleOrbClick}
        className={`relative w-14 h-14 rounded-full flex items-center justify-center cursor-pointer select-none z-50 border border-white/10 shadow-lg outline-none focus:outline-none transition-all duration-300 ${getOrbStateClass()}`}
        title="Voice Assistant"
      >
        {orbState === 'listening' && (
          <>
            <div className="siri-ripple-ring siri-ripple-ring-1"></div>
            <div className="siri-ripple-ring siri-ripple-ring-2"></div>
            <div className="siri-ripple-ring siri-ripple-ring-3"></div>
          </>
        )}

        <div className="siri-orb-base w-full h-full rounded-full flex items-center justify-center">
          {orbState === 'listening' ? (
            <Mic className="w-5 h-5 text-white animate-pulse" />
          ) : orbState === 'thinking' ? (
            <Loader2 className="w-5 h-5 text-white animate-spin" />
          ) : orbState === 'completed' ? (
            <CheckCircle className="w-5 h-5 text-white animate-bounce" />
          ) : (
            <Mic className="w-5 h-5 text-white hover:scale-110 transition-transform" />
          )}
        </div>
      </button>
    </div>
  );
}
