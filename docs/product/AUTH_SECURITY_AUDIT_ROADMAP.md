# Auth / Security / Audit Roadmap

**Status:** v1.2
**Owner:** Kaushik
**Last Updated:** 2026-08-08 (role-model table, scoring-capability section, and WS-1 known-gaps updated for Story 124/#655 — see inline notes; prior update 2026-08-04 was the role-model + WS-3 correction, Doc Audit Spike Story 2)
**Location:** `docs/product/AUTH_SECURITY_AUDIT_ROADMAP.md`

---

## Purpose

`SECURITY_FRAMEWORK.md` is a **menu** - a pick-and-choose list of independently
scoped security items. This document is the **execution spine**: it sequences the
auth, authorization, and audit work into a dependency-ordered program and assigns
each slice to a worktree (T1 main / T2 UX).

**Core thesis:** the auth/audit core is *not* a set of independently shippable
items. It is a single program with one hard dependency - the Phase 4 `requireAuth`
cutover - that almost everything else attaches to in a fixed order. Sequencing it
wrong breaks live scoring or ships a forgeable audit trail.

This doc does not replace `SECURITY_FRAMEWORK.md`; it references its item numbers
(e.g. `SF-1.2`) and adds the workstream (WS-*) sequencing layer on top.

---

## THE ROLE MODEL (canonical - read this before touching any role code)

This is the single authoritative statement of how roles work. Three layers
disagreed before WS-1; they no longer do. Do not reintroduce the drift.

### Two axes, never conflated

Roles live on **two separate axes**. Collapsing them into one list is what caused
the original defect.

**Axis 1 - Platform scope (GLOBAL).**
`platform_admin` is a **global capability**, not a team role. It is **never**
written to `team_memberships`. `normalizeRole()` throws `ROLE_FORBIDDEN` if
anything tries.

**Axis 2 - Team scope (PER-TEAM).**
`normalizeRole()` targets exactly **four canonical strings** at the code layer:

    admin | coach | scorekeeper | viewer

**!! CORRECTED 2026-07-13, re-verified live 2026-08-04 - this is NOT what the
database enforces.** `team_memberships.role`'s live CHECK constraint (verified via
direct `pg_constraint` query against prod, and matching `docs/db/schema.sql`)
allows **SEVEN** values, not four:

    admin | viewer | team_admin | coordinator | coach | scorekeeper | parent

The four-string list above is the code-level normalization *target*
(`normalizeRole()`), not a database-enforced fact. The DB tolerates the extra
three (`team_admin`, `coordinator`, `parent`) because ~596 existing rows hold
them - narrowing the CHECK constraint to four is a **data migration**, not a doc
edit. Treating the four-string list as DB-enforced is the exact error that broke
the public signup form once already (migration 009: `access_requests` rejected
`admin`/`viewer` until its own CHECK was widened to match the real seven-value
set). Do not reintroduce that assumption anywhere in this document or in code.

### The label layer

What a user SEES is richer than what we STORE, and what we STORE is richer than
what `normalizeRole()` TARGETS. Three layers, not two:

