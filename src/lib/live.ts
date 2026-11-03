'use client';
// Polling, a server-synced clock and a per-device id. Polling has nothing to reconnect: when
// the network comes back the next request simply works.
import { useEffect, useRef, useState } from 'react';
import type { StatePayload } from './state';

export function useLive(path: string, intervalMs: number) {
  const [data, setData] = useState<StatePayload | null>(null);
  const [online, setOnline] = useState(true);
  const [offset, setOffset] = useState(0); // server clock − this device's clock
  const kick = useRef<() => void>(() => {});

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    let fails = 0;
    const tick = async () => {
      clearTimeout(timer);
      try {
        const t0 = Date.now();
        const res = await fetch(path, { cache: 'no-store' });
        if (!res.ok) throw new Error(String(res.status));
        const body = (await res.json()) as StatePayload;
        const t1 = Date.now();
        if (stopped) return;
        if (t1 - t0 < 2000) setOffset(body.now - (t0 + t1) / 2);
        setData(body);
        fails = 0;
        setOnline(true);
      } catch {
        if (++fails >= 3) setOnline(false);
      }
      if (!stopped) timer = setTimeout(tick, document.hidden ? intervalMs * 5 : intervalMs);
    };
    kick.current = tick;
    tick();
    const onVisible = () => !document.hidden && tick();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onVisible);
    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onVisible);
    };
  }, [path, intervalMs]);

  return { data, setData, online, offset, refresh: () => kick.current() };
}

/** Current time in ms, corrected to the server clock, ticking on the second. `frozen` pins it. */
export function useNow(offset: number, frozen?: number | null): number {
  const [now, setNow] = useState(() => frozen ?? Date.now() + offset);
  useEffect(() => {
    if (frozen) {
      setNow(frozen);
      return;
    }
    let t: ReturnType<typeof setTimeout>;
    const loop = () => {
      const n = Date.now() + offset;
      setNow(n);
      t = setTimeout(loop, 1000 - (n % 1000) + 5);
    };
    loop();
    return () => clearTimeout(t);
  }, [offset, frozen]);
  return now;
}

export function deviceId(): string {
  try {
    let id = localStorage.getItem('next1-device');
    if (!id) {
      id = Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem('next1-device', id);
    }
    return id;
  } catch {
    return 'anon-' + Math.random().toString(36).slice(2);
  }
}

export function getPin(): string {
  try {
    return localStorage.getItem('next1-pin') ?? '';
  } catch {
    return '';
  }
}
export function setPin(pin: string) {
  try {
    if (pin) localStorage.setItem('next1-pin', pin);
    else localStorage.removeItem('next1-pin');
  } catch {}
}

export async function control(action: unknown, pin: string): Promise<StatePayload | null> {
  const res = await fetch('/api/control', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-pin': pin },
    body: JSON.stringify(action),
  });
  if (res.status === 401) throw new Error('pin');
  if (!res.ok) throw new Error(String(res.status));
  return (await res.json()) as StatePayload;
}
