import { authorised, defaultPin, json, loadState, payload, saveState } from '@/lib/server';
import { reduce, type Action } from '@/lib/state';
import { K, redis, storeKind } from '@/lib/store';

export const dynamic = 'force-dynamic';

/** PIN check plus a health line for /control. */
export async function GET(req: Request) {
  if (!authorised(req)) return json({ ok: false }, { status: 401 });
  return json({ ok: true, store: storeKind, defaultPin });
}

export async function POST(req: Request) {
  if (!authorised(req)) return json({ ok: false }, { status: 401 });
  const action = (await req.json()) as Action | { type: 'wipe-audience' } | { type: 'wipe-votes' };
  try {
    if (action.type === 'wipe-votes') {
      await redis('DEL', K.votes, K.voters);
    } else if (action.type === 'wipe-audience') {
      await redis('DEL', K.votes, K.voters, K.questions, K.qstatus, K.feedback);
    } else {
      const next = reduce(await loadState(), action, Date.now());
      await saveState(next);
    }
    return json(await payload());
  } catch (e) {
    return json({ error: String(e) }, { status: 503 });
  }
}
