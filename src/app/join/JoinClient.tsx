'use client';
// The audience page behind the QR. No login, one small bundle, and it polls through the CDN
// every 15 s, so a hall of phones on weak wifi is fine.
import { useEffect, useRef, useState } from 'react';
import { Avatar } from '@/components/Avatar';
import { Logo } from '@/components/Logo';
import { NextMark } from '@/components/NextMark';
import { agenda, allDecks, data, event, person, slotProgress, slotWindow, talkSlots, type Slot } from '@/lib/event';
import { deviceId, useLive, useNow } from '@/lib/live';
import { activeSlot, type Focus, type PollResult } from '@/lib/state';
import './join.css';

type Tab = 'now' | 'agenda' | 'ask' | 'feedback';
const TABS: [Tab, string][] = [
  ['now', 'Now'],
  ['agenda', 'Agenda'],
  ['ask', 'Ask'],
  ['feedback', 'Feedback'],
];

export default function JoinClient({ photos }: { photos: Record<string, string> }) {
  const { data: live, offset } = useLive('/api/state?view=join', 15000);
  const now = useNow(offset);
  const [tab, setTab] = useState<Tab>('now');
  const [open, setOpen] = useState<string | null>(null);
  // What the QR asked for (?focus=poll|ask). Holds until the room moves on (server focus changes).
  const [askedFor, setAskedFor] = useState<Focus>(null);
  const [answeredAll, setAnsweredAll] = useState(false);
  // A tab named in the URL hash (#agenda, #feedback) is the person's choice; the room's focus does not override it.
  const chosenTab = useRef(false);

  // Deep links work on first load: ?focus=poll|ask and #now|#agenda|#ask|#feedback.
  useEffect(() => {
    const q = new URLSearchParams(location.search).get('focus');
    const f: Focus = q === 'poll' || q === 'ask' ? q : null;
    setAskedFor(f);
    const h = location.hash.slice(1) as Tab;
    if (f === 'ask') setTab('ask');
    else if (f === 'poll') setTab('now');
    else if (TABS.some(([t]) => t === h)) {
      setTab(h);
      chosenTab.current = true;
    }
  }, []);

  const state = live?.state;
  const serverFocus = state?.focus ?? null;
  // When control changes what the room is doing, follow it once (do not fight a person who moves tabs later).
  const lastFocus = useRef<Focus | undefined>(undefined);
  useEffect(() => {
    if (!state) return;
    const prev = lastFocus.current;
    lastFocus.current = serverFocus;
    if (prev === serverFocus) return;
    // First load: what the room is doing now beats an older QR link, unless a tab was chosen in the URL.
    if (prev === undefined) {
      if (!serverFocus || chosenTab.current) return;
      if (serverFocus !== askedFor) setAskedFor(null);
    } else setAskedFor(null);
    if (serverFocus === 'ask') setTab('ask');
    if (serverFocus === 'poll') setTab('now');
  }, [state, serverFocus]);

  const go = (t: Tab) => {
    setTab(t);
    history.replaceState(null, '', `${location.pathname}#${t}`);
    window.scrollTo(0, 0);
  };

  const focus: Focus = serverFocus ?? askedFor;
  const cur = state ? activeSlot(state, now) : undefined;
  const polls = live?.polls ?? [];
  const pollOpen = !!state?.poll.open;

  return (
    <div className="jn">
      <header className="jn-head">
        <div className="jn-brand">
          <NextMark size={40} />
          <span className="jn-by">by <Logo height={16} /></span>
        </div>
        <p className="jn-sub">05.11.2026 · {event.venue}</p>
      </header>
      <nav className="jn-tabs" aria-label="Sections">
        {TABS.map(([t, label]) => (
          <button key={t} className={tab === t ? 'on' : ''} onClick={() => go(t)} aria-current={tab === t}>
            {label}
          </button>
        ))}
      </nav>

      <main className="jn-main">
        {tab === 'now' &&
          (focus === 'poll' ? (
            // The screen is asking for votes: the poll comes first, the question button only after voting.
            <>
              <PollFlow polls={polls} open={pollOpen} onDone={setAnsweredAll} />
              {answeredAll && (
                <div className="jn-after">
                  <p className="jn-strong">Voted. You can also ask a question.</p>
                  <button className="jn-btn primary wide" onClick={() => go('ask')}>Ask a question</button>
                </div>
              )}
              {cur && <NowCard slot={cur} now={now} photos={photos} />}
            </>
          ) : (
            <>
              {state?.feedbackOpen && <Feedback />}
              {cur ? <NowCard slot={cur} now={now} photos={photos} /> : <p className="jn-muted">Loading the programme…</p>}
              {pollOpen && <PollFlow polls={polls} open onDone={setAnsweredAll} />}
              <button className="jn-btn primary wide" onClick={() => go('ask')}>Ask a question</button>
              {cur && <NextUp slot={cur} />}
            </>
          ))}
        {tab === 'agenda' && <Agenda cur={cur} photos={photos} open={open} setOpen={setOpen} decksPublished={!!state?.decksPublished} />}
        {tab === 'ask' && <Ask />}
        {tab === 'feedback' && <Feedback />}
      </main>
      <footer className="jn-foot">
        New Education Experience &amp; Transformation
        <br />
        Campx · AI-forward education
      </footer>
    </div>
  );
}

