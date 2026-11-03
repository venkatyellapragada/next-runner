// Every /screen slide and its frame. Pure: props in, markup out, so the same code renders live on
// /screen, as the /control preview and statically on /print. Visual language: DESIGN.md.
import {
  agenda,
  data,
  event,
  fmtClock,
  fmtCountdown,
  person,
  poll,
  slotById,
  slotNext,
  slotProgress,
  slotWindow,
  type Slide,
  type SlideKind,
  type Slot,
} from '@/lib/event';
import { activeSlot, type LiveState } from '@/lib/state';
import { Avatar } from '../Avatar';
import { Logo } from '../Logo';
import { NextMark } from '../NextMark';
import { QR, shortUrl } from '../bits';
import './screen.css';

export { activeSlot };

export type ScreenProps = {
  slide: Slide;
  state: LiveState;
  now: number;
  votes?: number[];
  photos: Record<string, string>;
  joinUrl: string;
  offline?: boolean;
  /** Static rendering for the PDF: no running clock, countdowns become times. */
  print?: boolean;
};

const NIGHT: SlideKind[] = ['transition', 'break', 'questions', 'poll'];
const range = (s: Slot) => `${s.start}–${s.end}`;

export function Screen(p: ScreenProps) {
  const ground = NIGHT.includes(p.slide.kind) ? 'night' : 'paper';
  const notice = p.state.notice.trim();
  // In the /control preview an interlude shows as a card; on /screen the real one sits on top.
  const interlude = p.state.overlay;
  return (
    <div className={`stage ${ground} grid-${ground}`}>
      <Chrome {...p} hideBottom={!!notice} />
      <div key={p.slide.id} className="content slide-enter">
        <SlideBody {...p} />
      </div>
      {notice && (
        <div className="notice">
          <span className="label">Notice</span>
          <span className="clamp1">{notice}</span>
        </div>
      )}
      {interlude && <InterludeCard kind={interlude} />}
      {p.offline && <div className="offline-dot" title="Not reaching the server; showing the last known state" />}
    </div>
  );
}

function InterludeCard({ kind }: { kind: 'video' | 'sim' }) {
  const v = data.interludes;
  return (
    <div className="grid-night" style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
      {kind === 'video' ? (
        <img src={v.video.poster} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }} />
      ) : null}
      <p className="label" style={{ position: 'relative', fontSize: 40, color: '#fff', background: 'rgba(16,14,35,.8)', padding: '20px 32px' }}>
        {kind === 'video' ? `Playing: ${v.video.title}` : `Showing: ${v.simulation.title}`}
      </p>
    </div>
  );
}

// ── Frame: logo, place and clock, now / next, QR, day strip ──────────────
function Chrome({ state, now, joinUrl, print, slide, hideBottom }: ScreenProps & { hideBottom: boolean }) {
  const cur = activeSlot(state, now);
  const next = slotNext(cur?.id);
  const bigQR = slide.kind === 'holding';
  return (
    <>
      <div className="c-tl"><Logo height={34} /></div>
      <div className="c-tr">
        <span className="label">Hyderabad · 05.11.2026</span>
        {!print && (
          <>
            <span className="sep" />
            <span className="clock">{fmtClock(now)}</span>
          </>
        )}
      </div>
      {!hideBottom && (
        <>
          <div className="c-bl">
            <p className="label accent">Now{cur ? ` · ${range(cur)}` : ''}</p>
            <div className="title">{cur ? cur.label : event.theme}</div>
            <div className="c-bar">
              <div className="bar-fill" style={{ width: `${cur ? slotProgress(cur, now) * 100 : 0}%` }} />
            </div>
          </div>
          <div className="c-bc">
            <p className="label">Next{next ? ` · ${next.start}` : ''}</p>
            <div className="title">{next ? next.label : 'Thank you'}</div>
          </div>
          <div className="c-br">
            <p className="label">
              Scan to
              <br />
              ask
            </p>
            <div className="qr-tile"><QR value={joinUrl} size={bigQR ? 132 : 100} color="#0D0B14" /></div>
          </div>
          <DayStrip now={now} curId={cur?.id} />
        </>
      )}
    </>
  );
}

