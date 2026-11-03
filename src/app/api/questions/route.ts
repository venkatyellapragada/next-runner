import { authorised, clean, json } from '@/lib/server';
import { hgetall, K, redis } from '@/lib/store';

export const dynamic = 'force-dynamic';

export type Question = {
  id: string;
  text: string;
  name: string;
  role: string;
  org: string;
  ts: number;
  status?: 'new' | 'shown' | 'answered' | 'hidden';
};

// Audience: ask a question. One question per device every 20 seconds.
export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const text = clean(b.text, 280);
  const device = clean(b.device, 64);
  if (text.length < 5 || !device) return json({ ok: false, error: 'Please write a question.' }, { status: 400 });
  const free = await redis('SET', K.cooldown(device), '1', 'NX', 'EX', 20);
  if (!free) return json({ ok: false, error: 'Please wait a few seconds before asking again.' }, { status: 429 });
  const q: Question = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    text,
    name: clean(b.name, 60),
    role: clean(b.role, 40),
    org: clean(b.org, 80),
    ts: Date.now(),
  };
  await redis('RPUSH', K.questions, JSON.stringify(q));
  return json({ ok: true });
}

// Control: every question with its status, newest first.
export async function GET(req: Request) {
  if (!authorised(req)) return json({ ok: false }, { status: 401 });
  const [list, status] = await Promise.all([redis<string[]>('LRANGE', K.questions, 0, -1), hgetall(K.qstatus)]);
  const questions = list
    .map((s) => JSON.parse(s) as Question)
    .map((q) => ({ ...q, status: (status[q.id] as Question['status']) ?? 'new' }))
    .reverse();
  return json({ questions });
}

// Control: mark a question shown / answered / hidden.
export async function PATCH(req: Request) {
  if (!authorised(req)) return json({ ok: false }, { status: 401 });
  const { id, status } = (await req.json()) as { id: string; status: string };
  if (!['new', 'shown', 'answered', 'hidden'].includes(status)) return json({ ok: false }, { status: 400 });
  await redis('HSET', K.qstatus, id, status);
  return json({ ok: true });
}
