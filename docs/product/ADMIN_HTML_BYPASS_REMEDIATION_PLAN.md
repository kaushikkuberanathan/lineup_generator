# admin.html Bypass Remediation — Implementation Plan

**Status: Complete, 2026-08-25.** All 6 endpoints below shipped exactly per this
plan's per-endpoint design (with two deliberate, documented deviations — see
the note below the table in §2). Both parent issues are closed. This document
is preserved as the design record: the per-endpoint specs, the 5 cross-cutting
gotchas, and the phasing rationale are still the accurate account of *why* each
route looks the way it does, even though every checkbox below is now done.

**Parent issues:** #338 (original finding) — **closed**. #787 (remaining scope
after PR #780) — **closed**.
**Sub-issues:** #788–#793 — **all closed**, one per endpoint (see §5 below for
the PR that shipped each one).

**Deviations from this plan, found necessary during implementation:**
- **Route paths use no `/admin` prefix**, contrary to every path proposed
  below (e.g. `POST /api/v1/admin/coaches` → shipped as `POST /api/v1/coaches`).
  `admin.js` mounts bare at `/api/v1`, and none of its pre-existing protected
  routes (`/suspend`, `/reset-access`, `/feedback`, `/approve`, `/reject`, …)
  carry an `/admin` prefix — only the two public 1-tap email links do.
  `backend/CLAUDE.md` explicitly flags `/api/v1/admin/` paths as a documented
  gotcha to avoid; this plan's own proposed paths would have reintroduced it.
  Roster/schedule also shipped as routes on the existing `admin.js` router
  rather than the new `adminTeamData.js` file §4.4/§4.5 proposed, for the
  same consistency reason.