function DayStrip({ now, curId }: { now: number; curId?: string }) {
  const first = slotWindow(agenda[0], now).start;
  const last = slotWindow(agenda[agenda.length - 1], now).end;
  const pct = (t: number) => ((t - first) / (last - first)) * 100;
  return (
    <div className="strip" aria-hidden>
      {agenda.map((s) => {
        const w = slotWindow(s, now);
        return (
          <div key={s.id} className={s.id === curId ? 'now' : ''} style={{ left: `calc(${pct(w.start)}% + 2px)`, width: `calc(${pct(w.end) - pct(w.start)}% - 4px)` }}>
            <div className="bar-fill" style={{ width: `${slotProgress(s, now) * 100}%` }} />
          </div>
        );
      })}
    </div>
  );
}

function SlideBody(p: ScreenProps) {
  const slot = slotById(p.slide.slotId);
  switch (p.slide.kind) {
    case 'holding':
      return <Holding {...p} slot={slot!} />;
    case 'transition':
      return <Transition {...p} slot={slot!} />;
    case 'speaker':
      return <Speaker {...p} slot={slot!} />;
    case 'panel':
      return <Panel {...p} slot={slot!} />;
    case 'break':
      return <Break {...p} slot={slot!} />;
    case 'questions':
      return <Questions {...p} slot={slot} />;
    case 'poll':
      return <Poll {...p} />;
  }
}

// ── Countdown: minutes when far, m:ss when close, the time itself in print ──
function Countdown({ target, label, now, size = 200, print }: { target: number; label: string; now: number; size?: number; print?: boolean }) {
  const ms = target - now;
  const clock = (t: number) => {
    const [h, m] = fmtClock(t).split(':');
    return (
      <>
        {h}
        <span className="colon">:</span>
        {m}
      </>
    );
  };
  let lab = label;
  let big: React.ReactNode;
  if (print || ms > 60 * 60000) {
    lab = label.startsWith('We resume') ? 'We resume at' : 'Starts at';
    big = clock(target);
  } else if (ms <= 0) {
    big = 'Now';
  } else if (ms >= 10 * 60000) {
    big = (
      <>
        {Math.ceil(ms / 60000)}
        <small>min</small>
      </>
    );
  } else {
    const [m, s] = fmtCountdown(ms).split(':');
    big = (
      <>
        {m}
        <span className="colon">:</span>
        {s}
      </>
    );
  }
  return (
    <div>
      <p className="label" style={{ marginBottom: 20 }}>{lab}</p>
      <div className="count" style={{ fontSize: size }}>{big}</div>
    </div>
  );
}

function PersonLine({ id, photos, size = 120 }: { id: string; photos: Record<string, string>; size?: number }) {
  const s = person(id);
  return (
    <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
      <Avatar id={id} photos={photos} width={size} />
      <div>
        <p className="h2 accent" style={{ fontWeight: 500 }}>{s.name}</p>
        <p className="body muted" style={{ fontSize: 30, marginTop: 4 }}>{[s.title, s.org].filter(Boolean).join(', ')}</p>
      </div>
    </div>
  );
}

