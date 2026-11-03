// The only persistence: one Upstash Redis database over its REST API, or, when none is
// configured, an in-process Map that speaks the same few commands (for `npm run dev` and
// `npm run local` on a single laptop).

type Arg = string | number;
const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';
export const storeKind: 'redis' | 'memory' = URL_ && TOKEN ? 'redis' : 'memory';

const PREFIX = 'next1:';
export const K = {
  state: PREFIX + 'state',
  questions: PREFIX + 'questions', // list of JSON
  qstatus: PREFIX + 'qstatus', // hash id → new | shown | answered | hidden
  votes: PREFIX + 'votes', // hash optionIndex → count
  voters: PREFIX + 'voters', // set of device ids
  feedback: PREFIX + 'feedback', // list of JSON
  cooldown: (device: string) => PREFIX + 'cool:' + device,
};

export async function redis<T = unknown>(...cmd: Arg[]): Promise<T> {
  if (storeKind === 'memory') return memory(cmd) as T;
  const res = await fetch(URL_, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify(cmd),
    cache: 'no-store',
  });
  const json = (await res.json()) as { result?: T; error?: string };
  if (json.error) throw new Error(json.error);
  return json.result as T;
}

/** HGETALL comes back as a flat [field, value, …] list from REST. */
export async function hgetall(key: string): Promise<Record<string, string>> {
  const flat = await redis<string[] | Record<string, string> | null>('HGETALL', key);
  if (!flat) return {};
  if (!Array.isArray(flat)) return flat;
  const out: Record<string, string> = {};
  for (let i = 0; i < flat.length; i += 2) out[flat[i]] = flat[i + 1];
  return out;
}

// ── In-memory stand-in ───────────────────────────────────────────────────
type Val = string | string[] | Map<string, string> | Set<string>;
const g = globalThis as unknown as { __next1Mem?: Map<string, { v: Val; exp?: number }> };
const mem = (g.__next1Mem ??= new Map());

function live(key: string) {
  const e = mem.get(key);
  if (e?.exp && e.exp < Date.now()) {
    mem.delete(key);
    return undefined;
  }
  return e;
}

function memory(cmd: Arg[]): unknown {
  const [op, key, ...rest] = cmd.map(String);
  switch (op.toUpperCase()) {
    case 'GET':
      return (live(key)?.v as string) ?? null;
    case 'SET': {
      const nx = rest.includes('NX');
      const ex = rest.indexOf('EX');
      if (nx && live(key)) return null;
      mem.set(key, { v: rest[0], exp: ex >= 0 ? Date.now() + Number(rest[ex + 1]) * 1000 : undefined });
      return 'OK';
    }
    case 'DEL':
      [key, ...rest].forEach((k) => mem.delete(k));
      return 1;
    case 'RPUSH': {
      const list = (live(key)?.v as string[]) ?? [];
      list.push(...rest);
      mem.set(key, { v: list });
      return list.length;
    }
    case 'LRANGE':
      return [...((live(key)?.v as string[]) ?? [])];
    case 'HSET': {
      const h = (live(key)?.v as Map<string, string>) ?? new Map();
      for (let i = 0; i < rest.length; i += 2) h.set(rest[i], rest[i + 1]);
      mem.set(key, { v: h });
      return 1;
    }
    case 'HINCRBY': {
      const h = (live(key)?.v as Map<string, string>) ?? new Map();
      const n = Number(h.get(rest[0]) ?? 0) + Number(rest[1]);
      h.set(rest[0], String(n));
      mem.set(key, { v: h });
      return n;
    }
    case 'HGETALL':
      return Object.fromEntries((live(key)?.v as Map<string, string>) ?? []);
    case 'SADD': {
      const s = (live(key)?.v as Set<string>) ?? new Set();
      const had = s.has(rest[0]);
      s.add(rest[0]);
      mem.set(key, { v: s });
      return had ? 0 : 1;
    }
    case 'SCARD':
      return ((live(key)?.v as Set<string>) ?? new Set()).size;
    default:
      throw new Error(`memory store: ${op} not supported`);
  }
}
