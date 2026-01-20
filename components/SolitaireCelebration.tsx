
import React, { useEffect, useRef, useState } from 'react';
import { CardTheme } from '../types';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  vRot: number;
  width: number;
  height: number;
  color: string;
}

interface SolitaireCelebrationProps {
  theme: CardTheme;
}

const SolitaireCelebration: React.FC<SolitaireCelebrationProps> = ({ theme }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  
  // Create a stable set of "cards" to render
  const [cards] = useState(() => Array.from({ length: 52 }));

  useEffect(() => {
    if (!containerRef.current) return;
    
    const { clientWidth, clientHeight } = containerRef.current;
    
    // Initialize particles
    particlesRef.current = cards.map(() => ({
      x: clientWidth / 2, // Start middle
      y: clientHeight + 100, // Start below screen to shoot up
      vx: (Math.random() - 0.5) * 15, // Random X velocity
      vy: -(Math.random() * 15 + 15), // Strong upward velocity
      rotation: Math.random() * 360,
      vRot: (Math.random() - 0.5) * 10,
      width: 60, // approximate card width
      height: 84, // approximate card height
      // Randomly pick a color/style slightly to add variety
      color: Math.random() > 0.5 ? '#fff' : '#eee'
    }));

    // Physics constants
    const GRAVITY = 0.5;
    const BOUNCE = 0.7; // Energy kept after bounce
    const DRAG = 0.995; // Air resistance

    const animate = () => {
      const width = containerRef.current?.clientWidth || window.innerWidth;
      const height = containerRef.current?.clientHeight || window.innerHeight;

      particlesRef.current.forEach((p, i) => {
        const el = cardRefs.current[i];
        if (!el) return;

        // Apply forces
        p.vy += GRAVITY;
        p.vx *= DRAG;
        
        // Update position
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.vRot;

        // Floor bounce
        if (p.y + p.height > height) {
          p.y = height - p.height;
          p.vy *= -BOUNCE;
          
          // Add some friction on floor
          p.vx *= 0.9;
          p.vRot *= 0.9;

          // If barely moving on floor, stop bouncing to prevent micro-jitters
          if (Math.abs(p.vy) < GRAVITY * 2) {
             p.vy = 0;
          }
        }

        // Wall bounce
        if (p.x < 0) {
          p.x = 0;
          p.vx *= -BOUNCE;
        } else if (p.x + p.width > width) {
          p.x = width - p.width;
          p.vx *= -BOUNCE;
        }

        // Apply transform directly to DOM for performance
        el.style.transform = `translate3d(${p.x}px, ${p.y}px, 0) rotate(${p.rotation}deg)`;
      });

      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(requestRef.current);
    };
  }, [cards]);

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {cards.map((_, i) => (
        <div
          key={i}
          ref={el => {
              // React 19 callback ref style, but safe for older types if strictly typed
              if (el) cardRefs.current[i] = el;
          }}
          className={`absolute w-[60px] h-[84px] rounded-md border-2 shadow-xl ${theme.bgClass}`}
          style={{ 
            // Initial hide until JS takes over
            top: 0, 
            left: 0,
            transform: 'translate3d(-100px, -100px, 0)'
          }}
        >
            {/* Inner Decoration to match theme */}
            <div className={`w-full h-full flex items-center justify-center opacity-50`}>
                <div className={`w-8 h-8 rounded-full ${theme.decorClass}`}></div>
            </div>
            
            {/* White border typical of playing cards */}
            <div className="absolute inset-1 border border-white/10 rounded-sm"></div>
        </div>
      ))}
    </div>
  );
};

export default SolitaireCelebration;