// ── Holding: the opening screen, the film's title card ───────────────────
function Holding({ slot, now, print }: ScreenProps & { slot: Slot }) {
  const begins = slotNext(slot.id);
  const start = begins ? slotWindow(begins, now).start : 0;
  const ms = start - now;
  const when = print || ms > 60 * 60000 || ms <= 0 ? '' : ms >= 10 * 60000 ? `in ${Math.ceil(ms / 60000)} min` : `in ${fmtCountdown(ms)}`;
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      <NextMark size={290} />
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginTop: 4 }}>
        <span style={{ fontSize: 40, color: 'var(--ink-2)' }}>by</span>
        <Logo height={58} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 40, marginTop: 64, width: 1280 }}>
        <span style={{ flex: 1, height: 2, background: 'var(--indigo)' }} />
        <span className="label" style={{ color: 'var(--ink-2)' }}>In partnership with Google Cloud</span>
        <span style={{ flex: 1, height: 2, background: 'var(--red)' }} />
      </div>
      <p className="h2" style={{ marginTop: 56 }}>
        <span>{slot.title} are open. </span>
        <span className="muted">The programme begins at {begins?.start}</span>
        {when && <span className="accent" style={{ fontWeight: 500 }}> {when}</span>}
      </p>
    </div>
  );
}

// ── Transition: what is next, who, countdown (night) ─────────────────────
function Transition({ slot, now, photos, print }: ScreenProps & { slot: Slot }) {
  const ids = slot.kind === 'panel' ? [] : slot.speakers ?? [];
  return (
    <div className="cols">
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minWidth: 0 }}>
        <div>
          <p className="label accent" style={{ marginBottom: 36 }}>Up next · {range(slot)}</p>
          {slot.label !== slot.title && <p className="h1 faint" style={{ fontSize: 60, marginBottom: 12 }}>{slot.label}</p>}
          <h1 className="hero resolve" style={{ fontSize: slot.title.length <= 22 ? 132 : slot.title.length <= 36 ? 104 : 92 }}>{slot.title}</h1>
          {slot.subtitle && <p className="h2 muted" style={{ marginTop: 24 }}>{slot.subtitle}</p>}
        </div>
        {slot.kind === 'panel' && slot.moderator ? (
          <div>
            <p className="label" style={{ marginBottom: 20 }}>Moderator</p>
            <PersonLine id={slot.moderator} photos={photos} size={104} />
            <p className="body muted" style={{ marginTop: 20, fontSize: 30 }}>With eight university leaders from Telangana and Andhra Pradesh</p>
          </div>
        ) : ids.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {ids.map((id) => <PersonLine key={id} id={id} photos={photos} />)}
          </div>
        ) : slot.byline ? (
          <p className="h2 accent">{slot.byline}</p>
        ) : null}
      </div>
      <div style={{ width: 500, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
        <Countdown target={slotWindow(slot, now).start} label="Starts in" now={now} print={print} />
      </div>
    </div>
  );
}

