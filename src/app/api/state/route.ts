import { json, payload } from '@/lib/server';

export const dynamic = 'force-dynamic';

// /screen and /control read this uncached every second or so. /join asks with ?view=join and
// gets a CDN-cacheable answer, so a full hall of phones costs the store almost nothing.
export async function GET(req: Request) {
  const join = new URL(req.url).searchParams.get('view') === 'join';
  try {
    const body = await payload();
    return json(body, join ? { headers: { 'cache-control': 'public, s-maxage=5, stale-while-revalidate=30' } } : {});
  } catch (e) {
    return json({ error: String(e) }, { status: 503 });
  }
}
