'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Fit } from '@/components/Fit';
import { Screen } from '@/components/screen/Slides';
import { joinUrlFor } from '@/components/bits';
import { data, hhmmToMs, slideById } from '@/lib/event';
import { control, getPin, setPin, useLive, useNow } from '@/lib/live';
import { activeSlot, initialState, reduce, type Action, type Overlay } from '@/lib/state';

// The projector page. Follows /control through /api/state. If the network dies it keeps the
// last state, the clock keeps running, and the keyboard (or a USB clicker) still drives it:
//   → / PageDown / Space   next            ← / PageUp   previous
//   V   play the NEXT film        S   show the simulation        Q / Esc   back to the slides
//   M   sound on/off (film)       F   full screen         D   open this session's deck in a new tab
// Open once as /screen?pin=XXXX and the keyboard also moves /control's state.
// Testing: ?at=10:25 freezes the clock, ?slide=keynote-1:speaker forces a slide.
export default function ScreenClient({ photos }: { photos: Record<string, string> }) {
  const { data: live, setData, online, offset } = useLive('/api/state', 1000);
  const [params, setParams] = useState<{ at: number | null; slide: string | null; pin: string }>({ at: null, slide: null, pin: '' });
  const [local, setLocal] = useState<{ slideId: string; overlay: Overlay; v: number } | null>(null);
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    const q = new URLSearchParams(location.search);
    if (q.get('pin')) {
      setPin(q.get('pin')!);
      // Keep the PIN out of the address bar, history and screenshots once it is saved on this laptop.
      q.delete('pin');
      history.replaceState(null, '', location.pathname + (q.toString() ? `?${q}` : '') + location.hash);
    }
    setParams({ at: q.get('at') ? hhmmToMs(q.get('at')!, Date.now()) : null, slide: q.get('slide'), pin: getPin() });
    setOrigin(location.origin);
    // Keep the projector laptop awake.
    (navigator as Navigator & { wakeLock?: { request(t: string): Promise<unknown> } }).wakeLock?.request('screen').catch(() => {});
  }, []);

  const now = useNow(offset, params.at);
  const server = live?.state ?? initialState;
  // A keyboard move holds until /control next changes the state.
  const mine = local && local.v === server.v ? local : null;
  const state = useMemo(
    () => ({ ...server, slideId: params.slide ?? mine?.slideId ?? server.slideId, overlay: mine ? mine.overlay : server.overlay ?? null }),
    [server, mine, params.slide],
  );

  useEffect(() => {
    const onKey = async (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      let action: Action | null = null;
      if (['arrowright', 'pagedown', ' ', 'enter'].includes(k)) action = { type: 'next' };
      else if (['arrowleft', 'pageup', 'backspace'].includes(k)) action = { type: 'prev' };
      else if (k === 'v') action = { type: 'overlay', overlay: state.overlay === 'video' ? null : 'video' };
      else if (k === 's') action = { type: 'overlay', overlay: state.overlay === 'sim' ? null : 'sim' };
      else if (k === 'escape' || k === 'q') action = state.overlay ? { type: 'overlay', overlay: null } : null;
      else if (k === 'f') document.documentElement.requestFullscreen?.().catch(() => {});
      else if (k === 'd') {
        // The deck of the session on screen (or the one we left for poll/questions), in a new tab.
        const deck = activeSlot(state, Date.now() + offset)?.deck;
        if (deck) window.open(deck.url, 'next-deck');
        return;
      }
      if (!action) return;
      e.preventDefault();
      const moved = reduce(state, action, Date.now());
      setLocal({ slideId: moved.slideId, overlay: moved.overlay, v: server.v });
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
  }, [state, server.v, params.pin, setData, offset]);

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
  const slide = slideById(state.slideId) ?? slideById(initialState.slideId)!;
  return (
    <>
      <Fit fill style={{ position: 'fixed', inset: 0 }} background={slide.kind === 'break' ? '#f1f3fa' : '#ffffff'}>
        {(size) => (
          <Screen
            slide={slide}
            state={{ ...state, overlay: null }}
            now={now}
            polls={live?.polls}
            photos={photos}
            joinUrl={joinUrlFor(origin)}
            offline={!online}
            size={size}
          />
        )}
      </Fit>
      {state.overlay && (
        <Interlude
          kind={state.overlay}
          onClose={async () => {
            const action: Action = { type: 'overlay', overlay: null };
            setLocal({ slideId: state.slideId, overlay: null, v: server.v });
            if (params.pin) control(action, params.pin).then((r) => r && setData(r)).catch(() => {});
          }}
        />
      )}
    </>
  );
}

/** The film or the simulation, full bleed over the slides. */
function Interlude({ kind, onClose }: { kind: 'video' | 'sim'; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  // The simulation is served from this site (/sim), so its keys can be watched too: Q leaves it.
  // Esc stays the simulation's own ("fly home").
  const watchFrame = () => {
    try {
      frame.current?.contentWindow?.addEventListener('keydown', (e) => {
        const t = e.target as HTMLElement | null;
        if (e.key.toLowerCase() === 'q' && !(t && /input|textarea|select/i.test(t.tagName))) onClose();
      });
    } catch {
      /* another origin: use the button or /control */
    }
  };
  const [hint, setHint] = useState(true);
  const [muted, setMuted] = useState(false);
  const { video: film, simulation } = data.interludes;

  useEffect(() => {
    let t = setTimeout(() => setHint(false), 3000);
    const move = () => {
      setHint(true);
      clearTimeout(t);
      t = setTimeout(() => setHint(false), 2500);
    };
    window.addEventListener('mousemove', move);
    return () => {
      clearTimeout(t);
      window.removeEventListener('mousemove', move);
    };
  }, []);

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    v.currentTime = 0;
    // Browsers allow sound only after someone has pressed a key or clicked on this page.
    v.play().catch(() => {
      v.muted = true;
      setMuted(true);
      v.play().catch(() => {});
    });
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'm') {
        v.muted = !v.muted;
        setMuted(v.muted);
        if (v.paused) v.play().catch(() => {});
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [kind]);

  return (
    <div className={`interlude${hint ? ' show-hint' : ''}`}>
      {kind === 'video' ? (
        <video ref={video} src={film.src} poster={film.poster} loop playsInline preload="auto" />
      ) : simulation.url ? (
        <iframe ref={frame} onLoad={watchFrame} src={simulation.url} title={simulation.title} allow="fullscreen; autoplay; clipboard-write" />
      ) : (
        <div className="grid-night" style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontFamily: 'var(--mono)', fontSize: 20, letterSpacing: '0.12em', textAlign: 'center', lineHeight: 1.8 }}>
          SIMULATION LINK NOT SET
          <br />
          content/event.json → interludes.simulation.url
        </div>
      )}
      <button className="close" onClick={onClose}>Back to slides · {kind === 'video' ? 'Esc' : 'Q'}</button>
      <div className="hint">{kind === 'video' ? (muted ? 'Sound off · press M' : 'M mutes · Esc returns') : 'Q returns to the slides'}</div>
    </div>
  );
}
