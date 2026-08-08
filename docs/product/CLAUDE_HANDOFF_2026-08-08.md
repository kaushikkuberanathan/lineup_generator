# Handoff — 2026-08-08, T1 → next session (T2 or future T1)

Read this before starting UX-track or Dugout-track work. Full detail lives in
`docs/process/SESSION_RETROSPECTIVES.md`'s `2026-08-07-B` entry — this is the
condensed, actionable version.

## What's actually live right now

- `develop` is at `d9dc4f2`+ (PR #647 merged) plus a pending docs-only PR (#648,
  session retrospectives). All CI green on both.
- `main` has **not** moved since v2.8.5 (PR #619, `06030c1`). Nothing from
  tonight has promoted.
- Prod database: `teams.DELETE` grant is **present** for anon/authenticated —
  unchanged from before tonight. This is deliberate, not an oversight (see
  below).
- DEV database: `teams.DELETE` grant is **revoked** for anon/authenticated —
  ahead of prod on purpose, matching the code that's on `develop`.

## The one thing that matters most: do not re-apply migration 021 to prod yet

`backend/migrations/021_revoke_teams_delete.sql` closes #380 (routes team
deletion exclusively through the backend's `service_role`). It was applied to
prod once tonight, then **reverted within minutes** because production's live
backend (Render deploys from `main`, not `develop`) doesn't have the new
`DELETE /api/v1/teams/:teamId` route yet — revoking the grant left team
deletion with no working path at all in prod.

**Before re-applying 021 to prod:**
1. Promote `develop` → `main` through the normal Release Ritual (soak
   included — this is not a hotfix situation).
2. Confirm the route is actually live: a curl `DELETE` to
   `https://lineup-generator-backend.onrender.com/api/v1/teams/<id>` should
   401 from `requireAuth` specifically, not from `admin.js`'s catch-all gate
   (check the response body shape, or better, test with a real token).
3. Re-run `backend/migrations/021_revoke_teams_delete.sql` against prod.
4. Re-verify with the grant-check query in PR #647's description.
5. Only then close #380.

Migration 021's own file header has this same precondition written into it —
read it before touching prod grants on `teams` again.

## Other open items

| Item | State | Notes |
|---|---|---|
| #645 | Open, filed tonight | `admin.html` is hardcoded to the prod Supabase project (`hzaajccyurlyeweekvma`), zero build step, zero DEV-testing surface — always has been. Finding only, no fix proposed. Worth designing if anyone touches `admin.html` again. |
| #376 | Open | Root cause diagnosed and posted as a comment (`activeTeamId` never reconciled against real `memberships`). Fix needs `App.jsx` — blocked on the literal gate phrase, not granted this session. |
| #577 | Open, `status:deferred` | FEATURE_MAP.md restructure — confirmed by KK as its own dedicated-session item, not a quick task. Leave it. |
| #632-636 | Open | 4 dependency bump PRs held with real evidence of breakage (not assumed) — need a dedicated session to fix the underlying issue, not just re-attempt the bump. |
| App.jsx decomposition (Track 2) | Blocked | No gate phrase granted this session — do not start without KK typing it fresh in chat. |

## Two near-misses worth internalizing

1. **Worktree routing**: `git -C <path>` only redirects git subcommands.
   Edit/Write/Read need the literal absolute path into the correct worktree;
   non-git Bash needs a compound `cd "<path>" && <command>` in the same call
   (this session's Bash tool resets cwd after every call). Full corrected
   discipline: [[feedback-t1-scoped-work-via-git-dash-c]] /
   `feedback_t1_scoped_work_via_git_dash_c.md` in memory.
2. **Prod REVOKE before deploy**: a signal that looks like confirmation (a
   401 response) isn't the same as confirming the actual claim (the route
   exists). Before any prod-affecting action, verify the *exact* precondition
   — not an adjacent one that happens to look similar.

## Branch/worktree state

- Two temporary worktrees (`lineup-generator-tmp-fix380`, `lineup-generator-
  tmp-021`, `lineup-generator-tmp-retro`) were created and removed cleanly
  tonight — none should remain. If you see one, something didn't clean up;
  check `git worktree list` before assuming it's safe to delete.
- 8 stale local branches were deleted from Main tonight (all pre-verified
  merged). `local/develop-tracking` (Main) was deliberately left alone —
  ambiguous, non-standard naming, not worth guessing at.
- Did not touch `lineup-generator-ux` or `lineup-generator-ux-t2-isolated` at
  all beyond reading branch state read-only.
