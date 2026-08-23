# Dugout Lineup — 1-Pager

> v2.2 — 2026-08-23 — App v2.12.0 in production

---

## Mission

Dugout Lineup eliminates the pre-game scramble for recreational youth baseball and softball coaches. A coach inputs their roster once, taps generate, and walks onto the field with a complete, constraint-validated lineup in under 60 seconds — fair, rotated, and shareable to every phone in the dugout without an account or an app install.

---

## Core Promise

> If a coach cannot use this in under 2 minutes before a game, the system is too complex.

---

## Who It's For

| Persona | One Line |
|---------|----------|
| **Head Coach** | Generates and shares a fair lineup before the first pitch |
| **Dugout Parent** | Follows the current lineup from the share link, no login |
| **DJ Parent** | Knows the batting order and each player's walk-up song info |
| **Catcher Parent** | Knows which inning their child catches before the game starts |
| **Base Coach** | Coaches third base without holding a paper card |
| **Scorekeeper** | Tracks the full game from the share link, batting order clear |
| **Parent Viewer** | Opens a link and instantly sees where their child is playing |
| **Administrator** | Manages teams, audit history, and platform health (operational role, not field-day user) |

---

## What It Does

- **Auto-assign lineup** — V2 engine scores every player for every position across all innings using 8 scoring layers (preferred positions, bench equity, back-to-back rules, skill attributes, outfield repeat prevention). Runs up to 8 attempts, returns the best valid result, surfaces all violations — no silent failures.
- **Diamond view** — realistic SVG field with inning filter; built for a phone screen in a dugout, not a desktop dashboard.
- **Batting order** — drag-to-reorder with season stats (AVG, AB, H, R, RBI) tracked per player; sortable columns, color-coded averages.
- **Schedule + game logging** — add games manually or let AI parse from a photo or text paste; log results with one tap.
- **Share links** — Supabase-backed 8-char short URLs, mobile share sheet, open on any device with no account required.
- **Game Mode** — full-screen dugout view with inning advance, batting strip, Quick Swap; absent players shown in red across all 11 lineup surfaces.
- **Offline-first + PWA** — fully functional with no signal; installable on iOS and Android from the browser; no App Store required.

---

## Tech Stack

React 18 + Vite PWA on Vercel (auto-deploys from main); Node.js / Express backend on Render (Starter plan $7/mo, no spin-down; UptimeRobot availability monitoring); Supabase (Postgres + JSONB) for cloud sync and short link storage; Claude API (`claude-sonnet-4-6`) proxied through backend for AI schedule import; Mixpanel (32+ events) + Vercel Analytics for usage tracking; localStorage as primary store with Supabase as async background sync.

---

## Data Protection

**Corrected 2026-08-04** — reconciled with `CHARTER.md` § Data Protection. Four-layer defense against data loss: (1) Postgres trigger snapshots every write to `team_data_history` (last 20 per team) — fires regardless of write path; (2) RLS on `team_data` (live since v2.6.0) requires an active coach/admin membership to write — this, not the backend guard, is what actually covers the app's real write path, since the app writes directly to Supabase rather than through the backend; (3) in-app recovery UI with up to 5 restore points; (4) manual export/import backup always available to the coach with no admin required. The backend's `409 ROSTER_WIPE_GUARD` route exists but isn't in the app's actual write path — it protects other callers of that route, not the coach-facing app.

---

## Principles

Sideline-first, fairness is the product, zero friction for viewers, one-tap core workflows, local-first always, non-blocking cloud, additive-only until Phase 4 cutover, test before push, document everything non-obvious.

---

## Phase Status

For the authoritative roadmap including current release status, v2.5.1 features, v2.6.0 backlog, and longer-term planning, see [docs/product/ROADMAP.md](ROADMAP.md). This section is intentionally minimal here to avoid drift between docs.

| Snapshot (2026-08-23) | Status |
|---|---|
| Production version | v2.12.0 |
| Live scoring | Shipped — functionally on for every team via an active testing shim; per-team DB flag + Mud Hens/Demo All-Stars hardcode still in code but bypassed (corrected 2026-08-04) |
| Magic link + Google OAuth auth | Shipped |
| Admin UI | Shipped |
| Multi-coach invite, role-based access, season fairness, practice log, push notifications | Backlog (v2.6.0+) |

---

## Success Metrics

- Lineup generated in < 60 seconds (p50)
- Share link opens on mobile without login: 100% success rate
- Test suite: frontend Vitest, hermetic backend unit tests, backend integration checks, and local-stack RLS tests are enforced by CI; exact counts are recorded per release rather than frozen here
- Zero roster wipe incidents (three guards in place)
- Rollback to stable production: < 10 minutes from detection

---

## Explicit Non-Goals

Dugout Lineup will not handle league-wide management, bracket scheduling, video or media hosting, automated county score submission (CSRF-blocked; n8n approach documented in backlog), SMS or phone OTP (permanently removed), dedicated native app store submissions, or multi-league franchise features. The product is deliberately scoped to one team at a time, one coach at a time, on the sideline.

---

**Owner:** KK (kaushik.kuberanathan@gmail.com)
**Repo:** github.com/kaushikkuberanathan/lineup_generator
**Live app:** dugoutlineup.com
**Full charter:** [docs/product/CHARTER.md](./CHARTER.md)