- **§3a's "duplicate `rosterWipeGuard`, don't extract" recommendation was not
  needed.** `teamData.js` already exports `rosterWipeGuard` as a named export
  alongside its default router export (`module.exports.rosterWipeGuard`) —
  that section's reasoning assumed extracting it would require touching
  `teamData.js`'s exports, which turned out to already be false. The roster
  route (#792) imports the existing export directly; `teamData.js` was never
  modified.

This branch (`docs/admin-html-bypass-remediation-plan-787`) itself stayed
isolated per KK's original instruction and was never merged — this file is a
copy of its final content, brought into `develop` once the work it describes
was actually complete, so the design record isn't permanently orphaned on an
unmerged branch while every PR and issue comment that shipped this work cites
it by path.

---

## 1. What's already fixed (PR #780, merged)

`admin.html`'s **Approve Request** and **Deny Request** handlers now call
`POST /api/v1/approve` / `POST /api/v1/reject` with a Bearer token
(`sb.auth.getSession()` → `session.access_token`). That PR is the template to
copy for every fix below: same Bearer-token pattern, same error-shape
handling (`ALREADY_PROCESSED`, `VALIDATION_ERROR`, generic fallback).

## 2. What's still bypassed (confirmed against current `admin.html`)

| # | Action | Current direct-Supabase call | Line |
|---|---|---|---|
| 1 | Add Team | `sb.from('teams').insert({ id, name, age_group, sport, season, year })` | 825 |
| 2 | Add Coach | `sb.from('team_memberships').insert({...})` | 895 |
| 3 | Remove Coach | `sb.from('team_memberships').delete().eq('id', id)` | 875 |
| 4 | Roster save (add/remove player, CSV import) | `sb.from('team_data').upsert({ team_id, roster }, { onConflict: 'team_id' })` | 1132 |
| 5 | Schedule save (add game, CSV import, Clear Schedule) | `sb.from('team_data').upsert({ team_id, schedule }, { onConflict: 'team_id' })` | 1219 |
| 6 | Feature flag toggle | `sb.from('feature_flags').update({ enabled, updated_at }).eq('flag_name', x).is('team_id', null)` | 1301 |

## 3. Cross-cutting gotchas found during scoping (read before building anything)

These are not obvious from the issue titles alone — each would cost real
debugging time if discovered mid-implementation instead of now.

### 3a. `POST /api/teams/:teamId/data` cannot be reused as-is for #4/#5

It looks like the obvious target (it already has the roster-wipe guard), but
it is gated by `isAdminRequest()` — **localhost OR a matching `X-Admin-Key`
header** (`backend/src/routes/teamData.js:119-129`), not `requireAuth`. There
is no code path today that accepts a user's Bearer token on this route.

Two ways to fix this, and only one is safe:

- ❌ **Do not** add `requireAuth`/Bearer-token support to the existing route,
  and **do not** ship `ADMIN_KEY` to the browser so `admin.html` can call it
  directly — either change modifies an existing handler's auth surface,
  which `backend/CLAUDE.md`'s **Zero-Downtime Constraint** explicitly
  forbids ("Do NOT modify existing route handlers... Do NOT add middleware
  to existing routes"), and shipping the admin key to a static HTML file
  served to any admin's browser defeats its purpose as a server-only secret.
- ✅ **Add new, separate routes** (`POST /api/v1/admin/teams/:teamId/roster`,
  `POST /api/v1/admin/teams/:teamId/schedule` — see §4.4/§4.5) gated by the
  same `requireAuth, requireAdmin` the rest of `admin.js` already uses. This
  is purely additive — the existing route's behavior and callers (scripts,
  recovery tooling) are untouched.

The roster-wipe-guard logic (`rosterWipeGuard()`, `teamData.js:142-183`) is
~40 lines. Given the "don't modify existing handlers" constraint, the lowest
-risk move is to **duplicate** it into the new admin route file rather than
extract-and-share — extraction touches the existing file's imports/exports
even if behavior is unchanged. Note this as a candidate follow-up cleanup
once the new route has shipped and proven safe, not something to attempt in
the same PR.

### 3b. Admin-created teams currently, silently, wrongly add the platform admin as a member

`018_auto_provision_team_membership_on_create.sql`'s `on_team_created`
trigger fires `AFTER INSERT ON public.teams` and grants `role='admin',
status='active'` membership to **`auth.uid()`** — "whoever's authenticated
connection performed the INSERT." Today, `admin.html`'s Add Team handler
inserts using the **platform admin's own authenticated session** (the `sb`
client is initialized with the anon key + the logged-in admin's session), so
`auth.uid()` resolves to the platform admin — **every team created through
the admin panel today silently makes the platform admin a member of it.**
This has never been reported as a bug, presumably because platform admin
having access to every team is not visibly wrong, but it is not the intended
semantics (the intended member is whichever coach the team is being created
for, added separately via Add Coach).

**This is fixed for free** once Add Team routes through a new backend
endpoint using `supabaseAdmin` (service-role client, same as every other
`admin.js` route) — service-role requests carry no user JWT, so
`auth.uid()` resolves to `NULL` inside the trigger, and the trigger's own
documented behavior is to no-op on `NULL` (see the migration file's own
"WHY" section) rather than error. Net effect: the new route creates a team
with **zero** `team_memberships` rows, which is correct — the platform admin
adds the real coach afterward via Add Coach.

Worth a one-line callout in whichever PR ships Add Team, since it's a
behavior change (even though it's a bug fix, not a regression) that KK
should be aware is happening.

### 3c. New `auth_events` writes may silently no-op (pre-existing, unrelated bug — #736)

`auth_events`'s CHECK constraint only permits old phone-OTP-era event-type
strings (see Known Open Bugs #13 in the root `CLAUDE.md`). If any new route
below writes an `auth_events` row for a genuinely new event type (e.g.
`admin_added_coach`, `admin_removed_coach`), that insert will fail — but
`logAuthEvent()` deliberately swallows all errors ("analytics must never
block auth"), so it will **fail silently**, exactly like #736 already
documents for `magic_link_requested`. This is not something to fix as part
of this work (#736 is its own separate, already-filed issue) — just don't
assume a new event type "worked" because the endpoint returned 200. If audit
logging for these actions matters before #736 ships, reuse an
already-permitted event-type string, or explicitly note the gap in the PR
description.

### 3d. Roster vs. schedule wipe semantics are NOT the same

The roster-wipe guard exists because an accidental empty roster save is
almost always a bug (CSV paste failure, browser back-button race). **Do not
apply the same guard to schedule writes** — `admin.html`'s "Clear Schedule"
button is an *intentional* wipe-to-empty action already in the UI (line
1259-1263: `confirm('Clear the entire schedule...')` → `_schedData = []` →
save). A schedule-wipe guard would break that feature outright.

### 3e. Partial-column upserts — don't accidentally wipe sibling fields

`admin.html`'s current roster/schedule upserts only ever send `{team_id,
roster}` or `{team_id, schedule}` — Postgres/PostgREST's upsert only
updates the columns present in the payload, leaving `practices`,
`batting_order`, `grid`, etc. untouched. The **existing** internal
`POST /:teamId/data` route does the opposite on purpose — it always
resolves every field with `?? []`/`?? {}` defaults, because its designed
callers always send the full document. **The new admin routes must
replicate `admin.html`'s current partial-upsert behavior** (touch only the
one column the specific route owns), not the internal route's
full-document-replace behavior — otherwise Add Coach's sibling roster
route would silently null out a team's schedule on every roster save.

---

## 4. Per-endpoint design

All new routes live in `backend/src/routes/admin.js` (Add/Remove Coach, Add
Team, feature flags — small enough to colocate with the existing
approve/reject/update-role/suspend routes) or a new
`backend/src/routes/adminTeamData.js` mounted under `/api/v1/admin` (roster/
schedule — kept separate since they reuse `teamData.js`-shaped logic, not
`admin.js`-shaped logic). All are additive-only files/routes per the
Zero-Downtime Constraint — nothing in `app.js`, `admin.js`'s existing routes,
or `teamData.js` gets modified.

Every route below sits after `router.use(requireAuth, requireAdmin)`
(admin.js:196) or is mounted with the same two middlewares explicitly — same
gate as every other protected admin action.

### 4.1 Add Team — `POST /api/v1/admin/teams`

**Request body:**
```json
{ "name": "string (required)", "ageGroup": "string", "sport": "string",
  "season": "Spring|Fall (required)", "year": "integer" }
```

**Validation:** `name` non-empty, `season` in `['Spring','Fall']` (matches
`022_add_team_season.sql`'s intended CHECK — not live yet per that
migration's header, but validate to the intended values now rather than
after 023 ships), `year` optional integer, sensible bounds (e.g.
2000–2100, matching `teams/search`'s existing `year` validator).

**Server generates the id** — `String(Date.now()) + String(Math.floor(Math.random()*1000))`,
matching `admin.html`'s existing `genId()` format exactly (don't invent a
new id scheme just for this path; every other `teams.id` in the system is
this shape). Do not trust a client-supplied id.

**DB op:** `supabaseAdmin.from('teams').insert({ id, name, age_group: ageGroup ?? '', sport: sport ?? 'baseball', season, year: year ?? new Date().getFullYear() })`.
See §3b for why using `supabaseAdmin` here is required, not just convenient.

**Response:** `200 { team: { id, name, age_group, sport, season, year } }`.

**admin.html change:** replace the `sb.from('teams').insert(...)` call
(line 825) with a `fetch(BACKEND_URL + '/api/v1/admin/teams', { method: 'POST', headers: {Authorization: 'Bearer ' + session.access_token, ...}, body: ... })`,
same shape as PR #780's Approve/Deny rewiring.

### 4.2 Add Coach — `POST /api/v1/admin/coaches`

**Request body:** `{ "teamId": "string", "email": "string", "role": "one of CANONICAL_ROLES" }`

**Validation:** `teamId` non-empty, `email.isEmail()`, `role` via
`body('role').isIn(CANONICAL_ROLES)` (same pattern as `/admin/approve`) —
**do not** trust `normalizeRole()` alone here since this path has no
upstream `access_requests` row constraining the input the way `/approve`
does; validate against `CANONICAL_ROLES` directly at the express-validator
layer, exactly like `/admin/approve` already does.

**DB ops:** mirror `/admin/approve`'s shape (admin.js:264-277) exactly:
1. `supabaseAdmin.auth.admin.listUsers()` → find by email → `userId` or `null`.
2. `supabaseAdmin.from('team_memberships').insert({ email, phone_e164: null, team_id: teamId, role, status: 'invited', user_id: userId })`.

Using `status: 'invited'` (not `'active'`) matches `/admin/approve`'s
existing semantics for "granting someone access by email" — they activate
on first login, same as an approved access request would.

**Response:** `200 { message: 'Coach added.' }` or `409` if a membership
for that `(teamId, email)` pair already exists (check first — the current
client-side insert has no such guard and would presumably hit a DB-level
conflict if one exists; confirm whether `team_memberships` has a unique
constraint on `(team_id, email)` before deciding whether this needs an
explicit pre-check or can rely on the DB error).

**admin.html change:** replace line 895's `sb.from('team_memberships').insert(...)`.

### 4.3 Remove Coach — `DELETE /api/v1/admin/coaches/:membershipId`

**Validation:** `membershipId` is a UUID (`param('membershipId').isUUID()`).

**DB op:** `supabaseAdmin.from('team_memberships').delete().eq('id', membershipId)` —
preserves the **existing hard-delete behavior** exactly (scope decision, not
a design gap): `/admin/suspend` already exists as a soft-remove alternative
(`status: 'suspended'`) if KK later decides hard delete is the wrong default
for this action, but changing that semantic is out of scope for "route the
existing action through the backend" and should be a separate, deliberate
call by KK if made at all.

**Response:** `200 { message: 'Coach removed.' }`.

**admin.html change:** replace line 875.

### 4.4 Roster save — `POST /api/v1/admin/teams/:teamId/roster`

New file: `backend/src/routes/adminTeamData.js`, mounted at
`/api/v1/admin/teams` with `requireAuth, requireAdmin` applied at mount time
(do **not** touch `teamData.js`).

**Request body:** `{ "roster": [ ... ] }` (same shape `admin.html` already
builds — array of `{ name, firstName, lastName, skills, tags, prefs,
dislikes, batSkills }`).

**DB ops:**
1. Duplicate `rosterWipeGuard(teamId, roster, force)` from `teamData.js`
   into this new file (see §3a on why duplicate, not extract, for now).
   `admin.html` has no existing `force` override UI — decide whether to add
   one (a confirm-again dialog, mirroring "Clear Schedule"'s `confirm()`)
   or to always block empty-roster admin saves outright. Recommend: no
   `force` override for the admin panel initially — an admin needing to
   force-wipe a roster can use the existing recovery tooling
   (`X-Admin-Key` + `GET .../history`) that already exists for that.
2. `supabaseAdmin.from('team_data').upsert({ team_id: teamId, roster }, { onConflict: 'team_id' })` —
   **partial upsert, only these two columns** (see §3e — do not add
   `schedule`/`practices`/etc. defaults here).

**Response:** `200 { ok: true }` on success, `409 { error: 'ROSTER_WIPE_GUARD', currentRosterCount }`
on guard trip (same shape as the existing internal route, for consistency).

**admin.html change:** replace `saveRoster()`'s upsert call (line 1132).

### 4.5 Schedule save — `POST /api/v1/admin/teams/:teamId/schedule`

Same file as §4.4.

**Request body:** `{ "schedule": [ ... ] }`.

**DB op:** `supabaseAdmin.from('team_data').upsert({ team_id: teamId, schedule }, { onConflict: 'team_id' })` —
partial upsert, no wipe guard (§3d — Clear Schedule is intentional).

**Response:** `200 { ok: true }`.

**admin.html change:** replace `saveSchedule()`'s upsert call (line 1219).
Covers all three schedule-mutating actions in the panel (add game, CSV
import, Clear Schedule) since they all funnel through this one client-side
function already.

### 4.6 Feature flag toggle — `PATCH /api/v1/admin/feature-flags/:flagName`

Add to `admin.js` alongside the other small admin routes.

**Request body:** `{ "enabled": true|false }`.

**Validation:** `param('flagName')` non-empty string, `body('enabled').isBoolean()`.

**DB op:** `supabaseAdmin.from('feature_flags').update({ enabled, updated_at: new Date().toISOString() }).eq('flag_name', flagName).is('team_id', null)` —
matches the existing global-flags-only scope of `admin.html`'s Flags tab
exactly (per-team flag overrides, if any exist in this table, are out of
scope here since the current UI doesn't manage them either).

**Response:** `200 { message: '<flagName> set to <ON|OFF>.' }`.

**admin.html change:** replace the toggle handler's update call (line 1301).

---

## 5. Suggested phasing (maps to sub-issues #788–#793)

Each of the six endpoints above is independent — no shared code between
them except the Bearer-token fetch pattern already established by PR #780
and (for §4.4/§4.5 only) the duplicated wipe-guard helper. Recommend one PR
per endpoint, in this order (lowest-risk / most self-contained first):

1. **#788** Feature flag toggle (§4.6) — smallest, single-column update, no
   new DB semantics.
2. **#789** Remove Coach (§4.3) — smallest of the membership routes,
   preserves existing hard-delete behavior verbatim.
3. **#790** Add Coach (§4.2) — mirrors `/admin/approve`'s existing shape
   closely.
4. **#791** Add Team (§4.1) — includes the auto-provision-trigger behavior
   note (§3b) to call out explicitly in the PR description.
5. **#792** Roster save (§4.4) — includes the duplicated wipe-guard logic;
   highest-value fix since it closes the live roster-wipe-guard gap for the
   admin panel specifically.
6. **#793** Schedule save (§4.5) — do last since it's easiest to get
   subtly wrong (§3d) if the roster PR's reviewer's mental model of "just
   copy the wipe guard" gets pattern-matched onto schedule too.

Each PR should:
- Add a unit test file under `backend/src/__tests__/` following the
  existing naming convention (e.g. `adminCoaches.add.test.js`,
  `adminTeamData.roster.test.js`) — see `backend/CLAUDE.md`'s Unit suite
  table for the established per-file pattern (mock `supabaseAdmin.from`,
  stub `requireAuth`, RED→GREEN against a temporarily-reverted diff or a
  mutation test per the repo's RED-checkpoint rule).
- Update `docs/product/FEATURE_MAP.md`'s admin.html row.
- Follow this repo's full branch → issue → PR → CI → merge-commit hygiene
  (see root `CLAUDE.md`) — feature branch cut from `develop`, never a
  direct commit to `develop`.

### 5a. What actually shipped (added 2026-08-25, after the fact)

The suggested order above was followed exactly. Each PR names its own test
file, test count, and any deviation from this plan in its own body — this
table is just the map from issue to what merged.

| # | Endpoint | Route (actual — see the deviation note at the top of this doc) | Test file | PR |
|---|---|---|---|---|
| #788 | Feature flag toggle | `PATCH /api/v1/feature-flags/:flagName` | `adminFeatureFlags.test.js` (6) | #811 |
| #789 | Remove Coach | `DELETE /api/v1/coaches/:membershipId` | `adminRemoveCoach.test.js` (3) | #815 |
| #790 | Add Coach | `POST /api/v1/coaches` | `adminAddCoach.test.js` (8) | #817 |
| #791 | Add Team | `POST /api/v1/teams` | `adminAddTeam.test.js` (8) | #818 |
| #792 | Roster save | `POST /api/v1/teams/:teamId/roster` | `adminRosterSave.test.js` (8) | #819 |
| #793 | Schedule save | `POST /api/v1/teams/:teamId/schedule` | `adminScheduleSave.test.js` (5) | #820 |

38 new tests total across the 6 files, plus a 401-no-token case per route in
`admin.auth.test.js`, plus a RED→GREEN mutation-test checkpoint on every PR.
Full backend unit suite went 147 → 199 across this batch (some of that delta
is unrelated test-coverage work from other sessions landing in the same
window, not all 38 in one jump — see each PR's own before/after count for the
exact per-PR delta).

## 6. Explicitly out of scope for this remediation

- Changing Remove Coach from hard-delete to soft-suspend (§4.3) — flagged
  as a judgment call for KK, not bundled in.
- Fixing #736 (`auth_events` CHECK constraint) — pre-existing, separately
  tracked; don't let it block these PRs (see §3c).
- Extracting `rosterWipeGuard()` into a shared module used by both the old
  and new routes — candidate follow-up, not part of this pass (see §3a).
- Adding a `force` override to the admin panel's roster save (§4.4) — punted
  to the existing recovery-tooling path.
