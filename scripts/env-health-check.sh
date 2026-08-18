#!/usr/bin/env bash
# scripts/env-health-check.sh — deterministic environment health check for
# the Dugout Lineup local dev setup, both worktrees.
#
# WHY THIS EXISTS
#   Session 2026-08-17-A did this by hand (see SESSION_RETROSPECTIVES.md and
#   docs/process/CLAUDE_CODE_HANDOFF.md) and found two real gaps: Docker
#   Desktop not running (blocks the ephemeral RLS suite), and a missing
#   frontend/.env in the UX worktree. This script makes that check
#   deterministic and repeatable instead of ad hoc.
#
# WHAT IT DOES NOT DO
#   - Never prints secret VALUES — only variable names, presence, and byte
#     lengths. Safe to redirect this script's output to a log file that
#     might be read by someone other than KK.
#   - Never mutates anything remote. Prod checks are strictly read-only
#     (same CI_SAFE discipline as the rest of this repo's test suites).
#   - Does not attempt to fix anything except starting Docker Desktop if
#     it's the one thing blocking the RLS suite — matches what was judged
#     safe and reversible in session 2026-08-17-A. Everything else is
#     report-only; a human or an interactive Claude Code session (via the
#     env-health-check skill) decides what to do about a real finding.
#
# USAGE
#   bash scripts/env-health-check.sh            # full check, both worktrees
#   bash scripts/env-health-check.sh --quick     # skip test-suite runs (fast)
#   bash scripts/env-health-check.sh --no-fix    # never attempt to start Docker
#
# EXIT CODE
#   0 — everything passed (WARN-only findings still exit 0; they're not
#       failures, just things worth a human's attention)
#   1 — at least one real FAIL

set -u
QUICK=false
NO_FIX=false
for arg in "$@"; do
  case "$arg" in
    --quick) QUICK=true ;;
    --no-fix) NO_FIX=true ;;
  esac
done

PASS=0
WARN=0
FAIL=0
REPORT_LINES=()

log() { REPORT_LINES+=("$1"); echo "$1"; }
pass() { PASS=$((PASS+1)); log "  [PASS] $1"; }
warn() { WARN=$((WARN+1)); log "  [WARN] $1"; }
fail() { FAIL=$((FAIL+1)); log "  [FAIL] $1"; }
section() { log ""; log "=== $1 ==="; }

TS="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
log "Dugout Lineup environment health check — $TS"

# ─────────────────────────────────────────────────────────────────────────
section "Machine-wide tooling"
# ─────────────────────────────────────────────────────────────────────────

command -v git >/dev/null 2>&1 && pass "git: $(git --version)" || fail "git not found"
command -v node >/dev/null 2>&1 && pass "node: $(node --version)" || fail "node not found"
command -v npm >/dev/null 2>&1 && pass "npm: $(npm --version)" || fail "npm not found"

if command -v gh >/dev/null 2>&1; then
  if gh auth status >/dev/null 2>&1; then
    pass "gh CLI installed and authenticated"
  else
    warn "gh CLI installed but not authenticated"
  fi
else
  warn "gh CLI not found — GITHUB_TOKEN fallback still works for API calls, see feedback_github_token_fallback_for_pr_creation memory"
fi

if [ -n "${GITHUB_TOKEN:-}" ]; then
  pass "GITHUB_TOKEN present (value not logged)"
else
  warn "GITHUB_TOKEN not set in this shell"
fi

command -v vercel >/dev/null 2>&1 && pass "vercel CLI: $(vercel --version 2>&1 | head -1)" || warn "vercel CLI not found"
command -v supabase >/dev/null 2>&1 && pass "supabase CLI: $(supabase --version 2>&1 | head -1)" || warn "supabase CLI not found"

