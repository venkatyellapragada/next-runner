// Every /screen slide and its frame. Pure: props in, markup out, so the same code renders live on /screen
// (any screen shape), as the /control preview and statically on /print. Visual language: DESIGN.md.
import {
  data,
  event,
  fmtClock,
  fmtCountdown,
  person,
  seedPolls,
  slotById,
  slotNext,
  slotProgress,
  slotWindow,
  type Slide,
  type SlideKind,
  type Poll as PollDef,
  type Slot,
} from '@/lib/event';
import { activeSlot, timerActive, type LiveState } from '@/lib/state';
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
  /** The current poll; the first in content/event.json when not given. */
  pollDef?: PollDef;
  photos: Record<string, string>;
  joinUrl: string;
  offline?: boolean;
  /** Static rendering for the PDF: no running clock, countdowns become times. */
  print?: boolean;
  /** Stage size; 1920×1080 unless the screen has another shape. */
  size?: { w: number; h: number };
};

const GROUND: Partial<Record<SlideKind, string>> = { holding: 'brand on-brand', break: 'tint' };
const range = (s: Slot) => `${s.start}–${s.end}`;

export function Screen(p: ScreenProps) {
  const { w, h } = p.size ?? { w: 1920, h: 1080 };
  const notice = p.state.notice.trim();
  return (
    <div className={`stage ${GROUND[p.slide.kind] ?? 'paper'}`} style={{ width: w, height: h }}>
      <Top {...p} />
      <div key={p.slide.id} className="content slide-enter">
        <SlideBody {...p} />
      </div>
      {notice ? (
        <div className="notice">
          <span className="eyebrow">Notice</span>
          <span className="clamp1">{notice}</span>
        </div>
      ) : (
        <Foot {...p} />
      )}
      {p.state.overlay && <InterludeCard kind={p.state.overlay} />}
      {p.offline && <div className="offline-dot" title="Not reaching the server; showing the last known state" />}
    </div>
  );
}

function InterludeCard({ kind }: { kind: 'video' | 'sim' }) {
  const v = data.interludes;
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: '#0a0a0a' }}>
      {kind === 'video' && (
        <img src={v.video.poster} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }} />
      )}
      <p className="eyebrow" style={{ position: 'relative', fontSize: 40, color: '#fff', background: 'rgba(10,10,10,.8)', padding: '20px 32px', borderRadius: 10 }}>
        {kind === 'video' ? `Playing: ${v.video.title}` : `Showing: ${v.simulation.title}`}
      </p>
    </div>
  );
}

// ── Frame ────────────────────────────────────────────────────────────────
// Slides that already show the timer as their big number.
const TIMER_SLIDES: SlideKind[] = ['holding', 'transition', 'break'];

function Top({ now, print, state, slide }: ScreenProps) {
  const chip = !print && timerActive(state, now) && !TIMER_SLIDES.includes(slide.kind);
  return (
    <div className="top">
      <Logo height={36} />
      <div className="meta">
        {chip && (
          <span className="timer-chip">
            <span className="eyebrow">{state.timer.label || 'Timer'}</span>
            <b>{state.timer.endsAt! > now ? fmtCountdown(state.timer.endsAt! - now) : 'Now'}</b>
          </span>
        )}
        <span className="eyebrow">Hyderabad · 05.11.2026</span>
        {!print && (
          <>
            <span className="sep" />
            <span className="clock">{fmtClock(now)}</span>
          </>
        )}
      </div>
    </div>
  );
}

