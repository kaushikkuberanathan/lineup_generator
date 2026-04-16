# Dugout Lineup — Product Charter

> Version 1.0 — April 16, 2026 — App v2.2.30
> Owner: KK (Product + Engineering)

---

## 1. Purpose and Vision

### The Problem

It is 10 minutes before game time. You have 11 kids on the roster, parents watching from the fence, and a blank lineup card. Every recreational youth baseball and softball coach faces the same impossible puzzle every single week:

- Every kid must play — league rules mandate minimum innings, and they will be enforced
- Fairness is everything — if one kid never plays shortstop while another always does, you will hear about it
- Position variety matters — player development means rotating kids through new spots, not defaulting to what is easy
- No two games are the same — absences, injuries, a player who just cannot catch today — last week's lineup does not apply

Most coaches solve this with a mental spreadsheet, a scribbled notepad, or a chaotic group text. The result is more time spent on logistics than on actually coaching kids.

### The Vision

Dugout Lineup eliminates the pre-game scramble. A coach inputs their roster once, taps generate, and walks onto the field with a complete, constraint-validated lineup in under 60 seconds — fair, rotated, and shareable to every phone in the dugout without an account or an app install.

### Strategic North Star

> **If a coach cannot use this in under 2 minutes before a game, the system is too complex.**

Every product decision is evaluated against this principle first.

---

## 2. Scope and Non-Goals

### v1 Shipped (Live at dugoutlineup.com)

- Auto-assign defensive lineup engine (V2, 8 scoring layers, up to 8 attempts)
- Manual grid overrides with Auto-Fix and violation warnings
- Diamond SVG view with per-inning filter
- Batting order — drag-to-reorder, season stats (AVG, AB, H, R, RBI), sortable columns
- Schedule management — AI import from photo or text paste
- Game result logging with per-player batting stats
- Walk-up songs per player (title, artist, link, timestamps)
- Snack duty assignment per game
- Coach PIN protection — gates Finalize and Unlock; locked roster goes read-only
- Roster auto-snapshots (up to 5 restore points) + in-app recovery UI
- Multi-team support — create, edit, delete, backup any team
- Team search bar — filter by name, sport, age group
- Short share links — Supabase-backed 8-char ID, mobile share sheet
- Cloud sync (Supabase) + offline-first (localStorage), fully functional with no signal
- PDF export + print view (lineup card, batting order, diamond)
- PWA — installable on iOS and Android, no app store required
- County score report checkbox per completed game
- Game Mode — full-screen dugout view with inning advance, batting strip, Quick Swap
- Out Tonight — absent players shown with red indicators across all 11 lineup surfaces

### Phase 2 — In Progress

- Live scoring: real-time at-bat tracking, scorer lock, game state sync via Supabase Realtime
- Phase 4 auth: email magic link + Google OAuth, no passwords, no SMS
- Admin UI (`admin.html`) — team management, user management, approval routing

### Phase 3 — Later

- Multi-coach invite flow (role-based access: Coach / Assistant Coach / Viewer)
- Season-long position fairness tracking across all games
- Push notifications for lineup changes
- Practice session log (drills, attendance, notes)
- Scorekeeper role with scoped write access for live score entry
- Team Coordinator role with schedule write access
- Full audit log (who changed what, when)
- GitHub Actions CI gate — block deploys on failing engine tests

### Explicit Non-Goals

- **No league management.** Dugout Lineup is for one team at a time. League-wide standings, bracket management, and cross-team scheduling are out of scope.
- **No video or media hosting.** Walk-up song links are URLs only — no upload, no playback hosting.
- **No automated county score submission.** Score reporting to league websites remains a manual step (automated approach explored but blocked by session CSRF; n8n webhook orchestration documented in backlog).
- **No SMS or phone OTP.** Twilio permanently removed. Auth is email magic link and Google OAuth only.
- **No dedicated native apps.** The PWA is the app. No App Store submission planned.
- **No multi-league or franchise features.** Platform is for single organizations, not league administrators.

---

## 3. User Personas

Eight distinct roles interact with Dugout Lineup. All personas operate in real-world, time-constrained environments — field, dugout, bleachers — on a phone.