DOCKER_OK=false
if command -v docker >/dev/null 2>&1; then
  if docker ps >/dev/null 2>&1; then
    DOCKER_OK=true
    pass "Docker Desktop installed and running"
  elif [ "$NO_FIX" = false ]; then
    warn "Docker Desktop installed but not running — attempting to start it"
    DOCKER_EXE="/c/Program Files/Docker/Docker/Docker Desktop.exe"
    if [ -f "$DOCKER_EXE" ]; then
      "$DOCKER_EXE" >/dev/null 2>&1 &
      disown 2>/dev/null || true
      for _ in $(seq 1 24); do
        sleep 5
        if docker ps >/dev/null 2>&1; then DOCKER_OK=true; break; fi
      done
      if [ "$DOCKER_OK" = true ]; then
        pass "Docker Desktop started successfully (was down, now up)"
      else
        fail "Docker Desktop launch attempted but engine did not come up within 2 minutes"
      fi
    else
      fail "Docker Desktop installed but executable not found at expected path"
    fi
  else
    warn "Docker Desktop installed but not running (--no-fix set, not starting it)"
  fi
else
  warn "Docker not found — RLS ephemeral suite unavailable"
fi

# ─────────────────────────────────────────────────────────────────────────
section "GitHub / repo state (read-only)"
# ─────────────────────────────────────────────────────────────────────────

if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
  OPEN_PRS=$(gh pr list --state open --json number 2>/dev/null | grep -o '"number"' | wc -l)
  log "  Open PRs against develop: $OPEN_PRS"
  [ "$OPEN_PRS" -gt 5 ] && warn "more than 5 open PRs — may be worth a triage pass" || pass "open PR count looks normal"

  ALERTS=$(gh api repos/kaushikkuberanathan/lineup_generator/dependabot/alerts --jq '[.[] | select(.state=="open")] | length' 2>/dev/null)
  ALERTS_RC=$?
  if [ $ALERTS_RC -ne 0 ] || ! [[ "$ALERTS" =~ ^[0-9]+$ ]]; then
    warn "could not read Dependabot alert count (this token lacks security_events scope — known limitation, use the GitHub web UI's Security tab instead)"
  else
    log "  Open Dependabot alerts: $ALERTS"
    [ "$ALERTS" -gt 0 ] && warn "$ALERTS open Dependabot alert(s)" || pass "no open Dependabot alerts"
  fi
else
  warn "skipped GitHub API checks — gh not authenticated"
fi

# ─────────────────────────────────────────────────────────────────────────
section "Prod health (read-only, same endpoints UptimeRobot already pings)"
# ─────────────────────────────────────────────────────────────────────────

