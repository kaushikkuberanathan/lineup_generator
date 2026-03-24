# Lineup Generator — Product Roadmap

> Last updated: March 24, 2026
> MVP launched: March 24, 2026

---

## ✅ MVP — Launched 3/24

### Core Engine
- 11-constraint auto-assign scoring engine with retry fallback
- Manual cell edits with issue detection + Auto-Fix All
- Schema versioning + migration runner (v1→current)
- Hard blocks: back-to-back, outfield repeat, benchOnce enforcement

### Roster Tab
- Player cards with skill badges, coach tags, and batting skills
- Preferred / avoid positions per player
- Add/remove player with confirmation
- Innings selector (4/5/6)

### Field Grid Tab
- Full defensive grid with auto-assign + manual overrides
- Per-inning coverage summary

### Batting Tab
- Suggest Order (stats-driven)
- Desktop drag-to-reorder
- Season stats table (AB, H, R, RBI, AVG with color coding)

### Schedule Tab
- AI schedule import — photo, paste/text, manual, bulk
- Game result logging (score + per-player batting stats)
- Parse batting scorecard from photo or text dump
- View-only share link (URL-encoded snapshot)

### Print / PDF
- Toggle: Both / Defense Only / Batting Only
- PDF bundled via npm (jsPDF — no CDN dependency)
- Diamond view, grid, and batting order

### Infrastructure
- Supabase backend (primary data store)
- Render backend for AI parsing
- UptimeRobot ping to keep Render warm (5-minute interval)
- Vercel frontend deploy with CI/CD
- PWA — installable on iOS + Android, offline-capable after first visit
- Export / Import backup (JSON)
- 10-player field configuration: LC + RC replace CF in outfield; 1 bench slot per inning (schema v2, migration auto-remaps saved CF→LC)
- First-time coach onboarding modal (5-step in-app walkthrough, localStorage completion tracking, always re-accessible via "Getting Started" button in Roster tab)

### v1.1.0 — March 24, 2026
- Replaced Practice tab with Feedback tab (free-form feedback + bug reporting with localStorage persistence)
- Added About tab (app info, version history, inline onboarding guide)
- APP_VERSION constant + VERSION_HISTORY array in codebase
- Fixed LC/RC position colors (blue/purple, high contrast)
- Schema v2 + CF→LC migration
- 10-player field configuration (LC + RC replace CF)
- First-time coach onboarding modal (5-step)

---

## 🔴 P1 — Bugs / Critical Gaps

| # | Item | Notes |
|---|------|-------|
| 1 | **Mobile drag-to-reorder (batting)** | Touch drag is fragile — number circle as drag handle exists, but tap up/down arrow fallback is not yet implemented |
| 2 | **Sticky player name column (field grid)** | Horizontal scroll on mobile loses player names — original fix deferred in single-file build |
| 3 | **`Confident` vs `goodCoachability` weight parity** | Both tags have identical scoring mods — `Confident` should boost high-pressure positions (P, SS, C) more aggressively; `goodCoachability` should distribute more evenly |
| 4 | **Player absent flag (per game)** | No way to exclude a player from auto-assign for a single game without removing them from the roster |
| 5 | **Mud Hens g2 batting stats** | SQL restore in Supabase pending — two-query fix identified, not yet applied |

---

## 🟡 P2 — High-Value Enhancements

| # | Item | Notes |
|---|------|-------|
| 1 | **Print card metadata** | Team name, date, and opponent are hardcoded — should be pulled from team/game context |
| 2 | **"Revert to Generated" button** | After manual grid edits, no way to revert to the last auto-assigned state without full regeneration |
| 3 | **"Avoid Positions" collapsed by default** | 9 buttons per player adds excessive height on mobile; should be a disclosure, collapsed by default |
| 4 | **Reset Roster confirmation prompt** | Currently destructive with no warning dialog |
| 5 | **Per-game batting order** | Order should be regeneratable after each game using latest cumulative stats; stat-to-order feedback loop needs polish |
| 6 | **Practice Tab** | Session log with date, focus area, drill notes, and player attendance checkboxes — fully specced, not yet built |

---

## 🟢 P3 — Code Quality / Observability

| # | Item | Notes |
|---|------|-------|
| 1 | **`autoAssign` / `autoAssignWithRetryFallback` contract** | Output should explicitly carry: final grid, warnings, attempts used, fallback-invoked flag — enables observability and easier future debugging |
| 2 | **UI component tests (React Testing Library)** | Engine unit + integration tests exist; UI layer has zero test coverage |
| 3 | **E2E tests (Playwright or Cypress)** | No end-to-end coverage — critical before auth ships |
| 4 | **File split — renderSchedule and large render functions** | `renderSchedule` is ~593 lines doing the work of 4–5 components; blocking future feature velocity |
| 5 | **TypeScript migration** | Still `.jsx`, no types — lower priority but growing tech debt |
| 6 | **ESLint config** | No linting enforcement in the repo |

---

## 🔵 Phase 3 — Auth + Multi-Coach (Deferred by Design)

| # | Item | Notes |
|---|------|-------|
| 1 | **Supabase auth (magic link)** | No-password flow; fully specced in internal AUTH-ASSESSMENT doc |
| 2 | **Role system** | Head Coach / Assistant (edit) / Viewer (read-only) |
| 3 | **Invite flow** | Coach → Settings → Invite by email → Supabase magic link → auto-assigned to team |
| 4 | **Viewer-mode shell** | Stripped tab bar (Schedule + Lineup only); skill/coach tags hidden from viewer role |
| 5 | **Supabase Realtime** | Lineup lock → live push to assistant and viewer phones |
| 6 | **Multi-team management** | Home screen team cards with add/switch/delete; per-coach team isolation |
| 7 | **Season-end skill calibration report** | Compare auto-assigned positions vs actual played — closes the skill-accuracy feedback loop |
| 8 | **iCal / calendar import for schedule** | Structured calendar import as an alternate path alongside AI photo/text import |

---

## 🗓 Recommended Next Sprint (Sequenced)

1. ✅ **Verify 10-player auto-assign on live roster** — open Mud Hens, run Auto-Assign across 6 innings, confirm 1 bench/inning and no CF
2. **Player absent flag** — ~2–3 hrs, high game-day utility
3. **Mobile batting reorder arrow fallback** — ~1–2 hrs, biggest UX gap at the field
4. **Print card metadata** (team name, date, opponent) — ~1 hr
5. **`Confident` vs `goodCoachability` weight fix** — ~30 min, correctness issue
6. **"Revert to Generated" button** — ~1–2 hrs
7. ✅ **Verify onboarding modal on live app** — open app in a fresh browser session (or clear localStorage), create a new team, confirm 5-step modal appears; complete it and confirm it does not reappear on reload; confirm "Getting Started" button reopens it on demand

> **Note:** File split (P3 code quality) should happen in parallel with or just before Phase 3 auth work. It will reduce new feature implementation time by ~40%.

---

## Architecture Notes

- **Storage:** Supabase (primary) + localStorage (offline cache with sync-on-connect)
- **AI backend:** Render free tier — keep warm via UptimeRobot 5-min ping at `https://lineup-generator-backend.onrender.com/ping`
- **Frontend:** Vercel — auto-deploys on push to `main`
- **No auth yet:** All data is coach-owned, single-device. Export/Import backup is the current data safety net.