function Foot({ state, now, joinUrl, slide }: ScreenProps) {
  const cur = activeSlot(state, now);
  const next = slotNext(cur?.id);
  return (
    <div className="foot">
      <div style={{ minWidth: 0 }}>
        <p className="eyebrow accent">Now{cur ? ` · ${range(cur)}` : ''}</p>
        <div className="t">{cur ? cur.label : event.theme}</div>
        <div className="bar"><div className="bar-fill" style={{ width: `${cur ? slotProgress(cur, now) * 100 : 0}%` }} /></div>
      </div>
      <div className="next" style={{ minWidth: 0 }}>
        <p className="eyebrow">Next{next ? ` · ${next.start}` : ''}</p>
        <div className="t">{next ? next.label : 'Thank you'}</div>
      </div>
      <div className="qr">
        <p className="eyebrow">Scan<br />to ask</p>
        <div className="qr-tile"><QR value={joinUrl} size={slide.kind === 'holding' ? 104 : 92} color="#0A0A0A" /></div>
      </div>
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

/** The one gradient element on a slide: minutes when far, m:ss when close, the time in print. */
function Countdown({ target, label, now, print }: { target: number; label: string; now: number; print?: boolean }) {
  const ms = target - now;
  let lab = label;
  let big: React.ReactNode;
  if (print || ms > 60 * 60000) {
    lab = label.startsWith('We resume') ? 'We resume at' : 'Starts at';
    big = fmtClock(target);
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
    big = fmtCountdown(ms);
  }
  const isClock = typeof big === 'string' && big.includes(':') && (print || ms > 60 * 60000);
  return (
    <div>
      <p className="eyebrow" style={{ marginBottom: 20 }}>{lab}</p>
      <div className="hero-num" style={{ fontSize: isClock ? 200 : 240 }}>{big}</div>
    </div>
  );
}

function PersonLine({ id, photos, size = 112 }: { id: string; photos: Record<string, string>; size?: number }) {
  const s = person(id);
  return (
    <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
      <Avatar id={id} photos={photos} width={size} />
      <div>
        <p style={{ margin: 0, fontSize: 44, fontWeight: 700, letterSpacing: '-0.015em' }}>{s.name}</p>
        <p className="muted" style={{ margin: '4px 0 0', fontSize: 30 }}>{[s.title, s.org].filter(Boolean).join(', ')}</p>
      </div>
    </div>
  );
}

// ── Holding: the cover, the one brand-gradient slide ─────────────────────
function Holding({ slot, now, print, state }: ScreenProps & { slot: Slot }) {
  const begins = slotNext(slot.id);
  const timed = timerActive(state, now);
  const start = timed ? state.timer.endsAt! : begins ? slotWindow(begins, now).start : 0;
  const ms = start - now;
  const when = print || ms > 60 * 60000 || ms <= 0 ? null : ms >= 10 * 60000 ? `${Math.ceil(ms / 60000)} min` : fmtCountdown(ms);
  return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 96 }}>
      <div>
        <p className="eyebrow" style={{ marginBottom: 28 }}>05.11.2026 · {event.venue}</p>
        <NextMark size={300} style={{ color: '#fff' }} />
        <p className="heading muted" style={{ marginTop: 28, fontWeight: 600 }}>{event.expansion}</p>
        <p className="eyebrow" style={{ marginTop: 28 }}>In partnership with Google Cloud</p>
      </div>
      <div style={{ textAlign: 'right', flex: 'none' }}>
        <p className="eyebrow" style={{ marginBottom: 16 }}>{timed ? state.timer.label || 'Starting in' : `${slot.title} open · programme begins ${begins?.start}`}</p>
        {when ? (
          <p className="display" style={{ fontSize: 160, fontVariantNumeric: 'tabular-nums' }}>{when}</p>
        ) : (
          <p className="display" style={{ fontSize: 160, fontVariantNumeric: 'tabular-nums' }}>{begins?.start}</p>
        )}
      </div>
    </div>
  );
}

// ── Transition: what is next, who, countdown ─────────────────────────────
function Transition({ slot, now, photos, print, state }: ScreenProps & { slot: Slot }) {
  const ids = slot.kind === 'panel' ? [] : slot.speakers ?? [];
  const size = slot.title.length <= 22 ? 128 : slot.title.length <= 36 ? 104 : 92;
  return (
    <div className="cols">
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minWidth: 0 }}>
        <div>
          <p className="eyebrow accent" style={{ marginBottom: 32 }}>Up next · {range(slot)}</p>
          {slot.label !== slot.title && <p className="heading faint" style={{ fontSize: 52, fontWeight: 600, marginBottom: 12 }}>{slot.label}</p>}
          <h1 className="title resolve" style={{ fontSize: size }}>{slot.title}</h1>
          {slot.subtitle && <p className="heading muted" style={{ marginTop: 20, fontSize: 44, fontWeight: 500 }}>{slot.subtitle}</p>}
        </div>
        {slot.kind === 'panel' && slot.moderator ? (
          <div>
            <p className="eyebrow" style={{ marginBottom: 20 }}>Moderator</p>
            <PersonLine id={slot.moderator} photos={photos} size={100} />
            <p className="body muted" style={{ marginTop: 20, fontSize: 30 }}>With eight university leaders from Telangana and Andhra Pradesh</p>
          </div>
        ) : ids.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {ids.map((id) => <PersonLine key={id} id={id} photos={photos} />)}
          </div>
        ) : slot.byline ? (
          <p className="heading accent" style={{ fontSize: 48 }}>{slot.byline}</p>
        ) : null}
      </div>
      <div style={{ flex: 'none', minWidth: 420, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'flex-end' }}>
        {timerActive(state, now) && !print ? (
          <Countdown target={state.timer.endsAt!} label={state.timer.label || 'Starts in'} now={now} />
        ) : (
          <Countdown target={slotWindow(slot, now).start} label="Starts in" now={now} print={print} />
        )}
      </div>
    </div>
  );
}

