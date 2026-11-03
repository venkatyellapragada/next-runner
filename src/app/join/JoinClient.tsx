'use client';
// The audience page behind the QR. No login, one small bundle, and it polls through the CDN
// every 15 s, so a hall of phones on weak wifi is fine.
import { useEffect, useState } from 'react';
import { Avatar } from '@/components/Avatar';
import { Logo } from '@/components/Logo';
import { agenda, data, event, person, poll, slotProgress, slotWindow, talkSlots, type Slot } from '@/lib/event';
import { deviceId, useLive, useNow } from '@/lib/live';
import { activeSlot } from '@/lib/state';
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

  useEffect(() => {
    const h = location.hash.slice(1) as Tab;
    if (TABS.some(([t]) => t === h)) setTab(h);
  }, []);
  const go = (t: Tab) => {
    setTab(t);
    history.replaceState(null, '', `#${t}`);
    window.scrollTo(0, 0);
  };

  const state = live?.state;
  const cur = state ? activeSlot(state, now) : undefined;

  return (
    <div className="jn">
      <header className="jn-head">
        <div className="jn-brand">
          <span className="jn-name">{event.name}</span>
          <Logo height={18} />
        </div>
        <p className="jn-sub">{event.dateLabel} · {event.venue}</p>
      </header>
      <nav className="jn-tabs" aria-label="Sections">
        {TABS.map(([t, label]) => (
          <button key={t} className={tab === t ? 'on' : ''} onClick={() => go(t)} aria-current={tab === t}>
            {label}
          </button>
        ))}
      </nav>

      <main className="jn-main">
        {tab === 'now' && (
          <>
            {state?.feedbackOpen && (
              <button className="jn-card jn-cta" onClick={() => go('feedback')}>
                <span className="jn-eyebrow">Before you leave</span>
                <strong>Tell us how the day went</strong>
                <span>It takes two minutes</span>
              </button>
            )}
            {cur ? <NowCard slot={cur} now={now} photos={photos} /> : <p className="jn-muted">Loading the programme…</p>}
            {state?.poll.open && <PollCard votes={live?.votes} />}
            <button className="jn-btn primary wide" onClick={() => go('ask')}>Ask a question</button>
            {cur && <NextUp slot={cur} />}
          </>
        )}
        {tab === 'agenda' && <Agenda cur={cur} now={now} photos={photos} open={open} setOpen={setOpen} />}
        {tab === 'ask' && <Ask />}
        {tab === 'feedback' && <Feedback />}
      </main>
      <footer className="jn-foot">
        {event.expansion}. Hosted by Campx, the AI-native campus operating system.
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
  now,
  photos,
  open,
  setOpen,
}: {
  cur?: Slot;
  now: number;
  photos: Record<string, string>;
  open: string | null;
  setOpen: (id: string | null) => void;
}) {
  const decks = data.decks.links;
  return (
    <>
      <ol className="jn-agenda">
        {agenda.map((s) => {
          const past = slotWindow(s, now).end < now && s.id !== cur?.id;
          const expandable = s.kind !== 'break' && s.kind !== 'holding';
          const isOpen = open === s.id;
          const deck = decks.filter((d) => d.slot === s.id);
          return (
            <li key={s.id} className={`${s.id === cur?.id ? 'now' : ''} ${past ? 'past' : ''}`}>
              <button className="row" disabled={!expandable} onClick={() => setOpen(isOpen ? null : s.id)} aria-expanded={expandable ? isOpen : undefined}>
                <span className="time">{s.start}</span>
                <span className="what">
                  {s.id === cur?.id && <span className="jn-tag now">Now</span>}
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

function PollCard({ votes: liveVotes }: { votes?: number[] }) {
  const [voted, setVoted] = useState<number | null>(null);
  const [votes, setVotes] = useState<number[] | undefined>();
  const [err, setErr] = useState('');
  useEffect(() => {
    const v = remember('vote');
    if (v) setVoted(Number(v));
  }, []);
  const shown = votes ?? liveVotes;
  const total = shown?.reduce((a, b) => a + b, 0) ?? 0;
  return (
    <section className="jn-card">
      <p className="jn-eyebrow">Pulse poll</p>
      <h2 className="jn-title-sm" style={{ marginBottom: 12 }}>{poll.question}</h2>
      {voted === null ? (
        <div className="jn-options">
          {poll.options.map((o, i) => (
            <button
              key={o}
              className="jn-btn"
              onClick={async () => {
                const r = await post('/api/vote', { device: deviceId(), option: i });
                if (r.ok) {
                  setVoted(i);
                  remember('vote', String(i));
                  setVotes(r.votes);
                } else setErr(r.error ?? 'Could not record your vote.');
              }}
            >
              {o}
            </button>
          ))}
          {err && <p className="jn-error">{err}</p>}
        </div>
      ) : (
        <>
          <ul className="jn-results">
            {poll.options.map((o, i) => {
              const share = total && shown ? shown[i] / total : 0;
              return (
                <li key={o} className={i === voted ? 'mine' : ''}>
                  <div className="lab"><span>{o}</span><b>{Math.round(share * 100)}%</b></div>
                  <div className="jn-bar"><div style={{ width: `${share * 100}%` }} /></div>
                </li>
              );
            })}
          </ul>
          <p className="jn-muted">Thank you. Results are on the big screen.</p>
        </>
      )}
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
      <p className="jn-count">{280 - text.length}</p>
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
