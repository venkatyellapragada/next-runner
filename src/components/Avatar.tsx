import { initials, person } from '@/lib/event';

/** A person's photo, or their initials on a quiet tile until public/people/<id>.jpg exists; nothing for `photo: false`. */
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
  if (p.photo === false) return null;
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
