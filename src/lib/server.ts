// Server-side helpers shared by the API routes.
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { poll } from './event';
import { initialState, type LiveState, type StatePayload } from './state';
import { hgetall, K, redis } from './store';

export const CONTROL_PIN = process.env.CONTROL_PIN || '0000';
export const defaultPin = !process.env.CONTROL_PIN;

export function authorised(req: Request): boolean {
  const url = new URL(req.url);
  const pin = req.headers.get('x-pin') ?? url.searchParams.get('pin') ?? '';
  return pin === CONTROL_PIN;
}

export async function loadState(): Promise<LiveState> {
  const raw = await redis<string | null>('GET', K.state);
  if (!raw) return initialState;
  return { ...initialState, ...(JSON.parse(raw) as LiveState) };
}
export async function saveState(s: LiveState): Promise<void> {
  await redis('SET', K.state, JSON.stringify(s));
}

export async function loadVotes(): Promise<number[]> {
  const h = await hgetall(K.votes);
  return poll.options.map((_, i) => Number(h[String(i)] ?? 0));
}

export async function payload(): Promise<StatePayload> {
  const state = await loadState();
  const out: StatePayload = { state, now: Date.now() };
  if (state.poll.open || state.slideId === 'poll') out.votes = await loadVotes();
  return out;
}

export const json = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), {
    ...init,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...(init.headers ?? {}) },
  });

export const clean = (v: unknown, max: number) =>
  typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '';

/** id → "/people/<file>", read from public/people at build or request time. */
export function photoManifest(): Record<string, string> {
  try {
    const dir = join(process.cwd(), 'public', 'people');
    const out: Record<string, string> = {};
    for (const f of readdirSync(dir)) {
      const m = f.match(/^(.+)\.(jpe?g|png|webp)$/i);
      if (m) out[m[1]] = `/people/${f}`;
    }
    return out;
  } catch {
    return {};
  }
}
