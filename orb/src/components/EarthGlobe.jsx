import React, { useRef, useEffect, useState } from 'react';
import Globe from 'react-globe.gl';

export default function EarthGlobe() {
  const globeRef = useRef();
  const [dimensions, setDimensions] = useState({ width: 300, height: 300 });
  const containerRef = useRef();

  useEffect(() => {
    if (globeRef.current) {
      // Auto-rotate settings
      globeRef.current.controls().autoRotate = true;
      globeRef.current.controls().autoRotateSpeed = 1.2;
      globeRef.current.controls().enableZoom = false; // Keep it sleek and prevent accidental scrolling
      
      // Initial point of view (slightly zoomed out and angled)
      globeRef.current.pointOfView({ altitude: 2 }, 0);
    }
  }, []);

  useEffect(() => {
    // Make the globe responsive to its container
    const updateDimensions = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        // Keep it square based on the smaller dimension, leaving a little padding
        const size = Math.min(clientWidth, clientHeight) * 0.9;
        setDimensions({ width: size, height: size });
      }
    };

    updateDimensions();
    // A small delay to ensure layout is computed before sizing
    setTimeout(updateDimensions, 100);
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full flex items-center justify-center relative pointer-events-auto cursor-grab active:cursor-grabbing">
      {/* Subtle ambient glow behind the globe to match the theme */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-cyan-500/10 rounded-full blur-[60px] pointer-events-none" />
      
      <Globe
        ref={globeRef}
        width={dimensions.width}
        height={dimensions.height}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundColor="rgba(0,0,0,0)"
        atmosphereColor="lightskyblue" // Natural blue atmosphere match
        atmosphereAltitude={0.15}
      />
    </div>
  );
}
