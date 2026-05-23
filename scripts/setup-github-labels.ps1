# =============================================================================
# Dugout Lineup — GitHub Labels Setup
# Usage: .\scripts\setup-github-labels.ps1
#
# Prerequisites:
#   - GitHub CLI installed: https://cli.github.com/
#   - Authenticated: gh auth login
#   - Run from repo root (lineup_generator)
#
# Safe to re-run: --force flag updates color/description if label already exists.
# =============================================================================

$REPO = "kaushikkuberanathan/lineup_generator"

function New-Label {
    param(
        [string]$Name,
        [string]$Color,
        [string]$Description
    )
    Write-Host "  Creating: $Name" -NoNewline
    $result = gh label create $Name --repo $REPO --color $Color --description $Description --force 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host " ✅" -ForegroundColor Green
    } else {
        Write-Host " ❌  $result" -ForegroundColor Red
    }
}

# ── Check gh is authenticated ────────────────────────────────────────────────
Write-Host "`nChecking GitHub CLI auth..." -ForegroundColor Cyan
gh auth status --hostname github.com 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Not authenticated. Run: gh auth login" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Authenticated`n" -ForegroundColor Green

# ── PRIORITY ─────────────────────────────────────────────────────────────────
Write-Host "── Priority labels ──────────────────────────────" -ForegroundColor Yellow
New-Label "priority:p0" "B60205" "Production broken or data at risk — drop everything"
New-Label "priority:p1" "D93F0B" "Blocks a coach in the field — fix this release"
New-Label "priority:p2" "E4E669" "Important but not blocking — next 1-2 releases"
New-Label "priority:p3" "C5DEF5" "Nice to have — backlog"

# ── TYPE ─────────────────────────────────────────────────────────────────────
Write-Host "`n── Type labels ──────────────────────────────────" -ForegroundColor Yellow
New-Label "type:bug"        "D73A4A" "Something is broken"
New-Label "type:feature"    "0075CA" "New capability"
New-Label "type:chore"      "FEF2C0" "Refactor, cleanup, dependency bump"
New-Label "type:governance" "008672" "Docs, test debt, process"
New-Label "type:hotfix"     "B60205" "Emergency production fix — bypass overnight soak"
New-Label "type:incident"   "B60205" "Live production incident"
New-Label "type:docs"       "0052CC" "Documentation changes only"
New-Label "type:refactor"   "6F42C1" "Code refactor with no behavior change"

# ── AREA ─────────────────────────────────────────────────────────────────────
Write-Host "`n── Area labels ──────────────────────────────────" -ForegroundColor Yellow
New-Label "area:scoring"     "F9D0C4" "Live scoring / game mode"
New-Label "area:auth"        "C2E0C6" "Auth, magic link, sessions, RLS"
New-Label "area:ux"          "BFD4F2" "Frontend UX, design tokens, components"
New-Label "area:backend"     "D4C5F9" "Express API, Render, backend logic"
New-Label "area:ci-ops"      "FEF2C0" "GitHub Actions, Husky, Vitest, deployment"
New-Label "area:game-mode"   "FBCA04" "Game day overlay, DugoutView, ScoringMode"
New-Label "area:share-link"  "F9D0C4" "Share link routing, unauthenticated viewer"
New-Label "area:roster"      "BFD4F2" "Roster management, batting order, lineup engine"
New-Label "area:supabase"    "C2E0C6" "DB schema, RLS policies, migrations"
New-Label "area:analytics"   "D4C5F9" "Mixpanel events, Vercel Analytics"

# ── STATUS ───────────────────────────────────────────────────────────────────
Write-Host "`n── Status labels ────────────────────────────────" -ForegroundColor Yellow
New-Label "status:blocked"     "B60205" "Cannot proceed — waiting on dependency"
New-Label "status:in-progress" "0075CA" "Actively being worked"
New-Label "status:deferred"    "E4E669" "Intentionally pushed to future phase"
New-Label "status:needs-repro" "FEF2C0" "Bug reported but not yet confirmed"
New-Label "status:ready-for-review" "0E8A16" "PR is ready for review and merge"

# ── META ─────────────────────────────────────────────────────────────────────
Write-Host "`n── Meta labels ──────────────────────────────────" -ForegroundColor Yellow
New-Label "auto-created"          "EEEEEE" "Created by automation, not manually filed"
New-Label "source:coach-feedback" "BFD4F2" "Originated from in-app feedback submission"
New-Label "needs-overnight-soak"  "C2E0C6" "Merged to develop — awaiting overnight before main"
New-Label "hotfix-exception"      "B60205" "Ship Gate bypassed — reason in commit message"

# ── Summary ──────────────────────────────────────────────────────────────────
Write-Host "`n✅ Labels setup complete." -ForegroundColor Green
Write-Host "View at: https://github.com/$REPO/labels" -ForegroundColor Cyan