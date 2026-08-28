# Production Schema Baseline — Incident History & Narrative

**Captured:** 2026-07-13 from prod (`hzaajccyurlyeweekvma`).
**Merged:** 2026-08-27 (#358) — folded in what was `PROD_SCHEMA_BASELINE_ADDENDUM_1.md`.
A baseline plus its own correction-and-extension document was not a good shape; this
is now one file.

> **`docs/db/schema.sql` is the single source of truth for object definitions**
> (declared authoritative 2026-08-27, #358). Tables, columns, constraints, indexes,
> triggers, functions, views, RLS policies, grants, sequences — all of it lives there,
> organized into 9 numbered sections. This document does not restate any of that,
> because a restated definition is exactly the thing that drifts unnoticed (see #351,
> and the "14 tables vs. 15" correction this file itself needed on 2026-07-14 — a doc
> correcting a doc correcting a doc).
>
> **What this document is for:** WHY a given defect existed, HOW it was found, WHAT
> breaks if you "fix" it naively, and the incident history. That narrative doesn't
> live in `schema.sql` and doesn't belong there — SQL comments are a poor home for a
> multi-paragraph incident writeup. Keep it here instead.

---

## Section map — where each object type is defined

| Object type | `schema.sql` section |
|---|---|
| Extensions | § 1 |
| Sequences | § 2 |
| Tables + columns + defaults | § 3 |
| Indexes | § 4 |
| Functions (incl. `prosecdef` / `proconfig`) | § 5 |
| Triggers | § 6 |
| Views (incl. `security_invoker`) | § 7 |
| Row Level Security (enabled state + policies) | § 8 |
| Grants | § 9 |

If you need the current column list, constraint text, policy expression, or grant —
read the matching section of `schema.sql`, not this file. Below is only what happened
and why it mattered.

---

## Incident 1 — `team_memberships` role CHECK: repo said 4 roles, prod enforced 7

**Repo** (`003_create_team_memberships.sql`) declared 4 roles. **Prod** actually
enforced 7 — someone widened the CHECK outside version control. The current,
corrected role model (four canonical roles enforced in code, seven tolerated by the
DB CHECK for 596 legacy rows) is documented in full in the root `CLAUDE.md` §
Multi-team design — that is the living doc for this; this entry is the historical
record of how the discrepancy was found.

This invalidated WS-1's stated diagnosis (#336): WS-1 assumed `/admin/approve-link`
threw a CHECK violation approving a `team_admin` request. It would not have — prod's
constraint already permitted `team_admin`. WS-1's *application-code* fix (normalizing
role vocabulary, and the `/approve` validator's genuine omission of `admin`) remained
correct; the *reasoning* about why requests were stuck was wrong. See Incident 2 for
the real cause.

## Incident 2 — why the April access requests were actually stuck

Two of three stuck requests were for emails that already had an active membership on
that team, and a unique index on `(team_id, email)` rejected the resulting duplicate
insert — not the role CHECK. The third (a genuinely new email) approved successfully.
The failure mode was duplicate-membership, not role vocabulary. Filed to correct the
record after WS-1 shipped a fix aimed at the wrong cause.

## Incident 3 — `access_requests.requested_role` CHECK rejected WS-1's own normalized values

Prod's CHECK on `requested_role` permitted the legacy role set but not `admin`/`viewer`
— the exact canonical values WS-1's ingestion normalization (`a51db38`) started
writing. A Head Coach or Parent signup could fail at the DB layer post-WS-1. This was
the live bug migration 009 fixed (widened the CHECK) — see root `CLAUDE.md`'s
Multi-team design section, which documents the corrected state.

## Incident 4 — two `SECURITY DEFINER` functions with no pinned `search_path`

`activate_membership` and `restore_game_state` ran `SECURITY DEFINER` with no fixed
`search_path` — an escalation vector (a caller can shadow an unqualified table name
with one in their own schema; the function then executes against it as `postgres`).
Fixed by migration 012 (pins `search_path` on every `SECURITY DEFINER` function).
Current state: `schema.sql` § 5.

## Incident 5 — `feature_flags.team_id` typed `bigint` while every other `team_id` is `text`

Team IDs include non-numeric slugs (`party-animals-8u`, `bananas-8u`), which cannot be
stored in a `bigint`. Team-scoped feature flags only ever worked for the one numeric
team. Not yet fixed at the schema level — tracked as part of #109 (feature_flags
migration-file gap) and worth re-checking against `schema.sql` § 3 before relying on
team-scoped flags for a slug-ID team.

## Incident 6 — `teams.owner_id` is `text` defaulting to `''`, not a real FK

Not a `uuid`, no FK to `auth.users`. Team ownership is not actually linked to a user
record at the DB level. Current state: `schema.sql` § 3.

## Incident 7 — duplicate index on `access_requests`

`access_requests_team_status_created_idx` and `access_requests_team_status_idx` were
identical: `(team_id, status, requested_at DESC)`. One is redundant. Current state:
`schema.sql` § 4.

## Incident 8 — a VIEW bypassed the RLS lock on `team_data_history`

Migration 006 locked `team_data_history` (RLS on, anon grants revoked) — verified at
the time: `anon → permission denied`. But `team_data_history_latest`, a view selecting
from it, defaulted to `security_invoker = false` (the Postgres default), so it ran
with the **view owner's** privileges (`postgres`) instead of the caller's. `anon` read
the base table straight through the view, bypassing the lock entirely. Probed: 11 rows
leaked.

This was found only because a *second* baseline pass (the addendum that is now merged
into this file) went looking for views at all — the original capture enumerated
tables, constraints, indexes, triggers, functions, and RLS on/off state, but had no
VIEWS section. **You cannot detect drift in objects you never enumerate.**

Fixed by setting `security_invoker = true` on both views (migration 011). A sibling
view, `roster_snapshots_latest`, selected from a table that was still RLS-OFF at the
time so it leaked nothing *that day* — but it exposes `roster` (children's names), and
the instant `roster_snapshots` got locked down it would have become the identical
bypass. Fixed pre-emptively in the same migration. Both views were confirmed to have
zero real consumers (the app reads base tables directly) — current state: `schema.sql`
§ 7.

## Incident 9 — four hardcoded `*_anon_test` policies grant anon full write on live scoring data

**Still open — not fixed by this doc merge.** `at_bats`, `live_game_state`,
`game_scoring_sessions`, and `scoring_audit_log` each carry a `FOR ALL` policy scoped
to `team_id IN ('1774297491626', '9000000000001')` — `1774297491626` is the Mud Hens,
a real, live team. Anyone holding the public anon key can rewrite the score, forge
at-bats, steal the scorer lock, or fabricate audit entries for that team.

Mitigating context that makes it worse, not better: those same tables also carry
`allow_scorer_writes` with `USING (true) WITH CHECK (true)` — wide open to everyone,
for every team. The `*_anon_test` policies are not even the widest door; the scoring
tables are effectively unprotected regardless, by design, pending the auth cutover
that lets scoring writes require a real session. Tracked separately — see #355.
Current policy text: `schema.sql` § 8.

## Incident 10 — `TRUNCATE` granted to `anon` broadly

Every table except `auth_events` and `team_data_history` (+ its view) granted `anon`
and `authenticated` the full set including `TRUNCATE` — and RLS does not restrict
`TRUNCATE`. Where RLS was off (`team_data`, `teams`, `roster_snapshots`, pre-WS-3), the
public anon key could empty the table outright. Current grant state: `schema.sql` § 9.

---

## RLS state — history, not current fact

The original 2026-07-13 capture recorded `team_data`/`teams`/`roster_snapshots` as
RLS-OFF with full CRUD+TRUNCATE for anon — that was true that day and is the reason
#342 was a P0. It stopped being true on 2026-07-20 (v2.6.0, WS-3: `004_rls_fixes.sql`
enabled RLS and revoked TRUNCATE on those three tables), confirmed live 2026-08-01 by
a direct anon-key probe against prod (zero-row RLS-filtered responses, not the earlier
full-access signature). **For current RLS state, read `schema.sql` § 8 — do not infer
it from this history section.**

---

## Supabase migration ledger — as captured 2026-07-13

At capture time, prod's Supabase migration ledger contained only the five migrations
applied that day:

```
20260713143900  p0_enable_rls_auth_events
20260713144129  p0_lock_team_data_history
20260713154419  p1_fix_recursive_team_memberships_policy
20260713155017  p1_add_team_memberships_teams_fk
20260713172035  p0_widen_access_requests_role_check
```

Everything else in the schema at that point had been applied by hand, with no
migration file behind it. That gap — and whether it has since closed — is what #351
tracks. This baseline was step one toward fixing it: give the repo something real to
diff production against.

---

## How to regenerate `schema.sql`

The introspection queries live in `docs/db/schema_introspection.sql`. Re-run them
against prod and diff the result against `schema.sql`. Any difference is drift.
`schema.sql`'s own header documents a case where the introspection itself was wrong
(STORED GENERATED columns misread as DEFAULT expressions) — caught only by executing
the file against DEV, not by reading it. Treat any regenerated version the same way:
run it against DEV before trusting it.

Longer-term direction (per #351): adopt the Supabase CLI so `supabase db diff` does
this automatically instead of a hand-run query-and-compare.

---

## What a schema snapshot must cover, to actually detect drift

The original 2026-07-13 capture missed views entirely and found a live security hole
(Incident 8) the moment a second pass went looking for them. A drift detector is only
as good as what it enumerates:

- [x] Tables + columns + defaults
- [x] Constraints (PK, FK, UNIQUE, CHECK)
- [x] Indexes
- [x] Triggers
- [x] Functions, including `prosecdef` and `proconfig` (an unpinned `search_path` on a
      `SECURITY DEFINER` function is an escalation vector)
- [x] RLS enabled/disabled
- [x] RLS policies themselves
- [x] Views + `security_invoker`
- [x] Grants
- [x] Sequences
- [ ] Materialized views (none exist currently)
- [ ] Extensions beyond what's in `schema.sql` § 1

`schema.sql` now covers every checked item above. Any future automated drift check
(#351) should diff against `schema.sql`, not this file.
