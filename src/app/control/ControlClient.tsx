'use client';
import { useCallback, useEffect, useState } from 'react';
import { Fit } from '@/components/Fit';
import { joinUrlFor } from '@/components/bits';
import { Screen } from '@/components/screen/Slides';
import { agenda, people, poll, slideById, slideIndex, slides } from '@/lib/event';
import { control, getPin, setPin, useLive, useNow } from '@/lib/live';
import type { Action } from '@/lib/state';
import './control.css';

type Q = { id: string; text: string; name: string; role: string; org: string; ts: number; status: string };
type Health = { store: 'redis' | 'memory'; writable: boolean; defaultPin: boolean };

export default function ControlClient({ photos }: { photos: Record<string, string> }) {
  const [pin, setPinState] = useState('');
  const [health, setHealth] = useState<Health | null>(null);
  const [checked, setChecked] = useState(false);

  const verify = useCallback(async (p: string) => {
    const res = await fetch('/api/control', { headers: { 'x-pin': p }, cache: 'no-store' }).catch(() => null);
    if (res?.ok) {
      setHealth(await res.json());
      setPin(p);
      setPinState(p);
      return true;
    }
    return false;
  }, []);

  useEffect(() => {
    const saved = getPin();
    (saved ? verify(saved) : Promise.resolve(false)).finally(() => setChecked(true));
  }, [verify]);

  if (!checked) return null;
  if (!pin || !health) return <PinGate onPin={verify} />;
  return <Console pin={pin} health={health} photos={photos} onLock={() => (setPin(''), setPinState(''))} />;
}

function PinGate({ onPin }: { onPin: (p: string) => Promise<boolean> }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  return (
    <main className="ctl ctl-gate">
      <p className="ctl-eyebrow">NEXT 1.0 · Control</p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setError((await onPin(value.trim())) ? '' : 'That PIN did not work, or the server is unreachable.');
        }}
      >
        <label htmlFor="pin">Control PIN</label>
        <input id="pin" inputMode="numeric" autoComplete="off" autoFocus value={value} onChange={(e) => setValue(e.target.value)} />
        <button className="btn primary" type="submit">Open control</button>
        {error && <p className="ctl-error">{error}</p>}
      </form>
    </main>
  );
}