| # | Persona | Role | Auth Required | Primary Need |
|---|---------|------|---------------|--------------|
| 1 | **Head Coach** | Team owner, primary user | Phase 3 | Create fair lineup fast, share it instantly |
| 2 | **Dugout Parent** | Volunteer in-dugout assistant | Phase 3 | See current lineup, help manage substitutions |
| 3 | **DJ Parent** | Controls walk-up music | None (share link) | Know the batting order and song info per player |
| 4 | **Catcher Parent** | Supports catcher warmup between innings | None (share link) | Know who is catching which inning |
| 5 | **Base Coach** | First/third base volunteer | None (share link) | Know the batting order and who is on deck |
| 6 | **Scorekeeper** | Official scorer, tracks outs and at-bats | None (share link) | Batting order + defensive positions, clearly readable |
| 7 | **Parent Viewer** | Any parent in the stands | None (share link) | Know where their child is playing this inning |
| 8 | **Administrator** | Platform owner (KK only, platform_admin) | Active | System integrity, data recovery, team provisioning |

### Head Coach

Goals: generate a fair and balanced lineup in under 2 minutes, ensure player development across positions, adjust in real time when attendance changes, communicate the lineup to everyone in the dugout without extra steps.

Success metric: complete lineup generated and shared before the first pitch, with no fairness violations and no complaints about who always plays what.

### Dugout Parent

Goals: follow the current lineup without texting the coach, know substitutions in advance, help move kids to the right position between innings.

Success metric: open the share link, understand the current inning's defensive assignments, and know who bats next — all without asking anyone.

### DJ Parent

Goals: know the batting order before the game starts, find each player's walk-up song title and any timestamp note, cue the right song at the right time.

Success metric: play the right walk-up song for every batter, game to game, without a separate spreadsheet.

### Catcher Parent

Goals: know which inning their child is catching so they can have gear ready between innings, and know the full inning-by-inning catcher rotation.

Success metric: be ready with gear before the inning starts, not scrambling when the coach calls for a position change.

### Base Coach

Goals: know who is batting now and who is on deck, know the batting order for the full game, communicate effectively with batters and base runners.

Success metric: coach third base without holding a paper lineup card.

### Scorekeeper

Goals: follow the batting order accurately inning by inning, track defensive positions per inning, avoid confusion when the coach makes a substitution.

Success metric: score the entire game without asking the coach to repeat the lineup.

### Parent Viewer

Goals: know where their child is playing this inning, see the full schedule without texting the coach, stay informed without being in the group chat.

Success metric: open a shared link, see their child's position for the current inning, and close it — total time under 15 seconds.

### Administrator

Goals: provision teams and users, recover from data corruption, override system constraints without a code deploy, resolve any issue in under 2 minutes.

Success metric: fix any data problem using admin.html or Supabase SQL Editor without requiring an app update or coach downtime.

---

## 4. Success Metrics

### Engagement

| Metric | Target | Source |
|--------|--------|--------|
| Lineup generated per coach per week | ≥ 1 | Mixpanel `lineup_generated` |
| Share link opens per lineup | ≥ 3 | Mixpanel `share_link_opened` |
| Time to generate lineup (p50) | < 60s | Mixpanel `lineup_generated` duration |
| Coaches with ≥ 3 games logged | > 50% of active | Supabase query |
| Share link opens on mobile without login | 100% success rate | Mixpanel + manual |
| Game Mode used per game day | Tracked | Mixpanel `game_mode_opened` |

### Product Quality

| Metric | Target | Source |
|--------|--------|--------|
| Frontend test suite | 257 passed / 1 skipped / 0 failed | `npm test` (Vitest) |
| Build clean (zero errors) | 100% before every deploy | `npm run build` |
| Share link renders without login | 100% | Manual + health-check.yml |
| Auth never blocks Game Mode | 100% | Manual QA |
| Lineup engine violations surfaced (not silent) | 100% | Vitest engine suite |
| `/ping` uptime | > 99.5% | UptimeRobot monitor #802733786 |

### Business Health

| Metric | Target | Source |
|--------|--------|--------|
| Zero data loss incidents | Ongoing | team_data_history trigger |
| Rollback time on prod incident | < 10 min | Ops runbook |
| Deploy cycle (code change to live) | < 5 min | Vercel auto-deploy |
| Backend cold-start mitigation | UptimeRobot alive | `/ping` every 5 min |

---

## 5. Operating Principles

### Product

1. **Sideline-first.** Every design decision is evaluated on a phone screen, in a dugout, under time pressure. Desktop is secondary.
2. **Fairness is the product.** The lineup engine must surface every violation. No silent failures. Coaches trust the system because it never hides a problem.
3. **Zero friction for viewers.** Share links must work on any device with no account, no app install, and no redirect to a login screen. This is non-negotiable.
4. **One-tap workflows.** Generate, share, and open Game Mode are the three most important actions. They must each be one tap from anywhere in the app.
5. **Data belongs to the coach.** Export and backup are always available. The app never locks a coach out of their own data.

### Engineering