const range = (s: Slot) => `${s.start}–${s.end}`;
const who = (s: Slot) =>
  s.kind === 'panel'
    ? `Moderated by ${person(s.moderator!).name}`
    : s.speakers?.length
      ? s.speakers.map((id) => person(id).name).join(', ')
      : s.byline ?? '';

function NowCard({ slot, now, photos }: { slot: Slot; now: number; photos: Record<string, string> }) {
  const { start } = slotWindow(slot, now);
  const live = now >= start;
  return (
    <section className="jn-card">
      <p className="jn-eyebrow">{live ? 'Now' : 'Up next'} · {range(slot)}</p>
      {slot.label !== slot.title && <p className="jn-label">{slot.label}</p>}
      <h1 className="jn-title">{slot.title}</h1>
      {slot.subtitle && <p className="jn-muted">{slot.subtitle}</p>}
      <div className="jn-bar"><div style={{ width: `${slotProgress(slot, now) * 100}%` }} /></div>
      <People slot={slot} photos={photos} />
    </section>
  );
}

function NextUp({ slot }: { slot: Slot }) {
  const i = agenda.findIndex((s) => s.id === slot.id);
  const next = agenda[i + 1];
  if (!next) return null;
  return (
    <section className="jn-next">
      <p className="jn-eyebrow muted">Next · {next.start}</p>
      <p className="jn-strong">{next.label}{next.label !== next.title ? `: ${next.title}` : ''}</p>
      <p className="jn-muted">{who(next)}</p>
    </section>
  );
}

