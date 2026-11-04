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
| **A A A** | play the national anthem (Jana Gana Mana, from YouTube) full screen, once. Three presses within 2 s, so a stray key never starts it; after the first press the screen says *Press A twice more*. One **A** stops it. |
| **S** | open the Campx AI-University simulation full screen |
| **Q** or **Esc** | back to the slides (inside the simulation use **Q**; its own Esc flies the camera home) |
| **D** | open the deck of the session on screen in a new tab (Keynote 2, 3 and 4 have one); close the tab to return |
| M | film sound on/off |
| F | full screen |

The phone does the same from /control, under the screen preview: **Play film**, **National anthem** (asks to confirm), **Simulation**, **Back to slides**.

A projector that crops the edges of the picture: open `<site>/screen?safe=3` (any number 1–15, percent of the screen) to pull the whole stage in from every side.
Use the film before 09:30 and in breaks; the simulation in breaks and at lunch. Inside the
simulation: **T** opens the guided tours, **1–8** plays one, **A** plays all eight (about 6 min).

## Night before (4 Nov)
0. On the screen laptop, open the three deck links once (/control → *More* → *Decks*) and check they open without a login prompt. Keynote 4 (Venkat) is linked without a share key, so it opens only for someone signed in to its claude.ai organisation: sign the AV laptop in, or replace the link with a share link (`?sk=…`) in `content/event.json`; the decks live in a different claude.ai organisation, so sign that browser in to it if asked. As a backup, download each deck as a PDF from claude.ai (Share › Export) onto the laptop.
1. Photos in `public/people/` and bios in `content/event.json`; redeploy. /control → *Content check* says nothing is missing.
2. Rehearse once end to end: Next through every slide, a test question, a test vote.
3. Export the PDF from the live site and copy it to the AV laptop and a USB stick:
   `npm run export:pdf -- <site>` (Chrome must be installed).
4. /control → *Data* → **Reset for the event** (type RESET). Clears test questions, votes, feedback; screen back to Registrations.
5. Scan the QR from the back row of the hall on a phone with mobile data off (venue wifi).

## Morning (by 08:00)
1. AV laptop: power plugged in, sleep and notifications off, display 1920×1080. Open `<site>/screen?pin=PIN` in Chrome, press **F** for full screen. The clock in the corner must match your phone.
2. Operator phone: open `/control`, enter PIN. Green dot = live. *Agenda* tab → *Registrations → Holding*.
3. Check: tap Next on the phone, the screen changes within 2 seconds; tap Previous to go back.
4. Press **V** once on the laptop (this also unlocks sound for the day), check the film plays with sound through the hall speakers, press **Esc**. Press **A A A**, check the anthem starts with sound (it streams from YouTube, so this also checks the venue internet), press **Esc**. Press **S**, click once inside the simulation, check it moves smoothly, press **Q**.
5. Until 09:30: leave the film looping (**V**) or the *Registrations* screen up. It alternates every 20 s between the cover with the countdown and *The day at a glance* (the agenda and a QR that opens the agenda on phones).

## Running the day
/control: the screen block stays at the top as before (live preview, *On screen*, **Previous / Next**, *Play film*, *National anthem*, *Simulation*, then *Poll results*, *Questions*, *Question prompt*, *Open feedback*). Below it five tabs: **Agenda** (every slide, tap to jump), **Polls**, **Questions**, **Notice** (notice and timer), **More** (decks, feedback, content check, data). It remembers the tab.