1. **Local-first always.** The app is fully functional with no signal. localStorage is the primary store; Supabase is async background sync.
2. **Three-layer persistence.** User action → React state (instant) → localStorage (instant) → Supabase (async, fire-and-forget). Every write flows through this chain.
3. **Non-blocking Supabase.** All cloud calls are fire-and-forget. App never spinners waiting for cloud confirmation.
4. **Additive only until Phase 4 cutover.** No existing route handlers or tables modified until auth ships. New features extend — never modify.
5. **Data protection is mandatory.** NEVER write `roster: []` to a team that has players without `force: true`. Three guards: Postgres trigger, backend write guard, recovery endpoint.
6. **Zero-downtime deploys.** Maintenance mode flag in Supabase is the gate. Coaches have bypass URL during maintenance window.
7. **Test before push.** `npm run build` and `npm test` must be clean before any commit to main. The pre-deploy checklist is mandatory, not optional.

### Solo Team

1. **Velocity through discipline.** A solo operator cannot afford rework. The deploy checklist, version history schema, and pre-work verification exist to prevent the mistakes that cost hours.
2. **Document everything non-obvious.** Code comments explain the why. CLAUDE.md captures the rules. MASTER_DEV_REFERENCE.md captures the process. Any decision not in writing will be re-decided wrong at 10pm before a game.
3. **No heroics.** If something is not testable locally, say so and define a safe production path. Never push blind.
4. **Phase gates exist for a reason.** Phase 4 auth cutover removes the shims. Phase 3 adds multi-coach. These gates exist to protect real users from half-finished features.

---

## 6. Technical Architecture

### Stack

| Layer | Technology | Host |
|-------|-----------|------|
| Frontend | React 18 + Vite, mobile-first PWA | Vercel (auto-deploy from main) |
| Backend | Node.js / Express | Render (free tier + keep-alive) |
| Database | Supabase (Postgres + JSONB) | Supabase cloud |
| AI proxy | Claude API (`claude-sonnet-4-6`) | Via backend `/api/ai` route |
| Analytics | Mixpanel (32+ events) + Vercel Analytics | SaaS |
| Uptime | UptimeRobot monitor #802733786 | SaaS, pings `/ping` every 5 min |

### Data Architecture

```
User Action → React state (instant) → localStorage (instant) → Supabase (async, fire-and-forget)
```

App hydrates from localStorage first (instant, offline-capable). Supabase syncs in background. All Supabase calls are non-blocking — the app is fully functional without connectivity.

**Database schema (JSONB — structure matches localStorage exactly):**

```sql
teams      (id, name, age_group, year, sport, owner_id, created_at)
team_data  (team_id, roster, schedule, practices, batting_order, grid, innings, locked)
```

**Date keys in localStorage** must use local calendar date, not `toISOString()` (which returns UTC and breaks lookups for evening games after midnight UTC).

### Data Protection

Three independent guards prevent roster wipe:

1. **Postgres trigger** — every write to `team_data` snapshotted in `team_data_history` (last 20 per team). Applied via `backend/migrations/002_team_data_history.sql`.
2. **Backend write guard** — `POST /api/teams/:teamId/data` returns `409 ROSTER_WIPE_GUARD` if incoming roster is empty and DB row has players. Override requires explicit `force: true` (logged).
3. **Recovery endpoint** — `GET /api/teams/:teamId/history?limit=5&full=true` (localhost or `X-Admin-Key` header required).

### Feature Flags

Flags live in `frontend/src/config/featureFlags.js` and Supabase `feature_flags` table. Two-level evaluation: global default + per-user localStorage override. Enable for one user without a deploy via `?enable_flag=<name>` URL param.

| Flag | Default | Purpose |
|------|---------|---------|
| `VIEWER_MODE` | `false` | Read-only swipeable inning cards |
| `USE_NEW_LINEUP_ENGINE` | `true` | V2 scoring engine (not overridable) |
| `ACCESSIBILITY_V1` | `true` | Font floors, touch targets, contrast uplift |
| `GAME_MODE` | `true` | Full-screen game day mode |
| `MAINTENANCE_MODE` | `false` | Show maintenance screen during deploys |

### Deployment Posture

- Vercel auto-deploys frontend from `main` on every push
- Render auto-deploys backend from `main` on every push
- No staging environment — feature flags are the safety net
- All deploys require: clean `npm run build`, `npm test` passing, version bumped across all four locations (App.jsx, frontend/package.json, backend/package.json, ROADMAP.md)
- Rollback target: < 10 minutes from detection to stable production

---

## 7. Roadmap

Roadmap is organized by exit criteria, not dates. A phase ships when its criteria are met.

