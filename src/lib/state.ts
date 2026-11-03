// The live state: one small JSON document. Every change goes through `reduce`, and `v`
// increments on every change so /screen can tell a new command from an old one.
import { clockSlot, FIRST_SLIDE, seedPolls, slideById, slideIndex, slides, slotById, type Poll, type Slot } from './event';

export type Overlay = 'video' | 'sim' | null;
export type ShownQuestion = { id: string; text: string; name?: string; role?: string; org?: string };
export type LiveState = {
  v: number;
  slideId: string;
  /** Where to go back to after poll results or questions were put up out of order. */
  returnTo: string | null;
  /** The current poll (one at a time): the one phones answer and the results slide shows. */
  poll: { id: string; open: boolean };
  /** Questions picked on /control, in the order they appear on screen. The first is "now". */
  questions: ShownQuestion[];
  /** A break countdown started from /control; overrides the scheduled end on holding screens. */
  timer: { endsAt: number | null; label: string };
  /** A one-line announcement shown along the bottom of the screen. */
  notice: string;
  feedbackOpen: boolean;
  /** A full-screen interlude over the slides: the teaser film or the simulation. */
  overlay: Overlay;
  updatedAt: number;
};

export const initialState: LiveState = {
  v: 0,
  slideId: FIRST_SLIDE,
  returnTo: null,
  poll: { id: seedPolls[0]?.id ?? '', open: false },
  questions: [],
  timer: { endsAt: null, label: '' },
  notice: '',
  feedbackOpen: false,
  overlay: null,
  updatedAt: 0,
};

export type Action =
  | { type: 'next' }
  | { type: 'prev' }
  | { type: 'go'; slideId: string }
  | { type: 'show'; slideId: 'poll' | 'questions' }
  | { type: 'back' }
  | { type: 'poll'; open: boolean }
  | { type: 'poll-select'; id: string }
  | { type: 'q-show'; q: ShownQuestion }
  | { type: 'q-unshow'; id: string }
  | { type: 'q-first'; id: string }
  | { type: 'q-clear' }
  | { type: 'timer'; minutes: number | null; label?: string }
  | { type: 'notice'; text: string }
  | { type: 'feedback'; open: boolean }
  | { type: 'overlay'; overlay: Overlay }
  | { type: 'reset' };

const MAX_SHOWN = 4;

function inOrder(id: string | null): string {
  return id && slideIndex(id) >= 0 ? id : FIRST_SLIDE;
}

export function reduce(s: LiveState, a: Action, now: number): LiveState {
  const n: LiveState = { ...s, v: s.v + 1, updatedAt: now };
  switch (a.type) {
    case 'next':
    case 'prev': {
      // With an interlude up, the first press only returns to the slide underneath.
      if (s.overlay) return { ...n, overlay: null };
      if (slideIndex(s.slideId) < 0) return { ...n, slideId: inOrder(s.returnTo), returnTo: null };
      const i = slideIndex(s.slideId) + (a.type === 'next' ? 1 : -1);
      return { ...n, slideId: slides[Math.min(slides.length - 1, Math.max(0, i))].id };
    }
    case 'go':
      return slideById(a.slideId) ? { ...n, slideId: a.slideId, returnTo: null, overlay: null } : s;
    case 'overlay':
      return { ...n, overlay: a.overlay };
    case 'show':
      return {
        ...n,
        slideId: a.slideId,
        overlay: null,
        returnTo: slideIndex(s.slideId) >= 0 ? s.slideId : s.returnTo,
      };
    case 'back':
      return { ...n, slideId: inOrder(s.returnTo ?? s.slideId), returnTo: null };
    case 'poll':
      return { ...n, poll: { ...s.poll, open: a.open } };
    case 'poll-select':
      // Switching polls closes voting, so nobody answers the new question by accident.
      return s.poll.id === a.id ? s : { ...n, poll: { id: a.id, open: false } };
    case 'q-show':
      if (s.questions.some((q) => q.id === a.q.id)) return s;
      return { ...n, questions: [...s.questions, a.q].slice(-MAX_SHOWN) };
    case 'q-unshow':
      return { ...n, questions: s.questions.filter((q) => q.id !== a.id) };
    case 'q-first': {
      const q = s.questions.find((x) => x.id === a.id);
      return q ? { ...n, questions: [q, ...s.questions.filter((x) => x.id !== a.id)] } : s;
    }
    case 'q-clear':
      return { ...n, questions: [] };
    case 'timer':
      return {
        ...n,
        timer: a.minutes ? { endsAt: now + a.minutes * 60000, label: a.label ?? '' } : { endsAt: null, label: '' },
      };
    case 'notice':
      return { ...n, notice: a.text.slice(0, 120) };
    case 'feedback':
      return { ...n, feedbackOpen: a.open };
    case 'reset':
      return { ...initialState, v: s.v + 1, updatedAt: now };
  }
}

export type StatePayload = {
  state: LiveState;
  now: number;
  /** The current poll's question and options. */
  pollDef?: Poll;
  /** Votes per option index of the current poll; present while it is open or on screen. */
  votes?: number[];
};

/** The slot the room is in: the current slide's, else the one we left for poll/questions, else the clock's. */
export function activeSlot(state: LiveState, now: number): Slot | undefined {
  return slotById(slideById(state.slideId)?.slotId) ?? slotById(slideById(state.returnTo)?.slotId) ?? clockSlot(now);
}


/** A break timer counts until a minute after it ends, then lets the schedule take over again. */
export function timerActive(s: LiveState, now: number): boolean {
  return !!s.timer.endsAt && s.timer.endsAt > now - 60000;
}