function People({ slot, photos, bios = false }: { slot: Slot; photos: Record<string, string>; bios?: boolean }) {
  const ids = [...(slot.moderator ? [slot.moderator] : []), ...(slot.speakers ?? [])];
  if (!ids.length) return slot.byline ? <p className="jn-strong" style={{ marginTop: 12 }}>{slot.byline}</p> : null;
  return (
    <ul className="jn-people">
      {ids.map((id) => {
        const p = person(id);
        return (
          <li key={id}>
            <Avatar id={id} photos={photos} width={52} />
            <div>
              <p className="jn-strong">{p.name}{id === slot.moderator ? <span className="jn-tag">Moderator</span> : null}</p>
              <p className="jn-muted">{[p.title, p.org].filter(Boolean).join(', ')}</p>
              {bios && p.bio && <p className="jn-bio">{p.bio}</p>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function Agenda({
  cur,
  photos,
  open,
  setOpen,
  decksPublished,
}: {
  cur?: Slot;
  photos: Record<string, string>;
  open: string | null;
  setOpen: (id: string | null) => void;
  decksPublished: boolean;
}) {
  // Deck links appear only once /control shares them (after the talks).
  const decks = decksPublished ? allDecks() : [];
  // Done / now / next follow the slide control has up, so they agree with the screen when the day runs late.
  const curIdx = agenda.findIndex((x) => x.id === cur?.id);
  return (
    <>
      <ol className="jn-agenda">
        {agenda.map((s) => {
          const i = agenda.indexOf(s);
          const past = curIdx >= 0 && i < curIdx;
          const isNext = curIdx >= 0 && i === curIdx + 1;
          const expandable = s.kind !== 'break' && s.kind !== 'holding';
          const isOpen = open === s.id;
          const deck = decks.filter((d) => d.slot === s.id);
          return (
            <li key={s.id} className={`${s.id === cur?.id ? 'now' : ''} ${past ? 'past' : ''}`}>
              <button
                className="row"
                disabled={!expandable}
                onClick={() => setOpen(isOpen ? null : s.id)}
                aria-expanded={expandable ? isOpen : undefined}
                aria-label={expandable ? `${s.label}: ${isOpen ? 'Hide details' : 'Show details'}` : undefined}
              >
                <span className="time">{s.start}</span>
                <span className="what">
                  {s.id === cur?.id && <span className="jn-tag now">Now</span>}
                  {isNext && <span className="jn-tag now muted">Next</span>}
                  <span className="jn-strong">{s.label}</span>
                  {s.title !== s.label && <span className="jn-title-sm">{s.title}</span>}
                  {expandable && <span className="jn-muted">{who(s)}</span>}
                </span>
                {expandable && <span className="chev" aria-hidden>{isOpen ? '−' : '+'}</span>}
              </button>
              {isOpen && (
                <div className="detail">
                  {s.subtitle && <p className="jn-muted">{s.subtitle}</p>}
                  {s.topics && s.topics.length > 0 && (
                    <ul className="jn-topics">{s.topics.map((t) => <li key={t}>{t}</li>)}</ul>
                  )}
                  <People slot={s} photos={photos} bios />
                  {deck.map((d) => (
                    <a key={d.url} className="jn-btn" href={d.url} target="_blank" rel="noreferrer">{d.title || 'Open the deck'}</a>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ol>
      <section className="jn-card" id="decks">
        <p className="jn-eyebrow">Presentations</p>
        {decks.length ? (
          <ul className="jn-decks">
            {decks.map((d) => (
              <li key={d.url}><a href={d.url} target="_blank" rel="noreferrer">{d.title}</a></li>
            ))}
          </ul>
        ) : (
          <p className="jn-muted">{data.decks.note}</p>
        )}
      </section>
    </>
  );
}

function remember(key: string, value?: string): string {
  try {
    if (value !== undefined) localStorage.setItem('next1-' + key, value);
    return localStorage.getItem('next1-' + key) ?? '';
  } catch {
    return '';
  }
}

async function post(url: string, body: unknown): Promise<{ ok: boolean; error?: string; votes?: number[]; already?: boolean }> {
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    return await res.json();
  } catch {
    return { ok: false, error: 'No connection. Please try again in a moment.' };
  }
}

/** The pulse poll: each question in turn, one answer per question on this phone, then the results. */
function PollFlow({ polls, open, onDone }: { polls: PollResult[]; open: boolean; onDone: (done: boolean) => void }) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [votes, setVotes] = useState<Record<string, number[]>>({});
  const [err, setErr] = useState('');
  const [sending, setSending] = useState(false);
  const ids = polls.map((p) => p.id).join(',');
  useEffect(() => {
    const a: Record<string, number> = {};
    for (const p of polls) {
      const v = remember('vote-' + p.id);
      if (v) a[p.id] = Number(v);
    }
    setAnswers(a);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids]);
  const nextQ = polls.find((p) => answers[p.id] === undefined);
  const done = polls.length > 0 && !nextQ;
  useEffect(() => onDone(done), [done, onDone]);

  if (!polls.length) return null;
  if (!open && !done)
    return (
      <section className="jn-card">
        <p className="jn-eyebrow">Pulse poll</p>
        <h2 className="jn-title-sm">Voting opens shortly.</h2>
        <p className="jn-muted">Keep this page open; the questions appear here when the screen asks for them.</p>
      </section>
    );
  if (nextQ && open) {
    const k = polls.indexOf(nextQ);
    return (
      <section className="jn-card">
        <p className="jn-eyebrow">Pulse poll · Question {k + 1} of {polls.length}</p>
        <div className="jn-steps" aria-hidden>
          {polls.map((p, i) => <span key={p.id} className={i < k ? 'done' : i === k ? 'cur' : ''} />)}
        </div>
        <h2 className="jn-title-sm" style={{ marginBottom: 12 }}>{nextQ.question}</h2>
        <div className="jn-options">
          {nextQ.options.map((o, i) => (
            <button
              key={o}
              className="jn-btn"
              disabled={sending}
              onClick={async () => {
                setSending(true);
                setErr('');
                const r = await post('/api/vote', { device: deviceId(), pollId: nextQ.id, option: i });
                setSending(false);
                if (r.ok) {
                  remember('vote-' + nextQ.id, String(i));
                  setAnswers((a) => ({ ...a, [nextQ.id]: i }));
                  if (r.votes) setVotes((v) => ({ ...v, [nextQ.id]: r.votes! }));
                } else setErr(r.error ?? 'Could not record your answer.');
              }}
            >
              {o}
            </button>
          ))}
          {err && <p className="jn-error">{err}</p>}
        </div>
      </section>
    );
  }
  // Every question answered (or voting closed after answering some): show what the room said so far.
  return (
    <section className="jn-card">
      <p className="jn-eyebrow">Pulse poll · {done ? 'Thank you' : 'Voting closed'}</p>
      {polls.map((p, qi) => {
        const counts = votes[p.id] ?? p.votes;
        const total = counts?.reduce((a, b) => a + b, 0) ?? 0;
        return (
          <div key={p.id} className="jn-result">
            <p className="jn-strong">Q{qi + 1}. {p.question}</p>
            <ul className="jn-results">
              {p.options.map((o, i) => {
                const share = total && counts ? counts[i] / total : 0;
                return (
                  <li key={o} className={i === answers[p.id] ? 'mine' : ''}>
                    <div className="lab"><span>{o}</span><b>{counts ? `${Math.round(share * 100)}%` : ''}</b></div>
                    {counts && <div className="jn-bar"><div style={{ width: `${share * 100}%` }} /></div>}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
      <p className="jn-muted">Results are on the big screen.</p>
    </section>
  );
}

function Ask() {
  const [text, setText] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [org, setOrg] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [err, setErr] = useState('');
  useEffect(() => {
    setName(remember('name'));
    setRole(remember('role'));
    setOrg(remember('org'));
  }, []);
  if (status === 'sent')
    return (
      <section className="jn-card">
        <p className="jn-eyebrow">Question received</p>
        <h1 className="jn-title">Thank you.</h1>
        <p className="jn-muted">The moderator picks questions for the screen. Not every question can be taken in the room; all of them reach the Campx team.</p>
        <button className="jn-btn wide" onClick={() => (setText(''), setStatus('idle'))}>Ask another question</button>
      </section>
    );
  return (
    <form
      className="jn-card jn-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setErr('');
        setStatus('sending');
        remember('name', name);
        remember('role', role);
        remember('org', org);
        const r = await post('/api/questions', { device: deviceId(), text, name, role, org });
        if (r.ok) setStatus('sent');
        else {
          setStatus('idle');
          setErr(r.error ?? 'Could not send your question.');
        }
      }}
    >
      <p className="jn-eyebrow">Ask a question</p>
      <label htmlFor="q">Your question</label>
      <textarea id="q" rows={4} maxLength={280} required value={text} onChange={(e) => setText(e.target.value)} />
      <p className="jn-count" aria-live="polite">{280 - text.length} characters left</p>
      <label htmlFor="role">Your role (optional)</label>
      <select id="role" value={role} onChange={(e) => setRole(e.target.value)}>
        <option value="">Prefer not to say</option>
        {data.roles.map((r) => <option key={r}>{r}</option>)}
      </select>
      <label htmlFor="name">Name (optional)</label>
      <input id="name" maxLength={60} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
      <label htmlFor="org">Institution (optional)</label>
      <input id="org" maxLength={80} autoComplete="organization" value={org} onChange={(e) => setOrg(e.target.value)} />
      {err && <p className="jn-error">{err}</p>}
      <button className="jn-btn primary wide" type="submit" disabled={status === 'sending' || text.trim().length < 5}>
        {status === 'sending' ? 'Sending…' : 'Send question'}
      </button>
    </form>
  );
}

function Feedback() {
  const [done, setDone] = useState(false);
  const [rating, setRating] = useState(0);
  const [best, setBest] = useState('');
  const [comments, setComments] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [org, setOrg] = useState('');
  const [contact, setContact] = useState('');
  const [followUp, setFollowUp] = useState(false);
  const [err, setErr] = useState('');
  const [sending, setSending] = useState(false);
  useEffect(() => {
    setDone(remember('feedback') === 'sent');
    setName(remember('name'));
    setRole(remember('role'));
    setOrg(remember('org'));
  }, []);
  if (done)
    return (
      <section className="jn-card">
        <p className="jn-eyebrow">Feedback received</p>
        <h1 className="jn-title">Thank you for being at NEXT 1.0.</h1>
        <p className="jn-muted">The presentations will be shared on this page after the event.</p>
      </section>
    );
  return (
    <form
      className="jn-card jn-form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!rating) return setErr('Please choose a rating.');
        setSending(true);
        const r = await post('/api/feedback', { rating, best, comments, name, role, org, contact, followUp });
        setSending(false);
        if (r.ok) {
          remember('feedback', 'sent');
          setDone(true);
        } else setErr(r.error ?? 'Could not send. Please try again.');
      }}
    >
      <p className="jn-eyebrow">Feedback</p>
      <label>How useful was the day?</label>
      <div className="jn-rating" role="radiogroup" aria-label="Rating from 1 to 5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button type="button" key={n} role="radio" aria-checked={rating === n} className={rating === n ? 'on' : ''} onClick={() => setRating(n)}>
            {n}
          </button>
        ))}
      </div>
      <p className="jn-scale"><span>Not useful</span><span>Very useful</span></p>
      <label htmlFor="best">The session most useful to you</label>
      <select id="best" value={best} onChange={(e) => setBest(e.target.value)}>
        <option value="">Choose a session</option>
        {talkSlots().map((s) => <option key={s.id}>{s.label === s.title ? s.label : `${s.label}: ${s.title}`}</option>)}
      </select>
      <label htmlFor="c">What should we do differently, or cover next time?</label>
      <textarea id="c" rows={4} maxLength={2000} value={comments} onChange={(e) => setComments(e.target.value)} />
      <label htmlFor="fn">Name (optional)</label>
      <input id="fn" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
      <label htmlFor="fr">Role (optional)</label>
      <select id="fr" value={role} onChange={(e) => setRole(e.target.value)}>
        <option value="">Prefer not to say</option>
        {data.roles.map((r) => <option key={r}>{r}</option>)}
      </select>
      <label htmlFor="fo">Institution (optional)</label>
      <input id="fo" maxLength={120} value={org} onChange={(e) => setOrg(e.target.value)} />
      <label className="jn-check">
        <input type="checkbox" checked={followUp} onChange={(e) => setFollowUp(e.target.checked)} />
        I would like the Campx team to follow up with my institution
      </label>
      {followUp && (
        <>
          <label htmlFor="ct">Email or phone</label>
          <input id="ct" maxLength={120} autoComplete="email" value={contact} onChange={(e) => setContact(e.target.value)} />
        </>
      )}
      {err && <p className="jn-error">{err}</p>}
      <button className="jn-btn primary wide" type="submit" disabled={sending}>{sending ? 'Sending…' : 'Send feedback'}</button>
    </form>
  );
}
