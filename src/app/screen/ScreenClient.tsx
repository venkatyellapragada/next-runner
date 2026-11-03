'use client';
import { useEffect, useMemo, useState } from 'react';
import { Fit } from '@/components/Fit';
import { Screen } from '@/components/screen/Slides';
import { joinUrlFor } from '@/components/bits';
import { hhmmToMs, slideById } from '@/lib/event';
import { control, getPin, setPin, useLive, useNow } from '@/lib/live';
import { initialState, reduce, type Action } from '@/lib/state';

// The projector page. Follows /control through /api/state. If the network dies it keeps the
// last state, the clock keeps running, and the keyboard (or a USB clicker) still moves slides:
//   → / PageDown / Space  next      ← / PageUp  previous      F  fullscreen
// Open once as /screen?pin=XXXX and the keyboard also moves /control's state.
// Testing: ?at=10:25 freezes the clock, ?slide=keynote-1:speaker forces a slide.
export default function ScreenClient({ photos }: { photos: Record<string, string> }) {
  const { data, setData, online, offset } = useLive('/api/state', 1000);
  const [params, setParams] = useState<{ at: number | null; slide: string | null; pin: string }>({ at: null, slide: null, pin: '' });
  const [localSlide, setLocalSlide] = useState<{ id: string; v: number } | null>(null);
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    const q = new URLSearchParams(location.search);
    if (q.get('pin')) setPin(q.get('pin')!);
    setParams({ at: q.get('at') ? hhmmToMs(q.get('at')!, Date.now()) : null, slide: q.get('slide'), pin: getPin() });
    setOrigin(location.origin);
    // Keep the projector laptop awake.
    (navigator as Navigator & { wakeLock?: { request(t: string): Promise<unknown> } }).wakeLock?.request('screen').catch(() => {});
  }, []);

  const now = useNow(offset, params.at);
  const server = data?.state ?? initialState;
  // A keyboard move holds until /control next changes the state.
  const slideId = params.slide ?? (localSlide && localSlide.v === server.v ? localSlide.id : server.slideId);
  const state = useMemo(() => ({ ...server, slideId }), [server, slideId]);

  useEffect(() => {
    const onKey = async (e: KeyboardEvent) => {
      let action: Action | null = null;
      if (['ArrowRight', 'PageDown', ' ', 'Enter'].includes(e.key)) action = { type: 'next' };
      if (['ArrowLeft', 'PageUp', 'Backspace'].includes(e.key)) action = { type: 'prev' };
      if (e.key === 'f' || e.key === 'F') document.documentElement.requestFullscreen?.().catch(() => {});
      if (!action) return;
      e.preventDefault();
      const moved = reduce(state, action, Date.now());
      setLocalSlide({ id: moved.slideId, v: server.v });
      if (params.pin) {
        try {
          const res = await control(action, params.pin);
          if (res) setData(res);
        } catch {
          /* offline or wrong PIN: the local move stands */
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state, server.v, params.pin, setData]);

  // Hide the cursor when it is not moving.
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const show = () => {
      document.body.style.cursor = '';
      clearTimeout(t);
      t = setTimeout(() => (document.body.style.cursor = 'none'), 2500);
    };
    window.addEventListener('mousemove', show);
    show();
    return () => window.removeEventListener('mousemove', show);
  }, []);

  if (!origin) return null;
  const slide = slideById(slideId) ?? slideById(initialState.slideId)!;
  return (
    <Fit style={{ position: 'fixed', inset: 0 }}>
      <Screen
        slide={slide}
        state={state}
        now={now}
        votes={data?.votes}
        photos={photos}
        joinUrl={joinUrlFor(origin)}
        offline={!online}
      />
    </Fit>
  );
}
