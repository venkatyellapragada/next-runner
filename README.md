# NEXT 1.0 — event-day runner

One web app for NEXT 1.0 (New Education eXperience and Transformation), Campx, 5 November 2026,
Google Hyderabad, Kondapur.

| Route | Who | What |
|---|---|---|
| `/screen` | projector | slides for every agenda slot, header with clock, agenda tracker and QR |
| `/control` | the person running the day (phone, PIN) | next/previous, jump, poll, questions, break timer, notice |
| `/join` | audience, via the QR (no login) | now and agenda, speaker bios, ask a question, pulse poll, feedback, decks |
| `/print` | AV desk | every slide on one page each, for the PDF fallback |
| `/sim/` | screen (interlude) | the Campx AI-University simulation, a static build served from `public/sim` |

Day-of instructions: **RUNBOOK.md**. Look and feel: **DESIGN.md**.

## Stack, and why
- **Next.js on Vercel.** One framework for the three pages and the small API; `vercel --prod` deploys it.
- **State in one Upstash Redis database** (Vercel Marketplace, free tier), spoken to over its REST API
  with plain `fetch`: no socket server, no SDK. The whole live state is one small JSON document.
- **Polling, not websockets.** /screen polls every second, /control every 1.5 s, /join every 15 s
  through the CDN (cached 5 s, so 300 phones cost the database one read per region every 5 s).
  Polling has nothing to reconnect: if wifi drops for a minute, the next request simply works.
- **The agenda is bundled, not fetched.** `content/event.json` is compiled into the pages, so the
  screen keeps its clock, agenda tracker and current slide if the network dies; only remote
  control stops. The projector laptop's keyboard (or a USB clicker) still advances slides.
- **No Redis configured → in-memory store.** That is what `npm run local` uses to run the whole
  thing on one laptop on the venue LAN with no internet.
- **PDF fallback:** `npm run export:pdf` renders `/print` into `exports/next-1.0-slides.pdf`
  (plus one PNG per slide). A copy is committed.

## Data model
- `content/event.json` — event, people, agenda slots, polls, roles, interludes, deck links. Edit and redeploy.
- Live state (Redis key `next1:state`): `{ v, slideId, returnTo, poll: {id, open}, questions: [shown],
  timer: {endsAt, label}, notice, feedbackOpen, overlay }`. `v` increments on every change.
- Polls: `polls` in `content/event.json`, plus polls added from /control (Redis `next1:polls`). Votes per poll in
  `next1:votes:<id>`, one per device (`next1:voters:<id>`).
- Audience data (Redis): questions list plus a status per question, poll votes hash plus a
  voter set, feedback list. Exported as CSV from /control.

Slides are derived from the agenda: a talk gives a *transition* and a *speaker* slide, the panel a
*transition* and a *panel* slide, breaks and registration a *holding* slide, the Open Forum a
*transition* and the *questions* slide. *Poll results* and *questions* can be put on screen at any time
from /control and return to where you were.

## Interludes
- The NEXT film: `public/media/next-feature.mp4` (poster `next-feature-poster.jpg`). Replace the file to change it.
- The simulation: a static export of `venkatyellapragada/campx-ai-university`, built under `/sim` and committed in
  `public/sim`. To refresh it after the simulation changes: check it out next to this repo, then
  `node scripts/update-sim.mjs` and commit `public/sim`.
- Speaker decks: `deck: { title, url }` on a session in `content/event.json`. **D** on /screen opens the current session's deck in a new tab; /control links them and can share them on /join.
- Keys and buttons: RUNBOOK.md.

## Editing content
- Agenda, titles, topics, bios, deck links: `content/event.json`.
- Photos: drop `public/people/<person-id>.jpg` (ids are the keys under `people` in event.json;
  `public/people/README.md` lists every expected filename). Any portrait works; it is cropped
  to fill. Until a file exists the person shows as initials. /control → "Content check" lists what is missing.

## Commands
```
npm install
npm run dev              # http://localhost:3000, in-memory store
npm run local            # production build served on the LAN (0.0.0.0:3000), in-memory store
npm run export:pdf       # needs the app running (dev or local); writes exports/
npx vercel --prod        # deploy
```

## Deploy (once)
1. Push this repo to GitHub and import it in Vercel (or link it with `npx vercel link`). Framework: Next.js, no settings to change.
2. Vercel project → *Storage* → *Create* → **Upstash Redis** (Marketplace, free plan) → connect it to the project. This adds `KV_REST_API_URL` and `KV_REST_API_TOKEN`.
3. Vercel project → *Settings* → *Environment Variables* → `CONTROL_PIN` (production).
4. Redeploy. /control's status line must read "shared store"; "in-memory store" means step 2 is missing, and the three surfaces will not share state on Vercel.

## Environment
| Variable | Needed | Notes |
|---|---|---|
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | on Vercel | set automatically when an Upstash Redis store is connected to the project (`UPSTASH_REDIS_REST_URL` / `_TOKEN` also accepted) |
| `CONTROL_PIN` | yes | PIN for /control and the CSV exports; without it the PIN is `0000` and /control says so |
| `NEXT_PUBLIC_JOIN_URL` | optional | URL printed under the QR; defaults to the current origin + `/join` |
