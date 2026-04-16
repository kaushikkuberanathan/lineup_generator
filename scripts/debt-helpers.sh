#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────
# Dugout Lineup — Debt Ledger Shell Helpers
# ─────────────────────────────────────────────────────────────────────────
# Source this file from your shell profile to enable quick backlog queries.
#
# Usage (one-time setup):
#   echo 'source /path/to/lineup_generator/scripts/debt-helpers.sh' >> ~/.bashrc
#   # Or for PowerShell users on Windows, see debt-helpers.ps1
#
# Usage (daily):
#   debt         — show top 5 P0/P1 open items
#   debt-all     — show all open items grouped by priority
#   debt-p0      — count open P0s (pre-minor-bump gate)
#   debt-next    — show items targeting the next release
#   debt-old     — show any items over 30 days old (manual calc from "Age" field)
# ─────────────────────────────────────────────────────────────────────────

# Resolve repo root (works if sourced from anywhere)
_DEBT_REPO_ROOT() {
  git rev-parse --show-toplevel 2>/dev/null || echo "."
}
_DEBT_FILE() {
  echo "$(_DEBT_REPO_ROOT)/docs/product/DOC_TEST_DEBT.md"
}

# Top 5 P0/P1 open items
debt() {
  local file; file=$(_DEBT_FILE)
  echo "─── Top of Backlog ($(basename "$file")) ───"
  grep -E "^### (🔴|🟠) P" "$file" | head -5
  echo
  echo "$(grep -c "^### 🔴 P" "$file") P0 · $(grep -c "^### 🟠 P" "$file") P1 · $(grep -c "^### 🟡 P" "$file") P2 open"
}

# All open items grouped by priority
debt-all() {
  local file; file=$(_DEBT_FILE)
  echo "─── All Open Debt ───"
  echo
  echo "🔴 P0:"
  grep -E "^### 🔴 P" "$file"
  echo
  echo "🟠 P1:"
  grep -E "^### 🟠 P" "$file"
  echo
  echo "🟡 P2:"
  grep -E "^### 🟡 P" "$file"
}

# Count of P0s open — pre-minor-bump gate
debt-p0() {
  local count; count=$(grep -c "^### 🔴 P" "$(_DEBT_FILE)")
  echo "Open P0 items: $count"
  if [[ "$count" -gt 0 ]]; then
    echo "⚠  Cannot bump minor version (x.Y.0) without resolving or deferring these:"
    grep -E "^### 🔴 P" "$(_DEBT_FILE)"
    return 1
  fi
  echo "✓  P0 gate clear — safe to bump minor version"
  return 0
}

# Items targeting a specific release (usage: debt-target v2.2.37)
debt-target() {
  local version="${1:-v2.2.37}"
  local file; file=$(_DEBT_FILE)
  echo "─── Items targeting $version ───"
  # Find the item headers (### lines) whose block contains "Target: $version"
  awk -v ver="$version" '
    /^### (🔴|🟠|🟡) P/ { current_item = $0; found = 0 }
    $0 ~ "Target.*" ver && !found { print current_item; found = 1 }
  ' "$file"
}

# Shortcut: items for the next release
debt-next() {
  debt-target "v2.2.37"
}

# Echo the debt dashboard snapshot
debt-dashboard() {
  local file; file=$(_DEBT_FILE)
  awk '/^## Debt Summary Dashboard/,/^## Revision History/' "$file" | head -n -2
}

# Help
debt-help() {
  cat <<EOF
Debt ledger helpers:
  debt          — top 5 P0/P1 open items + counts
  debt-all      — all open items by priority
  debt-p0       — P0 count (pre-minor-bump gate; exits 1 if any open)
  debt-target X — items targeting version X (e.g. debt-target v2.2.37)
  debt-next     — shortcut for next release
  debt-dashboard — print the dashboard snapshot
  debt-help     — this message

Ledger lives at: $(_DEBT_FILE)
EOF
}

# Run debt on source (optional — gives feedback that the file loaded)
# Comment out if too chatty:
# [[ -f "$(_DEBT_FILE)" ]] && echo "Debt helpers loaded. Run: debt-help"
