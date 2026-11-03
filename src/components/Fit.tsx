'use client';
// Scales the 1920-wide stage to the box it sits in.
// - fill (the projector): the stage takes the box's shape, 1920 wide and as tall as needed (or 1080 tall and
//   wider), so there are no bars on a 16:10 laptop or an odd projector.
// - otherwise (the /control preview): a fixed 1920×1080 stage, letterboxed.
import { useEffect, useRef, useState } from 'react';

export type StageSize = { w: number; h: number };

export function Fit({
  children,
  style,
  fill = false,
  background = '#fff',
}: {
  children: (size: StageSize) => React.ReactNode;
  style?: React.CSSProperties;
  fill?: boolean;
  background?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState({ s: 0, x: 0, y: 0, w: 1920, h: 1080 });
  useEffect(() => {
    const el = box.current!;
    const measure = () => {
      const { width, height } = el.getBoundingClientRect();
      const s = Math.min(width / 1920, height / 1080);
      if (fill) setFit({ s, x: 0, y: 0, w: Math.round(width / s), h: Math.round(height / s) });
      else setFit({ s, x: (width - 1920 * s) / 2, y: (height - 1080 * s) / 2, w: 1920, h: 1080 });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [fill]);
  return (
    <div ref={box} style={{ position: 'relative', overflow: 'hidden', background, ...style }}>
      <div
        style={{
          position: 'absolute',
          left: fit.x,
          top: fit.y,
          width: fit.w,
          height: fit.h,
          transform: `scale(${fit.s})`,
          transformOrigin: '0 0',
          visibility: fit.s ? 'visible' : 'hidden',
        }}
      >
        {children({ w: fit.w, h: fit.h })}
      </div>
    </div>
  );
}