// ── Speaker ──────────────────────────────────────────────────────────────
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
      <div style={{ flex: 1, minWidth: 0 }}>
        <p className="eyebrow accent" style={{ marginBottom: 32 }}>§ {slot.label} · {range(slot)}</p>
        <h1 className="title resolve" style={{ fontSize: 104 }}>{s.name}</h1>
        <p className="heading muted" style={{ marginTop: 16, fontSize: 40, fontWeight: 500 }}>{[s.title, s.org].filter(Boolean).join(', ')}</p>
        {(session || topics.length > 0) && (
          <div style={{ marginTop: 48, paddingTop: 40, borderTop: '1px solid var(--rule)' }}>
            {session && <p className="heading" style={{ fontSize: 56 }}>{slot.title}</p>}
            {slot.subtitle && <p className="body muted" style={{ marginTop: 10 }}>{slot.subtitle}</p>}
            {topics.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 56px', marginTop: 32 }}>
                {topics.map((t, i) => (
                  <p key={t} className="body step" style={{ fontSize: 32 }}>
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

// ── Panel: moderator plus eight panelists ────────────────────────────────
function Panel({ slot, photos }: ScreenProps & { slot: Slot }) {
  const mod = slot.moderator ? person(slot.moderator) : null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 36 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 64 }}>
        <div style={{ minWidth: 0 }}>
          <p className="eyebrow accent" style={{ marginBottom: 24 }}>§ {slot.label} · {range(slot)}</p>
          <h1 className="heading resolve" style={{ fontSize: 68, fontWeight: 800, letterSpacing: '-0.03em' }}>{slot.title}</h1>
          {slot.subtitle && <p className="heading muted" style={{ marginTop: 6, fontSize: 40, fontWeight: 500 }}>{slot.subtitle}</p>}
        </div>
        {mod && (
          <div style={{ display: 'flex', gap: 20, alignItems: 'center', flex: 'none', background: 'var(--bg-2)', borderRadius: 14, padding: '18px 24px' }}>
            <Avatar id={slot.moderator!} photos={photos} width={88} />
            <div>
              <p className="eyebrow accent" style={{ fontSize: 18, marginBottom: 6 }}>Moderator</p>
              <p style={{ margin: 0, fontSize: 32, fontWeight: 700, letterSpacing: '-0.015em' }}>{mod.name}</p>
              <p className="muted" style={{ margin: 0, fontSize: 24 }}>{mod.title}, {mod.org}</p>
            </div>
          </div>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {(slot.speakers ?? []).map((id) => {
          const s = person(id);
          return (
            <div key={id} className="card" style={{ display: 'flex', gap: 24, alignItems: 'center', minWidth: 0, padding: 16 }}>
              <Avatar id={id} photos={photos} width={84} />
              <div style={{ minWidth: 0 }}>
                <p className="clamp1" style={{ margin: 0, fontSize: 32, fontWeight: 700, letterSpacing: '-0.015em' }}>{s.name}</p>
                <p className="clamp1 muted" style={{ margin: '2px 0 0', fontSize: 26 }}>{s.title}, {s.org}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Break / lunch / high tea (tinted ground) ─────────────────────────────
function Break({ slot, state, now, print }: ScreenProps & { slot: Slot }) {
  const next = slotNext(slot.id);
  const timed = timerActive(state, now);
  const target = timed ? state.timer.endsAt! : next ? slotWindow(next, now).start : slotWindow(slot, now).end;
  const nextWho = next?.speakers?.map((id) => person(id).name).join(', ') ?? next?.byline;
  return (
    <div className="cols">
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minWidth: 0 }}>
        <div>
          <p className="eyebrow accent" style={{ marginBottom: 32 }}>{slot.label} · {range(slot)}</p>
          <h1 className="display resolve" style={{ fontSize: 200 }}>{slot.title}</h1>
          {slot.subtitle && <p className="heading muted" style={{ marginTop: 32, fontSize: 44, fontWeight: 500 }}>{slot.subtitle}</p>}
        </div>
        {next && (
          <div className="card" style={{ padding: '28px 32px', alignSelf: 'flex-start', maxWidth: 1000 }}>
            <p className="eyebrow" style={{ marginBottom: 12 }}>After the break · {next.start}</p>
            <p style={{ margin: 0, fontSize: 40, fontWeight: 700, letterSpacing: '-0.015em' }}>
              {next.label}
              {next.title !== next.label && <span className="accent">: {next.title}</span>}
            </p>
            {nextWho && <p className="muted" style={{ margin: '6px 0 0', fontSize: 28 }}>{nextWho}</p>}
          </div>
        )}
      </div>
      <div style={{ flex: 'none', minWidth: 420, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'flex-end' }}>
        <Countdown target={target} label={(timed && state.timer.label) || 'We resume in'} now={now} print={print && !timed} />
      </div>
    </div>
  );
}

function QrPanel({ joinUrl, line, size = 280 }: { joinUrl: string; line: string; size?: number }) {
  return (
    <div style={{ background: 'var(--bg-2)', borderRadius: 14, padding: 32, display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'flex-start' }}>
      <div className="qr-tile"><QR value={joinUrl} size={size} color="#0A0A0A" /></div>
      <p style={{ margin: 0, fontSize: 32, fontWeight: 700 }}>{line}</p>
      <p className="eyebrow" style={{ fontSize: 18, letterSpacing: '0.06em', textTransform: 'none' }}>{shortUrl(joinUrl)}</p>
    </div>
  );
}

// ── Questions ────────────────────────────────────────────────────────────
function Questions({ state, joinUrl, slot }: ScreenProps & { slot?: Slot }) {
  const [current, ...queue] = state.questions;
  const who = (q: { name?: string; role?: string; org?: string }) =>
    [q.name, q.role, q.org].filter(Boolean).join(' · ') || 'From the audience';
  return (
    <div className="cols">
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <p className="eyebrow accent" style={{ marginBottom: 36 }}>
          {slot ? `§ ${slot.label} · ${slot.title}` : '§ Questions from the room'}
        </p>
        {current ? (
          <>
            <div style={{ borderTop: '1px solid var(--rule)', borderBottom: '1px solid var(--rule)', padding: '36px 0' }}>
              <p style={{ margin: 0, fontSize: 120, lineHeight: 0.5, fontWeight: 800, color: 'var(--indigo)' }}>“</p>
              <p className="heading resolve" style={{ fontSize: 64, lineHeight: 1.15, marginTop: 8 }}>{current.text}</p>
              <p className="eyebrow" style={{ marginTop: 28, fontSize: 24 }}>{who(current)}</p>
            </div>
            {queue.length > 0 && (
              <div style={{ marginTop: 'auto' }}>
                <p className="eyebrow" style={{ marginBottom: 16 }}>Next in the queue</p>
                {queue.map((q) => (
                  <p key={q.id} className="body muted clamp1" style={{ fontSize: 32, padding: '10px 0', borderTop: '1px solid var(--rule)' }}>{q.text}</p>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <h1 className="title resolve" style={{ fontSize: 120 }}>Ask from your phone.</h1>
            <p className="heading muted" style={{ marginTop: 28, fontSize: 44, fontWeight: 500 }}>Scan the code, write your question, add your role if you like. Selected questions appear here.</p>
          </>
        )}
      </div>
      <div style={{ width: 420, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
        <QrPanel joinUrl={joinUrl} line="Scan to ask a question" />
      </div>
    </div>
  );
}

// ── Poll results ─────────────────────────────────────────────────────────
function Poll({ state, votes, joinUrl, pollDef }: ScreenProps) {
  const poll = pollDef ?? seedPolls[0];
  const counts = votes && votes.length === poll.options.length ? votes : poll.options.map(() => 0);
  const total = counts.reduce((a, b) => a + b, 0);
  const max = Math.max(...counts);
  return (
    <div className="cols">
      <div style={{ flex: 1, minWidth: 0 }}>
        <p className="eyebrow accent" style={{ marginBottom: 32 }}>§ Pulse poll · {total} {total === 1 ? 'response' : 'responses'}</p>
        <h1 className="heading resolve" style={{ fontSize: 56, marginBottom: 48 }}>{poll.question}</h1>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
          {poll.options.map((o, i) => {
            const share = total ? counts[i] / total : 0;
            const lead = total > 0 && counts[i] === max;
            return (
              <div key={o}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                  <p className={`body ${lead ? '' : 'muted'}`} style={{ fontSize: 32, fontWeight: lead ? 700 : 400 }}>{o}</p>
                  <p className="tabular" style={{ margin: 0, fontSize: 40, fontWeight: 700, color: lead ? 'var(--indigo)' : 'var(--ink-2)' }}>{Math.round(share * 100)}%</p>
                </div>
                <div style={{ height: 14, background: 'var(--bg-2)', borderRadius: 7, overflow: 'hidden' }}>
                  <div className="bar-fill" style={{ height: '100%', width: `${share * 100}%`, background: lead ? 'var(--indigo)' : 'var(--rule-strong)', borderRadius: 7 }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ width: 400, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
        {state.poll.open ? <QrPanel joinUrl={joinUrl} line="Vote on your phone" size={260} /> : <p className="heading faint" style={{ fontSize: 44 }}>Voting closed</p>}
      </div>
    </div>
  );
}
