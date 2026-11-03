import { allPolls, authorised, clean, json, loadVotes } from '@/lib/server';
import { K, redis } from '@/lib/store';

export const dynamic = 'force-dynamic';

// Control: every poll with its vote counts.
export async function GET(req: Request) {
  if (!authorised(req)) return json({ ok: false }, { status: 401 });
  const polls = await allPolls();
  const withVotes = await Promise.all(polls.map(async (p) => ({ ...p, votes: await loadVotes(p) })));
  return json({ polls: withVotes });
}

// Control: add a poll during the day.
export async function POST(req: Request) {
  if (!authorised(req)) return json({ ok: false }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const question = clean(b.question, 200);
  const options = (Array.isArray(b.options) ? b.options : []).map((o) => clean(o, 80)).filter(Boolean).slice(0, 6);
  if (question.length < 5 || options.length < 2) return json({ ok: false, error: 'Write a question and at least two options.' }, { status: 400 });
  const poll = { id: 'p' + Date.now().toString(36), question, options };
  await redis('RPUSH', K.customPolls, JSON.stringify(poll));
  return json({ ok: true, poll });
}

// Control: remove a poll added during the day (polls in content/event.json stay).
export async function DELETE(req: Request) {
  if (!authorised(req)) return json({ ok: false }, { status: 401 });
  const id = new URL(req.url).searchParams.get('id') ?? '';
  const list = await redis<string[]>('LRANGE', K.customPolls, 0, -1);
  const keep = list.filter((j) => (JSON.parse(j) as { id: string }).id !== id);
  if (keep.length === list.length) return json({ ok: false, error: 'Only polls added here can be removed.' }, { status: 400 });
  await redis('DEL', K.customPolls, K.votes(id), K.voters(id));
  if (keep.length) await redis('RPUSH', K.customPolls, ...keep);
  return json({ ok: true });
}
