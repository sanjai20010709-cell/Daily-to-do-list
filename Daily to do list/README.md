# Daily Self Development

A personal daily habit checklist and journal — no backend, no build step, no
frameworks. Just three files and your browser's local storage.

## 1. Project structure

```
habit-tracker/
├── index.html   ← page structure (all four tabs: Today, History, Statistics, Settings)
├── style.css    ← design system (light + dark theme, layout, animations)
├── script.js    ← all app logic (storage, dates, streaks, rendering)
└── README.md    ← this file
```

## 2. Running it locally

No installation needed.

- **Simplest:** double-click `index.html` and it opens in your browser.
- **Recommended (avoids some browsers' local-file quirks):** serve the folder
  with any static server, e.g.:

  ```bash
  cd habit-tracker
  python3 -m http.server 8000
  ```

  then open `http://localhost:8000` in your browser.

Your data lives in that browser's local storage, tied to the page's origin —
so use the same browser (and, if you host it, the same URL) each time you
want to see your history.

## 3. How to add, rename, or remove an activity

All activities are defined in **one place** in `script.js` — the
`ACTIVITIES` array near the top of the file:

```js
const ACTIVITIES = [
  { id: "meditation", name: "Meditation", icon: "🧘",
    detailLabel: "Duration", detailPlaceholder: "e.g. 15 minutes" },
  // ...
];
```

- **Add an activity:** copy one of the objects, give it a unique `id`
  (used internally, never shown), a `name`, an `icon` (any emoji), and an
  optional `detailLabel`/`detailPlaceholder` for its optional detail field.
- **Remove an activity:** delete its object from the array.
- **Skip an activity on a specific weekday** (like Gym on Sundays): add
  `sundaySkip: true`. The `applicableActivitiesForKey()` function is what
  reads that flag — you could extend it to skip on other days too.
- The checklist, progress math, streaks, history, and weekly report all read
  from this single array, so you never need to touch the HTML or CSS to
  change your list of habits.

## 4. How local storage is used

Everything is stored under a few keys in `localStorage`:

- **`dsd_daily_data`** — one JSON object keyed by date (`"2026-08-17"`),
  each holding that day's `activities` (true/false per habit), optional
  `details` (free text per habit), and `notes`. A day is only written once
  you actually interact with it (check a box, add a detail, or save notes) —
  so opening the app on a new day never overwrites anything.
- **`dsd_theme`** — `"light"` or `"dark"`, remembered across visits.
- **`dsd_weekly_reports`** — a saved snapshot of each *closed* week's report
  (Monday–Sunday), written automatically once that week's Sunday has passed.

Because storage is keyed by date string, today's changes can never overwrite
yesterday's — each day is its own independent record, and old records are
never deleted automatically.

**Export/Import** (in Settings) reads and writes this same data as a single
JSON file, so you can back it up or move it to another browser.

## 5. How the streak calculation works

A day counts as "successful" when every *applicable* activity for that day
is checked — 7/7 on a normal day, or 6/6 on a Sunday (Gym doesn't count
against you on Sundays).

- **Best streak:** the app looks across all saved days in order and finds
  the longest run of *consecutive calendar dates* that were all successful.
- **Current streak:** it starts at today and walks backward one day at a
  time, counting while each day was successful, and stops at the first day
  that wasn't. If today isn't finished yet, it starts counting from
  yesterday instead — so an in-progress day never resets your streak display
  before the day is over.

## 6. How daily records stay separate by date

Every read and write goes through a date key like `2026-08-17`
(`YYYY-MM-DD`, based on your local time zone, not UTC — so it always
matches your own calendar day). Today's view only ever reads and writes the
key for today's date; History and Statistics read other keys but never
write to them. That's what guarantees August 17 and August 18 can never
overwrite each other, and why a fresh day always starts fully unchecked.

## 7. What was tested

- Checking / unchecking each activity, including the disabled Gym checkbox
  on Sundays
- Progress count and progress bar updating immediately on every toggle
- The "all 7 (or 6 on Sunday) complete" celebration message
- Notes saving per-date, with the confirmation message, and surviving a
  page refresh
- Opening the app on a new day: yesterday's checks do not carry over
- History table listing every saved day with correct completed/percentage,
  and the read-only detail view for a past day
- Current and best streak across multi-day sequences, including a broken
  streak and the Sunday exception
- Weekly summary math (activities completed, average %, perfect days) and
  the Monday–Sunday day-by-day breakdown, including the Sunday 6-activity
  adjustment
- Monthly summary aggregation
- Dark/light theme toggle and persistence
- Export to JSON and re-importing that same file
- "Clear all data" confirmation dialog and the resulting reset
- Responsive layout at mobile widths

## 8. Notes on the design

The interface leans into a personal-journal feel rather than a productivity
dashboard: a moss/ink color palette, a serif display face (Fraunces) for
headings, monospace figures for dates and stats (like ledger entries), and
a small stamp-style animation on the checkbox when you complete a habit.
Nothing here reflects your actual data — it's just the visual language of
the app, so feel free to restyle `style.css` (all colors are CSS variables
at the top of the file, under `:root` and `html[data-theme="dark"]`).
