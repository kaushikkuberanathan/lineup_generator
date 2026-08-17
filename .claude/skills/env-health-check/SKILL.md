---
name: env-health-check
description: Check that this machine's local dev setup (Docker, both worktrees, tests, env files) and this repo's GitHub/prod state are actually healthy — not just "looked fine last time." Use at the start of a session working on lineup_generator, whenever something feels off (a test that shouldn't be failing, a worktree that seems out of sync), or when asked to verify the environment. Prod checks are strictly read-only.
---

# Environment Health Check — Dugout Lineup

This wraps `scripts/env-health-check.sh`, a deterministic script that checks
machine tooling, both local worktrees, and read-only GitHub/prod state. The
script does the checking; this skill does the judgment — deciding what a
finding means and what (if anything) to do about it.

Origin: session `2026-08-17-A` (see `docs/process/SESSION_RETROSPECTIVES.md`)
found Docker Desktop down and a missing `frontend/.env` in the UX worktree
purely by manual inspection. This exists so that stops being manual.

## What it covers, and what it doesn't

**Covers:** machine tooling (git/node/npm/gh/vercel/supabase CLI/Docker),
both worktrees (branch sync, working-tree cleanliness, Husky hook, installed
deps, env file presence, lint, full test suites, RLS suite), GitHub state
(open PR count, Dependabot alerts), prod health (backend `/ping`, frontend
loads) — all from *this machine*.

**Doesn't cover, by design:** anything requiring the cloud sandbox's own view
of GitHub/prod (there's a separate daily scheduled cloud routine for that —
check `https://claude.ai/code/routines` or ask to list routines if you need
its most recent findings). This skill and that routine are deliberately
split: this machine can see Docker and both worktrees, the cloud routine
can't; the cloud routine runs even if this PC is off, this skill can't.

## Running it

```bash
bash scripts/env-health-check.sh          # full check — takes ~3-5 min (real lint + test suite runs, both worktrees)
bash scripts/env-health-check.sh --quick  # skip lint/build/test, just tooling + file presence + prod ping (~10s)
bash scripts/env-health-check.sh --no-fix # never attempt to auto-start Docker even if it's down
```

Always run from the main worktree (`lineup_generator`) — it auto-discovers
both worktree paths via `git worktree list` and checks both regardless of
which one you run it from.

**At session start**, prefer checking for a recent report over re-running
the full suite: `.claude/health-reports/latest.log` (gitignored, local only
— see "Where results go" below). If it's from today and shows 0 FAIL, that's
usually enough; re-run fresh if it's stale, missing, or you have a specific
reason to distrust it (per this repo's own standing discipline: verify the
specific claim that matters, don't trust a general "probably fine").

## Reading the output

Three tiers, and they mean different things:

- **PASS** — confirmed working, no action needed.
- **WARN** — worth knowing, not necessarily worth fixing right now. Examples:
  a branch not yet pushed (often just means WIP), a Dependabot alert count
  that couldn't be read (known token-scope limitation, not a real gap),
  minor drift from origin. Report these to the user in a summary; don't
  treat them as blockers.
- **FAIL** — something that should work doesn't. Examples: a test suite
  failure, a missing Husky hook, prod `/ping` not returning 200, `node_modules`
  missing. These need real attention before self-service troubleshooting on
  this repo can be trusted.

## What to actually do with a FAIL

Don't just report and stop — but don't silently "fix" things that need a
human decision either. Follow this repo's own established judgment calls
(same reasoning applied throughout session `2026-08-17-A`):

- **Docker down** → the script already tries to start it automatically
  (`--no-fix` disables this). If it still fails to come up, that needs a
  human — Docker Desktop itself may be broken, not just stopped.
- **Missing `node_modules`** → safe to fix directly: `npm install` at the
  affected level (root/frontend/backend). Low risk, purely additive.
- **Missing Husky wrapper** (`.husky/_/pre-push`) → same fix, `npm install`
  at repo root. This one matters more than it looks: without it, `git push`
  silently skips the pre-push branch guard — see root `CLAUDE.md`'s
  "Worktree setup before first push" note.
- **Missing `.env`/`.env.rls.local`** → if the *other* worktree has a
  complete, working copy, copying it across is safe and was exactly what
  session `2026-08-17-A` did (these are gitignored, never committed, no
  secret-exposure risk from a local file copy). If *neither* worktree has
  it, that's a real gap — surface it, don't invent values.
- **Lint or test-suite failure** → do not "fix" this by loosening the check,
  skipping the test, or committing past it. Investigate the actual cause the
  same way the rest of this repo's test-first discipline expects (see root
  `frontend/CLAUDE.md` § RED Checkpoint) before touching anything.
- **Prod `/ping` or frontend not returning 200** → this is the one genuinely
  urgent category. Don't attempt a fix from here — surface it immediately
  and point at root `CLAUDE.md`'s Rollback Procedure. This finding is why
  the check exists in the first place; treat it with the same urgency
  UptimeRobot's own alerting is supposed to have.
- **A worktree diverged from origin** → just `git fetch` and report the gap;
  don't merge, rebase, or pull without knowing what's actually different,
  per this repo's own pre-pull branch-check convention.

## Where results go

Every run writes a timestamped report to `.claude/health-reports/` (gitignored
— these are local artifacts, not repo history) and updates
`.claude/health-reports/latest.log` to point at the newest one. Nothing here
is committed or pushed automatically.

## Local scheduling

There's no `claude` CLI binary on this machine (this session runs as a
VSCode extension only), so a true unattended *agentic* run isn't possible via
Windows Task Scheduler — Task Scheduler can only invoke the raw script, not
this skill's judgment layer. The raw script alone is still useful
unattended: it's fully deterministic, writes its report to
`.claude/health-reports/latest.log`, and exits non-zero on a real FAIL. If a
Scheduled Task is configured (check `schtasks /query /tn DugoutHealthCheck`
first — see `docs/process/CLAUDE_CODE_HANDOFF.md` for whether one was
actually set up), the judgment layer runs *next*, at the start of whatever
session next opens this repo, by reading that report rather than assuming
it's fine unread.
