"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MARK_ANCHORS, MARK_GRADIENT, MARK_SEGMENTS, MARK_STROKE_WIDTH } from "@/lib/brand-mark";

// LC monogram (branding guide S1): firm L + enveloping C arc. Geometry lives
// in lib/brand-mark.ts (shared with footer, favicon and PWA icons).
// Both glyphs rest at full opacity so the letters read cleanly at any size;
// the mouse light still spotlights the hovered letter.
const BASE_OPACITIES = [1, 1];

const MAX_DIST = 40;

function getOpacities(mx: number | null, my: number | null) {
  if (mx === null || my === null) return BASE_OPACITIES;

  return MARK_ANCHORS.map(({ x: cx, y: cy }) => {
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
    const x = ((e.clientX - rect.left) / rect.width) * 64;
    const y = ((e.clientY - rect.top) / rect.height) * 64;
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
  const color1 = color || '#582694';
  const color2 = color ? `${color}cc` : '#ad42af';

  const svg = (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width={size} height={size}>
      <defs>
        <linearGradient
          id={gradId}
          gradientUnits="userSpaceOnUse"
          x1={MARK_GRADIENT.x1}
          y1={MARK_GRADIENT.y1}
          x2={MARK_GRADIENT.x2}
          y2={MARK_GRADIENT.y2}
        >
          <stop offset="0%" stopColor={color1} />
          <stop offset="100%" stopColor={color2} />
        </linearGradient>
      </defs>
      {MARK_SEGMENTS.map((d, i) => (
        <path
          key={d}
          d={d}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={MARK_STROKE_WIDTH}
          strokeLinecap="round"
          strokeLinejoin="round"
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
