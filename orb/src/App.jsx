import { useState } from 'react';
import EarthGlobe from './components/EarthGlobe';
import Starfield from './components/Starfield';

function App() {
  const [text, setText] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;

    setResponse('');
    setIsLoading(true);

    // 1. Send the prompt to the backend
    fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: text, history: [] })
    })
      .then(res => res.text())
      .then(data => {
        const lines = data.split('\n');
        const resultLine = lines.reverse().find(line => line.includes('"type":"result"'));

        if (resultLine) {
          const jsonStr = resultLine.replace('data: ', '');
          const { content } = JSON.parse(jsonStr);
          setResponse(content.speech || content);
        } else {
          setResponse('No response returned.');
        }
        setText('');
      })
      .catch(error => {
        setResponse(`Error: ${error.message}`);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">

      {/* Background gradients for premium feel */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-600/20 blur-[120px] pointer-events-none" />

      {/* Dynamic Realistic Starfield */}
      <Starfield />

      <div className="w-full max-w-2xl relative z-10 flex flex-col h-[80vh]">

        {/* Header */}
        <div className="flex-none text-center mb-6">
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 via-cyan-400 to-indigo-400 bg-clip-text text-transparent drop-shadow-sm pb-2">
            Jarvis
          </h1>
          <p className="text-zinc-400 mt-2 text-sm font-medium tracking-wide uppercase">Your Advanced Personal Assistant</p>
        </div>

        {/* Earth Container - taking up the middle space */}
        <div className="flex-1 w-full relative z-0 flex items-center justify-center min-h-[200px] mb-4">
          <EarthGlobe />
        </div>

        {/* Chat Area */}
        <div className="flex-none overflow-y-auto max-h-[40vh] mb-6 flex flex-col justify-end space-y-4 pr-2 relative z-10">
          {response && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out flex w-full">
              <div className="bg-zinc-800/60 backdrop-blur-md border border-zinc-700/50 rounded-2xl rounded-tl-sm px-6 py-5 text-zinc-200 shadow-2xl leading-relaxed max-w-[95%]">
                {response}
              </div>
            </div>
          )}
          {isLoading && (
            <div className="animate-in fade-in duration-300 flex w-full">
              <div className="bg-zinc-800/40 backdrop-blur-sm border border-zinc-700/30 rounded-2xl rounded-tl-sm px-5 py-4 text-zinc-400 flex space-x-2 items-center shadow-lg">
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
        </div>

        {/* Input Form */}
        <div className="flex-none w-full">
          <form
            onSubmit={handleSubmit}
            className="relative flex items-center bg-zinc-900/60 backdrop-blur-xl border border-zinc-700/50 rounded-full shadow-2xl overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500/50 focus-within:border-indigo-500/50 transition-all duration-300"
          >
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Ask Jarvis anything..."
              className="w-full bg-transparent text-zinc-100 placeholder-zinc-500 px-8 py-5 outline-none text-lg"
            />
            <button
              type="submit"
              disabled={!text.trim() || isLoading}
              className="absolute right-3 p-3.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 shadow-lg"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}

export default App;
