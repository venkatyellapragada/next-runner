import { poll } from '@/lib/event';
import { clean, json, loadState, loadVotes } from '@/lib/server';
import { K, redis } from '@/lib/store';

export const dynamic = 'force-dynamic';

// One vote per device, only while the poll is open.
export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const option = Number(b.option);
  const device = clean(b.device, 64);
  if (!device || !Number.isInteger(option) || option < 0 || option >= poll.options.length)
    return json({ ok: false }, { status: 400 });
  const state = await loadState();
  if (!state.poll.open) return json({ ok: false, error: 'The poll is closed.' }, { status: 409 });
  const added = await redis<number>('SADD', K.voters, device);
  if (added) await redis('HINCRBY', K.votes, String(option), 1);
  return json({ ok: true, already: !added, votes: await loadVotes() });
}
