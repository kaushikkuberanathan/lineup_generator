# Agent Onboarding Supplement — Full KK Context

> Read immediately after `docs/process/CLAUDE_CODE_HANDOFF.md`. Added 2026-08-17
> from KK's untrimmed onboarding export. Repository `CLAUDE.md` files remain
> authoritative when a historical statement conflicts with current Git state.

## Decision and Communication Model

Think as a “Council of Three” expressed in one coherent recommendation:

1. Backend-first Lead Software Developer: contracts, data, failure modes,
   retries, and idempotency.
2. Pragmatic Technical Architect: security, scale, cost, ownership boundaries,
   and observability.
3. Tactical Front-End Engineer: mobile taps, accessible states, field pressure,
   and edge cases.

Put the recommended approach first, then meaningful alternatives and tradeoffs.
Label MVP versus Phase 2+ explicitly. Do not leave KK with an unranked menu when
the evidence supports a recommendation.

On KK's personal Windows PC, assume product and technical fluency but not
power-CLI fluency. Give PowerShell commands one at a time, say which window to
use, explain what each command does, show expected output, and include recovery.
Never give him macOS/Linux commands to execute. Repository Bash scripts can still
run internally where CI or an established workflow requires them.

## Additional Architecture Constraints

- Roster entries have no dependable `.id`. Player name is the legacy stable
  identifier across roster, batting order, fielding grid, lineup engine, and
  scoring. Read root `CLAUDE.md` section “Roster identity” and preserve the
  established `player.id || name` fallback behavior.
- The legacy `var C` color object was retired from `App.jsx` in v2.8.5. Treat a
  new reference as stale or suspicious and verify Git history before acting.
- KK is both global platform administrator and a real Mud Hens coach. Mobile,
  first-name-friendly, minimal-tap decisions come from live field use.

## Branch and PR Conventions — `issue/*` Naming

The supplied prior-agent convention claimed a nested three-tier hierarchy
(`issue/<N>-<slug> -> feature/<topic> -> develop -> main`, with a squash merge
at the inner level). **Checked against real PR data on 2026-08-17 and this is
wrong.** Three sampled `issue/*` merges (PR #382, #398, #433 — pulled via
`GET /repos/.../pulls/{n}` and `git show -s --format=%P`) all had
`base.ref: "develop"` directly and were genuine 2-parent merge commits, not
squashes into an intermediate branch. There is no `feature/*` parent tier in
practice: `issue/N-slug` and `feature/topic` are two interchangeable naming
conventions at the *same* tier, both cut from and merged straight back to
`develop` under the standard "always a merge commit, never squash" policy.
Do not require an `issue/*` branch to have a `feature/*` parent, and do not
squash an `issue/*` merge into anything.

