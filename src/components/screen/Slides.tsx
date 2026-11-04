// Every /screen slide and its frame. Pure: props in, markup out, so the same code renders live on /screen
// (any screen shape), as the /control preview and statically on /print. Visual language: DESIGN.md.
import {
  agenda,
  data,
  isPollLoop,
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
  type Slot,
} from '@/lib/event';
import { activeSlot, timerActive, type LiveState, type PollResult } from '@/lib/state';
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
  /** Every poll question, with votes while voting is open or results are up; content/event.json when not given. */
  polls?: PollResult[];
  photos: Record<string, string>;
  joinUrl: string;
  offline?: boolean;
  /** Static rendering for the PDF: no running clock, countdowns become times. */
  print?: boolean;
  /** Stage size; 1920×1080 unless the screen has another shape. */
  size?: { w: number; h: number };
  /** Print only: the registrations agenda page instead of the cover (live, the two alternate every 20 s). */
  variant?: 'agenda';
};

const GROUND: Partial<Record<SlideKind, string>> = { holding: 'brand on-brand' };
const range = (s: Slot) => `${s.start}–${s.end}`;
/** QR codes say what they are for: the poll slide opens the poll, question slides open the form. */
const withFocus = (joinUrl: string, focus: 'poll' | 'ask') => `${joinUrl}${joinUrl.includes('?') ? '&' : '?'}focus=${focus}`;
// Slides with their own QR card: the footer drops its QR so there is only ever one, captioned for the slide.
const OWN_QR: SlideKind[] = ['poll', 'questions', 'ask'];

/** During registrations the cover and the agenda take turns, 20 s each. */
export const AGENDA_TURN_MS = 20000;
function showsAgenda(p: ScreenProps) {
  if (p.slide.kind !== 'holding') return false;
  return p.variant === 'agenda' || (!p.print && Math.floor(p.now / AGENDA_TURN_MS) % 2 === 1);
}

export function Screen(p: ScreenProps) {
  const { w, h } = p.size ?? { w: 1920, h: 1080 };
  const notice = p.state.notice.trim();
  const agendaUp = showsAgenda(p);
  const wall = p.slide.kind === 'poll' || isPollLoop(p.slide.id);
  const ground = agendaUp ? 'paper' : GROUND[p.slide.kind] ?? 'paper';
  // A notice moves the whole slide aside (smaller, to the left) and fills an indigo panel on the right.
  return (
    <div className={`stage ${ground}${notice ? ' has-notice' : ''}`} style={{ width: w, height: h }}>
      <div className="frame">
        <Top {...p} agendaUp={agendaUp} />
        <div key={p.slide.id + (agendaUp ? ':agenda' : '')} className="content slide-enter" style={wall ? { bottom: 64 } : undefined}>
          {agendaUp ? <AgendaScan {...p} /> : <SlideBody {...p} />}
        </div>
        {!wall && <Foot {...p} agendaUp={agendaUp} />}
      </div>
      {notice && (
        <aside className="notice-panel" key={notice}>
          <p className="eyebrow">Notice</p>
          <p className="notice-text" style={{ fontSize: notice.length <= 40 ? 84 : notice.length <= 80 ? 68 : 54 }}>{notice}</p>
          <p className="eyebrow notice-foot">{event.name} · {fmtClock(p.now)}</p>
        </aside>
      )}
      {p.state.overlay && <InterludeCard kind={p.state.overlay} />}
      {p.offline && <div className="offline-dot" title="Not reaching the server; showing the last known state" />}
    </div>
  );
}

function InterludeCard({ kind }: { kind: Exclude<LiveState['overlay'], null> }) {
  const v = data.interludes;
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: '#0a0a0a' }}>
      {kind === 'video' && (
        <img src={v.video.poster} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }} />
      )}
      <p className="eyebrow" style={{ position: 'relative', fontSize: 40, color: '#fff', background: 'rgba(10,10,10,.8)', padding: '20px 32px', borderRadius: 10 }}>
        {kind === 'video' ? `Playing: ${v.video.title}` : kind === 'anthem' ? `Playing: ${v.anthem.title}` : `Showing: ${v.simulation.title}`}
      </p>
    </div>
  );
}

