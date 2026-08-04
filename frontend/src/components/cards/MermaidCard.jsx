import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { Maximize2, Minimize2, Copy, Check, RefreshCw, ZoomIn, ZoomOut, RotateCcw, Move } from 'lucide-react';

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
  trimmed = trimmed.replace(/%%\{[\s\S]*?\}%%/gi, '').trim();
  trimmed = trimmed.replace(/\b(barChart|lineChart)\b/gi, 'xychart-beta');
  return trimmed;
}

export default function MermaidCard({ chartCode }) {
  const containerRef = useRef(null);
  const [svgContent, setSvgContent] = useState('');
  const [error, setError] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  // Pan & Zoom state (supports up to 1000% / 10.0x zoom and click-and-drag panning)
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const diagramIdRef = useRef(`mermaid-${(chartCode || '').slice(0, 35).replace(/[^a-z0-9]+/gi, '-')}`);
  const chartIdRef = useRef(`mermaid-svg-${Math.random().toString(36).substring(2, 9)}`);

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
        const orphanErrEl = document.getElementById(`d${chartIdRef.current}`);
        if (orphanErrEl) orphanErrEl.remove();
        if (isMounted) {
          setError('Diagram compilation pending or syntax invalid.');
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

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(10.0, +(prev + (prev >= 2 ? 1.0 : 0.25)).toFixed(2)));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(0.2, +(prev - (prev >= 2 ? 1.0 : 0.25)).toFixed(2)));
  };

  const handleResetZoom = () => {
    setZoomLevel(1.0);
    setPanPosition({ x: 0, y: 0 });
  };

  // Drag / Pan mouse handlers (only active when expanded in fullscreen)
  const handleMouseDown = (e) => {
    if (!isExpanded || e.button !== 0) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - panPosition.x, y: e.clientY - panPosition.y };
  };

  const handleMouseMove = (e) => {
    if (!isExpanded || !isDragging) return;
    setPanPosition({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch drag handlers
  const handleTouchStart = (e) => {
    if (!isExpanded) return;
    if (e.touches.length === 1) {
      setIsDragging(true);
      dragStartRef.current = { x: e.touches[0].clientX - panPosition.x, y: e.touches[0].clientY - panPosition.y };
    }
  };

  const handleTouchMove = (e) => {
    if (!isExpanded || !isDragging || e.touches.length !== 1) return;
    setPanPosition({
      x: e.touches[0].clientX - dragStartRef.current.x,
      y: e.touches[0].clientY - dragStartRef.current.y
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Mouse wheel zoom up to 1000% (only when expanded in fullscreen)
  const handleWheel = (e) => {
    if (!isExpanded) return;
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    setZoomLevel(prev => Math.min(10.0, Math.max(0.2, +(prev * zoomFactor).toFixed(2))));
  };

  return (
    <div className="my-3 rounded-2xl bg-[#141414] border border-[#2a2a2a] overflow-hidden shadow-xl font-sans">
      {/* Top Header */}
      <div className="px-4 py-3 bg-[#1c1c1c] border-b border-[#262626] flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center space-x-2">
          <div className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
          <span className="text-xs font-mono font-semibold text-slate-200 uppercase tracking-wider">
            Mermaid Diagram
          </span>
        </div>

        <div className="flex items-center space-x-1.5">
          {/* Zoom Locked Indicator in Inline View */}
          <button
            onClick={() => {
              setIsExpanded(true);
              handleResetZoom();
            }}
            className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-[#242424] border border-[#333333] text-slate-400 hover:text-white text-[10px] font-mono transition-colors cursor-pointer"
            title="Zoom is locked inline. Click to expand for full interactive zoom and pan."
          >
            <ZoomIn className="w-3 h-3 text-slate-400" />
            <span>Zoom Locked (Click to Expand)</span>
          </button>

          <button
            onClick={handleCopyCode}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#262626] transition-colors cursor-pointer"
            title="Copy Mermaid Code"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => {
              setIsExpanded(!isExpanded);
              if (!isExpanded) handleResetZoom();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#262626] transition-colors cursor-pointer"
            title={isExpanded ? 'Exit Fullscreen' : 'Expand Fullscreen'}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Rendered Inline SVG Canvas (Zoom & Pan Locked) */}
      <div 
        onClick={() => {
          setIsExpanded(true);
          handleResetZoom();
        }}
        className="p-6 overflow-hidden flex justify-center bg-[#141414] min-h-[220px] items-center relative select-none cursor-pointer group"
        title="Click to view full screen with interactive zoom and pan"
      >
        {error ? (
          <div className="w-full space-y-2 select-text cursor-auto" onClick={(e) => e.stopPropagation()}>
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
            className="mermaid-svg-wrapper transition-transform duration-150 ease-out origin-center group-hover:scale-[1.01]"
            style={{
              transform: 'none',
              cursor: 'pointer'
            }}
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        ) : (
          <div className="flex items-center space-x-2 text-xs font-mono text-slate-500">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>Rendering diagram...</span>
          </div>
        )}
      </div>

      {/* Fullscreen Interactive Canvas Modal */}
      {isExpanded && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col p-4 sm:p-8 overflow-hidden">
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-white" />
              <span className="text-sm font-mono font-bold text-white uppercase tracking-wider">
                Mermaid Diagram Viewer (Zoom: up to 1000%)
              </span>
            </div>

            <div className="flex items-center space-x-2">
              {/* Fullscreen Zoom & Reset Controls */}
              <div className="flex items-center space-x-1 px-3 py-1 rounded-xl bg-[#242424] border border-[#333333] text-slate-300">
                <button
                  onClick={handleZoomOut}
                  className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#333333] transition-colors cursor-pointer"
                  title="Zoom Out (-)"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono text-slate-200 w-14 text-center select-none font-bold">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  onClick={handleZoomIn}
                  className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#333333] transition-colors cursor-pointer"
                  title="Zoom In (+)"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={handleResetZoom}
                  className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#333333] transition-colors cursor-pointer ml-1"
                  title="Reset Zoom (100%)"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                onClick={() => setIsExpanded(false)}
                className="p-2 rounded-xl bg-[#212121] text-slate-300 hover:text-white hover:bg-[#333333] transition-colors cursor-pointer"
              >
                <Minimize2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div 
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onWheel={handleWheel}
            className="flex-1 overflow-hidden flex items-center justify-center p-6 bg-[#121212] my-4 rounded-2xl border border-white/10 relative cursor-grab active:cursor-grabbing select-none"
          >
            {svgContent ? (
              <div
                className="mermaid-svg-wrapper transition-transform duration-75 ease-out origin-center"
                style={{
                  transform: `translate(${panPosition.x}px, ${panPosition.y}px) scale(${zoomLevel})`,
                  cursor: isDragging ? 'grabbing' : 'grab'
                }}
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