| UI label          | Stored value (DB, 7 possible) | `normalizeRole()` target (4) | Notes |
|-------------------|--------------------------------|-------------------------------|-------|
| Head Coach        | `admin`                        | `admin`                       | Runs the team. RLS grants team-management. |
| Assistant Coach   | `coach`                        | `coach`                       | |
| Team Coordinator  | `coordinator` (legacy rows) or `coach` | `coach`                | Coach-tier in authz terms. `coordinator` is a real, DB-tolerated legacy value, not just a label. |
| Scorekeeper       | `scorekeeper`                  | `scorekeeper`                 | Re-added to `RequestAccessScreen.jsx` 2026-08-08 (Story 124/#655), reversing this doc's prior "not offered" guidance — see updated note below. |
| Parent / Family   | `viewer` or `parent` (legacy rows) | `viewer`                  | Read-only team seat. Added as an offered picker option 2026-08-08 (Story 124/#655) — previously a valid mapping with no UI entry; that gap is now closed. |
| *(legacy only)*   | `team_admin`                   | `admin`                       | Tolerated for existing rows; not offered as a request-access option. |

**Two labels legitimately map to one canonical `normalizeRole()` target.** This is
not a bug. Do NOT "fix" it by trying to remove `coordinator`/`team_admin`/`parent`
from the CHECK constraint on the assumption they're an accidental drift - they are
live, populated, legacy-tolerated values today. If the DB-level vocabulary is ever
narrowed to match the four-string target, that is a deliberate data migration
(reassign or reject the ~596 legacy rows first), tracked as its own workstream -
not a side effect of editing this document.

Because of this, `RequestAccessScreen.jsx` tracks an option **`id`** in state and
resolves `id -> value` at submit. `value` cannot serve as the React key or the
`<select>` value, or the picker collapses Coordinator into Assistant Coach.

### Scoring is a capability, not a role

Any user - including a `viewer` parent - can claim the scorer lock for a specific
game via `game_scoring_sessions` / `scoring_audit_log`. Scoring is orthogonal to
team role - this remains true and unchanged.

**Updated 2026-08-08 (Story 124/#655):** `scorekeeper` was re-added to
`RequestAccessScreen.jsx`'s offered options, reversing the "not offered"
guidance this section previously stated as settled. This was a deliberate,
in-session product call, not rediscovered drift - but it sits in real tension
with the capability-not-role argument above, which was not re-litigated at the
time. Practical effect: a self-requested Scorekeeper membership is now possible
alongside the pre-existing, role-independent per-game scorer lock - two
different mechanisms that both grant scoring ability. Whether a persistent
Scorekeeper role earns its keep beyond what the capability lock already gives
(season-long identity, notification routing, etc.) has not been explicitly
answered. If this doc is revisited, resolve that question explicitly rather
than quietly removing this note.

### The translate-vs-reject asymmetry (intentional)

Different boundaries handle legacy vocabulary differently. **This looks like an
inconsistency and is not.** It is pinned by tests (WS1-11 vs WS1-14).

| Boundary                  | Input source      | Legacy label  | Unknown value        |
|---------------------------|-------------------|---------------|----------------------|
| `POST /request-access`    | public form       | **TRANSLATE** | 400 VALIDATION_ERROR |
| `GET /admin/approve-link` | legacy DB read    | **TRANSLATE** | 400 HTML page        |
| `POST /admin/approve`     | admin dropdown    | **REJECT**    | 400 VALIDATION_ERROR |
| `POST /admin/update-role` | admin dropdown    | **REJECT**    | 400 VALIDATION_ERROR |

**Why:** public input must be tolerated and normalized (we do not control what an
old cached bundle sends). Admin-chosen input from an authenticated panel dropdown
should be *rejected* if malformed - transforming it would silently accept junk and
weaken the contract.

`normalizeRole()` is idempotent, so applying it at multiple boundaries is safe.

---

## Workstreams

| WS | Title | Maps to | Gate | Worktree | Status |
|----|-------|---------|------|----------|--------|
| WS-1 | Role vocabulary normalization | *(new)* | A | T1 | **DONE** (#336) |
| WS-2 | Approve-link HMAC + `reviewed_by` | SF-1.11 | A | T1 | Open (#337) |
| WS-3 | `requireAuth` cutover + RLS 004 | Charter P2 | B (spine) | T1 | **SPLIT STATUS - re-verified live 2026-08-04.** #342 (team-data/teams/roster_snapshots RLS) is **DONE** - shipped v2.6.0 (2026-07-20), confirmed live: all three tables now show `relrowsecurity = true` with real `auth.uid()`-scoped policies (see `docs/db/schema.sql` §8). #355 (the scoring tables) is **STILL OPEN** - confirmed live, unchanged: `live_game_state`/`game_scoring_sessions`/`scoring_audit_log` each carry an `allow_scorer_writes` policy (`roles: public, cmd: ALL, qual: true`) that permits unrestricted read/write/delete on every team's scoring data, platform-wide - broader than the "four backdoors, Mud Hens-only" framing this row previously carried; the team-scoped `*_anon_test` policies are redundant given `allow_scorer_writes` already grants everything to everyone. #355 is not fixable without WS-4 (below). |
| WS-4 | FK restore + WHO/WHEN columns | SF-2.1-adj | rides B | T1 | Not started |
| WS-5 | Agreement gate (backend + UI) | *(new)* | C | T1 + T2 | Not started |
| WS-6 | Ownership-check middleware | SF-1.2 | rides B | T1 | Not started |
| WS-7 | Phase 0 hygiene | SF-0.1-0.5 | none | T1 | Not started |

---

## The dependency spine

```
SF Phase 0 hygiene (WS-7) ---- parallel, no dependency ----+
                                                           |
[GATE A]  WS-1 role normalization  DONE                    |
          WS-2 approve-link HMAC   #337                    |
    |                                                      |
    v                                                      |
[GATE B]  WS-3 requireAuth cutover + 004_rls_fixes.sql <---+   the spine
    |        rides with: WS-4 (FK restore + WHO/WHEN cols)
    |                    WS-6 (ownership middleware, SF-1.2)
    v
[GATE C]  WS-5 agreement gate (table + /legal/* + middleware + UI)
    |
    v
[GATE D]  Hardening: audit-log table (SF-2.1), account deletion (SF-3.2),
          COPPA consult (SF-3.1)
```

**Why the spine is non-negotiable:** RLS hardening, FK restore, and `requireAuth`
share the same break-if-misordered surface. `004_rls_fixes.sql` will break the app
if run before the cutover (coaches still write `team_data` with the anon key). The
FK restore has the identical trap: today's scoring writes use a localStorage UUID
not present in `auth.users`, so restoring the FK before auth is live throws
mid-game. They must land together.

---

## WS-1 - Role vocabulary normalization  `[DONE - #336]`

Five commits on `security/336-role-normalization`:

| Commit | Slice |
|---------|-------|
| `a1e7c3d` | `normalizeRole()` helper + 34 unit tests (inert) |
| `e52792f` | `/admin/approve-link` - closed a LIVE CHECK violation |
| `66b3917` | `/approve` + `/update-role` validators consolidated to `CANONICAL_ROLES` |
| `a51db38` | request-access ingestion - the source boundary |
| `1724bbe` | clients send canonical roles - label layer at the UI |

**The break it fixed:** `access_requests.requested_role` was persisted verbatim, so
`team_admin` / `coordinator` / `parent` landed in the DB. `/admin/approve-link`
inserted that value straight into `team_memberships`, whose CHECK constraint rejects
it - so approving a Head Coach threw. Production held exactly such a row.

`POST /admin/approve` separately omitted `admin` from its validator, so an admin
using the panel could not approve a Head Coach at all.

**Coverage:** 93 backend unit tests (`normalizeRole` + three route-level suites
asserting on the INSERT PAYLOAD, not just the response).

**Known gaps, deliberately deferred:**

- `App.jsx:2304` (`role: team.role || "team_admin"`) - an analytics default, not an
  authz value. Moves together with `ANALYTICS.md`'s four matching refs.
- ~~No `RequestAccessScreen` frontend test exists.~~ **Closed 2026-08-08** (Story
  124/#655) - 13 tests added, including coverage of the `id`/`value` indirection
  this gap warned about (mutation-tested to confirm the tests actually catch a
  collapsed-option regression, not just assert against the current shape).

---

## WS-2 - Approve-link HMAC signing + `reviewed_by`  `[GATE A - #337]`

Replace UUID-only approve/deny links with HMAC-signed, 24h-expiring tokens. Stop
trusting `role` from the query string. Set `reviewed_by` on both approve paths.

**Folded in (same code block):** the `/admin/approve-link` `access_requests` status
update awaits without capturing its error. If it fails, the membership is created
but the request stays `pending` - a silent inconsistency, unlogged.

---

## Issues filed 2026-07-13

| # | Title | Priority |
|---|-------|----------|
| #336 | WS-1 Role vocabulary normalization | P1 - **DONE** |
| #337 | WS-2 Approve-link HMAC + reviewed_by | P1 |
| #338 | admin.html writes directly to team_memberships, bypassing all backend guards | P1 - **DONE 2026-08-25** |
| #339 | Test suites pollute production team_memberships and access_requests | P2 |
| #340 | OG meta duplicate | P3 |
| **#342** | **P0: RLS DISABLED on core tables - rosters publicly readable and destructible** | **P0** |
| #346 | Real access requests buried under ~593 test rows in the admin panel | P1 |
| #347 | Missing FK broke the Coaches tab - no test caught it | P2 |
| **#348** | **No test exercises RLS as an authenticated user - three P0/P1s hid behind a green suite** | **P1** |
| #350 | Docs are stale or false; admin panel undocumented | P1 |
| **#351** | **The repo and the production database have never been in sync** | **P1** |
| #353 | Pitcher rest eligibility (future feature, design preserved) | P3 |
| **#355** | **Four hardcoded anon backdoors are live on the Mud Hens' scoring tables** | **P1** |
| #358 | docs/db/ has four overlapping artifacts that will drift | P2 |

**Migrations applied to prod 2026-07-13 (005-012):** RLS lock on `auth_events` and
`team_data_history`; recursive-policy fix; missing FK; the CHECK widening that
**unbroke the signup form**; view RLS-bypass fix; SECURITY DEFINER `search_path` pins
+ a dead vulnerable function dropped.

**Ground truth is now `docs/db/schema.sql`.** Debugging gotchas are in
`docs/TROUBLESHOOTING.md`.

**#338 was the significant discovery, resolved 2026-08-25.** `frontend/public/admin.html`
used to write membership rows straight to Supabase via the client SDK - a FOURTH write
path into `team_memberships` that WS-1 did not know about, bypassing `normalizeRole`,
`requireAuth`, `requireAdmin`, `reviewed_by`, and auth-event logging. WS-1 patched its
option values as a stopgap in 2026-07-13; the architectural bypass itself was fixed via
PR #780 (Approve/Deny) and #787's six sub-issues #788-793 (feature flags, Add/Remove
Coach, Add Team, roster, schedule) — every admin.html mutation now authenticates to
the Express API with a Bearer token. See
`docs/product/ADMIN_HTML_BYPASS_REMEDIATION_PLAN.md` for the full design record.

---

## Worktree split

**Constraint:** T2 (UX) survives parallel work *only* if it stays out of
release-bump files, `App.jsx`, and backend. The split is **by file ownership, not
by topic**.

| Worktree | Owns | WS slices |
|----------|------|-----------|
| **T1 (main)** | `App.jsx`, backend routes, migrations, RLS, middleware | WS-1 (done), 2, 3, 4, 6, WS-5 *backend* |
| **T2 (UX)** | `components/`, `theme/tokens.js`, `content/legal.js` | WS-5 `AgreementGate.jsx`, legal-copy reconciliation |

**The parallelization win:** T2 can build `AgreementGate.jsx` against a **frozen API
contract** before T1 finishes the backend. Freeze the agreement-version string as a
shared constant first, so both worktrees import one value.

---

## Standing practice - WHO/WHEN convention

> Every mutable table carries `created_at`, `updated_at`, and a `*_by` actor column
> referencing `auth.users(id)`. Every append-only audit table carries `recorded_at`
> plus a non-null, FK-enforced `actor_user_id`. No exceptions without a documented
> reason.

Current gaps (WS-4): `team_data` has neither `updated_at` nor `updated_by` at row
level. `scorer_user_id` / `actor_user_id` are untrusted TEXT with FKs dropped - the
audit log is forgeable today. `share_links` has no `created_by`.