// ── Frame ────────────────────────────────────────────────────────────────
// Slides that already show the timer as their big number.
const TIMER_SLIDES: SlideKind[] = ['holding', 'transition', 'break'];

// Slides that introduce a session before it begins: a "Starts in" chip sits by the clock until the start.
const STARTS_SLIDES: SlideKind[] = ['speaker', 'panel'];

function Top({ now, print, state, slide, agendaUp }: ScreenProps & { agendaUp?: boolean }) {
  const chip = !print && timerActive(state, now) && (agendaUp || !TIMER_SLIDES.includes(slide.kind));
  const slot = slotById(slide.slotId);
  const startMs = slot && STARTS_SLIDES.includes(slide.kind) ? slotWindow(slot, now).start - now : 0;
  const starts = !print && !chip && startMs > 0;
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
        {starts && (
          <span className="timer-chip">
            <span className="eyebrow">{startMs > 60 * 60000 ? 'Starts at' : 'Starts in'}</span>
            <b>{startMs > 60 * 60000 ? slot!.start : startMs >= 10 * 60000 ? `${Math.ceil(startMs / 60000)} min` : fmtCountdown(startMs)}</b>
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

function Foot({ state, now, joinUrl, slide, agendaUp }: ScreenProps & { agendaUp?: boolean }) {
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
      {!OWN_QR.includes(slide.kind) && !isPollLoop(slide.id) && !agendaUp && (
        <div className="qr">
          <p className="eyebrow">Agenda &amp;<br />questions</p>
          <div className="qr-tile"><QR value={joinUrl} size={slide.kind === 'holding' ? 104 : 92} color="#0A0A0A" /></div>
        </div>
      )}
    </div>
  );
}

function SlideBody(p: ScreenProps) {
  const slot = slotById(p.slide.slotId);
  switch (p.slide.kind) {
    case 'holding':
      return <Holding {...p} slot={slot!} />;
    case 'anthem':
      return <Anthem {...p} slot={slot!} />;
    case 'transition':
      return <Transition {...p} slot={slot!} />;
    case 'ask':
      return <AskPrompt {...p} />;
    case 'speaker':
      return <Speaker {...p} slot={slot!} />;
    case 'panel':
      return <Panel {...p} slot={slot!} />;
    case 'break':
      return slot?.pollLoop ? <PollLoop {...p} slot={slot} /> : <Break {...p} slot={slot!} />;
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
  // No picture to carry the line: the name steps up a size, under an indigo marker.
  if (s.photo === false)
    return (
      <div style={{ borderLeft: '6px solid var(--indigo)', paddingLeft: 32 }}>
        <p className="eyebrow" style={{ marginBottom: 16 }}>Speaker</p>
        <p className="heading" style={{ fontSize: 64 }}>{s.name}</p>
        <p className="heading muted" style={{ marginTop: 10, fontSize: 36, fontWeight: 500 }}>{[s.title, s.org].filter(Boolean).join(', ')}</p>
      </div>
    );
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

// ── Registrations, turn two: today's agenda and the code to keep it on a phone ─
function AgendaScan({ joinUrl, now, print }: ScreenProps) {
  const items = agenda.filter((s) => s.kind !== 'holding');
  const half = Math.ceil(items.length / 2);
  const live = print ? undefined : agenda.find((s) => now >= slotWindow(s, now).start && now < slotWindow(s, now).end);
  return (
    <div className="cols" style={{ gap: 112 }}>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <p className="eyebrow accent" style={{ marginBottom: 20 }}>Today · 05.11.2026 · {event.venue}</p>
        <h1 className="heading resolve" style={{ fontSize: 76, fontWeight: 800, letterSpacing: '-0.03em' }}>The day at a glance</h1>
        <div style={{ marginTop: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 64 }}>
          {[items.slice(0, half), items.slice(half)].map((col, ci) => (
            <div key={ci}>
              {col.map((s) => (
                <div key={s.id} className="agenda-row" style={live?.id === s.id ? { color: 'var(--indigo)' } : undefined}>
                  <span className="t">{s.start}</span>
                  <span className="l clamp1">{s.label}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div style={{ flex: 'none', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
        <QrPanel joinUrl={`${joinUrl}#agenda`} line="Scan for today's agenda" size={380} />
      </div>
    </div>
  );
}

// ── Anthem: everyone rises before the guest of honour; A (or /control) plays it ─
function Anthem({ slot }: ScreenProps & { slot: Slot }) {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <p className="eyebrow accent" style={{ marginBottom: 40 }}>Before the {slot.label} · {slot.start}</p>
      <h1 className="display resolve" style={{ fontSize: 180 }}>Please rise for the National Anthem.</h1>
      <p className="heading muted" style={{ marginTop: 40, fontSize: 56, fontWeight: 600 }}>{data.interludes.anthem.title}</p>
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
            <p className="body muted" style={{ marginTop: 20, fontSize: 30 }}>With {COUNT[(slot.speakers ?? []).length] ?? (slot.speakers ?? []).length} university leaders from across India</p>
          </div>
        ) : slot.kind === 'forum' && ids.length ? (
          // The team answering: portraits in a row under the byline.
          <div>
            {slot.byline && <p className="eyebrow" style={{ marginBottom: 20 }}>{slot.byline}</p>}
            <div style={{ display: 'flex', gap: 40 }}>
              {ids.map((id) => {
                const s = person(id);
                return (
                  <div key={id} style={{ width: 300 }}>
                    <Avatar id={id} photos={photos} width={180} />
                    <p style={{ margin: '18px 0 0', fontSize: 32, fontWeight: 700, letterSpacing: '-0.015em', lineHeight: 1.1 }}>{s.name}</p>
                    <p className="muted" style={{ margin: '6px 0 0', fontSize: 22, lineHeight: 1.3 }}>{[s.title, s.org].filter(Boolean).join(', ')}</p>
                  </div>
                );
              })}
            </div>
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
  if (slot.headline && s.photo === false) return <Statement slot={slot} lead={lead} />;
  if ((slot.speakers ?? []).length > 1) return <SpeakerPair {...p} />;
  return (
    <div className="cols" style={{ gap: 96, alignItems: 'flex-start' }}>
      <Avatar id={lead} photos={photos} width={480} height={600} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p className="eyebrow accent" style={{ marginBottom: 32 }}>§ {slot.label} · {range(slot)}</p>
        <h1 className="title resolve" style={{ fontSize: 104 }}>{s.name}</h1>
        <p className="heading muted" style={{ marginTop: 16, fontSize: 40, fontWeight: 500 }}>{[s.title, s.org].filter(Boolean).join(', ')}</p>
        {(session || topics.length > 0) && (
          <div style={{ marginTop: 48, paddingTop: 40, borderTop: '1px solid var(--rule)' }}>
            {session && <p className="heading" style={{ fontSize: slot.title.length > 34 ? 48 : 56 }}>{slot.title}</p>}
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

// A photo-less speaker with a headline: the statement fills the slide, the speaker signs it off at the foot.
function Statement({ slot, lead }: { slot: Slot; lead: string }) {
  const s = person(lead);
  const lines = slot.headline!.split('\n');
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <p className="eyebrow accent" style={{ marginBottom: 40 }}>§ {slot.label} · {range(slot)}</p>
      <h1 className="display resolve" style={{ fontSize: 200, lineHeight: 1.04 }}>
        {lines.map((line, i) => {
          const [before, after] = line.split('{next}');
          const color = i === lines.length - 1 && lines.length > 1 ? 'var(--indigo)' : undefined;
          if (after === undefined) return <span key={i} style={{ display: 'block', color }}>{line}</span>;
          // The logo's lowercase sits on the baseline; 240 puts its "t" at about the cap height of the type.
          return (
            <span key={i} style={{ display: 'flex', alignItems: 'baseline', gap: '0.22em', color, marginTop: 24 }}>
              {before.trim() && <span>{before.trim()}</span>}
              <NextMark size={240} />
              {after.trim() && <span>{after.trim()}</span>}
            </span>
          );
        })}
      </h1>
      <div style={{ marginTop: 'auto', paddingTop: 36, borderTop: '1px solid var(--rule)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 96 }}>
        <div>
          <p className="heading" style={{ fontSize: 60 }}>{s.name}</p>
          <p className="heading muted" style={{ marginTop: 10, fontSize: 36, fontWeight: 500 }}>{[s.title, s.org].filter(Boolean).join(', ')}</p>
        </div>
        <p className="eyebrow" style={{ textAlign: 'right' }}>{event.expansion}</p>
      </div>
    </div>
  );
}

const COUNT: Record<number, string> = { 6: 'six', 7: 'seven', 8: 'eight', 9: 'nine', 10: 'ten' };

// Two speakers share the session: both portraits side by side on the left, the session on the right.
function SpeakerPair({ slot, photos }: ScreenProps & { slot: Slot }) {
  const ids = (slot.speakers ?? []).slice(0, 2);
  const topics = slot.topics ?? [];
  return (
    <div className="cols" style={{ gap: 96, alignItems: 'flex-start' }}>
      <div style={{ display: 'flex', gap: 32, flex: 'none' }}>
        {ids.map((id) => {
          const s = person(id);
          return (
            <div key={id} style={{ width: 320 }}>
              <Avatar id={id} photos={photos} width={320} height={400} />
              <p style={{ margin: '24px 0 0', fontSize: 40, fontWeight: 700, letterSpacing: '-0.015em', lineHeight: 1.1 }}>{s.name}</p>
              <p className="muted" style={{ margin: '8px 0 0', fontSize: 26, lineHeight: 1.3 }}>{[s.title, s.org].filter(Boolean).join(', ')}</p>
            </div>
          );
        })}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p className="eyebrow accent" style={{ marginBottom: 32 }}>§ {slot.label} · {range(slot)}</p>
        <h1 className="title resolve" style={{ fontSize: 104 }}>{slot.title}</h1>
        {slot.subtitle && <p className="heading muted" style={{ marginTop: 16, fontSize: 44, fontWeight: 500 }}>{slot.subtitle}</p>}
        {topics.length > 0 && (
          <div style={{ marginTop: 48, paddingTop: 36, borderTop: '1px solid var(--rule)', display: 'flex', flexDirection: 'column', gap: 18 }}>
            {topics.map((t, i) => (
              <p key={t} className="body step" style={{ fontSize: 32 }}>
                <span className="n">{String(i + 1).padStart(2, '0')}</span>
                <span>{t}</span>
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Panel: moderator plus nine panelists, three by three ─────────────────
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
          <div style={{ display: 'flex', gap: 20, alignItems: 'center', flex: 'none' }}>
            <Avatar id={slot.moderator!} photos={photos} width={88} />
            <div>
              <p className="eyebrow accent" style={{ fontSize: 18, marginBottom: 6 }}>Moderator</p>
              <p style={{ margin: 0, fontSize: 32, fontWeight: 700, letterSpacing: '-0.015em' }}>{mod.name}</p>
              <p className="muted" style={{ margin: 0, fontSize: 24 }}>{mod.title}, {mod.org}</p>
            </div>
          </div>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16 }}>
        {(slot.speakers ?? []).map((id) => {
          const s = person(id);
          return (
            <div key={id} className="card" style={{ display: 'flex', gap: 20, alignItems: 'center', minWidth: 0, padding: 12 }}>
              <Avatar id={id} photos={photos} width={124} />
              <div style={{ minWidth: 0 }}>
                <p className="clamp2" style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: '-0.015em', lineHeight: 1.1 }}>{s.name}</p>
                <p className="clamp2 muted" style={{ margin: '6px 0 0', fontSize: 21, lineHeight: 1.25 }}>{s.title}, {s.org}</p>
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
    // The code's edges are the panel's edges: flush with the content margin, caption aligned under it.
    <div style={{ width: size, display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'flex-start' }}>
      <QR value={joinUrl} size={size} color="#0A0A0A" quiet={0} />
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
        <QrPanel joinUrl={withFocus(joinUrl, 'ask')} line="Scan to ask a question" />
      </div>
    </div>
  );
}

// ── Ask: after each morning session, gather questions for the Open Forum ─
function AskPrompt({ joinUrl }: ScreenProps) {
  const forum = agenda.find((s) => s.kind === 'forum');
  // Both columns hang from the top margin and share a height: heading at the top, the call to scan level
  // with the foot of the QR panel.
  return (
    <div style={{ display: 'flex', gap: 112, alignItems: 'stretch' }}>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <p className="eyebrow accent" style={{ marginBottom: 32 }}>§ {forum ? `${forum.label} · ${forum.start}` : 'Questions from the room'}</p>
          <h1 className="title resolve" style={{ fontSize: 120 }}>Questions for the Open Forum?</h1>
        </div>
        <p className="heading muted" style={{ fontSize: 44, fontWeight: 500, maxWidth: 1000 }}>
          Scan the code and send yours now{forum ? `. We take them in the Open Forum at ${forum.start}.` : '.'}
        </p>
      </div>
      <div style={{ flex: 'none' }}>
        <QrPanel joinUrl={withFocus(joinUrl, 'ask')} line="Scan to ask a question" size={540} />
      </div>
    </div>
  );
}

// One question's options as bars with percentages; the leading answer in indigo.
function PollBars({ q, size = 24 }: { q: PollResult; size?: number }) {
  const counts = q.votes && q.votes.length === q.options.length ? q.votes : q.options.map(() => 0);
  const total = counts.reduce((a, b) => a + b, 0);
  const max = Math.max(...counts);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: size * 0.2 }}>
      {q.options.map((o, i) => {
        const share = total ? counts[i] / total : 0;
        const lead = total > 0 && counts[i] === max;
        return (
          <div key={o} style={{ display: 'grid', gridTemplateColumns: `1fr 32% ${Math.round(size * 3)}px`, alignItems: 'center', gap: 16 }}>
            <p className="clamp1" style={{ margin: 0, fontSize: size, fontWeight: lead ? 700 : 400, color: lead ? 'var(--ink)' : 'var(--ink-2)' }}>{o}</p>
            <div style={{ height: size / 2, background: 'var(--bg-2)', borderRadius: size / 4, overflow: 'hidden' }}>
              <div className="bar-fill" style={{ height: '100%', width: `${share * 100}%`, background: lead ? 'var(--indigo)' : 'var(--rule-strong)' }} />
            </div>
            <p className="tabular" style={{ margin: 0, fontSize: size * 1.15, fontWeight: 700, textAlign: 'right', color: lead ? 'var(--indigo)' : 'var(--ink-2)' }}>{Math.round(share * 100)}%</p>
          </div>
        );
      })}
    </div>
  );
}

// ── The results wall: every question as a card, two columns, scrolling slowly on a loop ──
// Used for the lunch break (voting open, "we resume in") and for the results slide put up from /control.
// Phones answer; the screen only shows how the room answered.
const SECONDS_PER_ROW = 8;

function PollWall({ all, state, joinUrl, print, eyebrow, aside }: { all: PollResult[]; state: LiveState; joinUrl: string; print?: boolean; eyebrow: string; aside?: React.ReactNode }) {
  const responses = Math.max(0, ...all.map((q) => (q.votes ?? []).reduce((a, b) => a + b, 0)));
  const rows = Math.ceil(all.length / 2);
  // Four cards fit without moving; more scroll, the list joined end to end so the loop has no seam.
  const scroll = !print && all.length > 4;
  const cards = (offset: number) =>
    all.map((q, qi) => {
      const total = (q.votes ?? []).reduce((a, b) => a + b, 0);
      return (
        <div key={q.id + offset} className="card poll-card">
          <div style={{ display: 'flex', gap: 16, alignItems: 'baseline' }}>
            <span className="eyebrow accent" style={{ fontSize: 20, flex: 'none' }}>Q{qi + 1}</span>
            <p className="clamp2" style={{ margin: 0, fontSize: 28, fontWeight: 700, lineHeight: 1.18, letterSpacing: '-0.01em', flex: 1 }}>{q.question}</p>
            <span className="eyebrow" style={{ fontSize: 16, flex: 'none' }}>{total} {total === 1 ? 'answer' : 'answers'}</span>
          </div>
          <div style={{ marginTop: 'auto' }}>
            <PollBars q={q} />
          </div>
        </div>
      );
    });
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 48 }}>
        <div style={{ minWidth: 0 }}>
          <p className="eyebrow accent" style={{ marginBottom: 14 }}>{eyebrow}</p>
          <h1 className="heading resolve" style={{ fontSize: 60, fontWeight: 800, letterSpacing: '-0.03em' }}>What the room thinks</h1>
          <p className="heading muted" style={{ marginTop: 8, fontSize: 32, fontWeight: 500 }}>
            <b className="accent" style={{ fontVariantNumeric: 'tabular-nums' }}>{responses}</b> {responses === 1 ? 'person has' : 'people have'} answered · {all.length} questions
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 32, flex: 'none' }}>
          {aside}
          {print || state.poll.open ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, background: 'var(--bg-2)', borderRadius: 14, padding: '10px 14px' }}>
              <p style={{ margin: 0, fontSize: 28, fontWeight: 700, textAlign: 'right', lineHeight: 1.2 }}>Vote on<br />your phone</p>
              <div className="qr-tile"><QR value={withFocus(joinUrl, 'poll')} size={124} color="#0A0A0A" /></div>
            </div>
          ) : (
            <p className="eyebrow" style={{ fontSize: 24 }}>Voting closed</p>
          )}
        </div>
      </div>
      <div className={`poll-wall${scroll ? ' scrolling' : ''}`}>
        <div className="poll-track" style={scroll ? { animationDuration: `${rows * SECONDS_PER_ROW}s` } : undefined}>
          <div className="poll-grid">{cards(0)}</div>
          {scroll && <div className="poll-grid" aria-hidden>{cards(1)}</div>}
        </div>
      </div>
    </div>
  );
}

// ── Lunch: the results wall with voting open and the time we resume ──
function PollLoop({ slot, state, now, polls, joinUrl, print }: ScreenProps & { slot: Slot }) {
  const all: PollResult[] = polls?.length ? polls : seedPolls;
  const next = slotNext(slot.id);
  const target = timerActive(state, now) ? state.timer.endsAt! : next ? slotWindow(next, now).start : slotWindow(slot, now).end;
  const ms = target - now;
  const far = print || ms > 60 * 60000;
  return (
    <PollWall
      all={all}
      state={state}
      joinUrl={joinUrl}
      print={print}
      eyebrow={`${slot.label} · ${range(slot)} · Pulse poll`}
      aside={
        <div style={{ textAlign: 'right' }}>
          <p className="eyebrow" style={{ marginBottom: 6 }}>{far ? 'We resume at' : 'We resume in'}</p>
          <p className="display" style={{ fontSize: 72, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.03em' }}>
            {far ? fmtClock(target) : ms <= 0 ? 'Now' : ms >= 10 * 60000 ? `${Math.ceil(ms / 60000)} min` : fmtCountdown(ms)}
          </p>
        </div>
      }
    />
  );
}

// ── Poll results: put up from /control at any moment ───────────
function Poll({ state, polls, joinUrl, print }: ScreenProps) {
  const all: PollResult[] = polls?.length ? polls : seedPolls;
  return <PollWall all={all} state={state} joinUrl={joinUrl} print={print} eyebrow="§ Pulse poll · Results" />;
}