BACKEND_CODE_TIME=$(curl -s -o /dev/null -w "%{http_code} %{time_total}" --max-time 10 https://lineup-generator-backend.onrender.com/ping 2>&1)
BACKEND_CODE=$(echo "$BACKEND_CODE_TIME" | cut -d' ' -f1)
if [ "$BACKEND_CODE" = "200" ]; then
  pass "prod backend /ping: 200 (${BACKEND_CODE_TIME#* })s"
else
  fail "prod backend /ping: got '$BACKEND_CODE_TIME' (expected 200)"
fi

FRONTEND_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 https://dugoutlineup.com 2>&1)
if [ "$FRONTEND_CODE" = "200" ]; then
  pass "prod frontend loads: 200"
else
  fail "prod frontend: got HTTP $FRONTEND_CODE (expected 200)"
fi

# ─────────────────────────────────────────────────────────────────────────
# Per-worktree checks
# ─────────────────────────────────────────────────────────────────────────

REPO_ROOT="$(git rev-parse --show-toplevel)"
mapfile -t WORKTREES < <(git -C "$REPO_ROOT" worktree list --porcelain | grep '^worktree ' | cut -d' ' -f2-)

for WT in "${WORKTREES[@]}"; do
  section "Worktree: $WT"
  cd "$WT" || { fail "cannot cd into $WT"; continue; }

  BRANCH=$(git branch --show-current)
  log "  Branch: $BRANCH"

  git fetch origin --prune >/dev/null 2>&1
  if ! git rev-parse --verify "origin/$BRANCH" >/dev/null 2>&1; then
    warn "local branch '$BRANCH' has no matching origin branch yet (not pushed, or origin default differs — e.g. ux-local-base tracks origin/develop by design)"
  else
    AHEAD_BEHIND=$(git rev-list --left-right --count "origin/$BRANCH...HEAD" 2>/dev/null)
    BEHIND=$(echo "$AHEAD_BEHIND" | cut -f1)
    AHEAD=$(echo "$AHEAD_BEHIND" | cut -f2)
    if [ "$BEHIND" = "0" ] && [ "$AHEAD" = "0" ]; then
      pass "in sync with origin/$BRANCH"
    else
      warn "diverged from origin/$BRANCH — $AHEAD ahead, $BEHIND behind"
    fi
  fi

  DIRTY=$(git status --porcelain | wc -l)
  if [ "$DIRTY" -eq 0 ]; then
    pass "working tree clean"
  else
    warn "$DIRTY uncommitted change(s) — run git status to inspect"
  fi

  if [ -f ".husky/_/pre-push" ]; then
    pass "Husky pre-push wrapper present"
  else
    fail "Husky pre-push wrapper MISSING — run 'npm install' at repo root (see root CLAUDE.md, Worktree setup note)"
  fi

  for d in "node_modules" "frontend/node_modules" "backend/node_modules"; do
    [ -d "$d" ] && pass "$d present" || fail "$d missing — run npm install"
  done

  for f in "frontend/.env" "frontend/.env.development" "backend/.env"; do
    if [ -f "$f" ]; then
      LEN=$(wc -c < "$f" | tr -d ' ')
      pass "$f present (${LEN} bytes)"
    else
      warn "$f missing"
    fi
  done

  # backend/.env.rls.local's values (the local ephemeral stack's URL/keys)
  # rotate whenever its Docker containers get recreated (supabase stop/prune
  # then start again) - presence and byte count alone can't catch a stale
  # file, only a live comparison against the current stack can. Only
  # meaningful when Docker is actually up; falls back to presence-only
  # otherwise.
  if [ -f "backend/.env.rls.local" ]; then
    if [ "$DOCKER_OK" = true ] && command -v supabase >/dev/null 2>&1; then
      STATUS_OUT=$(timeout 15 supabase status -o env 2>/dev/null)
      CURRENT_API_URL=$(echo "$STATUS_OUT" | grep '^API_URL=' | cut -d= -f2- | tr -d '"')
      CURRENT_ANON_KEY=$(echo "$STATUS_OUT" | grep '^ANON_KEY=' | cut -d= -f2- | tr -d '"')
      CURRENT_SERVICE_KEY=$(echo "$STATUS_OUT" | grep '^SERVICE_ROLE_KEY=' | cut -d= -f2- | tr -d '"')
      FILE_URL=$(grep '^RLS_TEST_SUPABASE_URL=' backend/.env.rls.local | cut -d= -f2-)
      FILE_ANON_KEY=$(grep '^RLS_TEST_SUPABASE_ANON_KEY=' backend/.env.rls.local | cut -d= -f2-)
      FILE_SERVICE_KEY=$(grep '^RLS_TEST_SUPABASE_SERVICE_ROLE_KEY=' backend/.env.rls.local | cut -d= -f2-)

      if [ -z "$CURRENT_API_URL" ]; then
        warn "backend/.env.rls.local present but could not get fresh 'supabase status' to validate against"
      else
        MISMATCHES=()
        [ "$CURRENT_API_URL" != "$FILE_URL" ] && MISMATCHES+=("API_URL")
        [ "$CURRENT_ANON_KEY" != "$FILE_ANON_KEY" ] && MISMATCHES+=("ANON_KEY")
        [ "$CURRENT_SERVICE_KEY" != "$FILE_SERVICE_KEY" ] && MISMATCHES+=("SERVICE_ROLE_KEY")
        # Report only which fields mismatch, never the values themselves.
        if [ ${#MISMATCHES[@]} -eq 0 ]; then
          pass "backend/.env.rls.local present and matches the current local Supabase stack (URL, anon key, service-role key all current)"
        else
          JOINED=$(IFS=,; echo "${MISMATCHES[*]}")
          fail "backend/.env.rls.local is STALE — mismatched field(s): $JOINED (containers were likely recreated since it was written). Regenerate: supabase status -o env, see docs/process/CLAUDE_CODE_HANDOFF.md"
        fi
      fi
    else
      LEN=$(wc -c < "backend/.env.rls.local" | tr -d ' ')
      pass "backend/.env.rls.local present (${LEN} bytes, not validated — Docker down or supabase CLI unavailable)"
    fi
  else
    warn "backend/.env.rls.local missing"
  fi

  if [ "$QUICK" = false ]; then
    log "  Running frontend lint..."
    LINT_RC=0
    (cd frontend && timeout 120 npm run lint >/dev/null 2>&1) || LINT_RC=$?
    if [ "$LINT_RC" -eq 0 ]; then
      pass "frontend lint clean"
    elif [ "$LINT_RC" -eq 124 ]; then
      fail "frontend lint TIMED OUT after 120s — likely hung, not just failing. Run 'npm run lint' in $WT/frontend directly to investigate"
    else
      fail "frontend lint FAILED — run 'npm run lint' in $WT/frontend for detail"
    fi

    log "  Running frontend test suite (this takes ~1-2 min)..."
    FRONTEND_TEST_OUT=$(cd frontend && timeout 300 npx vitest run --no-file-parallelism 2>&1)
    TEST_RC=$?
    if [ "$TEST_RC" -eq 124 ]; then
      fail "frontend test suite TIMED OUT after 300s — likely hung (not the known Bug #7 cold-start flake, that fails fast). Run 'npx vitest run' in $WT/frontend directly to investigate"
    elif echo "$FRONTEND_TEST_OUT" | grep -q "Tests.*failed" ; then
      fail "frontend test suite has failures — see $WT/frontend, run npx vitest run"
    elif echo "$FRONTEND_TEST_OUT" | grep -qE "Test Files.*passed"; then
      SUMMARY=$(echo "$FRONTEND_TEST_OUT" | grep -E "Test Files|Tests " | tr '\n' ' ')
      pass "frontend tests: $SUMMARY"
    else
      warn "frontend test suite output unrecognized — run manually to check"
    fi

    log "  Running backend unit tests..."
    UNIT_RC=0
    (cd backend && timeout 60 npm run test:unit >/dev/null 2>&1) || UNIT_RC=$?
    if [ "$UNIT_RC" -eq 0 ]; then
      pass "backend unit tests clean"
    elif [ "$UNIT_RC" -eq 124 ]; then
      fail "backend unit tests TIMED OUT after 60s — likely hung. Run 'npm run test:unit' in $WT/backend directly to investigate"
    else
      fail "backend unit tests FAILED — run 'npm run test:unit' in $WT/backend for detail"
    fi

    if [ "$DOCKER_OK" = true ]; then
      if [ -f "backend/.env.rls.local" ]; then
        log "  Running RLS ephemeral suite..."
        RLS_RC=0
        (cd backend && timeout 90 npm run test:rls >/dev/null 2>&1) || RLS_RC=$?
        if [ "$RLS_RC" -eq 0 ]; then
          pass "RLS suite clean (7 intentional skips expected, see #355)"
        elif [ "$RLS_RC" -eq 124 ]; then
          fail "RLS suite TIMED OUT after 90s — likely hung, possibly a stale local stack. Run 'npm run test:rls' in $WT/backend directly to investigate"
        else
          fail "RLS suite FAILED — run 'npm run test:rls' in $WT/backend for detail"
        fi
      else
        warn "backend/.env.rls.local missing — cannot run RLS suite even though Docker is up. Regenerate via: supabase status -o env (see docs/process/CLAUDE_CODE_HANDOFF.md)"
      fi
    else
      warn "Docker not running — RLS suite skipped"
    fi
  else
    log "  (--quick: skipped lint/build/test runs)"
  fi
done

# ─────────────────────────────────────────────────────────────────────────
section "Summary"
# ─────────────────────────────────────────────────────────────────────────

log "PASS: $PASS   WARN: $WARN   FAIL: $FAIL"

REPORT_DIR="$REPO_ROOT/.claude/health-reports"
mkdir -p "$REPORT_DIR"
REPORT_FILE="$REPORT_DIR/$(date -u +%Y-%m-%dT%H%M%SZ).log"
printf '%s\n' "${REPORT_LINES[@]}" > "$REPORT_FILE"
cp "$REPORT_FILE" "$REPORT_DIR/latest.log"

# Prune timestamped reports older than 30 days — this runs daily, so without
# pruning that's ~365 small log files a year. latest.log is never touched
# (it's the same name every run, not a timestamped one this glob matches).
PRUNED=$(find "$REPORT_DIR" -maxdepth 1 -name "20*.log" -mtime +30 -print -delete 2>/dev/null | wc -l)
[ "$PRUNED" -gt 0 ] && log "  (pruned $PRUNED report(s) older than 30 days)"

log ""
log "Full report written to: $REPORT_FILE"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
exit 0
