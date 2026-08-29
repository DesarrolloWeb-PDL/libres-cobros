"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Posiciones centrales de cada cubo (en coord del viewBox 32x32)
const CUBES = [
  { cx: 9.5, cy: 9.5 },   // arriba izq
  { cx: 22.5, cy: 9.5 },  // arriba der
  { cx: 9.5, cy: 22.5 },  // abajo izq
  { cx: 22.5, cy: 22.5 }, // abajo der
];

const MAX_DIST = 22; // distancia máx para atenuar

function getOpacities(mx: number | null, my: number | null) {
  if (mx === null || my === null) return [1, 0.7, 0.5, 0.3];

  return CUBES.map(({ cx, cy }) => {
    const d = Math.sqrt((mx - cx) ** 2 + (my - cy) ** 2);
    const factor = Math.max(0, 1 - d / MAX_DIST);
    return 0.15 + factor * 0.85; // mínimo 0.15, máximo 1
  });
}

interface LogoProps {
  size?: number;
  showScroll?: boolean;
  className?: string;
  color?: string;
}

export function Logo({ size = 180, showScroll = true, className = "", color }: LogoProps) {
  const heroRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [mouse, setMouse] = useState<{ x: number | null; y: number | null }>({ x: null, y: null });

  useEffect(() => {
    if (!showScroll) return;

    const handleScroll = () => {
      const hero = heroRef.current;
      if (!hero) return;

      const rect = hero.getBoundingClientRect();
      const heroHeight = hero.offsetHeight;
      const progress = Math.min(1, Math.max(0, -rect.top / (heroHeight * 1.2)));
      setScrollProgress(progress);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [showScroll]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = logoRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    // Normalizar a coordenadas del viewBox (32x32)
    const x = ((e.clientX - rect.left) / rect.width) * 32;
    const y = ((e.clientY - rect.top) / rect.height) * 32;
    setMouse({ x, y });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setMouse({ x: null, y: null });
  }, []);

  const scale = showScroll ? 1 - scrollProgress * 0.6 : 1;
  const opacity = showScroll ? 1 - scrollProgress * 0.85 : 1;
  const blur = showScroll ? scrollProgress * 12 : 0;
  const opacities = getOpacities(mouse.x, mouse.y);
  const gradId = color ? `logoGrad-${color.replace('#', '')}` : 'violetGrad';
  const color1 = color || '#7c3aed';
  const color2 = color ? `${color}cc` : '#a78bfa';

  // Simplified render when not showing scroll (for sidebar/header use)
  if (!showScroll) {
    return (
      <div style={{ width: size, height: size }} className={className}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width={size} height={size}>
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={color1} />
              <stop offset="100%" stopColor={color2} />
            </linearGradient>
          </defs>
          <rect x="4" y="4" width="11" height="11" rx="2" fill={`url(#${gradId})`} opacity={opacities[0]} style={{ transition: "opacity 0.25s ease-out" }} />
          <rect x="17" y="4" width="11" height="11" rx="2" fill={`url(#${gradId})`} opacity={opacities[1]} style={{ transition: "opacity 0.25s ease-out" }} />
          <rect x="4" y="17" width="11" height="11" rx="2" fill={`url(#${gradId})`} opacity={opacities[2]} style={{ transition: "opacity 0.25s ease-out" }} />
          <rect x="17" y="17" width="11" height="11" rx="2" fill={`url(#${gradId})`} opacity={opacities[3]} style={{ transition: "opacity 0.25s ease-out" }} />
        </svg>
      </div>
    );
  }

  return (
    <div ref={heroRef} className={`flex justify-center py-5 ${className}`}>
      <div
        ref={logoRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ width: size, opacity, filter: `blur(${blur}px)`, transform: `scale(${scale})` }}
        className="cursor-pointer"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width={size} height={size}>
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={color1} />
              <stop offset="100%" stopColor={color2} />
            </linearGradient>
          </defs>
          <rect x="4" y="4" width="11" height="11" rx="2" fill={`url(#${gradId})`} opacity={opacities[0]} style={{ transition: "opacity 0.25s ease-out" }} />
          <rect x="17" y="4" width="11" height="11" rx="2" fill={`url(#${gradId})`} opacity={opacities[1]} style={{ transition: "opacity 0.25s ease-out" }} />
          <rect x="4" y="17" width="11" height="11" rx="2" fill={`url(#${gradId})`} opacity={opacities[2]} style={{ transition: "opacity 0.25s ease-out" }} />
          <rect x="17" y="17" width="11" height="11" rx="2" fill={`url(#${gradId})`} opacity={opacities[3]} style={{ transition: "opacity 0.25s ease-out" }} />
        </svg>
      </div>
    </div>
  );
}
