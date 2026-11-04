'use client';
import { useCallback, useEffect, useState } from 'react';
import { Fit } from '@/components/Fit';
import { joinUrlFor } from '@/components/bits';
import { Screen } from '@/components/screen/Slides';
import { agenda, allDecks, FIRST_SLIDE, people, slideById, slideIndex, slides, type Poll } from '@/lib/event';
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
  // The tab is remembered on this phone, so a reload lands where the operator was.
  const [tab, setTab] = useState<Tab>('live');
  useEffect(() => {
    setOrigin(location.origin);
    try {
      const t = localStorage.getItem(TAB_KEY) as Tab | null;
      if (t && TABS.some(([id]) => id === t)) setTab(t);
    } catch {}
  }, []);
  const pick = (t: Tab) => {
    setTab(t);
    window.scrollTo({ top: 0 });
    try {
      localStorage.setItem(TAB_KEY, t);
    } catch {}
  };

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
  const { state, polls } = data;
  const slide = slideById(state.slideId) ?? slideById(FIRST_SLIDE)!;
  const i = slideIndex(state.slideId);
  const upNext = i >= 0 ? slides[i + 1] : slideById(state.returnTo);
  const slotOf = (id: string | null | undefined) => agenda.find((s) => s.id === slideById(id)?.slotId);
  const onScreenLine =
    state.overlay === 'video'
      ? 'The NEXT film'
      : state.overlay === 'anthem'
        ? 'The national anthem'
        : state.overlay === 'sim'
          ? 'The simulation'
          : slotOf(state.slideId)
            ? `${slotOf(state.slideId)!.label} · ${slide.name}`
            : slide.name;

  return (
    <main className="ctl ctl-tabbed">
      {/* Pinned: what the room sees right now, above every tab. */}
      <div className="ctl-pin">
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

      <section className="ctl-now ctl-pinned" aria-label="On screen now">
        {origin && (
          <Fit style={{ flex: '0 0 56%', aspectRatio: '16 / 9', border: '1px solid var(--line)', borderRadius: 4 }}>
            {() => <Screen slide={slide} state={state} now={now} polls={polls} photos={photos} joinUrl={joinUrlFor(origin)} />}
          </Fit>
        )}
        <div className="ctl-onscreen">
          <span className="ctl-eyebrow">On screen</span>
          <span className="what">{onScreenLine}</span>
          {state.notice.trim() && <span className="ctl-flag">Notice up</span>}
          {state.focus && <span className="ctl-focus">Phones: {state.focus === 'poll' ? 'poll' : 'ask'}</span>}
        </div>
      </section>

      <nav className="ctl-tabs" role="tablist" aria-label="Control sections">
        {TABS.map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'on' : ''} onClick={() => pick(id)}>
            {label}
            {id === 'polls' && state.poll.open && <span className="ctl-live" aria-label="voting open" />}
          </button>
        ))}
      </nav>
      </div>

      {tab === 'live' && (
        <>
          <section className="ctl-section">
            <h2>Put up, then return</h2>
            <div className="ctl-row">
              <button className={`btn ${state.slideId === 'poll' ? 'on' : ''}`} onClick={() => send({ type: 'show', slideId: 'poll' })}>Poll results</button>
              <button className={`btn ${state.slideId === 'questions' ? 'on' : ''}`} onClick={() => send({ type: 'show', slideId: 'questions' })}>Questions</button>
              <button className={`btn ${state.slideId === 'ask' ? 'on' : ''}`} onClick={() => send({ type: 'show', slideId: 'ask' })}>Question prompt</button>
              {state.returnTo && <button className="btn primary" onClick={() => send({ type: 'back' })}>Back to agenda</button>}
            </div>
          </section>
          <section className="ctl-section">
            <h2>Interludes</h2>
            <div className="ctl-row interludes">
              <button className={`btn ${state.overlay === 'video' ? 'on' : ''}`} onClick={() => send({ type: 'overlay', overlay: state.overlay === 'video' ? null : 'video' })}>
                {state.overlay === 'video' ? 'Stop film' : 'Play film'}
                <small>V on the laptop</small>
              </button>
              <button
                className={`btn ${state.overlay === 'anthem' ? 'on' : ''}`}
                onClick={() =>
                  state.overlay === 'anthem'
                    ? send({ type: 'overlay', overlay: null })
                    : confirm('Play the national anthem now?') && send({ type: 'overlay', overlay: 'anthem' })
                }
              >
                {state.overlay === 'anthem' ? 'Stop anthem' : 'National anthem'}
                <small>A A A on the laptop</small>
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
          </section>
          <NoticeSection notice={state.notice} send={send} />
          <TimerSection endsAt={state.timer.endsAt} label={state.timer.label} now={now} send={send} />
        </>
      )}

      {tab === 'agenda' && (
        <Section title="Running order">
          <ol className="ctl-order">
            {agenda.map((slot) => {
              const own = slides.filter((s) => s.slotId === slot.id);
              const active = own.some((s) => s.id === state.slideId);
              return (
                <li key={slot.id} className={active ? 'active' : ''}>
                  <div className="when">{slot.start}</div>
                  <div className="what">
                    <div className="label">
                      {slot.label}
                      {slot.deck && (
                        <a className="ctl-deck" href={slot.deck.url} target="_blank" rel="noreferrer">Open deck</a>
                      )}
                    </div>
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
      )}

      {tab === 'polls' && <PollSection pin={pin} open={state.poll.open} openedAt={state.poll.openedAt} now={now} onScreen={state.slideId === 'poll'} send={send} />}
      {tab === 'questions' && <QuestionsSection pin={pin} shown={state.questions} onScreen={state.slideId === 'questions'} send={send} />}

      {tab === 'more' && (
        <>
          <Section title="Feedback form">
            <p className="ctl-muted">Opening it puts the form at the top of the audience page. It is always reachable from there.</p>
            <button className={`btn ${state.feedbackOpen ? 'on' : ''}`} onClick={() => send({ type: 'feedback', open: !state.feedbackOpen })}>
              {state.feedbackOpen ? 'Feedback is open: close' : 'Open feedback now'}
            </button>
          </Section>
          <Section title="Decks">
            <p className="ctl-muted">
              On the screen laptop, <b>D</b> opens the deck of the session on screen in a new tab; close the tab to return. The links also sit beside each session in Agenda.
            </p>
            <ul className="ctl-decklist">
              {allDecks().map((d) => (
                <li key={d.url}>
                  <span>{d.title}</span>
                  <a href={d.url} target="_blank" rel="noreferrer">Open</a>
                </li>
              ))}
            </ul>
            <button className={`btn ${state.decksPublished ? 'on' : ''}`} onClick={() => send({ type: 'decks', published: !state.decksPublished })}>
              {state.decksPublished ? 'Decks are on the audience page: hide' : 'Share decks with the audience'}
            </button>
          </Section>
          <ContentCheck photos={photos} />
          <DataSection pin={pin} send={send} />
        </>
      )}

      <footer className="ctl-dock">
        {err && <p className="ctl-error">{err}</p>}
        <div className="ctl-nav">
          <button className="btn" disabled={busy} onClick={() => send({ type: 'prev' })}>Previous</button>
          <button className="btn primary big" disabled={busy} onClick={() => send({ type: 'next' })}>
            Next
            {state.overlay ? <small>Back to the slides</small> : upNext && <small>{slotOf(upNext.id)?.label ?? ''} · {upNext.name}</small>}
          </button>
        </div>
      </footer>
    </main>
  );
}

const TABS = [
  ['live', 'Live'],
  ['agenda', 'Agenda'],
  ['polls', 'Polls'],
  ['questions', 'Questions'],
  ['more', 'More'],
] as const;
type Tab = (typeof TABS)[number][0];
const TAB_KEY = 'next1-ctl-tab';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="ctl-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

type Send = (a: Action | { type: 'wipe-votes' } | { type: 'wipe-audience' }) => Promise<void>;

type PollRow = Poll & { votes: number[] };

function since(ms: number) {
  const m = Math.floor(ms / 60000);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`;
}

function PollSection({ pin, open, openedAt, now, onScreen, send }: { pin: string; open: boolean; openedAt?: number; now: number; onScreen: boolean; send: Send }) {
  const [polls, setPolls] = useState<PollRow[]>([]);
  const [adding, setAdding] = useState(false);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState('');
  const [err, setErr] = useState('');
  const load = useCallback(async () => {
    const res = await fetch('/api/polls', { headers: { 'x-pin': pin }, cache: 'no-store' }).catch(() => null);
    if (res?.ok) setPolls((await res.json()).polls);
  }, [pin]);
  useEffect(() => {
    load();
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [load]);

  const add = async () => {
    setErr('');
    const res = await fetch('/api/polls', {
      method: 'POST',
      headers: { 'x-pin': pin, 'content-type': 'application/json' },
      body: JSON.stringify({ question, options: options.split('\n') }),
    });
    const body = await res.json();
    if (!body.ok) return setErr(body.error ?? 'Could not add the question.');
    setQuestion('');
    setOptions('');
    setAdding(false);
    load();
  };
  const remove = async (id: string) => {
    if (!confirm('Remove this question and its votes?')) return;
    await fetch(`/api/polls?id=${encodeURIComponent(id)}`, { method: 'DELETE', headers: { 'x-pin': pin } });
    load();
  };
  const totals = polls.map((p) => p.votes.reduce((a, b) => a + b, 0));
  const responses = Math.max(0, ...totals);
  const answers = totals.reduce((a, b) => a + b, 0);

  return (
    <Section title={`Pulse poll · ${polls.length} questions`}>
      <div className="ctl-stats">
        <div><b>{responses}</b><span>people</span></div>
        <div><b>{answers}</b><span>answers</span></div>
        <div>
          <b className={open ? 'live' : ''}>{open ? (openedAt ? since(now - openedAt) : 'Open') : 'Closed'}</b>
          <span>{open ? 'voting open' : 'voting'}</span>
        </div>
      </div>
      <p className="ctl-muted">Phones answer every question in turn while voting is open. The screen only ever shows results.</p>
      <div className="ctl-row" style={{ marginBottom: 12 }}>
        <button className={`btn ${open ? 'on' : 'primary'}`} onClick={() => (!open || confirm('Close voting? Phones stop accepting answers.')) && send({ type: 'poll', open: !open }).then(load)}>
          {open ? 'Close voting' : 'Open voting'}
        </button>
        <button className={`btn ${onScreen ? 'on' : ''}`} onClick={() => send({ type: 'show', slideId: 'poll' })}>Show results on screen</button>
        <button className="btn danger" onClick={() => confirm('Clear every vote on every question?') && send({ type: 'wipe-votes' }).then(load)}>Clear votes</button>
      </div>
      <ol className="ctl-polls">
        {polls.map((p, qi) => {
          const total = totals[qi];
          const max = Math.max(...p.votes);
          return (
            <li key={p.id}>
              <div className="ctl-poll-head">
                <p className="ctl-q">Q{qi + 1}. {p.question}</p>
                <span className="ctl-tag">{total} {total === 1 ? 'vote' : 'votes'}</span>
              </div>
              <ul className="ctl-bars">
                {p.options.map((o, i) => {
                  const share = total ? p.votes[i] / total : 0;
                  const lead = total > 0 && p.votes[i] === max;
                  return (
                    <li key={o} className={lead ? 'lead' : ''}>
                      <span className="o">{o}</span>
                      <span className="n">{p.votes[i]} · {Math.round(share * 100)}%</span>
                      <span className="track"><span style={{ width: `${share * 100}%` }} /></span>
                    </li>
                  );
                })}
              </ul>
              {p.custom && <button className="btn danger" onClick={() => remove(p.id)}>Remove</button>}
            </li>
          );
        })}
      </ol>
      {adding ? (
        <div className="ctl-add">
          <label htmlFor="pq">Question</label>
          <input id="pq" className="grow" maxLength={200} value={question} onChange={(e) => setQuestion(e.target.value)} />
          <label htmlFor="po">Options, one per line (2 to 6)</label>
          <textarea id="po" rows={5} value={options} onChange={(e) => setOptions(e.target.value)} />
          {err && <p className="ctl-error">{err}</p>}
          <div className="ctl-row">
            <button className="btn primary" onClick={add}>Add question</button>
            <button className="btn" onClick={() => setAdding(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <button className="btn" onClick={() => setAdding(true)}>Add a question</button>
      )}
    </Section>
  );
}

function QuestionsSection({ pin, shown, onScreen: slideUp, send }: { pin: string; shown: { id: string; text: string }[]; onScreen: boolean; send: Send }) {
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
      <div className="ctl-row" style={{ marginBottom: 12 }}>
        <button className={`btn ${slideUp ? 'on' : ''}`} onClick={() => send({ type: 'show', slideId: 'questions' })}>Show questions slide</button>
        <button className="btn" onClick={() => send({ type: 'show', slideId: 'ask' })}>Question prompt</button>
      </div>
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
              <button className="chip" onClick={() => (onScreen.has(q.id) && send({ type: 'q-unshow', id: q.id }), mark(q.id, 'answered'))}>Answered</button>
              <button
                className="chip"
                onClick={() => (q.status !== 'hidden' && onScreen.has(q.id) && send({ type: 'q-unshow', id: q.id }), mark(q.id, q.status === 'hidden' ? 'new' : 'hidden'))}
              >
                {q.status === 'hidden' ? 'Unhide' : 'Hide'}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}

const TIMER_LABELS = ['We resume in', 'Starting in', 'Lunch ends in', 'Session ends in'];
function TimerSection({ endsAt, label, now, send }: { endsAt: number | null; label: string; now: number; send: Send }) {
  const [custom, setCustom] = useState('');
  const [lab, setLab] = useState(TIMER_LABELS[0]);
  const left = endsAt ? endsAt - now : 0;
  const running = !!endsAt && left > -60000;
  const start = (minutes: number) => send({ type: 'timer', minutes, label: lab });
  return (
    <Section title="Timer">
      <p className="ctl-muted">
        Counts down on every slide: large on intro, break and opening slides, as a pill in the top row on the others. It clears itself a minute after it ends.
      </p>
      {running && (
        <p className="ctl-running">
          {label || 'Timer'} · <b>{left > 0 ? `${Math.floor(left / 60000)}:${String(Math.floor((left % 60000) / 1000)).padStart(2, '0')}` : 'ended'}</b>
        </p>
      )}
      <div className="chips">
        {TIMER_LABELS.map((l) => (
          <button key={l} className={`chip ${lab === l ? 'on' : ''}`} onClick={() => setLab(l)}>{l}</button>
        ))}
      </div>
      <div className="ctl-row">
        {[2, 5, 10, 15, 30].map((m) => (
          <button key={m} className="btn" onClick={() => start(m)}>{m} min</button>
        ))}
        <input className="num" inputMode="numeric" placeholder="min" value={custom} onChange={(e) => setCustom(e.target.value)} />
        <button className="btn" onClick={() => Number(custom) > 0 && start(Number(custom))}>Start timer</button>
        {running && <button className="btn danger" onClick={() => send({ type: 'timer', minutes: null })}>Stop timer</button>}
      </div>
    </Section>
  );
}

const PRESETS = ['Please take your seats. We begin in two minutes.', 'Please set your phones to silent.', 'Lunch is served in the cafeteria.'];
function NoticeSection({ notice, send }: { notice: string; send: Send }) {
  const [text, setText] = useState('');
  return (
    <Section title="Notice">
      <p className="ctl-muted">The slide steps aside and the notice fills an indigo panel on the right; phones show it on Now. {notice ? '' : 'Nothing showing.'}</p>
      {notice && <p className="ctl-notice-now">“{notice}”</p>}
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
  const missingPhoto = Object.keys(people).filter((id) => people[id].photo !== false && !photos[id]);
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

async function download(pin: string, type: 'questions' | 'feedback' | 'poll') {
  // The PIN travels in a header, never in a URL (history, logs, screenshots).
  const res = await fetch(`/api/export?type=${type}`, { headers: { 'x-pin': pin } });
  if (!res.ok) return alert('Download failed. Check the connection and try again.');
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url;
  a.download = `next-1.0-${type}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function DataSection({ pin, send }: { pin: string; send: Send }) {
  return (
    <Section title="Data">
      <div className="ctl-row">
        <button className="btn" onClick={() => download(pin, 'questions')}>Questions CSV</button>
        <button className="btn" onClick={() => download(pin, 'feedback')}>Feedback CSV</button>
        <button className="btn" onClick={() => download(pin, 'poll')}>Poll CSV</button>
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
