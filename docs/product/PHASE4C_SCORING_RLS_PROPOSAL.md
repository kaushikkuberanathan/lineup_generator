# Phase 4C Auth Cutover — Live Scoring RLS Design Proposal

**Status: PROPOSAL ONLY. Not authorized for implementation.** Written per KK's explicit
instruction (overnight handoff, 2026-08-06): recon + design only, no code changes, no
SQL executed against any database. The drafted migration (`backend/migrations/019_scoring_auth_uid_rls.sql`)
has not been applied anywhere — not prod, not DEV, not even a local ephemeral stack.

This supersedes `docs/ops/PHASE4C_CUTOVER.md` where they conflict — that file has one
stale file path (see §1) — but does not replace it; both should be read together until
a future session consolidates them.

---

## 1. Current-state audit

### 1.1 What the shim actually is, and where (corrected from the existing checklist)

`docs/ops/PHASE4C_CUTOVER.md` (last touched pre-Slice-4) names
`frontend/src/components/ScoringMode/index.jsx` as shim location #2. **That file no
longer exists** — Slice 4 (v2.5.11) removed the legacy ScoringMode root component;
`ScoringMode/` now holds only 7 presentational children imported by `DugoutView.jsx`
(root CLAUDE.md's Live Scoring Architecture section already documents this). The real
shim locations, verified by direct grep tonight:

| # | File | What |
|---|---|---|
| 1 | `frontend/src/hooks/useLiveScoring.js` (~line 288-292) | `_effectiveUserId` / `_effectiveUserName` — falls back from real `userId`/`userName` params to `null`/`'Coach'` |
| 2 | `frontend/src/components/game-mode/DugoutView.jsx` (~line 60-61) | `isEnabled = liveScoringEnabled || true` — the `|| true` forces live scoring on regardless of the feature flag's real value |
| 3 | `frontend/src/components/game-mode/DugoutView.jsx` (~line 82-107) | `scoringUserId`/`scoringUserName` — falls back through `user.id` → `session.user.id` → `_storedLocalId` (a `scorer_local_id` UUID v4 generated once per device into `localStorage`) → a hardcoded zero-UUID; `isAdminTestMode` is already hardcoded to `false` here (a partial step already taken, ahead of the rest of this cutover) |

Both files are in this repo's **Locked Files** list (`game-mode/*`, and `useLiveScoring.js`
is not itself listed but is tightly coupled to it — see §4). No gate phrase was granted
tonight, so none of this was touched; this section is audit only.

### 1.2 Why it exists (D-S355 context)

Live scoring shipped before Phase 4 auth did. `useLiveScoring()` needs *some* stable
per-device identity to write `scorer_user_id` (lock claim), `actor_user_id` (audit
trail), and `recorded_by_id` (at-bat authorship) — with no real Supabase Auth session
available at build time, `scorer_local_id` (a `localStorage` UUID v4) stood in. The
four DB-level `"*_anon_test"` policies (below) exist for the same reason: to let an
**unauthenticated** `anon`-key client exercise the full scoring write path during
development/testing, scoped to two hardcoded team ids so the exposure wouldn't be
*unbounded* — except `allow_scorer_writes` was added alongside them with no scoping at
all, which is the actual live vulnerability tracked as **#355**.

### 1.3 Live DB state — confirmed again tonight, not new

Same read-only `pg_policies` query Track 1 used for #428 (zero write, zero risk) was
run against prod tonight as part of this audit. Result, on the four scoring tables:

| Table | Policies present |
|---|---|
| `live_game_state` | `allow_scorer_writes` (ALL, `public`, `USING(true) WITH CHECK(true)`), `game_state_anon_test` (ALL, `public`, scoped to 2 hardcoded team ids), `public_read_live_state` (SELECT, `public`) |
| `game_scoring_sessions` | `allow_scorer_writes` (ALL, `public`), `scorer_lock_anon_test` (ALL, `public`, scoped), `public_read_scoring_sessions` (SELECT, `public`) |
| `scoring_audit_log` | `allow_scorer_writes` (ALL, `public`), `audit_log_anon_test` (ALL, `public`, scoped), `public_read_audit_log` (SELECT, `public`) |
| `at_bats` | `at_bats_anon_test` (ALL, `public`, scoped) — **no catch-all on this table**, `public_read_at_bats` (SELECT, `public`) |

This matches — exactly, not approximately — what `backend/src/__tests__/rls/policies.test.js`'s
`LS` block already documents as RED-by-design (#355, skipped pending fix, tracked in
`DOC_TEST_DEBT.md`). **Nothing new or worse than already documented was found.** Per
tonight's instructions this is therefore not a hard-stop — it's the expected, already-
tracked baseline this proposal is designing a fix for.

Column types (`docs/db/schema.sql`, confirmed): `game_scoring_sessions.scorer_user_id`,
`scoring_audit_log.actor_user_id`, `at_bats.recorded_by_id` are all `TEXT`, not `uuid`,
not `FK`'d to `auth.users` — schema.sql's own inline comments call this out as the
"WS-4" forgeable-identity gap. All four tables' `team_id` columns are `TEXT`, matching
`team_memberships.team_id` — no cast needed for a membership join (same shape as
`team_data`/`roster_snapshots`).