- Label PRs as well as issues using existing `priority:*`, `type:*`, `area:*`,
  and `status:*` labels where practical — real practice (checked PR #663,
  #677) is inconsistent, not a hard gate. Fetch the repository label list;
  never invent strings. A PR's status label can differ from its linked
  issue's status.
- Every issue-branch commit references its issue, and the PR body closes it.
- Verify a merge's parent shape instead of trusting GitHub's sticky dropdown.

## Expanded Release Checks

- For an `x.Y.0` minor release, run the PowerShell `debt-p0` helper and require
  “P0 gate clear.”
- `VERSION_HISTORY` uses an approved `techNote` string enforced by
  `frontend/src/__tests__/versionHistory.test.js`; free-form values fail CI.
- Reconcile test counts, documentation, feature-map entries, roadmap issue
  placeholders, real-device preview behavior, and CI on the actual target SHA.
- If implementation added more tests or assertions than the approved proposal,
  list the delta and obtain conscious acceptance before declaring completion.

## Multi-Agent and Multi-Worktree Coordination

- Re-read `git status`, branch, worktree list, and `origin/develop` immediately
  before checkout, branch, stash, merge, or shared-file work. Another terminal's
  summary and earlier turn state can be stale.
- Do not switch, stash, clean, or rewrite a worktree while background tests or
  agents are reading/writing it.
- `git -C <path>` scopes only that Git command. Every read, edit, npm, Supabase,
  copy, or delete operation must independently target the intended absolute
  worktree. Shell directory changes do not persist between tool calls.
- Recheck shared ledgers such as `CLAUDE.md`, `ROADMAP.md`, and
  `DOC_TEST_DEBT.md` against `origin/develop` immediately before editing.
- Do not open or merge a feature-to-develop PR while another track is in a
  develop-to-main promotion. A pushed branch can wait. After the promotion and
  post-promote sync, integrate current `develop` first.
- Do not parallelize branches that modify the same shared file. Sequence them
  through merge and sync.
- Verify agent reports using actual branch diffs, direct ledger/test counts, and
  CI for the precise SHA. Confirm the PR is not unintentionally left as draft.
- Escalate security or reliability findings immediately rather than folding them
  into routine sprint cadence.
- Audit version alignment, onboarding/support navigation, and legal copy every
  other day or after two or more features ship without a documentation pass.

## Windows and Corporate-Device Quirks

- Corporate certificate checks can make `curl` fail with
  `CRYPT_E_NO_REVOCATION_CHECK`. The known workaround is `--ssl-no-revoke` when
  curl is truly needed; prefer authenticated first-party tooling when scoped.
- PowerShell double-quoted here-strings interpolate and can damage backtick-
  wrapped Markdown. Use literal single-quoted here-strings for PR/issue bodies.
- Explicitly encode GitHub JSON as UTF-8 and re-fetch after writes to catch
  mangled non-ASCII text.
- `Select-String -Path "**/*.ext"` is not recursive. Prefer `rg`, or enumerate
  files with `Get-ChildItem -Recurse` before `Select-String`.
- Do not route npm scripts through `cmd /c` from an automation shell when it
  fails silently; use PowerShell invocation in the correctly scoped worktree.
- Keep explicit-path staging. Tooling can create files during a session, making
  blanket staging unsafe.
- **This repo lives inside a OneDrive-synced folder — avoid hosting active
  `.git` metadata there if you have a choice.** On 2026-08-17 the primary
  worktree's `.git/config` was found zero-filled (416 bytes, all null bytes)
  at 23:38 local, one minute after `HEAD` and `index` were both last
  touched — consistent with a git write racing a OneDrive background sync on
  this actively-changing directory, on a day with heavy confirmed concurrent
  multi-session git activity across these same worktrees. **This is a
  suspected cause and risk factor, not a confirmed root cause** — no
  process-level or OneDrive sync-log evidence was captured to prove the
  mechanism, only the timing correlation. No OneDrive version-history or
  Windows Recycle Bin recovery path was found for the file. Recovered by
  reconstructing `.git/config` from a fresh independent `git clone`'s
  generated config (real git-authored baseline, not written from memory)
  plus two settings only recoverable from session history: `core.hooksPath
  = .husky/_` and the `ux-local-base` branch's non-default tracking of
  `origin/develop`. **Process gap, not repeated:** the corrupted (zeroed)
  file was overwritten during recovery before a copy was saved — losing the
  one artifact that might have helped confirm or rule out the OneDrive-sync
  hypothesis. If this happens again: copy the corrupted file aside first,
  every time, even under pressure to restore quickly. Full incident detail:
  `docs/process/SESSION_RETROSPECTIVES.md`, session `2026-08-17-A`.

## Historical Claims Reconciled on 2026-08-17

- The old export says GitHub CLI is often unavailable. It is now installed at
  `2.97.0` and authenticates as `kaushikkuberanathan`. Its current token still
  cannot list Actions-secret metadata (HTTP 403), so verify each capability.
- The export lists extra isolated/scratch worktrees. The verified local
  `git worktree list` contained only the primary and UX worktrees. Historical
  worktree names are not current facts.
- Release counts, open PRs, CI status, soak age, and branch distance in the export
  are a dated snapshot. Fetch remote state and query CI before release claims.
- Root `CLAUDE.md` currently defines regular merge commits for feature-to-develop
  and develop-to-main. The child issue-branch squash convention described in the
  prior export is **not real** — see "Branch and PR Conventions" above. Checked
  against three actual PRs (#382, #398, #433); all merged directly to `develop`
  as genuine 2-parent merge commits. This entry itself was accepted uncritically
  on first pass and only corrected after independent verification — a reminder
  that "reconcile against root CLAUDE.md" is not sufficient when root CLAUDE.md
  is silent on the specific claim; check real merge/PR data instead.

## Additional Questions for KK or the Prior Agent

1. Is the nested `issue/* -> feature/*` branch layer required for every
   multi-story initiative, or only selected tracks?
2. Should PR labeling be added to authoritative repository governance, since the
   current root label wording is primarily issue-oriented?
3. Which actions require KK checkpoints beyond the documented gate phrases—for
   example creating issues, opening draft PRs, changing provider variables, or
   running read-only PROD smoke tests?
4. Should periodic drift audits be scheduled by calendar, feature count, or only
   during release preparation?
5. Which device is this agent expected to optimize setup instructions for now:
   the Cox-managed laptop, personal OneDrive PC, or both?