### Phase 1 — Shipped

Core single-coach lineup and schedule management. Auto-assign engine, batting order, diamond view, share links, PDF export, PWA, offline-first. Live at dugoutlineup.com as of March 24, 2026.

### Phase 2 — In Progress

| Item | Status | Exit Criteria |
|------|--------|---------------|
| Live scoring (at-bat tracking, scorer lock) | In progress | Scorer can track full game from dugout device |
| Phase 4 auth (magic link + Google OAuth) | Parked — shims in place | Auth ships without blocking any existing viewer/share link |
| Admin UI — six management tabs | In progress | KK can provision teams and manage users from admin.html |
| RLS cutover (`004_rls_fixes.sql`) | Parked | Run only after Phase 4 auth confirmed end-to-end |
| Score reporting automation | Backlog | n8n webhook orchestration replaces manual checkbox |

### Phase 3 — Later (Backlog)

Multi-coach invite, role-based access (Coach / Assistant / Viewer), season-long fairness tracking, practice session log, push notifications, scorekeeper write access, full audit log, CI gate on engine tests.

### Parked Items

| Item | Reason |
|------|--------|
| Phone OTP / Twilio | Permanently removed. Auth is email magic link and Google OAuth only |
| Automated county score submission | Blocked by CSRF — n8n webhook approach documented in ROADMAP.md backlog |
| `frontend/.claude/settings.local.json` in git | IDE noise — add to `.gitignore` in next release (v2.2.32) |

---

## 8. Risks and Mitigations

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|-----------|
| 1 | Roster wipe due to empty write | Low | Critical | Three-layer guard: Postgres trigger + backend 409 + recovery endpoint |
| 2 | Share link blocked by auth | Medium | High | Auth principle enforced in code: share/Game Mode paths never check session |
| 3 | Render cold start during game day | Medium | High | UptimeRobot pings `/ping` every 5 min; coach bypass URL for maintenance window |
| 4 | localStorage vs Supabase state drift | Medium | Medium | Additive merge on boot: Supabase teams not in localStorage are appended, never overwrite |
| 5 | Breaking lineup engine change | Medium | High | Vitest regression suite (engine.v2 + lineupEngineV2-unit + bench-equity groups); must pass before deploy |
| 6 | Auth shim left in after Phase 4 cutover | Medium | Medium | Shim removal checklist in CLAUDE.md; three files, ordered steps, SQL listed explicitly |
| 7 | UTC date breaking attendance lookups | Low | High | Local date pattern documented and enforced in CLAUDE.md — `toISOString()` banned for localStorage keys |
| 8 | Solo operator burnout / bus factor = 1 | High | High | All decisions documented. Deploy checklist is machine-executable. CLAUDE.md captures rules. Codebase is self-describing. |

---

## 9. Governance

### Decision Rights

| Area | Owner | Override |
|------|-------|---------|
| Product direction and roadmap priority | KK | None |
| Architecture and technical approach | KK | None |
| Auth cutover timing | KK | None — Phase 4 gate is explicit |
| Production deploys | KK | Requires "confirmed — push to main" phrase |
| Feature flag toggles (no deploy needed) | KK | Can delegate to admin panel |
| SQL migrations | KK | Must be written to file first — never executed directly |

### Document Ownership

| Document | Owner | Review Cadence |
|----------|-------|----------------|
| `CHARTER.md` (this file) | KK | Quarterly + on phase transitions |
| `ONE_PAGER.md` | KK | Monthly |
| `ROADMAP.md` | KK | Every release |
| `MASTER_DEV_REFERENCE.md` | KK | On process changes |
| `CLAUDE.md` | KK | Every release + on rule changes |
| `PERSONAS.md` | KK | On phase transitions (refresh pending v2.2.32) |
| `SOLUTION_DESIGN.md` | KK | On architecture changes |
| `ANALYTICS.md` | KK | When new events are added |

> **Version bump requirement:** CHARTER.md and ONE_PAGER.md both increment their internal version number on any phase transition or structural change to the product scope.

### Review Cadence

- **Every release**: ROADMAP.md, CLAUDE.md version entry, package.json versions, APP_VERSION in App.jsx
- **Monthly**: ONE_PAGER.md — confirm phase status and non-goals are current
- **Quarterly**: CHARTER.md — full review of scope, metrics, personas, risks
- **On phase transitions**: CHARTER.md, ONE_PAGER.md, PERSONAS.md — confirm all three are aligned before the phase is declared complete

---

*Dugout Lineup — built with Claude Code, shipped on the sideline.*
*github.com/kaushikkuberanathan/lineup_generator | dugoutlineup.com*
