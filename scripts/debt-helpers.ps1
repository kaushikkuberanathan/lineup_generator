# ─────────────────────────────────────────────────────────────────────────
# Dugout Lineup — Debt Ledger PowerShell Helpers
# ─────────────────────────────────────────────────────────────────────────
# Load into your PowerShell profile:
#   Add-Content $PROFILE ". C:\path\to\lineup_generator\scripts\debt-helpers.ps1"
#   # Then open a new PowerShell window
#
# Or dot-source ad-hoc:
#   . .\scripts\debt-helpers.ps1
#
# Usage:
#   debt              — top 5 P0/P1 open items + counts
#   debt-all          — all open items by priority
#   debt-p0           — P0 count (pre-minor-bump gate)
#   debt-target v2.2.37 — items targeting specific version
#   debt-next         — shortcut for next release
#   debt-help         — show available commands
# ─────────────────────────────────────────────────────────────────────────

function Get-DebtFile {
    $root = & git rev-parse --show-toplevel 2>$null
    if ($LASTEXITCODE -ne 0) { $root = "." }
    return Join-Path $root "docs/product/DOC_TEST_DEBT.md"
}

function debt {
    $file = Get-DebtFile
    Write-Host "─── Top of Backlog ($(Split-Path $file -Leaf)) ───" -ForegroundColor Cyan
    Select-String -Path $file -Pattern "^### (🔴|🟠) P" | Select-Object -First 5 | ForEach-Object { $_.Line }
    Write-Host ""
    $p0 = (Select-String -Path $file -Pattern "^### 🔴 P").Count
    $p1 = (Select-String -Path $file -Pattern "^### 🟠 P").Count
    $p2 = (Select-String -Path $file -Pattern "^### 🟡 P").Count
    Write-Host "$p0 P0 · $p1 P1 · $p2 P2 open"
}

function debt-all {
    $file = Get-DebtFile
    Write-Host "─── All Open Debt ───" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "🔴 P0:" -ForegroundColor Red
    Select-String -Path $file -Pattern "^### 🔴 P" | ForEach-Object { $_.Line }
    Write-Host ""
    Write-Host "🟠 P1:" -ForegroundColor Yellow
    Select-String -Path $file -Pattern "^### 🟠 P" | ForEach-Object { $_.Line }
    Write-Host ""
    Write-Host "🟡 P2:" -ForegroundColor DarkYellow
    Select-String -Path $file -Pattern "^### 🟡 P" | ForEach-Object { $_.Line }
}

function debt-p0 {
    $file = Get-DebtFile
    $count = (Select-String -Path $file -Pattern "^### 🔴 P").Count
    Write-Host "Open P0 items: $count"
    if ($count -gt 0) {
        Write-Host "⚠  Cannot bump minor version (x.Y.0) without resolving or deferring these:" -ForegroundColor Yellow
        Select-String -Path $file -Pattern "^### 🔴 P" | ForEach-Object { $_.Line }
        return $false
    }
    Write-Host "✓  P0 gate clear — safe to bump minor version" -ForegroundColor Green
    return $true
}

function debt-target {
    param([string]$Version = "v2.2.37")
    $file = Get-DebtFile
    Write-Host "─── Items targeting $Version ───" -ForegroundColor Cyan

    # Read file; for each ### P header, look ahead ~15 lines for "Target: $Version"
    $lines = Get-Content $file
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match "^### (🔴|🟠|🟡) P") {
            $header = $lines[$i]
            $searchEnd = [Math]::Min($i + 15, $lines.Count - 1)
            for ($j = $i + 1; $j -le $searchEnd; $j++) {
                if ($lines[$j] -match "Target.*\Q$Version\E") {
                    Write-Host $header
                    break
                }
                if ($lines[$j] -match "^### (🔴|🟠|🟡) P") { break }  # hit next item
            }
        }
    }
}

function debt-next { debt-target -Version "v2.2.37" }

function debt-dashboard {
    $file = Get-DebtFile
    $content = Get-Content $file -Raw
    if ($content -match "(?s)## Debt Summary Dashboard.*?(?=## Revision History)") {
        Write-Host $Matches[0]
    }
}

function debt-help {
    Write-Host @"
Debt ledger helpers:
  debt                 — top 5 P0/P1 open items + counts
  debt-all             — all open items by priority
  debt-p0              — P0 count (pre-minor-bump gate)
  debt-target v2.2.37  — items targeting version X
  debt-next            — shortcut for next release
  debt-dashboard       — print the dashboard snapshot
  debt-help            — this message

Ledger lives at: $(Get-DebtFile)
"@
}