### 1.4 No public/anon viewer requirement found

Unlike `share_links` (which genuinely needs anon `SELECT` for the unauthenticated
share-link viewer flow — root CLAUDE.md's non-negotiable Auth Principle), no equivalent
public route was found for live scoring. `LiveScoreViewer.jsx` renders from props/the
`useLiveScoring()` hook's own state, not a standalone public route; `viewerMode` in
`DugoutView.jsx` is a same-session, already-authenticated team member's UI toggle
(CLAUDE.md's `dugoutFocusMode` doc: "Viewer (`viewerMode=true`, ...)" refers to a
teammate's role, not the public). **The four `public_read_*` SELECT policies appear to
be un-narrowed predecessors of a real `authenticated`-scoped need, not a deliberate
anon-read design** — flagged for KK to confirm before Section B (below) drops them,
since being wrong here would silently break a real viewer flow this audit didn't find.

---

## 2. Proposed RLS design

Full policy language: `backend/migrations/019_scoring_auth_uid_rls.sql` (drafted,
**not applied anywhere**). Summary:

- **Identity**: `auth.uid()`, joined through `team_memberships` exactly like the
  `team_data`/`roster_snapshots` pattern migration 004 already established — no new
  pattern invented.
- **Role scoping**: `role IN ('admin', 'coach', 'scorekeeper')` for writes. `scorekeeper`
  is one of the seven canonical `team_memberships` roles (`schema.sql`'s CHECK
  constraint) and exists specifically for this use case, but isn't exercised by any
  existing policy in this tree — **flagged for KK**: confirm scorekeeper-role coaches
  are an intended near-term user before applying, not dead code being wired up early.
- **Forgeable-identity fix**: `scoring_audit_log`'s and `at_bats`'s INSERT policies bind
  `actor_user_id = auth.uid()::text` / `recorded_by_id = auth.uid()::text` — closing the
  WS-4 gap the LS5/LS6 test comments already name (a coach could otherwise forge another
  user's name into the audit trail). The `::text` cast is transitional until §3 step 6
  restores the real `uuid` column type.
- **Scorer-lock DELETE**: scoped to `scorer_user_id = auth.uid()::text` OR an admin of
  that team — matches the app's existing "Hand off scoring" release-lock behavior
  (root CLAUDE.md's Game Mode Action Tiers) without granting any coach the ability to
  kick another team's scorer.
- **Additive structure**: Section A of the migration only *adds* the new policies —
  Postgres combines multiple `PERMISSIVE` policies for the same command with `OR`, so
  this is a no-op restriction-wise until Section B (still commented out, gated behind
  its own STOP banner in the file) actually drops the old anon/catch-all policies.

---

## 3. Exact shim-removal sequence

**Do not skip steps or reorder them.** Each step's own subsection explains what breaks
if it's done out of turn — see also §5 for the consolidated worst-case list.

1. **Apply migration 019, Section A only** (additive — new `auth.uid()`-scoped policies
   alongside the existing ones). Safe at any time; changes nothing observable, since the
   old wide-open policies still gate every write more permissively than the new ones.
2. **Flip the frontend shim** (needs the `game-mode/*` gate phrase — not granted
   tonight): remove `useLiveScoring.js`'s `_effectiveUserId`/`_effectiveUserName`
   fallback, restore direct `userId`/`userName` param use; in `DugoutView.jsx`, change
   `isEnabled = liveScoringEnabled || true` → `= liveScoringEnabled`, and replace the
   `scoringUserId`/`_storedLocalId` fallback chain with the real authenticated
   `user.id`/`session.user.id` only (no `localStorage` fallback, no zero-UUID). Safe to
   deploy at this point *because Section B hasn't run yet* — if anything about the real-
   identity path is subtly wrong, the old permissive policies still let writes through
   while it's diagnosed.
3. **Soak in prod** for at least one full real game-day cycle with real authenticated
   coaches: scorer claim, heartbeat, pitch recording, hand-off, finish-game. Confirm via
   `scoring_audit_log` that `actor_user_id` values are now real `auth.users` UUIDs
   (as text), not `scorer_local_id` values or the zero-UUID.
4. **Apply migration 019, Section B** (drops the four `*_anon_test` backdoors and three
   `allow_scorer_writes` catch-alls) — **only after step 3's soak is confirmed clean.**
   This is the actual #355 fix. Confirm the `public_read_*` policies' anon-viewer
   question (§1.4) with KK before including them in this step.
5. **Un-skip `LS1`-`LS7`** in `policies.test.js` (remove the `{skip: '#355 tracked...'}`
   annotations) — these were committed RED-by-design specifically to go GREEN once this
   step lands; premature un-skipping before step 4 actually ships would fail the
   required `rls` CI check for every PR in the repo (the exact scenario KK's original
   2026-08-02 skip decision was designed to avoid).
6. **Restore column types**: `game_scoring_sessions.scorer_user_id`,
   `scoring_audit_log.actor_user_id`, `at_bats.recorded_by_id` — `TEXT` → `uuid` + `FK`
   to `auth.users`. Requires clearing shim-era rows first (`scorer_local_id` UUIDs and
   any `'admin-coach-mud-hens'`-style test markers aren't guaranteed to be valid
   `auth.users` ids) — `ALTER COLUMN ... TYPE uuid USING ...::uuid` will hard-fail on
   any row that isn't a valid UUID string, or silently produce an unreferenced UUID if
   cast without checking it against `auth.users` first. Drop the `::text` casts in the
   Section A policies once this lands.
7. **Remove `isAdminTestMode` entirely** and the dead "⚠ Admin Test Mode" badge
   reference — the value is already hardcoded `false` in `DugoutView.jsx` (a partial
   step someone already took ahead of this cutover); confirm no remaining render path
   references it, then delete the variable.

---

## 4. Every locked-file location this will eventually touch

| File / path | Locked? | What changes |
|---|---|---|
| `frontend/src/components/game-mode/DugoutView.jsx` | **Yes** — `game-mode/*` gate phrase | Shim flip (step 2), `isAdminTestMode` removal (step 7) |
| `frontend/src/components/ScoringMode/*` | **Yes** — `ScoringMode/*` gate phrase | Likely none directly (the shim lives in the hook + DugoutView), but any of the 7 children reading `scoringUserId`/`isAdminTestMode` as a prop would need re-verifying once the identity source changes upstream — not confirmed here, flag for whoever does step 2 |
| `frontend/src/hooks/useLiveScoring.js` | **Not** on the literal Locked Files list, but tightly coupled to `game-mode/*` — treat it as requiring the same care/gate discipline in practice | Shim removal (step 2) |
| `backend/migrations/019_scoring_auth_uid_rls.sql` (this proposal's draft) | Not locked | Section A apply (step 1), Section B apply (step 4) |
| `backend/src/__tests__/rls/policies.test.js` | Not locked | Un-skip LS1-LS7 (step 5) |
| `docs/ops/PHASE4C_CUTOVER.md` | Not locked | Needs a correction pass regardless of this proposal's fate — its step 2 file path is stale (§1.1) |
| `docs/db/schema.sql` | Not locked | Column type restore (step 6) needs a schema.sql re-capture afterward, per this repo's "re-verify against live prod" convention for that file |

**App.jsx is not directly in this shim's path** (grep found no `AUTH TESTING SHIM` /
`scoringUserId` markers there) — this cutover does not need the `App.jsx` gate phrase,
only `game-mode/*` and possibly `ScoringMode/*`.

---

## 5. What could go wrong — failure modes specific to a live game-day transition window

- **Section B before step 2/3 (the worst case)**: every coach's live scoring write is
  RLS-denied instantly, mid-game, for every team, simultaneously — the shimmed frontend
  isn't sending a real authenticated identity yet, so nothing satisfies the new
  `auth.uid()`-scoped policies once the old permissive ones are gone. No graceful
  degradation exists for this — `isRlsError()` in `useLiveScoring.js` currently treats a
  `42501` as "your scorer lock expired," which would be actively misleading here (the
  real cause would be "the backend cutover shipped out of order," not an expired lock).
- **Step 6 before step 4's soak is clean**: if any lingering shim-era write pattern still
  reaches these tables with a fabricated identity, the `TEXT`→`uuid` cast fails the
  whole `ALTER COLUMN` outright (a hard schema-migration failure, not a silent one — the
  safer of the two possible wrong-orderings, but still a deploy blocker if hit live).
- **A game in progress at the exact moment Section B runs**: `game_scoring_sessions`'
  heartbeat (20s interval) and `live_game_state`'s per-pitch upserts are fire-and-forget
  from the client's perspective — a Section B deploy mid-inning would surface as
  writes silently failing (console warnings only, no user-facing error surfaced by
  today's `persist()`/heartbeat code, per `useLiveScoring.js`'s existing `.then()`
  handlers) rather than a clean, visible failure. Recommend timing step 4 for a period
  with **zero games in progress** (a mid-week off-day), not "whenever CI is green."
- **`scorekeeper` role assumption wrong**: if no real user is expected to hold this role
  soon, including it in the write-scoping is harmless-but-premature; if some other,
  narrower intent was meant for that role, this proposal's blanket inclusion could be
  too permissive. Low severity (it's additive to `admin`/`coach`, not a new attack
  surface on its own), but worth KK's explicit confirmation before step 1.
- **`public_read_*` policies dropped on a wrong assumption**: if a real anon viewer
  route does exist somewhere this audit didn't find, dropping these in step 4 breaks it
  silently (viewers would just see nothing, no error). §1.4 already flags this — treat
  it as a confirm-before-proceeding item, not a settled fact.
- **No live, currently-exploitable finding *worse* than the already-documented #355
  was surfaced during this audit.** Per tonight's instructions, that means this stays a
  design proposal, not an escalation — but it's worth restating plainly: the four
  backdoor policies and the three unscoped catch-alls are real, live, and exploitable
  *today*, exactly as `#355`/`DOC_TEST_DEBT.md` already track them.