- **Each session:** one slide per speaker. Put it up (**Next**) as soon as the previous session ends: until the start time it carries a *Starts in* chip beside the clock, which disappears when the session begins. The panel works the same way. The AV desk then switches to the speaker's PowerPoint and back to this window when they finish.
- **National anthem (09:45):** after the Welcome Address, **Next** lands on *Please rise for the National Anthem*. Once the hall is standing, press **A A A** (or *National anthem* on the phone and confirm). It plays once; when it ends press **Esc** (click outside the video first if you clicked on it), then **Next**.
- **Open Forum questions:** *Questions for the Open Forum?* (large QR) is in the running order three times: right after the anthem, when lunch ends, and after Campx Keynote 3. Leave it up while Manasa reminds the room to scan; phones with /join open jump to the Ask form. To put it up at any other moment: **Question prompt** under the screen (or in *Questions*), then **Back to agenda**. The questions collect in *Questions* for the Open Forum at 15:30.
- **Pulse poll (14 questions), morning to afternoon:** *Polls* → **Open voting** in the morning. Phones go through the questions one by one: answer or *Skip*, a 2-second look at how the room answered, a progress bar, and at the end a summary with their own answers marked (they can go back to the ones they skipped). The tab shows people, answers and how long voting has been open, with bars and the leading answer per question. Nothing on the screen asks for votes except the results.
- **Lunch (13:15):** **Next** onto *Lunch* puts up the results wall: every question as a card, two columns, scrolling slowly on a loop, with the number of people who have answered, the QR to vote (while voting is open) and the time we resume. Lunch no longer opens or closes voting.
- **Results in the afternoon:** *Polls* → **Show results on screen** (the same scrolling wall), then **Close voting** (asks to confirm) to freeze the numbers. **Back to agenda** returns. *Add a question* adds one to the set during the day (removable); *Clear votes* clears every question.
- **Breaks, high tea:** **Next** lands on the break slide with a countdown to the restart.
- **Timer:** *Notice* tab → *Timer*: pick a label (*We resume in*, *Starting in*, *Lunch ends in*, *Session ends in*), then 2/5/10/15/30 min or type minutes and *Start timer*. It counts down on every slide: as the big number on intro, break and opening slides, as a pill at the top on the others. *Stop timer* returns to the schedule; it also clears itself a minute after it ends.
- **Announcements:** *Notice* tab → pick a preset or type one → Show. The slide shrinks to the left and the notice fills an indigo panel on the right; phones show it at the top of *Now*. **Clear** after a minute.
- **Phones follow the screen:** opening voting or showing results sends /join to the poll; a question prompt or questions slide sends it to the Ask form; any other slide returns it to the normal page. The QR on the results wall opens the poll, the one on question slides opens the form; other slides carry one general QR.
- **Open Forum (15:30):** the screen shows only the *Open Forum* slide. The questions sent during the day are in *Questions* (newest first) for whoever reads them out; **Answered** and **Hide** tidy the list.
- **Feedback:** **Open feedback** (under the screen preview) at the start of Keynote 4 (16:20). It moves the form to the top of everyone's audience page.
- **Decks (Keynote 2, Bala; Keynote 3, Ketan; Keynote 4, Venkat):** they are claude.ai decks, so they open in a browser tab. On the screen laptop, with that session's slide up, press **D**: the deck opens in a new tab; present it from there and close the tab to come back to the runner. *More* → *Decks* (and *Open deck* beside each session in *Agenda*) has the same links for a presenter's laptop.
- **Sharing decks:** after the talks, *More* → *Decks* → **Share decks with the audience** puts the links on /join (Agenda and Presentations). Off until then.
- **Audience Watch tab:** /join → *Watch* has the NEXT film (loads only when someone presses play) and a link to the AI-University simulation.
- **Wrong slide:** tap any slide in *Agenda*.

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
| Projector cuts off the edges (a number or the QR is clipped) | Reopen as `<site>/screen?safe=3` (raise the number until everything shows). |
| Film plays without sound | Press **M** on the laptop. Browsers hold sound until someone presses a key on the page; the morning check covers it. |
| Simulation is slow or stutters | Close it (**Q**) and keep it for breaks only. It needs a laptop with a real graphics chip. |

## After the event
- /control → *Data*: download Questions, Feedback and Poll CSVs.
- Deck links: add `{ "slot": "keynote-1", "title": "AI Forward Academics", "url": "https://…" }` entries to `decks.links` in `content/event.json`; redeploy. They appear on /join under Agenda and Presentations.
