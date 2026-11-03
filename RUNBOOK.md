# RUNBOOK — NEXT 1.0, 5 November 2026

`<site>` below is the deployed address. PIN = the `CONTROL_PIN` set in Vercel.

| Who | Opens | Device |
|---|---|---|
| AV desk | `<site>/screen?pin=PIN` (once; the PIN is remembered) | projector laptop, Chrome |
| Operator | `<site>/control` | phone |
| Audience | the QR on screen → `<site>/join` | their phones |
| Backup | `exports/next-1.0-slides.pdf` | on the AV laptop **and** a USB stick |

## Night before (4 Nov)
1. Photos in `public/people/` and bios in `content/event.json`; redeploy. /control → *Content check* says nothing is missing.
2. Rehearse once end to end: Next through every slide, a test question, a test vote.
3. Export the PDF from the live site and copy it to the AV laptop and a USB stick:
   `npm run export:pdf -- <site>` (Chrome must be installed).
4. /control → *Data* → **Reset for the event** (type RESET). Clears test questions, votes, feedback; screen back to Registrations.
5. Scan the QR from the back row of the hall on a phone with mobile data off (venue wifi).

## Morning (by 08:00)
1. AV laptop: power plugged in, sleep and notifications off, display 1920×1080. Open `<site>/screen?pin=PIN` in Chrome, press **F** for full screen. The clock in the corner must match your phone.
2. Operator phone: open `/control`, enter PIN. Green dot = live. Tap *Registrations → Holding*.
3. Check: tap Next on the phone, the screen changes within 2 seconds; tap Previous to go back.

## Running the day
- **Each session:** after the previous one ends, tap **Next** → *Intro* slide (title, speaker, countdown to start). When the speaker walks up, **Next** → *Speaker* slide. The AV desk then switches to the speaker's PowerPoint and back to this window when they finish.
- **Breaks, lunch, high tea:** **Next** lands on the holding screen with a countdown to the restart. Running late? *Break timer* → 5/10/15 min, or type minutes. *Clear* returns to the schedule.
- **Announcements:** *Notice band* → pick a preset or type one → Show. Clear it after a minute.
- **Pulse poll:** *Open voting* (suggested: at the end of Keynote 1). *Show results on screen* whenever you like, *Back to agenda* returns to where you were. *Close voting* freezes the result.
- **Open Forum (15:30):** questions arrive under *Questions*, newest first. Nothing reaches the screen until you tap **Put on screen**. The first one is shown large, up to three more as the queue. **Answered** removes it. **Hide** removes an unsuitable one from your list. Questions can also be shown during any session: *Questions* button at the top.
- **Feedback:** *Open feedback now* at the start of Keynote 4 (16:20). It moves the form to the top of everyone's audience page.
- **Wrong slide:** tap any slide in *Running order*.

## When something fails
| Symptom | Do this |
|---|---|
| Phone taps don't change the screen; red dot on /control | Reload /control. Meanwhile the AV desk advances with the laptop's **→ / ←** keys or a USB clicker (PageDown/PageUp). While the network is up, the keys move /control too; offline they move only the screen, and the next tap on /control takes over again. |
| Venue wifi drops for the AV laptop | Do nothing: the screen keeps its slide and the clock keeps running from the laptop. Advance with the keyboard. A small grey dot bottom-right means it is not reaching the server. Do **not** reload the page while offline. |
| Screen page was closed or reloaded with no internet | Open `next-1.0-slides.pdf` full screen (one page per slide, in order) and page through it with the clicker. Tether the laptop to a phone hotspot to get /screen back. |
| No internet for the whole venue for a long time | On any laptop with the repo: `npm install` (once, beforehand) then `npm run local`. Open `http://<that-laptop-IP>:3000/screen` on the AV laptop and `/control` on a phone on the same wifi or hotspot. Audience features run only for people on that network. |
| Audience page slow | Expected under load; it refreshes every 15 s. The schedule on the page works without the network once loaded. |
| An unsuitable question | It is never on screen unless you put it there. Tap **Hide**. |
| Projector shows a cursor or a browser bar | Move the mouse off and wait 3 s; press **F** again. |

## After the event
- /control → *Data*: download Questions, Feedback and Poll CSVs.
- Deck links: add `{ "slot": "keynote-1", "title": "AI Forward Academics", "url": "https://…" }` entries to `decks.links` in `content/event.json`; redeploy. They appear on /join under Agenda and Presentations.
