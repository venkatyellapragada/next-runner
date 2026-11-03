// Every /screen slide, the header and the day strip. Pure: props in, markup out, so the same
// code renders live on /screen and statically on /print.
import {
  agenda,
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
  type Slot,
} from '@/lib/event';
import { activeSlot, type LiveState } from '@/lib/state';
export { activeSlot };
import { Logo } from '../Logo';
import { Avatar, QR, shortUrl } from '../bits';
import './screen.css';

export type ScreenProps = {
  slide: Slide;
  state: LiveState;
  now: number;
  votes?: number[];
  photos: Record<string, string>;
  joinUrl: string;
  offline?: boolean;
};

const range = (s: Slot) => `${s.start}–${s.end}`;

export function Screen(p: ScreenProps) {
  const notice = p.state.notice.trim();
  return (
    <div className="stage">
      <Header {...p} />
      <DayStrip now={p.now} />
      <div className={`body-area${notice ? ' with-notice' : ''}`}>
        <div key={p.slide.id} className="slide-enter" style={{ height: '100%' }}>
          <SlideBody {...p} />
        </div>
      </div>
      {notice && <div className="notice">{notice}</div>}
      {p.offline && <div className="offline-dot" title="Not reaching the server; showing the last known state" />}
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

// ── Header ────────────────────────────────────────────────────────────────
function Header({ state, now, joinUrl }: ScreenProps) {
  const cur = activeSlot(state, now);
  const next = slotNext(cur?.id);
  return (
    <header className="hdr">
      <div className="hdr-brand">
        <span className="hdr-name">{event.name}</span>
        <span className="hdr-rule" />
        <Logo height={30} />
      </div>
      <div className="hdr-track">
        <div className="hdr-slot">
          <p className="eyebrow">Now{cur ? ` · ${range(cur)}` : ''}</p>
          <div className="title">{cur ? cur.label : event.theme}</div>
          <div className="hdr-bar">
            <div className="bar-fill" style={{ width: `${cur ? slotProgress(cur, now) * 100 : 0}%` }} />
          </div>
        </div>
        <div className="hdr-slot">
          <p className="eyebrow" style={{ color: 'var(--ink-2)' }}>
            Next{next ? ` · ${next.start}` : ''}
          </p>
          <div className="title muted">{next ? next.label : 'Thank you'}</div>
        </div>
      </div>
      <div className="hdr-right">
        <div className="hdr-scan">
          Scan to ask
          <br />a question
        </div>
        <QR value={joinUrl} size={92} />
        <div className="hdr-clock">{fmtClock(now)}</div>
      </div>
    </header>
  );
}

function DayStrip({ now }: { now: number }) {
  const first = slotWindow(agenda[0], now).start;
  const last = slotWindow(agenda[agenda.length - 1], now).end;
  const pct = (t: number) => ((t - first) / (last - first)) * 100;
  return (
    <div className="strip" aria-hidden>
      {agenda.map((s) => {
        const w = slotWindow(s, now);
        return (
          <div key={s.id} style={{ left: `calc(${pct(w.start)}% + 2px)`, width: `calc(${pct(w.end) - pct(w.start)}% - 4px)` }}>
            <div className="bar-fill" style={{ width: `${slotProgress(s, now) * 100}%` }} />
          </div>
        );
      })}
    </div>
  );
}

// ── Countdown block, shared by transition, holding and break ─────────────
function Countdown({ target, label, now, size = 200 }: { target: number; label: string; now: number; size?: number }) {
  const ms = target - now;
  if (ms <= 0) {
    return (
      <div>
        <p className="eyebrow" style={{ marginBottom: 24 }}>{label}</p>
        <div className="count" style={{ fontSize: size }}>Now</div>
      </div>
    );
  }
  if (ms > 60 * 60000) {
    return (
      <div>
        <p className="eyebrow" style={{ marginBottom: 24 }}>Starts at</p>
        <div className="count" style={{ fontSize: size }}>{fmtClock(target)}</div>
      </div>
    );
  }
  return (
    <div>
      <p className="eyebrow" style={{ marginBottom: 24 }}>{label}</p>
      {ms >= 10 * 60000 ? (
        <div className="count" style={{ fontSize: size }}>
          {Math.ceil(ms / 60000)}
          <span style={{ fontSize: size * 0.32, letterSpacing: 0, marginLeft: size * 0.06 }}>min</span>
        </div>
      ) : (
        <div className="count" style={{ fontSize: size }}>{fmtCountdown(ms)}</div>
      )}
    </div>
  );
}

function SpeakerLine({ ids, photos }: { ids: string[]; photos: Record<string, string> }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {ids.map((id) => {
        const s = person(id);
        return (
          <div key={id} style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
            <Avatar id={id} photos={photos} width={128} />
            <div>
              <p className="h2">{s.name}</p>
              <p className="meta muted" style={{ marginTop: 8 }}>{[s.title, s.org].filter(Boolean).join(', ')}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Holding: registrations, the opening screen ───────────────────────────
function Holding({ slot, now, joinUrl }: ScreenProps & { slot: Slot }) {
  // "New Education eXperience and Transformation": one line per letter of NEXT, the letter in indigo.
  const lines = event.expansion.replace(' and ', '\u00a0and ').split(' ');
  const begins = slotNext(slot.id);
  return (
    <div className="cols">
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <p className="eyebrow" style={{ marginBottom: 40 }}>
            {event.dateLabel} · {event.venue}
          </p>
          <h1 className="hero">
            {lines.map((w, i) => {
              const k = w.search(/[A-Z]/);
              return (
                <span key={i} style={{ display: 'block' }}>
                  {w.slice(0, k)}
                  <span style={{ color: 'var(--brand)' }}>{w[k]}</span>
                  {w.slice(k + 1)}
                </span>
              );
            })}
          </h1>
          <p className="h2 muted" style={{ marginTop: 40 }}>{event.theme}</p>
        </div>
        <p className="body muted">{slot.subtitle}</p>
      </div>
      <div className="vrule" />
      <div style={{ width: 440, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <QR value={joinUrl} size={320} />
          <p className="body" style={{ marginTop: 24 }}>Agenda, speakers and questions on your phone.</p>
          <p className="meta muted" style={{ marginTop: 12 }}>{shortUrl(joinUrl)}</p>
        </div>
        {begins && <Countdown target={slotWindow(begins, now).start} label="Programme begins in" now={now} size={160} />}
      </div>
    </div>
  );
}

// ── Transition: what is next, who, countdown ─────────────────────────────
function Transition({ slot, now, photos }: ScreenProps & { slot: Slot }) {
  const ids = slot.kind === 'panel' ? [] : slot.speakers ?? [];
  return (
    <div className="cols">
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minWidth: 0 }}>
        <div>
          <p className="eyebrow" style={{ marginBottom: 32 }}>Up next · {range(slot)}</p>
          {slot.label !== slot.title && <p className="h2 muted" style={{ marginBottom: 16 }}>{slot.label}</p>}
          <h1 className="hero">{slot.title}</h1>
          {slot.subtitle && <p className="h2 muted" style={{ marginTop: 24 }}>{slot.subtitle}</p>}
        </div>
        {slot.kind === 'panel' && slot.moderator ? (
          <div>
            <p className="eyebrow" style={{ marginBottom: 24 }}>Moderator</p>
            <SpeakerLine ids={[slot.moderator]} photos={photos} />
            <p className="body muted" style={{ marginTop: 32 }}>
              With {slot.speakers?.length ?? 0} leaders from universities across Telangana and Andhra Pradesh
            </p>
          </div>
        ) : ids.length ? (
          <SpeakerLine ids={ids} photos={photos} />
        ) : slot.byline ? (
          <p className="h2">{slot.byline}</p>
        ) : null}
      </div>
      <div className="vrule" />
      <div style={{ width: 520, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
        <Countdown target={slotWindow(slot, now).start} label="Starts in" now={now} />
      </div>
    </div>
  );
}

// ── Speaker: name, title, photo, what the session covers ─────────────────
function Speaker(p: ScreenProps & { slot: Slot }) {
  const { slot, photos } = p;
  const lead = (slot.speakers ?? [])[0];
  if (!lead) return <Transition {...p} />;
  const s = person(lead);
  const topics = slot.topics ?? [];
  return (
    <div className="cols" style={{ gap: 88 }}>
      <Avatar id={lead} photos={photos} width={496} height={620} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minWidth: 0, height: 620 }}>
        <div>
          <p className="eyebrow" style={{ marginBottom: 32 }}>{slot.label} · {range(slot)}</p>
          <h1 className="hero">{s.name}</h1>
          <p className="h2 muted" style={{ marginTop: 20 }}>{s.title}</p>
          <p className="h2 muted">{s.org}</p>
        </div>
        <div>
          <div style={{ height: 1, background: 'var(--line)', margin: '48px 0 40px' }} />
          {slot.title !== slot.label && <p className="h1" style={{ fontSize: 60 }}>{slot.title}</p>}
          {slot.subtitle && <p className="body muted" style={{ marginTop: 12 }}>{slot.subtitle}</p>}
          {topics.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 48px', marginTop: 32 }}>
              {topics.map((t) => (
                <p key={t} className="body bullet">{t}</p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Panel: moderator plus eight panelists ────────────────────────────────
function Panel({ slot, photos }: ScreenProps & { slot: Slot }) {
  const mod = slot.moderator ? person(slot.moderator) : null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 64 }}>
        <div style={{ minWidth: 0 }}>
          <p className="eyebrow" style={{ marginBottom: 24 }}>{slot.label} · {range(slot)}</p>
          <h1 className="h1" style={{ fontSize: 64 }}>{slot.title}</h1>
          {slot.subtitle && <p className="h2 muted" style={{ marginTop: 8, fontSize: 44 }}>{slot.subtitle}</p>}
        </div>
        {mod && (
          <div style={{ display: 'flex', gap: 24, alignItems: 'flex-end', flex: 'none' }}>
            <div style={{ textAlign: 'right' }}>
              <p className="eyebrow" style={{ marginBottom: 14 }}>Moderator</p>
              <p className="meta" style={{ fontSize: 32 }}>{mod.name}</p>
              <p className="meta muted">{mod.title}, {mod.org}</p>
            </div>
            <Avatar id={slot.moderator!} photos={photos} width={120} />
          </div>
        )}
      </div>
      <div style={{ height: 1, background: 'var(--line)', margin: '36px 0 32px' }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '22px 96px' }}>
        {(slot.speakers ?? []).map((id) => {
          const s = person(id);
          return (
            <div key={id} style={{ display: 'flex', gap: 28, alignItems: 'center', minWidth: 0 }}>
              <Avatar id={id} photos={photos} width={108} />
              <div style={{ minWidth: 0 }}>
                <p className="meta clamp1" style={{ fontSize: 34, color: 'var(--ink)' }}>{s.name}</p>
                <p className="meta muted clamp1" style={{ marginTop: 4 }}>{s.org}</p>
                <p className="meta muted clamp1">{s.title}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Break / lunch / high tea ─────────────────────────────────────────────
function Break({ slot, state, now, joinUrl }: ScreenProps & { slot: Slot }) {
  const next = slotNext(slot.id);
  const timed = state.timer.endsAt && state.timer.endsAt > now - 60000;
  const target = timed ? state.timer.endsAt! : next ? slotWindow(next, now).start : slotWindow(slot, now).end;
  const nextWho = next?.speakers?.map((id) => person(id).name).join(', ') ?? next?.byline;
  return (
    <div className="cols">
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minWidth: 0 }}>
        <div>
          <p className="eyebrow" style={{ marginBottom: 32 }}>{range(slot)}</p>
          <h1 className="hero" style={{ fontSize: 144 }}>{slot.title}</h1>
          {slot.subtitle && <p className="h2 muted" style={{ marginTop: 32 }}>{slot.subtitle}</p>}
        </div>
        {next && (
          <div>
            <p className="eyebrow" style={{ marginBottom: 20 }}>After the break · {next.start}</p>
            <p className="h2">{next.label}{next.title !== next.label ? `: ${next.title}` : ''}</p>
            {nextWho && <p className="meta muted" style={{ marginTop: 8 }}>{nextWho}</p>}
          </div>
        )}
      </div>
      <div className="vrule" />
      <div style={{ width: 520, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 28, alignItems: 'center' }}>
          <QR value={joinUrl} size={200} />
          <p className="meta muted">Agenda, speakers and the pulse poll on your phone</p>
        </div>
        <Countdown target={target} label={(timed && state.timer.label) || 'We resume in'} now={now} />
      </div>
    </div>
  );
}

// ── Questions: Open Forum queue, or put up from /control at any time ────
function Questions({ state, joinUrl, slot }: ScreenProps & { slot?: Slot }) {
  const [current, ...queue] = state.questions;
  const who = (q: { name?: string; role?: string; org?: string }) =>
    [q.name, q.role, q.org].filter(Boolean).join(', ') || 'From the audience';
  return (
    <div className="cols">
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <p className="eyebrow" style={{ marginBottom: 40 }}>
          {slot ? `${slot.label}: ${slot.title}` : 'Questions from the room'}
        </p>
        {current ? (
          <>
            <p className="h1" style={{ fontSize: 64, lineHeight: 1.15 }}>{current.text}</p>
            <p className="meta muted" style={{ marginTop: 32, fontSize: 32 }}>{who(current)}</p>
            {queue.length > 0 && (
              <div style={{ marginTop: 'auto' }}>
                <div style={{ height: 1, background: 'var(--line)', marginBottom: 32 }} />
                <p className="eyebrow" style={{ marginBottom: 24, color: 'var(--ink-2)' }}>Next in the queue</p>
                {queue.map((q) => (
                  <p key={q.id} className="body clamp1" style={{ marginBottom: 12 }}>{q.text}</p>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <h1 className="hero">Ask from your phone.</h1>
            <p className="h2 muted" style={{ marginTop: 32 }}>
              Scan the code, write your question, add your role if you like. Selected questions appear here.
            </p>
          </>
        )}
      </div>
      <div className="vrule" />
      <div style={{ width: 400, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
        <QR value={joinUrl} size={320} />
        <p className="body" style={{ marginTop: 24 }}>Scan to ask a question</p>
        <p className="meta muted" style={{ marginTop: 8 }}>{shortUrl(joinUrl)}</p>
      </div>
    </div>
  );
}

// ── Poll results ─────────────────────────────────────────────────────────
function Poll({ state, votes, joinUrl }: ScreenProps) {
  const counts = votes ?? poll.options.map(() => 0);
  const total = counts.reduce((a, b) => a + b, 0);
  const max = Math.max(...counts);
  return (
    <div className="cols">
      <div style={{ flex: 1, minWidth: 0 }}>
        <p className="eyebrow" style={{ marginBottom: 32 }}>
          Pulse poll · {total} {total === 1 ? 'response' : 'responses'}
        </p>
        <h1 className="h1" style={{ fontSize: 60, marginBottom: 56 }}>{poll.question}</h1>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 30 }}>
          {poll.options.map((o, i) => {
            const share = total ? counts[i] / total : 0;
            const lead = total > 0 && counts[i] === max;
            return (
              <div key={o}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                  <p className="body" style={{ fontWeight: lead ? 600 : 400 }}>{o}</p>
                  <p className="meta tabular" style={{ fontSize: 40, color: lead ? 'var(--brand)' : 'var(--ink-2)' }}>
                    {Math.round(share * 100)}%
                  </p>
                </div>
                <div style={{ height: 14, background: 'var(--tint)', borderRadius: 2 }}>
                  <div
                    className="bar-fill"
                    style={{ height: '100%', width: `${share * 100}%`, background: lead ? 'var(--brand)' : 'var(--ink-3)', borderRadius: 2 }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="vrule" />
      <div style={{ width: 360, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
        {state.poll.open ? (
          <>
            <QR value={joinUrl} size={280} />
            <p className="body" style={{ marginTop: 24 }}>Vote on your phone</p>
            <p className="meta muted" style={{ marginTop: 8 }}>{shortUrl(joinUrl)}</p>
          </>
        ) : (
          <p className="h2 muted">Voting closed</p>
        )}
      </div>
    </div>
  );
}
