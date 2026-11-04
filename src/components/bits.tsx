// Small pure pieces shared by /screen, /print, /join and /control. No hooks: these render the
// same on the server (for /print) and in the browser.
import QRCode from 'qrcode';

/** QR as one SVG path, built synchronously so it renders anywhere. */
/** `quiet`: the white margin in modules. 2 for codes on a tile; 0 where the slide's own white is the margin. */
export function QR({ value, size, color = 'var(--ink)', quiet = 2 }: { value: string; size: number; color?: string; quiet?: number }) {
  const qr = QRCode.create(value, { errorCorrectionLevel: 'M' });
  const n = qr.modules.size;
  let d = '';
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) if (qr.modules.get(x, y)) d += `M${x + quiet} ${y + quiet}h1v1h-1z`;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${n + 2 * quiet} ${n + 2 * quiet}`} role="img" aria-label={`QR code: ${value}`} shapeRendering="crispEdges">
      <rect width={n + 2 * quiet} height={n + 2 * quiet} fill="#fff" />
      <path d={d} fill={color} />
    </svg>
  );
}

export function joinUrlFor(origin: string): string {
  return process.env.NEXT_PUBLIC_JOIN_URL || `${origin.replace(/\/$/, '')}/join`;
}
export { Avatar } from './Avatar';

export function shortUrl(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
}
