# DESIGN — NEXT 1.0 event runner

Decided before any screen was built. Every screen applies these and nothing else.

## Source of the brand
campx.in itself (read from the team's `campx-website` production deployment on 3 Nov 2026):
deep indigo `#1E027F` as the brand colour, the two-arc ✕ mark in red `#E43341` and indigo,
Google Sans for headings, Plus Jakarta Sans for text, white surfaces, grey ink, uppercase
eyebrows tracked wide (+0.24em) above tight headlines (−0.025 to −0.035em). The tone is
operator-plain: short declaratives, no exclamation marks ("AI-first, unified, live in 8 weeks").
The Campx wordmark is the artwork from Campx's own design system (react-blueprint `LogoCampx`).

## Principles
1. **Read from 20 metres.** The big screen is a fixed 1920×1080 stage scaled to the projector.
   Nothing the audience must read is smaller than 28 px on that stage; eyebrow labels (24 px)
   are the only exception and are never the only carrier of meaning.
2. **One idea per slide.** A slide answers one question: who is speaking, what is next, how long
   is the break, what did the room say.
3. **Hierarchy by size and weight, not colour.** Ink is near-black; indigo marks the single
   thing that is "now". Red exists only inside the logo.
4. **One signature element per screen.** The Campx wordmark in the header is the signature.
   Slides are typographic: no gradients, no glows, no shapes for decoration, no emoji.
5. **Restraint in motion.** Content changes; chrome does not move.

## Palette (light theme)
| Token | Hex | Use |
|---|---|---|
| `--ink` | `#101828` | all primary text |
| `--ink-2` | `#364153` | secondary text on /screen (projector-safe; lighter greys wash out) |
| `--ink-3` | `#6A7282` | meta text on /control and /join only |
| `--line` | `#E5E7EB` | hairlines, empty progress |
| `--tint` | `#F6F7F9` | quiet panels, photo placeholders |
| `--surface` | `#FFFFFF` | every background |
| `--brand` | `#1E027F` | eyebrows, "now" marker, progress fill, countdown, leading poll bar |
| `--brand-tint` | `#EEF0FF` | selected rows on /control and /join, "now" row |
| `--mark-red` | `#E43341` | the logo's ✕ only |
| `--danger` | `#C81E2E` | destructive buttons on /control only |
| `--ok` | `#2F7D32` | "connected" dot on /control only |

## Type
- **Display / headings / numerals:** Google Sans (400, 500, 700), self-hosted in `public/fonts`
  so the screen renders identically with no internet. Clock and countdowns use tabular figures.
- **Text:** Plus Jakarta Sans (400, 600), self-hosted.

Stage scale (px on the 1920×1080 stage):

| Role | Size / line | Weight | Tracking |
|---|---|---|---|
| hero (speaker name, session title on its own slide) | 104 / 1.02 | 500 | −0.03em |
| h1 (session title under a name, break heading) | 72 / 1.08 | 500 | −0.025em |
| h2 (person title, poll question, current question) | 48 / 1.2 | 500 | −0.02em |
| body (topics, queue questions) | 36 / 1.35 | 400 Jakarta | −0.01em |
| meta (times, institutions, header) | 28 / 1.3 | 500 | 0 |
| eyebrow | 24 / 1 | 600 Jakarta, uppercase | +0.24em, `--brand` |
| countdown | 200 / 1 | 500 tabular | −0.04em |

/join and /control use the same families at phone sizes: 15 px body, 13 px meta, 22–28 px titles.

## Space
- 8 px grid. Stage gutters 112 px left/right. Header 120 px, then a 6 px day strip.
- Content block starts 96 px below the strip; columns separated by 64 px.
- Corner radius 4 px on photos, panels and buttons. No shadows on /screen; one 1 px line where a
  separation is needed.
- Photos: speaker portrait 4:5 at 480×600; panel tiles 1:1 at 184 px; moderator 240 px.
  A missing photo renders initials on `--tint`, which reads as deliberate if the file never arrives.

## Persistent header (every /screen slide)
Left: event name "NEXT 1.0" (Google Sans 700) and the Campx wordmark. Centre: the agenda tracker,
"Now" and "Next" with times. Right: QR code to /join and the IST clock (HH:MM, tabular).
Under the header, the **day strip**: one segment per agenda slot, width proportional to duration;
past slots `--brand`, the current slot filled by elapsed time, future slots `--line`.

## Motion
- Slide change: 360 ms opacity fade with a 12 px rise, ease-out. Nothing else animates on entry.
- Progress bars and the day strip advance once a second with a linear 1 s width transition.
- Clocks and countdowns change in place, no ticking animation. No loops, no pulses.
- `prefers-reduced-motion`: fades only.

## Copy
Sentence case for headings. Times as `10:30` (24-hour, IST, never "AM/PM" on /screen).
"Campx", never "CampX". No exclamation marks.
