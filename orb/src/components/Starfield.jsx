import React, { useMemo } from 'react';

export default function Starfield() {
  const stars = useMemo(() => {
    // Generate a random, realistic starfield
    const generated = [];
    // 250 stars for a dense, realistic look
    for (let i = 0; i < 250; i++) {
      const x = Math.random() * 100;
      const y = Math.random() * 100;
      
      const rand = Math.random();
      // 80% tiny stars, 17% medium stars, 3% large bright stars
      let r, opacity, isBright = false;
      
      if (rand < 0.8) {
        // Tiny distant stars
        r = Math.random() * 0.5 + 0.3;
        opacity = Math.random() * 0.3 + 0.1;
      } else if (rand < 0.97) {
        // Medium stars
        r = Math.random() * 0.8 + 0.8;
        opacity = Math.random() * 0.4 + 0.4;
      } else {
        // Large bright stars
        r = Math.random() * 1.2 + 1.2;
        opacity = Math.random() * 0.3 + 0.7;
        isBright = true;
      }
      
      generated.push(
        <circle 
          key={i} 
          cx={`${x}%`} 
          cy={`${y}%`} 
          r={r} 
          fill="white" 
          opacity={opacity} 
          style={isBright ? { filter: 'drop-shadow(0px 0px 3px rgba(255,255,255,0.9))' } : undefined}
        />
      );
    }
    return generated;
  }, []);

  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden mix-blend-screen opacity-70">
      <svg className="w-full h-full">
        <defs>
          <radialGradient id="star-glow">
            <stop offset="0%" stopColor="white" stopOpacity="1" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
        </defs>
        {stars}
      </svg>
    </div>
  );
}
