import { clean, findPoll, json, loadState, loadVotes } from '@/lib/server';
import { K, redis } from '@/lib/store';

export const dynamic = 'force-dynamic';

// One vote per device per poll, only on the current poll while it is open.
export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const option = Number(b.option);
  const device = clean(b.device, 64);
  const state = await loadState();
  const pollId = clean(b.pollId, 64) || state.poll.id;
  const poll = await findPoll(pollId);
  if (!poll || !device || !Number.isInteger(option) || option < 0 || option >= poll.options.length)
    return json({ ok: false, error: 'That poll has changed. Please refresh.' }, { status: 400 });
  if (state.poll.id !== poll.id || !state.poll.open) return json({ ok: false, error: 'This poll is closed.' }, { status: 409 });
  const added = await redis<number>('SADD', K.voters(poll.id), device);
  if (added) await redis('HINCRBY', K.votes(poll.id), String(option), 1);
  return json({ ok: true, already: !added, votes: await loadVotes(poll) });
}
