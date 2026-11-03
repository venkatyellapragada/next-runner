'use client';
// Scales the fixed 1920×1080 stage to whatever box it sits in (projector, or the /control preview).
import { useEffect, useRef, useState } from 'react';

export function Fit({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  const box = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState({ s: 0, x: 0, y: 0 });
  useEffect(() => {
    const el = box.current!;
    const measure = () => {
      const { width, height } = el.getBoundingClientRect();
      const s = Math.min(width / 1920, height / 1080);
      setFit({ s, x: (width - 1920 * s) / 2, y: (height - 1080 * s) / 2 });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={box} style={{ position: 'relative', overflow: 'hidden', background: '#fff', ...style }}>
      <div
        style={{
          position: 'absolute',
          left: fit.x,
          top: fit.y,
          width: 1920,
          height: 1080,
          transform: `scale(${fit.s})`,
          transformOrigin: '0 0',
          visibility: fit.s ? 'visible' : 'hidden',
        }}
      >
        {children}
      </div>
    </div>
  );
}
