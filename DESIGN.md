# DESIGN — NEXT 1.0 event runner

Rewritten on 3 Nov after the first pass was rejected. The source is now the NEXT teaser film
(`public/media/next-feature.mp4`) and the Campx design system it is built on (`campx-design-master`,
vendored in the simulation repo as `vendor/design-system/tokens.css`: Outfit display, Plus Jakarta Sans body,
Geist Mono labels, paper `#F6F5F0`, brand indigo `#1E027F`, coral `#E43341`, cross `#931C88`, dark accent `#8B86FF`). Every screen applies
these and nothing else.

## What the film establishes
- Two grounds: warm **paper** and deep **night**, alternating like chapters. Both carry a faint
  plus-mark grid, which is the identity's texture.
- **Corner chrome** in tracked monospace: Campx logo top left, `HYDERABAD · 05.11.2026` top right,
  a chapter label bottom left, a theme label bottom right. The content sits inside that frame.
- Headlines in a geometric sans, where the line that matters is full strength and the rest of the
  sentence fades. One phrase may carry a colour: indigo on paper, violet or coral on night.
- The **next** wordmark: lowercase, heavy, its x is the Campx two-arc mark (red, indigo, magenta
  overlap). This is the signature element and appears on the opening and closing screens only.
- Thin rules in the two arc colours (indigo left, red right) frame a label.

## Palette
| Token | Hex | Use |
|---|---|---|
| `--paper` | `#F6F5F0` | paper ground |
| `--ink` | `#0D0B14` | text on paper |
| `--ink-2` | `#5E5B69` | secondary text on paper (readable at 20 m) |
| `--ink-3` | `#9A97A3` | chrome labels on paper |
| `--fade` | `#CFCDC5` | faded words on paper (decorative only) |
| `--rule` | `#DEDCD4` | hairlines, grid marks, empty tracks on paper |
| `--night` | `#100E23` | night ground |
| `--night-2` | `#1B1931` | tracks and panels on night |
| `--snow` | `#FFFFFF` | text on night |
| `--snow-2` | `#A9A6BC` | secondary text on night |
| `--snow-3` | `#6B697E` | chrome labels on night |
| `--indigo` | `#1E027F` | the emphasis colour on paper; progress fill on paper |
| `--violet` | `#8B86FF` | the emphasis colour on night (design system dark accent); progress fill on night |
| `--red` | `#E43341` | the mark's red arm; countdown colon; topic numerals |
| `--coral` | `#F85A64` | the red on night |
| `--magenta` | `#931C88` | the mark's overlap only |

Which ground: talks and the panel are paper (lit hall, faces and names). Intros, breaks,
questions and the poll are night (the room is between things; the film's "questions" chapter
is night too). The interludes (film, simulation) are full bleed.

## Type
- **Outfit** (300–800), self-hosted: headlines, names, numbers, the clock.
- **Plus Jakarta Sans** (400–700), self-hosted: body copy, and all text on /join and /control.
- **Geist Mono** (400–700), self-hosted: chrome and labels only, uppercase, tracked +0.18em.

Stage scale (px on the 1920×1080 stage). Nothing the audience must read is under 28 px; chrome
labels (20–22 px) are orientation for the room, never the only place information lives.

| Role | Size / line | Weight | Tracking |
|---|---|---|---|
| display (break title, wordmark) | 160–320 | 600–800 | −0.04em |
| hero (speaker name, session title) | 112 / 1.0 | 600 | −0.035em |
| h1 | 72 / 1.08 | 500 | −0.03em |
| h2 | 48 / 1.2 | 400 | −0.02em |
| body (Plus Jakarta) | 36 / 1.35 | 400 | −0.01em |
| label (mono) | 22 / 1 | 600 | +0.18em, uppercase |
| countdown | 200 / 1 | 500, tabular | −0.04em |

## Frame and space
- Stage padding: chrome at 80 px from the edges; content starts at x = 140 and sits between
  y = 150 and y = 920.
- Top left: Campx logo. Top right: `HYDERABAD · 05.11.2026` and the IST clock.
- Bottom left: **now**, its times and a two-colour progress rule. Bottom centre: **next**.
  Bottom right: the QR to /join with "Scan to ask".
- A 3 px day strip runs along the very bottom: one segment per slot, elapsed time filled.
- Photos: square-cornered with 4 px radius, no frames, no shadows.

## Motion
- Slide change: 420 ms fade with a 16 px rise; headline words then resolve from faded to full in
  one 600 ms step. Nothing loops on the slides.
- Progress and the day strip advance once a second, linearly.
- `prefers-reduced-motion`: fades only.

## Interludes
- **Film:** `public/media/next-feature.mp4`, full screen, looping until stopped.
- **Simulation:** the Campx AI University simulation in a full-screen frame, URL in
  `content/event.json` (`interludes.simulation.url`).
- On the screen laptop: **V** film, **S** simulation, **Q** or **Esc** back to the slides (Q also works
  while the simulation has focus; Esc there belongs to the simulation). /control has the same buttons.
- The simulation is served from this site at `/sim/` (a static build of `campx-ai-university`), so it
  works offline in LAN mode too.

## Copy
Sentence case. Times as `10:30` (24-hour IST). "Campx", never "CampX". No exclamation marks in
runner copy (the film's own closing line is the film's).
