import { poll } from '@/lib/event';
import { authorised, loadVotes } from '@/lib/server';
import { hgetall, K, redis } from '@/lib/store';

export const dynamic = 'force-dynamic';

const cell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
const csv = (rows: unknown[][]) => rows.map((r) => r.map(cell).join(',')).join('\r\n');
const ist = (ms: number) => new Date(ms).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

// /api/export?type=questions|feedback|poll&pin=…  → CSV download
export async function GET(req: Request) {
  if (!authorised(req)) return new Response('PIN required', { status: 401 });
  const type = new URL(req.url).searchParams.get('type');
  let rows: unknown[][];
  if (type === 'questions') {
    const [list, status] = await Promise.all([redis<string[]>('LRANGE', K.questions, 0, -1), hgetall(K.qstatus)]);
    rows = [['time', 'question', 'name', 'role', 'institution', 'status'] as unknown[]].concat(
      list.map((s) => {
        const q = JSON.parse(s);
        return [ist(q.ts), q.text, q.name, q.role, q.org, status[q.id] ?? 'new'];
      }),
    );
  } else if (type === 'feedback') {
    const list = await redis<string[]>('LRANGE', K.feedback, 0, -1);
    rows = [['time', 'rating', 'most useful', 'comments', 'name', 'role', 'institution', 'contact', 'follow up'] as unknown[]].concat(
      list.map((s) => {
        const f = JSON.parse(s);
        return [ist(f.ts), f.rating, f.best, f.comments, f.name, f.role, f.org, f.contact, f.followUp ? 'yes' : ''];
      }),
    );
  } else if (type === 'poll') {
    const votes = await loadVotes();
    rows = [['option', 'votes'] as unknown[]].concat(poll.options.map((o, i) => [o, votes[i]]));
  } else return new Response('type must be questions, feedback or poll', { status: 400 });
  return new Response('﻿' + csv(rows), {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="next-1.0-${type}.csv"`,
      'cache-control': 'no-store',
    },
  });
}
