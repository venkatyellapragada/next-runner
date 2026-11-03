import { clean, json } from '@/lib/server';
import { K, redis } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const rating = Number(b.rating);
  if (!(rating >= 1 && rating <= 5)) return json({ ok: false, error: 'Please choose a rating.' }, { status: 400 });
  const entry = {
    ts: Date.now(),
    rating,
    best: clean(b.best, 80),
    comments: clean(b.comments, 2000),
    name: clean(b.name, 80),
    role: clean(b.role, 40),
    org: clean(b.org, 120),
    contact: clean(b.contact, 120),
    followUp: b.followUp === true,
  };
  await redis('RPUSH', K.feedback, JSON.stringify(entry));
  return json({ ok: true });
}