function Console({ pin, health, photos, onLock }: { pin: string; health: Health; photos: Record<string, string>; onLock: () => void }) {
  const { data, setData, online, offset } = useLive('/api/state', 1500);
  const now = useNow(offset);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [origin, setOrigin] = useState('');
  useEffect(() => setOrigin(location.origin), []);

  const send = useCallback(
    async (a: Action | { type: 'wipe-votes' } | { type: 'wipe-audience' }) => {
      setBusy(true);
      setErr('');
      try {
        const res = await control(a, pin);
        if (res) setData(res);
      } catch (e) {
        if ((e as Error).message === 'pin') onLock();
        else setErr('Not saved: the server did not answer. Try again, or use the keyboard on the screen laptop.');
      } finally {
        setBusy(false);
      }
    },
    [pin, setData, onLock],
  );

  if (!data) return <main className="ctl"><p className="ctl-muted">Connecting…</p></main>;
  const { state, votes } = data;
  const slide = slideById(state.slideId)!;
  const i = slideIndex(state.slideId);
  const upNext = i >= 0 ? slides[i + 1] : slideById(state.returnTo);
  const slotOf = (id: string | null | undefined) => agenda.find((s) => s.id === slideById(id)?.slotId);

  return (
    <main className="ctl">
      <header className="ctl-top">
        <div className="ctl-status">
          <span className="ctl-brand">NEXT 1.0 · Control</span>
          <span className={`dot ${online ? 'ok' : 'bad'}`} />
          {online ? 'Live' : 'Offline: retrying'} · {health.store === 'redis' ? 'shared store' : 'in-memory store (single machine only)'}
          {!health.writable && <strong className="warn"> · store not accepting writes</strong>}
          {health.defaultPin && <strong className="warn"> · default PIN 0000</strong>}
        </div>
        <button className="link" onClick={onLock}>Lock</button>
      </header>

      <section className="ctl-now">
        {origin && (
          <Fit style={{ width: '100%', aspectRatio: '16 / 9', border: '1px solid var(--line)', borderRadius: 4 }}>
            {() => <Screen slide={slide} state={state} now={now} votes={votes} photos={photos} joinUrl={joinUrlFor(origin)} />}
          </Fit>
        )}
        <p className="ctl-onscreen">
          <span className="ctl-eyebrow">On screen</span>
          {state.overlay === 'video' ? 'The NEXT film' : state.overlay === 'sim' ? 'The simulation' : `${slotOf(state.slideId)?.label ?? slide.name} · ${slide.name}`}
        </p>
        <div className="ctl-nav">
          <button className="btn" disabled={busy} onClick={() => send({ type: 'prev' })}>Previous</button>
          <button className="btn primary big" disabled={busy} onClick={() => send({ type: 'next' })}>
            Next
            {upNext && <small>{slotOf(upNext.id)?.label ?? ''} · {upNext.name}</small>}
          </button>
        </div>
        <div className="ctl-row interludes">
          <button className={`btn ${state.overlay === 'video' ? 'on' : ''}`} onClick={() => send({ type: 'overlay', overlay: state.overlay === 'video' ? null : 'video' })}>
            {state.overlay === 'video' ? 'Stop film' : 'Play film'}
            <small>V on the laptop</small>
          </button>
          <button className={`btn ${state.overlay === 'sim' ? 'on' : ''}`} onClick={() => send({ type: 'overlay', overlay: state.overlay === 'sim' ? null : 'sim' })}>
            {state.overlay === 'sim' ? 'Close simulation' : 'Simulation'}
            <small>S on the laptop</small>
          </button>
          {state.overlay && (
            <button className="btn primary" onClick={() => send({ type: 'overlay', overlay: null })}>
              Back to slides
              <small>Q / Esc</small>
            </button>
          )}
        </div>
        <div className="ctl-row">
          <button className={`btn ${state.slideId === 'poll' ? 'on' : ''}`} onClick={() => send({ type: 'show', slideId: 'poll' })}>Poll results</button>
          <button className={`btn ${state.slideId === 'questions' ? 'on' : ''}`} onClick={() => send({ type: 'show', slideId: 'questions' })}>Questions</button>
          {state.returnTo && <button className="btn" onClick={() => send({ type: 'back' })}>Back to agenda</button>}
        </div>
        {err && <p className="ctl-error">{err}</p>}
      </section>

      <Section title="Running order">
        <ol className="ctl-order">
          {agenda.map((slot) => {
            const own = slides.filter((s) => s.slotId === slot.id);
            const active = own.some((s) => s.id === state.slideId);
            return (
              <li key={slot.id} className={active ? 'active' : ''}>
                <div className="when">{slot.start}</div>
                <div className="what">
                  <div className="label">{slot.label}</div>
                  <div className="chips">
                    {own.map((s) => (
                      <button key={s.id} className={`chip ${s.id === state.slideId ? 'on' : ''}`} onClick={() => send({ type: 'go', slideId: s.id })}>
                        {s.name}
                      </button>
                    ))}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </Section>

      <PollSection open={state.poll.open} votes={votes} send={send} />
      <QuestionsSection pin={pin} shown={state.questions} send={send} />
      <TimerSection endsAt={state.timer.endsAt} now={now} send={send} />
      <NoticeSection notice={state.notice} send={send} />

      <Section title="Feedback form">
        <p className="ctl-muted">Opening it puts the form at the top of the audience page. It is always reachable from there.</p>
        <button className={`btn ${state.feedbackOpen ? 'on' : ''}`} onClick={() => send({ type: 'feedback', open: !state.feedbackOpen })}>
          {state.feedbackOpen ? 'Feedback is open: close' : 'Open feedback now'}
        </button>
      </Section>

      <ContentCheck photos={photos} />
      <DataSection pin={pin} send={send} />
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="ctl-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

type Send = (a: Action | { type: 'wipe-votes' } | { type: 'wipe-audience' }) => Promise<void>;

function PollSection({ open, votes, send }: { open: boolean; votes?: number[]; send: Send }) {
  const total = votes?.reduce((a, b) => a + b, 0) ?? 0;
  return (
    <Section title="Pulse poll">
      <p className="ctl-q">{poll.question}</p>
      {votes && (
        <ul className="ctl-votes">
          {poll.options.map((o, i) => (
            <li key={o}><span>{o}</span><b>{votes[i]}</b></li>
          ))}
          <li className="total"><span>Total</span><b>{total}</b></li>
        </ul>
      )}
      <div className="ctl-row">
        <button className={`btn ${open ? 'on' : 'primary'}`} onClick={() => send({ type: 'poll', open: !open })}>
          {open ? 'Close voting' : 'Open voting'}
        </button>
        <button className="btn" onClick={() => send({ type: 'show', slideId: 'poll' })}>Show results on screen</button>
        <button className="btn danger" onClick={() => confirm('Clear every vote?') && send({ type: 'wipe-votes' })}>Clear votes</button>
      </div>
    </Section>
  );
}

function QuestionsSection({ pin, shown, send }: { pin: string; shown: { id: string; text: string }[]; send: Send }) {
  const [list, setList] = useState<Q[]>([]);
  const [all, setAll] = useState(false);
  const load = useCallback(async () => {
    const res = await fetch('/api/questions', { headers: { 'x-pin': pin }, cache: 'no-store' }).catch(() => null);
    if (res?.ok) setList((await res.json()).questions);
  }, [pin]);
  useEffect(() => {
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [load]);
  const mark = async (id: string, status: string) => {
    setList((l) => l.map((q) => (q.id === id ? { ...q, status } : q)));
    await fetch('/api/questions', { method: 'PATCH', headers: { 'x-pin': pin, 'content-type': 'application/json' }, body: JSON.stringify({ id, status }) });
  };
  const onScreen = new Set(shown.map((q) => q.id));
  const visible = list.filter((q) => all || (q.status !== 'hidden' && q.status !== 'answered'));

  return (
    <Section title={`Questions (${list.length})`}>
      {shown.length > 0 && (
        <div className="ctl-shown">
          <p className="ctl-eyebrow">On screen, in order</p>
          {shown.map((q, k) => (
            <div key={q.id} className="ctl-shown-q">
              <span>{k === 0 ? 'Now' : k + 1}</span>
              <p>{q.text}</p>
              {k > 0 && <button className="chip" onClick={() => send({ type: 'q-first', id: q.id })}>Make current</button>}
              <button className="chip" onClick={() => (send({ type: 'q-unshow', id: q.id }), mark(q.id, 'answered'))}>Answered</button>
            </div>
          ))}
          <div className="ctl-row">
            <button className="btn" onClick={() => send({ type: 'show', slideId: 'questions' })}>Show questions slide</button>
            <button className="btn" onClick={() => send({ type: 'q-clear' })}>Clear from screen</button>
          </div>
        </div>
      )}
      <label className="ctl-check">
        <input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} /> Include answered and hidden
      </label>
      {visible.length === 0 && <p className="ctl-muted">No questions yet.</p>}
      <ul className="ctl-qlist">
        {visible.map((q) => (
          <li key={q.id} className={`st-${q.status}`}>
            <p className="text">{q.text}</p>
            <p className="who">
              {[q.name, q.role, q.org].filter(Boolean).join(', ') || 'Anonymous'} ·{' '}
              {new Date(q.ts).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false })}
              {q.status !== 'new' && <> · {q.status}</>}
            </p>
            <div className="chips">
              {onScreen.has(q.id) ? (
                <button className="chip on" onClick={() => send({ type: 'q-unshow', id: q.id })}>On screen: remove</button>
              ) : (
                <button
                  className="chip primary"
                  onClick={() => (send({ type: 'q-show', q: { id: q.id, text: q.text, name: q.name, role: q.role, org: q.org } }), mark(q.id, 'shown'))}
                >
                  Put on screen
                </button>
              )}
              <button className="chip" onClick={() => mark(q.id, 'answered')}>Answered</button>
              <button className="chip" onClick={() => mark(q.id, q.status === 'hidden' ? 'new' : 'hidden')}>{q.status === 'hidden' ? 'Unhide' : 'Hide'}</button>
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function TimerSection({ endsAt, now, send }: { endsAt: number | null; now: number; send: Send }) {
  const [custom, setCustom] = useState('');
  const left = endsAt ? Math.max(0, endsAt - now) : 0;
  return (
    <Section title="Break timer">
      <p className="ctl-muted">
        Shown on break and registration slides instead of the scheduled time.
        {endsAt ? ` Running: ${Math.floor(left / 60000)}:${String(Math.floor((left % 60000) / 1000)).padStart(2, '0')} left.` : ''}
      </p>
      <div className="ctl-row">
        {[5, 10, 15, 30].map((m) => (
          <button key={m} className="btn" onClick={() => send({ type: 'timer', minutes: m })}>{m} min</button>
        ))}
        <input className="num" inputMode="numeric" placeholder="min" value={custom} onChange={(e) => setCustom(e.target.value)} />
        <button className="btn" onClick={() => Number(custom) > 0 && send({ type: 'timer', minutes: Number(custom) })}>Start</button>
        {endsAt && <button className="btn" onClick={() => send({ type: 'timer', minutes: null })}>Clear</button>}
      </div>
    </Section>
  );
}

const PRESETS = ['Please take your seats. We begin in two minutes.', 'Please set your phones to silent.', 'Lunch is served in the cafeteria.'];
function NoticeSection({ notice, send }: { notice: string; send: Send }) {
  const [text, setText] = useState('');
  return (
    <Section title="Notice band">
      <p className="ctl-muted">One line along the bottom of the screen. {notice ? `Showing: “${notice}”` : 'Nothing showing.'}</p>
      <div className="ctl-row">
        <input className="grow" maxLength={120} placeholder="Type a notice" value={text} onChange={(e) => setText(e.target.value)} />
        <button className="btn primary" onClick={() => text.trim() && send({ type: 'notice', text })}>Show</button>
        {notice && <button className="btn" onClick={() => send({ type: 'notice', text: '' })}>Clear</button>}
      </div>
      <div className="chips">
        {PRESETS.map((p) => (
          <button key={p} className="chip" onClick={() => send({ type: 'notice', text: p })}>{p}</button>
        ))}
      </div>
    </Section>
  );
}

function ContentCheck({ photos }: { photos: Record<string, string> }) {
  const missingPhoto = Object.keys(people).filter((id) => !photos[id]);
  const missingBio = Object.entries(people).filter(([, p]) => !p.bio).map(([id]) => id);
  return (
    <Section title="Content check">
      <p className="ctl-muted">
        {missingPhoto.length ? `${missingPhoto.length} photos missing. Add them as public/people/<id>.jpg and redeploy:` : 'Every photo is in place.'}
      </p>
      {missingPhoto.length > 0 && <p className="ctl-mono">{missingPhoto.map((id) => `${id}.jpg`).join('  ')}</p>}
      <p className="ctl-muted">{missingBio.length ? `${missingBio.length} bios empty in content/event.json.` : 'Every bio is filled in.'}</p>
    </Section>
  );
}

function DataSection({ pin, send }: { pin: string; send: Send }) {
  const q = `pin=${encodeURIComponent(pin)}`;
  return (
    <Section title="Data">
      <div className="ctl-row">
        <a className="btn" href={`/api/export?type=questions&${q}`}>Questions CSV</a>
        <a className="btn" href={`/api/export?type=feedback&${q}`}>Feedback CSV</a>
        <a className="btn" href={`/api/export?type=poll&${q}`}>Poll CSV</a>
      </div>
      <p className="ctl-muted">After the rehearsal: clear test questions, votes and feedback, and return the screen to Registrations.</p>
      <button
        className="btn danger"
        onClick={async () => {
          if (prompt('Type RESET to clear all questions, votes and feedback') !== 'RESET') return;
          await send({ type: 'wipe-audience' });
          await send({ type: 'reset' });
        }}
      >
        Reset for the event
      </button>
    </Section>
  );
}
