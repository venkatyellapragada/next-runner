import { allPolls, authorised, defaultPin, json, loadState, payload, saveState } from '@/lib/server';
import { reduce, type Action } from '@/lib/state';
import { K, redis, storeKind } from '@/lib/store';

export const dynamic = 'force-dynamic';

/** PIN check plus a health line for /control: proves the store takes a write and reads it back. */
export async function GET(req: Request) {
  if (!authorised(req)) return json({ ok: false }, { status: 401 });
  let writable = false;
  try {
    const stamp = String(Date.now());
    await redis('SET', K.health, stamp, 'EX', 300);
    writable = (await redis<string | null>('GET', K.health)) === stamp;
  } catch {}
  return json({ ok: true, store: storeKind, writable, defaultPin });
}

export async function POST(req: Request) {
  if (!authorised(req)) return json({ ok: false }, { status: 401 });
  const action = (await req.json()) as Action | { type: 'wipe-audience' } | { type: 'wipe-votes' };
  try {
    if (action.type === 'wipe-votes') {
      const id = (await loadState()).poll.id;
      await redis('DEL', K.votes(id), K.voters(id));
    } else if (action.type === 'wipe-audience') {
      const ids = (await allPolls()).map((p) => p.id);
      await redis('DEL', K.questions, K.qstatus, K.feedback, ...ids.flatMap((id) => [K.votes(id), K.voters(id)]));
    } else {
      const next = reduce(await loadState(), action, Date.now());
      await saveState(next);
    }
    return json(await payload());
  } catch (e) {
    return json({ error: String(e) }, { status: 503 });
  }
}
