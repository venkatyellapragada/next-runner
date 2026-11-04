# RUNBOOK — NEXT 1.0, 5 November 2026

Live site: **https://next-runner.vercel.app** (`<site>` below). PIN = the `CONTROL_PIN` set in Vercel (project `next-runner`, team venkat-2195s-projects).

| Who | Opens | Device |
|---|---|---|
| AV desk | `<site>/screen?pin=PIN` (once; the PIN is remembered) | projector laptop, Chrome |
| Operator | `<site>/control` | phone |
| Audience | the QR on screen → `<site>/join` | their phones |
| Backup | `exports/next-1.0-slides.pdf` | on the AV laptop **and** a USB stick |

## Keys on the screen laptop
| Key | Does |
|---|---|
| → / PageDown / Space | next slide (a clicker works) |
| ← / PageUp | previous slide |
| **V** | play the NEXT film full screen (loops, with sound) |
| **S** | open the Campx AI-University simulation full screen |
| **Q** or **Esc** | back to the slides (inside the simulation use **Q**; its own Esc flies the camera home) |
| **D** | open the deck of the session on screen in a new tab (Keynote 2 and Keynote 3 have one); close the tab to return |
| M | film sound on/off |
| F | full screen |

The phone does the same from /control: **Play film**, **Simulation**, **Back to slides**.
Use the film before 09:30 and in breaks; the simulation in breaks and at lunch. Inside the
simulation: **T** opens the guided tours, **1–8** plays one, **A** plays all eight (about 6 min).

## Night before (4 Nov)
0. On the screen laptop, open both deck links once (/control → *Decks*) and check they open without a login prompt; the decks live in a different claude.ai organisation, so sign that browser in to it if asked. As a backup, download each deck as a PDF from claude.ai (Share › Export) onto the laptop.
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
4. Press **V** once on the laptop (this also unlocks sound for the day), check the film plays with sound through the hall speakers, press **Esc**. Press **S**, click once inside the simulation, check it moves smoothly, press **Q**.
5. Until 09:30: leave the film looping (**V**) or the *Registrations* holding screen up.

## Running the day
- **Each session:** after the previous one ends, tap **Next** → *Intro* slide (title, speaker, countdown to start). When the speaker walks up, **Next** → *Speaker* slide. The AV desk then switches to the speaker's PowerPoint and back to this window when they finish.
- **Breaks, lunch, high tea:** **Next** lands on the holding screen with a countdown to the restart.
- **Timer:** /control → *Timer*: pick a label (*We resume in*, *Starting in*, *Lunch ends in*, *Session ends in*), then 2/5/10/15/30 min or type minutes and *Start timer*. It counts down on every slide: as the big number on intro, break and opening slides, as a pill at the top on the others. *Stop timer* returns to the schedule; it also clears itself a minute after it ends.
- **Announcements:** *Notice band* → pick a preset or type one → Show. Clear it after a minute.
- **Pulse poll (4 questions):** /control → *Pulse poll* → **Open voting**. Phones go through all four questions one after another (one answer per question per phone); the Ask button appears only after the last answer. **Show results on screen** puts all four questions up with percentages; *Back to agenda* returns. **Close voting** freezes the result. *Add a question* adds one to the set during the day (removable); *Clear votes* clears every question.
- **Phones follow the screen:** opening voting or showing results sends /join to the poll; the questions slide or the Open Forum sends it to the Ask form; any other slide returns it to the normal page. The QR on the results slide opens the poll, the one on the questions slide opens the form; other slides carry one general QR.
- **Open Forum (15:30):** questions arrive under *Questions*, newest first. Nothing reaches the screen until you tap **Put on screen**. The first one is shown large, up to three more as the queue. **Answered** removes it. **Hide** removes an unsuitable one from your list. Questions can also be shown during any session: *Questions* button at the top.
- **Feedback:** *Open feedback now* at the start of Keynote 4 (16:20). It moves the form to the top of everyone's audience page.
- **Decks (Keynote 2, Bala; Keynote 3, Ketan):** they are claude.ai decks, so they open in a browser tab. On the screen laptop, with that session's intro or speaker slide up, press **D**: the deck opens in a new tab; present it from there and close the tab to come back to the runner. /control → *Decks* (and *Open deck* beside each session) has the same links for a presenter's laptop.
- **Sharing decks:** after the talks, /control → *Decks* → **Share decks with the audience** puts the links on /join (Agenda and Presentations). Off until then.
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
| Film plays without sound | Press **M** on the laptop. Browsers hold sound until someone presses a key on the page; the morning check covers it. |
| Simulation is slow or stutters | Close it (**Q**) and reopen with lower quality: set the URL in `content/event.json` to `/sim/index.html?quality=low`, or keep it for breaks only. It needs a laptop with a real graphics chip. |

## After the event
- /control → *Data*: download Questions, Feedback and Poll CSVs.
- Deck links: add `{ "slot": "keynote-1", "title": "AI Forward Academics", "url": "https://…" }` entries to `decks.links` in `content/event.json`; redeploy. They appear on /join under Agenda and Presentations.
