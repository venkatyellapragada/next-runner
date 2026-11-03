import raw from '../../content/event.json';

export type Person = { name: string; title: string; org: string; bio: string };
export type SlotKind = 'holding' | 'talk' | 'panel' | 'break' | 'forum';
export type Slot = {
  id: string;
  start: string; // "HH:MM" IST
  end: string;
  kind: SlotKind;
  label: string;
  title: string;
  subtitle?: string;
  byline?: string;
  speakers?: string[];
  moderator?: string;
  topics?: string[];
};
export type DeckLink = { slot?: string; title: string; url: string };
export type EventData = {
  event: {
    name: string;
    expansion: string;
    theme: string;
    host: string;
    date: string;
    dateLabel: string;
    venue: string;
    utcOffset: string;
  };
  people: Record<string, Person>;
  agenda: Slot[];
  poll: { question: string; options: string[] };
  roles: string[];
  decks: { note: string; links: DeckLink[] };
};

export const data = raw as EventData;
export const { event, people, agenda, poll } = data;

// ── Slides ────────────────────────────────────────────────────────────────
// Derived from the agenda. The order here is the order "Next" walks through.
export type SlideKind = 'holding' | 'transition' | 'speaker' | 'panel' | 'break' | 'questions' | 'poll';
export type Slide = { id: string; kind: SlideKind; slotId: string | null; name: string };

const perSlot: Record<SlotKind, SlideKind[]> = {
  holding: ['holding'],
  talk: ['transition', 'speaker'],
  panel: ['transition', 'panel'],
  break: ['break'],
  forum: ['transition', 'questions'],
};
const slideName: Record<SlideKind, string> = {
  holding: 'Holding',
  transition: 'Intro',
  speaker: 'Speaker',
  panel: 'Panel',
  break: 'Break',
  questions: 'Questions',
  poll: 'Poll results',
};

export const slides: Slide[] = agenda.flatMap((slot) =>
  perSlot[slot.kind].map((kind) => ({ id: `${slot.id}:${kind}`, kind, slotId: slot.id, name: slideName[kind] })),
);

/** Slides that are not part of the running order; /control puts them up and returns. */
export const POLL_SLIDE: Slide = { id: 'poll', kind: 'poll', slotId: null, name: 'Poll results' };
export const QUESTIONS_SLIDE: Slide = { id: 'questions', kind: 'questions', slotId: null, name: 'Questions' };
export const extraSlides = [POLL_SLIDE, QUESTIONS_SLIDE];

export const FIRST_SLIDE = slides[0].id;

export function slideById(id: string | null | undefined): Slide | undefined {
  if (!id) return undefined;
  return slides.find((s) => s.id === id) ?? extraSlides.find((s) => s.id === id);
}
export function slotById(id: string | null | undefined): Slot | undefined {
  return id ? agenda.find((s) => s.id === id) : undefined;
}
export function slideIndex(id: string): number {
  return slides.findIndex((s) => s.id === id);
}

// ── People ────────────────────────────────────────────────────────────────
export function person(id: string): Person & { id: string } {
  const p = people[id];
  return p ? { id, ...p } : { id, name: id, title: '', org: '', bio: '' };
}

const HONORIFIC = /^(prof\.?|dr\.?|\(dr\.\)|shri|smt\.?|mr\.?|ms\.?|mrs\.?)$/i;
export function initials(name: string): string {
  const words = name.split(/\s+/).filter((w) => w && !HONORIFIC.test(w));
  const full = words.filter((w) => !w.endsWith('.') && w.length > 1);
  const first = full.length >= 2 ? full[0] : words[0] ?? '';
  const last = full[full.length - 1] ?? words[words.length - 1] ?? '';
  return ((first[0] ?? '') + (last !== first ? last[0] ?? '' : '')).toUpperCase();
}

/** "Prof. Kumar Molugaram" → "Kumar Molugaram" for places that need it short. */
export function plainName(name: string): string {
  return name
    .split(/\s+/)
    .filter((w) => !HONORIFIC.test(w))
    .join(' ');
}

// ── Time (all agenda times are IST) ──────────────────────────────────────
const IST_OFFSET_MS = 330 * 60 * 1000;

/** Epoch ms of IST midnight for the IST day containing `ms`. The agenda runs on "today", so a
 *  rehearsal on the 4th behaves exactly like the day itself. */
export function istMidnight(ms: number): number {
  const shifted = ms + IST_OFFSET_MS;
  return shifted - (((shifted % 86400000) + 86400000) % 86400000) - IST_OFFSET_MS;
}
export function hhmmToMs(hhmm: string, nowMs: number): number {
  const [h, m] = hhmm.split(':').map(Number);
  return istMidnight(nowMs) + (h * 60 + m) * 60000;
}
export function slotWindow(slot: Slot, nowMs: number) {
  return { start: hhmmToMs(slot.start, nowMs), end: hhmmToMs(slot.end, nowMs) };
}
export function slotProgress(slot: Slot, nowMs: number): number {
  const { start, end } = slotWindow(slot, nowMs);
  return Math.min(1, Math.max(0, (nowMs - start) / (end - start)));
}
export function clockSlot(nowMs: number): Slot | undefined {
  return agenda.find((s) => {
    const w = slotWindow(s, nowMs);
    return nowMs >= w.start && nowMs < w.end;
  });
}
export function fmtClock(ms: number): string {
  const d = new Date(ms + IST_OFFSET_MS);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}
export function fmtCountdown(ms: number): string {
  const t = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  const mm = String(m).padStart(h ? 2 : 1, '0');
  return h ? `${h}:${mm}:${String(s).padStart(2, '0')}` : `${mm}:${String(s).padStart(2, '0')}`;
}
export function slotNext(slotId: string | undefined): Slot | undefined {
  const i = agenda.findIndex((s) => s.id === slotId);
  return i >= 0 ? agenda[i + 1] : undefined;
}
export function talkSlots(): Slot[] {
  return agenda.filter((s) => s.kind === 'talk' || s.kind === 'panel' || s.kind === 'forum');
}
