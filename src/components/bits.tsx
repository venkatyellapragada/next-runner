// Small pure pieces shared by /screen, /print, /join and /control. No hooks: these render the
// same on the server (for /print) and in the browser.
import QRCode from 'qrcode';
import { initials, person } from '@/lib/event';

/** QR as one SVG path, built synchronously so it renders anywhere. */
export function QR({ value, size, color = 'var(--ink)' }: { value: string; size: number; color?: string }) {
  const qr = QRCode.create(value, { errorCorrectionLevel: 'M' });
  const n = qr.modules.size;
  let d = '';
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) if (qr.modules.get(x, y)) d += `M${x + 2} ${y + 2}h1v1h-1z`;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${n + 4} ${n + 4}`} role="img" aria-label={`QR code: ${value}`} shapeRendering="crispEdges">
      <rect width={n + 4} height={n + 4} fill="#fff" />
      <path d={d} fill={color} />
    </svg>
  );
}

/** A person's photo, or their initials on a quiet tile until public/people/<id>.jpg exists. */
export function Avatar({
  id,
  photos,
  width,
  height = width,
  round = false,
}: {
  id: string;
  photos: Record<string, string>;
  width: number;
  height?: number;
  round?: boolean;
}) {
  const p = person(id);
  const src = photos[id];
  const style: React.CSSProperties = {
    width,
    height,
    borderRadius: round ? '50%' : 'var(--radius)',
    flex: 'none',
    overflow: 'hidden',
    background: 'var(--tint)',
  };
  if (src) return <img src={src} alt={p.name} style={{ ...style, objectFit: 'cover', objectPosition: '50% 25%' }} />;
  return (
    <div
      aria-label={`${p.name} (photo to come)`}
      title={`Photo missing: public/people/${id}.jpg`}
      style={{
        ...style,
        display: 'grid',
        placeItems: 'center',
        fontFamily: 'var(--display)',
        fontWeight: 500,
        fontSize: Math.round(Math.min(width, height) * 0.36),
        letterSpacing: '-0.02em',
        color: 'var(--ink-2)',
      }}
    >
      {initials(p.name)}
    </div>
  );
}

export function joinUrlFor(origin: string): string {
  return process.env.NEXT_PUBLIC_JOIN_URL || `${origin.replace(/\/$/, '')}/join`;
}
export function shortUrl(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
}