// ── Speaker (paper) ──────────────────────────────────────────────────────
function Speaker(p: ScreenProps & { slot: Slot }) {
  const { slot, photos } = p;
  const lead = (slot.speakers ?? [])[0];
  if (!lead) return <Transition {...p} />;
  const s = person(lead);
  const topics = slot.topics ?? [];
  const session = slot.title !== slot.label;
  return (
    <div className="cols" style={{ gap: 96, alignItems: 'flex-start' }}>
      <Avatar id={lead} photos={photos} width={480} height={600} />
      <div style={{ flex: 1, minWidth: 0, paddingTop: 8 }}>
        <p className="label accent" style={{ marginBottom: 36 }}>{slot.label} · {range(slot)}</p>
        <h1 className="hero resolve" style={{ fontSize: 104 }}>{s.name}</h1>
        <p className="h2 muted" style={{ marginTop: 16, fontSize: 44 }}>{[s.title, s.org].filter(Boolean).join(', ')}</p>
        {(session || topics.length > 0) && (
          <div style={{ marginTop: 56 }}>
            {session && <p className="h1 accent" style={{ fontSize: 60 }}>{slot.title}</p>}
            {slot.subtitle && <p className="body muted" style={{ marginTop: 10 }}>{slot.subtitle}</p>}
            {topics.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 56px', marginTop: 32 }}>
                {topics.map((t, i) => (
                  <p key={t} className="body topic" style={{ fontSize: 32 }}>
                    <span className="n">{String(i + 1).padStart(2, '0')}</span>
                    <span>{t}</span>
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Panel: moderator plus eight panelists (paper) ────────────────────────
function Panel({ slot, photos }: ScreenProps & { slot: Slot }) {
  const mod = slot.moderator ? person(slot.moderator) : null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 64 }}>
        <div style={{ minWidth: 0 }}>
          <p className="label accent" style={{ marginBottom: 24 }}>{slot.label} · {range(slot)}</p>
          <h1 className="h1 resolve" style={{ fontWeight: 600, fontSize: 68 }}>{slot.title}</h1>
          {slot.subtitle && <p className="h2 accent" style={{ marginTop: 6, fontSize: 44, fontWeight: 500 }}>{slot.subtitle}</p>}
        </div>
        {mod && (
          <div style={{ display: 'flex', gap: 24, alignItems: 'center', flex: 'none' }}>
            <div style={{ textAlign: 'right' }}>
              <p className="label" style={{ marginBottom: 10 }}>Moderator</p>
              <p style={{ margin: 0, fontSize: 34, fontWeight: 600, letterSpacing: '-0.015em' }}>{mod.name}</p>
              <p className="muted" style={{ margin: 0, fontSize: 26 }}>{mod.title}, {mod.org}</p>
            </div>
            <Avatar id={slot.moderator!} photos={photos} width={112} />
          </div>
        )}
      </div>
      <div style={{ height: 2, display: 'flex', margin: '32px 0 30px' }}>
        <span style={{ flex: 1, background: 'var(--indigo)' }} />
        <span style={{ flex: 1, background: 'var(--red)' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px 96px' }}>
        {(slot.speakers ?? []).map((id) => {
          const s = person(id);
          return (
            <div key={id} style={{ display: 'flex', gap: 28, alignItems: 'center', minWidth: 0 }}>
              <Avatar id={id} photos={photos} width={100} />
              <div style={{ minWidth: 0 }}>
                <p className="clamp1" style={{ margin: 0, fontSize: 34, fontWeight: 600, letterSpacing: '-0.015em' }}>{s.name}</p>
                <p className="clamp1 muted" style={{ margin: '2px 0 0', fontSize: 28 }}>{s.org}</p>
                <p className="clamp1 faint" style={{ margin: 0, fontSize: 24 }}>{s.title}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Break / lunch / high tea (night) ─────────────────────────────────────
function Break({ slot, state, now, print }: ScreenProps & { slot: Slot }) {
  const next = slotNext(slot.id);
  const timed = state.timer.endsAt && state.timer.endsAt > now - 60000;
  const target = timed ? state.timer.endsAt! : next ? slotWindow(next, now).start : slotWindow(slot, now).end;
  const nextWho = next?.speakers?.map((id) => person(id).name).join(', ') ?? next?.byline;
  return (
    <div className="cols">
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minWidth: 0 }}>
        <div>
          <p className="label accent" style={{ marginBottom: 32 }}>{slot.label} · {range(slot)}</p>
          <h1 className="display resolve" style={{ fontSize: 200 }}>{slot.title}</h1>
          {slot.subtitle && <p className="h2 muted" style={{ marginTop: 36 }}>{slot.subtitle}</p>}
        </div>
        {next && (
          <div>
            <p className="label" style={{ marginBottom: 16 }}>After the break · {next.start}</p>
            <p className="h2" style={{ fontWeight: 500 }}>
              {next.label}
              {next.title !== next.label && <span className="accent">: {next.title}</span>}
            </p>
            {nextWho && <p className="body muted" style={{ fontSize: 30, marginTop: 6 }}>{nextWho}</p>}
          </div>
        )}
      </div>
      <div style={{ width: 560, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
        <Countdown target={target} label={(timed && state.timer.label) || 'We resume in'} now={now} print={print} />
      </div>
    </div>
  );
}

// ── Questions: the Open Forum queue, or put up at any time (night) ──────
function Questions({ state, joinUrl, slot }: ScreenProps & { slot?: Slot }) {
  const [current, ...queue] = state.questions;
  const who = (q: { name?: string; role?: string; org?: string }) =>
    [q.name, q.role, q.org].filter(Boolean).join(' · ') || 'From the audience';
  return (
    <div className="cols">
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <p className="label accent" style={{ marginBottom: 40 }}>
          {slot ? `${slot.label}: ${slot.title}` : 'Questions from the room'}
        </p>
        {current ? (
          <>
            <p className="h1 resolve" style={{ fontSize: 68, lineHeight: 1.14, fontWeight: 500 }}>{current.text}</p>
            <p className="h2 accent" style={{ marginTop: 32, fontSize: 34, fontWeight: 500 }}>{who(current)}</p>
            {queue.length > 0 && (
              <div style={{ marginTop: 'auto' }}>
                <p className="label" style={{ marginBottom: 20 }}>Next in the queue</p>
                {queue.map((q) => (
                  <p key={q.id} className="body muted clamp1" style={{ marginBottom: 10 }}>{q.text}</p>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <h1 className="hero resolve" style={{ fontSize: 128 }}>Ask from your phone.</h1>
            <p className="h2 faint" style={{ marginTop: 32 }}>Scan the code, write your question, add your role if you like. Selected questions appear here.</p>
          </>
        )}
      </div>
      <div style={{ width: 360, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
        <div className="qr-tile" style={{ alignSelf: 'flex-start' }}><QR value={joinUrl} size={300} color="#0D0B14" /></div>
        <p className="body" style={{ marginTop: 24 }}>Scan to ask a question</p>
        <p className="label" style={{ marginTop: 10, letterSpacing: '0.06em', textTransform: 'none' }}>{shortUrl(joinUrl)}</p>
      </div>
    </div>
  );
}

// ── Poll results (night) ─────────────────────────────────────────────────
function Poll({ state, votes, joinUrl }: ScreenProps) {
  const counts = votes ?? poll.options.map(() => 0);
  const total = counts.reduce((a, b) => a + b, 0);
  const max = Math.max(...counts);
  return (
    <div className="cols">
      <div style={{ flex: 1, minWidth: 0 }}>
        <p className="label accent" style={{ marginBottom: 32 }}>
          Pulse poll · {total} {total === 1 ? 'response' : 'responses'}
        </p>
        <h1 className="h1 resolve" style={{ fontSize: 60, marginBottom: 52, fontWeight: 500 }}>{poll.question}</h1>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {poll.options.map((o, i) => {
            const share = total ? counts[i] / total : 0;
            const lead = total > 0 && counts[i] === max;
            return (
              <div key={o}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                  <p className={`body ${lead ? '' : 'muted'}`} style={{ fontWeight: lead ? 500 : 400 }}>{o}</p>
                  <p className="tabular" style={{ margin: 0, fontSize: 40, fontWeight: 500, color: lead ? 'var(--violet)' : 'var(--snow-2)' }}>
                    {Math.round(share * 100)}%
                  </p>
                </div>
                <div style={{ height: 10, background: 'var(--night-2)', borderRadius: 2 }}>
                  <div className="bar-fill" style={{ height: '100%', width: `${share * 100}%`, background: lead ? 'var(--violet)' : 'var(--snow-3)', borderRadius: 2 }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ width: 340, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
        {state.poll.open ? (
          <>
            <div className="qr-tile" style={{ alignSelf: 'flex-start' }}><QR value={joinUrl} size={260} color="#0D0B14" /></div>
            <p className="body" style={{ marginTop: 24 }}>Vote on your phone</p>
          </>
        ) : (
          <p className="h2 faint">Voting closed</p>
        )}
      </div>
    </div>
  );
}
