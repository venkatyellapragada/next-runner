// Server-side helpers shared by the API routes.
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { isPollLoop, seedPolls, type Poll } from './event';
import { initialState, type LiveState, type StatePayload } from './state';
import { hgetall, K, redis } from './store';

export const CONTROL_PIN = process.env.CONTROL_PIN || '0000';
export const defaultPin = !process.env.CONTROL_PIN;

export function authorised(req: Request): boolean {
  // Header only: a PIN in a URL ends up in history, logs and screenshots.
  return (req.headers.get('x-pin') ?? '') === CONTROL_PIN;
}

export async function loadState(): Promise<LiveState> {
  const raw = await redis<string | null>('GET', K.state);
  if (!raw) return initialState;
  const saved = JSON.parse(raw) as LiveState;
  // State saved by earlier versions (a poll id, no focus) keeps working.
  return { ...initialState, ...saved, poll: { open: !!saved.poll?.open }, focus: saved.focus ?? null };
}
export async function saveState(s: LiveState): Promise<void> {
  await redis('SET', K.state, JSON.stringify(s));
}

/** Every poll: the ones in content/event.json, then the ones added from /control. */
export async function allPolls(): Promise<Poll[]> {
  const custom = (await redis<string[]>('LRANGE', K.customPolls, 0, -1)).map((j) => ({ ...(JSON.parse(j) as Poll), custom: true }));
  return [...seedPolls, ...custom];
}
export async function findPoll(id: string): Promise<Poll | undefined> {
  return (await allPolls()).find((p) => p.id === id);
}

export async function loadVotes(p: Poll): Promise<number[]> {
  const h = await hgetall(K.votes(p.id));
  return p.options.map((_, i) => Number(h[String(i)] ?? 0));
}

export async function payload(): Promise<StatePayload> {
  const state = await loadState();
  const out: StatePayload = { state, now: Date.now() };
  const polls = await allPolls();
  const withVotes = state.poll.open || state.slideId === 'poll' || isPollLoop(state.slideId);
  out.polls = withVotes ? await Promise.all(polls.map(async (p) => ({ ...p, votes: await loadVotes(p) }))) : polls;
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
