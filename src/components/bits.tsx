// Small pure pieces shared by /screen, /print, /join and /control. No hooks: these render the
// same on the server (for /print) and in the browser.
import QRCode from 'qrcode';

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

export function joinUrlFor(origin: string): string {
  return process.env.NEXT_PUBLIC_JOIN_URL || `${origin.replace(/\/$/, '')}/join`;
}
export { Avatar } from './Avatar';

export function shortUrl(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
}
