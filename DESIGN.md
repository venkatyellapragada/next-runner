# DESIGN — NEXT 1.0 event runner

Third pass (3 Nov, evening). Built on two sources:
- **The Campx Design System** (claude.ai artifact "Campx Design System", `@campx-org/doc-design-system`): its
  tokens, type and slide rules, exactly.
- **How Claude lays out decks** (the Slides type's craft rules): generous margins, the heading pinned to the top
  margin, one footer row, one idea per slide, statements over bullets, one accent moment, toned grounds.

## Rules taken from the Campx Design System
- White ground, near-black ink, one working colour: **indigo**. Eyebrows, rules, markers, progress, the "now".
- The coral → magenta → indigo **brand gradient** is the signature and is rationed: **one gradient element per
  slide** (the opening cover, or the hero countdown). Never two.
- One family, **Hanken Grotesk**: display 800, headings 700, sub-heads 600, body 400. **JetBrains Mono** is the
  second voice for eyebrows (`§ 03 · CAMPX KEYNOTE 1`), labels and the clock's meta. No italics.
- Sentence case. The middot `·` separates meta. Tabular figures. No exclamation marks, no emoji.
- Cards: 1 px `rule` border, 14 px radius, no shadows. Tinted panels in `bg-2`.

## Rules taken from Claude's decks
- Margins 128 px left and right; the eyebrow and heading sit at the top margin, never centred with the body.
- One idea per slide; a statement or a big number beats a list.
- Two grounds (white and `bg-2`) and one accent statement slide (the gradient cover).
- One type scale of five sizes; emphasis by weight or the indigo, not by a new size.
- One footer row: now, next, the QR.

## Palette
| Token | Hex | Use |
|---|---|---|
| `--paper` | `#FFFFFF` | every slide ground; /join and /control |
| `--bg-2` | `#F1F3FA` | break slides, panels (QR panel, cards on /join) |
| `--ink` | `#0A0A0A` | headings and body |
| `--ink-2` | `#525252` | secondary text (7.8:1) |
| `--ink-3` | `#737373` | eyebrow labels, meta, footer (4.7:1) |
| `--rule` | `#E5E5E5` | hairlines, card borders, progress track |
| `--rule-strong` | `#A1A1A1` | non-leading poll bars |
| `--indigo` | `#1E027F` | the working colour |
| `--coral` | `#C24548` | gradient start only |
| `--magenta` | `#822C79` | gradient middle only |
| `--brand-gradient` | `135deg, #C24548 → #822C79 → #1E027F` | the cover; the hero countdown's fill |

## Type scale on the stage (px)
| Role | Size / line | Weight |
|---|---|---|
| display (cover, break) | 160–220 / 0.95 | 800, −0.035em |
| title (session, name) | 104–120 / 1.0 | 800, −0.03em |
| heading | 56–64 / 1.1 | 700, −0.02em |
| body | 32–40 / 1.3 | 400 / 600 |
| eyebrow (mono) | 22 / 1.2 | 500, +0.14em, uppercase |
| hero number | 240 / 1 | 800, tabular, gradient fill |

## Frame
- The stage is 1920 wide and as tall as the screen's shape needs (1080 at 16:9, 1200 at 16:10), or
  1080 tall and wider on a very wide screen. Nothing is letterboxed: content is anchored to the edges.
- Top row (64 px from the top): Campx lockup left; `HYDERABAD · 05.11.2026` and the IST clock right.
- Content between y = 176 and 210 px above the bottom, x = 128 to width − 128.
- Footer row above a hairline: **Now** (eyebrow, title, indigo progress), **Next**, then the QR to /join.
- Photos: 14 px radius, no frame, no shadow. Missing photo = initials on `bg-2`.

## Motion
420 ms fade-and-rise on slide change; headline resolves from 20% to full in 600 ms. Progress advances once a
second. Reduced motion: fades only. Nothing loops.

## Interludes
The NEXT film (**V**) and the Campx AI-University simulation (**S**, served from `/sim/`), full screen; **Q** or
**Esc** returns to the slides. /control has the same buttons.
