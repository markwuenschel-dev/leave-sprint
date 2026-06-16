# Leave Sprint Dashboard

Single-file HTML dashboard tracking a 29-day career transition sprint (June 17 – July 15 2026). Open `index.html` in any browser — no build step, no server, no dependencies.

---

## Deploy to Netlify (2 minutes)

1. Rename `unified_schedule.html` → `index.html`
2. Go to **app.netlify.com/drop**
3. Drag the file onto the page
4. Bookmark the URL you get

To update: drag a new version onto the same drop URL, or connect a GitHub repo for auto-deploy on push.

---

## Tabs

| Tab | What it does |
|---|---|
| **Week by Week** | Full day-by-day leave sprint schedule — 4 weeks, 29 days, all four daily disciplines |
| **Daily Rhythm** | Time budget, today's session strip (live during sprint), stop rules |
| **Workbench Modules** | Per-layer build progression across all six project tracks |
| **Coding Bank & Refs** | Tier A–D problem bank (31 problems), 20-file defense map, applications tracker |
| **📅 Calendar** | June + July 2026 grid — click any sprint day cell to see the full day detail inline |
| **📚 Q Bank** | 60 structured interview questions across SWE I, MLE I, DS I, DE I with progressive reveal |

---

## Features

**Auto-jump to today** — on load, the page opens the current leave week, scrolls to today's day block, and attaches a `← TODAY` label. The `Day N` button in the tab bar re-triggers this at any time.

**Checkboxes** — every task in the 29 sprint day blocks has a checkbox. The three core disciplines (Code · File · Q&A) gate the day-done counter. Build tasks are tracked separately. All state persists across sessions.

**Today card** — compact strip above the tabs showing today's four tasks with synced checkboxes. Same state as the day block — checking one updates the other.

**Sprint dashboard** — days done, problems solved, current streak, days until applications. Milestone bar: Mock #1 (Day 21) · Applications (Day 22) · Mock #2 (Day 26) · Sprint End (Day 29).

**Calendar detail panel** — clicking a sprint day cell (D1–D29) opens a full task panel below the calendar without navigating away. Each task has a synced checkbox and a **↗ Go to day block** button.

**Practice Mode** (Coding Bank tab) — 26 Q&A questions, 20 file defense prompts, and 29 coding prompts extracted live from the schedule. Shuffle, reveal, keyboard navigation.

**Q Bank** (Q Bank tab) — 60 Level I foundation questions across four tracks. Each card has a compressed answer, optional full detail, follow-up question with its own reveal, project tie-in, and trap to avoid. Mark questions mastered or flagged for review.

**Journals** — collapsible textarea at the bottom of each sprint day block. Autosaves 700ms after last keystroke. Mock interview days (21, 26) and retro days (7, 14) have context-specific placeholder text.

**Themes** — 🌙 Dark · ☀️ Light · 💻 System. Preference persists in localStorage. Applies before first paint to prevent flash.

---

## Keyboard shortcuts

| Keys | Action |
|---|---|
| `Space` | Reveal answer (Practice Mode / Q Bank) |
| `← →` | Previous / next question |
| `Enter` | Advance after reveal |
| `M` | Toggle mastered (Q Bank) |
| `R` | Toggle review (Q Bank) |

---

## localStorage keys

| Key | Stores |
|---|---|
| `cqw-sprint-v1` | Task checkboxes, journal text, coding bank solved state |
| `cqw-qbank-v1` | Q Bank mastered / review status per question |
| `cqw-theme` | `dark` · `light` · `system` |

State is per-browser and per-device. To transfer between devices, copy the localStorage values via browser devtools (`Application → Local Storage`).
