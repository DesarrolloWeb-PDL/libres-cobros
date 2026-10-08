"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Cubes on a 32×32 viewBox — large and well-separated, like the portfolio mark.
const CUBE_SIZE = 14;
const CUBE_GAP = 4;
const CUBE_POS = [
  { x: 0, y: 0 },
  { x: CUBE_SIZE + CUBE_GAP, y: 0 },
  { x: 0, y: CUBE_SIZE + CUBE_GAP },
  { x: CUBE_SIZE + CUBE_GAP, y: CUBE_SIZE + CUBE_GAP },
];

// Centers = pos + size/2
const HALF = CUBE_SIZE / 2;
const CUBES = [
  { cx: 0 + HALF, cy: 0 + HALF },
  { cx: CUBE_SIZE + CUBE_GAP + HALF, cy: 0 + HALF },
  { cx: 0 + HALF, cy: CUBE_SIZE + CUBE_GAP + HALF },
  { cx: CUBE_SIZE + CUBE_GAP + HALF, cy: CUBE_SIZE + CUBE_GAP + HALF },
];

const MAX_DIST = 26;

function getOpacities(mx: number | null, my: number | null) {
  if (mx === null || my === null) return [1, 0.7, 0.5, 0.3];

  return CUBES.map(({ cx, cy }) => {
    const d = Math.sqrt((mx - cx) ** 2 + (my - cy) ** 2);
    const factor = Math.max(0, 1 - d / MAX_DIST);
    return 0.15 + factor * 0.85;
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

  const svg = (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width={size} height={size}>
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={color1} />
          <stop offset="100%" stopColor={color2} />
        </linearGradient>
      </defs>
      {CUBE_POS.map(({ x, y }, i) => (
        <rect
          key={`${x}-${y}`}
          x={x}
          y={y}
          width={CUBE_SIZE}
          height={CUBE_SIZE}
          rx="2.5"
          fill={`url(#${gradId})`}
          opacity={opacities[i]}
          style={{ transition: "opacity 0.25s ease-out" }}
        />
      ))}
    </svg>
  );

  // Compact mode (sidebar, headers): still gets the mouse light effect.
  if (!showScroll) {
    return (
      <div
        ref={logoRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ width: size, height: size }}
        className={`cursor-pointer ${className}`}
      >
        {svg}
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
        {svg}
      </div>
    </div>
  );
}
