import { clean, findPoll, json, loadState, loadVotes } from '@/lib/server';
import { K, redis } from '@/lib/store';

export const dynamic = 'force-dynamic';

// One answer per device per question, while voting is open. Every question in the set can be answered.
export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const option = Number(b.option);
  const device = clean(b.device, 64);
  const poll = await findPoll(clean(b.pollId, 64));
  if (!poll || !device || !Number.isInteger(option) || option < 0 || option >= poll.options.length)
    return json({ ok: false, error: 'This question has changed. Please refresh.' }, { status: 400 });
  const state = await loadState();
  if (!state.poll.open) return json({ ok: false, error: 'Voting is closed.' }, { status: 409 });
  const added = await redis<number>('SADD', K.voters(poll.id), device);
  if (added) await redis('HINCRBY', K.votes(poll.id), String(option), 1);
  return json({ ok: true, already: !added, votes: await loadVotes(poll) });
}
