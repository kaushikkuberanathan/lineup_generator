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
of GitHub/prod. There's a separate daily cloud routine for that —
[Dugout Lineup — Daily GitHub + Prod Health Check](https://claude.ai/code/routines/trig_01FMH5WAYUGdEzeoxy1CFnxo)
(`trig_01FMH5WAYUGdEzeoxy1CFnxo`, fires 11:17 UTC / ~7:17am ET daily). Use
`RemoteTrigger` (`action: "list_runs"` then `"get_run_log"`) to pull its most
recent findings rather than re-deriving them locally. This skill and that
routine are deliberately split: this machine can see Docker and both
worktrees, the cloud routine can't; the cloud routine runs even if this PC
is off and can query Render/Vercel/Supabase directly via their connectors,
this skill can't (no MCP connectors available in a plain local session).
Notably: the cloud sandbox's network egress is proxied to an allowlist that
excludes `dugoutlineup.com` and the Render backend domain entirely, so its
prod-health signal comes from the Render/Vercel/Supabase connectors'
platform-reported status, not a literal HTTP ping — that's a real, permanent
constraint of that environment, not a bug to fix.

## Cloud routine security posture

The routine's `HARD RULE: take no write actions` in its prompt is not the
only backstop — as of 2026-08-17 each attached MCP connector
(`Git-CoPilot-MCP`, `Supabase`, `Vercel`, `Render`) has an explicit
`permitted_tools` allowlist restricted to `list_*`/`get_*`/`search_*`-style
read calls. This was a real gap the first test run exposed: connectors were
initially registered with `permitted_tools: []`, which the platform treats
as *unrestricted*, not *nothing permitted* — the test run's own transcript
showed it successfully calling `list_pull_requests`, `get_advisors`,
`list_deployments`, etc. with no tool-level gate at all, meaning the prompt's
"don't write" instruction was the *only* thing standing between a
prompt-injection attempt (this routine reads PR titles, issue text — exactly
the untrusted content injection attacks target) and an actual
`apply_migration` / `trigger_deploy` / `merge_pull_request` call. Fixed via
`RemoteTrigger action: "update"` with explicit `permitted_tools` per
connector.

**Two things about this fix are unverified, not just "should work":**
- Whether `permitted_tools` blocks at actual *execution* time (robust) or
  only at *discovery*/ToolSearch time (weaker — a prompt-injected instruction
  that already knows an exact tool name wouldn't need discovery). A live
  test to confirm this was attempted and blocked by the Claude Code
  safety classifier itself (asking a cloud agent to deliberately call a
  tool outside its own permission boundary reads as a bypass attempt, even
  with a harmless target and defensive intent) — correctly refused rather
  than routed around. KK chose to defer verification to the routine's own
  settings page (`https://claude.ai/code/routines`) rather than force the
  test.
- Whether the `mcp__github__*` tool namespace observed in the first test
  run's transcript (used for the actual `list_pull_requests`/`get_commit`
  calls) is the same thing as the explicitly-attached `Git-CoPilot-MCP`
  connector (in which case the new allowlist covers it) or a separate,
  always-on integration tied to the session's `git_repository` source (in
  which case it might not). Not resolved — worth checking next time this
  routine's config is touched.
- Whether `{"notifications": {"push": true}}` sent via `update` actually
  took effect — the API returned 200 and `updated_at` changed, but the
  field isn't echoed back in the trigger object, so there's no positive
  confirmation. Check the routine's own settings page to confirm before
  assuming a push notification will actually fire on a bad finding.

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
`.claude/health-reports/latest.log`, and exits non-zero on a real FAIL.

A Scheduled Task named **`DugoutLineupHealthCheck`** was registered
2026-08-17 (`Get-ScheduledTask -TaskName "DugoutLineupHealthCheck"` to
inspect it), daily at 6:15am local, running
`scripts/env-health-check.sh` via Git Bash and redirecting combined
stdout/stderr to `.claude/health-reports/scheduled-task-stdout.log`
(truncated fresh each run, not appended — the script's own timestamped
reports already keep history) as a backstop in case the script itself
crashes before writing its own report. `ExecutionTimeLimit` is 30 minutes —
wider than the ~19-minute worst case if every single per-step timeout below
were hit on both worktrees at once, so the task's own outer limit never
preempts the script's more informative per-step timeout reporting.
`-WakeToRun` is set, so it'll wake the machine from sleep/hibernate to fire —
**but not from a full power-off.** If the laptop is genuinely shut down
overnight rather than asleep, the realistic behavior is "runs next time the
machine is on," not literally 6:15am every day. Say that plainly if asked
about it rather than overclaiming the schedule.

**Also as of this revision:** lint/test/RLS steps each have their own
timeout (120s/300s/60s/90s) and report an explicit `[FAIL] ... TIMED OUT`
rather than letting a hang silently eat the whole run. Timestamped reports
older than 30 days are pruned automatically at the end of every run.
`backend/.env.rls.local`'s presence check was upgraded to an actual
validity check — its URL is compared against a fresh `supabase status -o
env` (when Docker's up) rather than trusting byte-count alone, since its
values rotate whenever the local containers get recreated.

The judgment layer runs *next*, at the start of whatever session next opens
this repo, by reading `.claude/health-reports/latest.log` rather than
assuming it's fine unread.

**Verified, not just configured (2026-08-17):**
- Fired manually via `Start-ScheduledTask` once — confirmed `LastTaskResult: 0`
  and real report content written (37 PASS, both worktrees' full test suites
  actually ran).
- Docker-down recovery — the actual reason this script exists — was
  deliberately tested, not just code-reviewed: force-stopped every Docker
  Desktop process, confirmed `docker ps` genuinely failed, ran the script,
  confirmed it detected the outage, launched Docker Desktop, polled, and
  came back with `[PASS] Docker Desktop started successfully (was down, now
  up)` — then independently confirmed via `docker ps` that the ephemeral RLS
  containers were really back (`Up 20 seconds`). Recovery was fast (~12s
  total) because the underlying WSL2 VM was still warm from having just been
  running; a true cold boot after a full system restart could take longer —
  the script's 2-minute poll budget is sized for that case, not just the
  warm-restart case tested here.
