# scripts/

Repo tooling. Most of these are documented individually elsewhere (`CLAUDE.md`,
`docs/product/PRODUCT_OPS.md`) — this file exists so a session can find what's here
without already knowing where each one is referenced.

## GitHub API calls from PowerShell — read this first

**`github-api-helpers.ps1`** — `Invoke-GitHubApi`, a drop-in `Invoke-RestMethod`
wrapper that fixes a real, silent content-corruption bug: Windows PowerShell 5.1's
`Invoke-RestMethod` does not default to UTF-8 for a JSON string body. A non-ASCII
character (emoji, curly quote, accented letter) in a PR/issue/comment body either
gets silently corrupted to `??` with a normal 200/201 response, or the call 400s
outright — same root cause, two different symptoms depending on what else is in the
payload. See #644 for the incident that surfaced this.

**Any session making a GitHub API call directly via `Invoke-RestMethod` from
PowerShell should dot-source this and use `Invoke-GitHubApi` instead of calling
`Invoke-RestMethod` directly** — don't rely on recalling the encoding fix from memory
each time.

```powershell
. .\scripts\github-api-helpers.ps1
Invoke-GitHubApi -Uri "https://api.github.com/repos/OWNER/REPO/issues/1/comments" `
  -Method Post `
  -Headers @{ Authorization = "Bearer $env:GITHUB_TOKEN"; Accept = "application/vnd.github+json" } `
  -Body @{ body = "Some text with a checkmark: ✓" }
```

This does not apply to the GitHub MCP tool (`mcp__*__` GitHub functions) — those
handle encoding correctly on their own. It matters only for raw `Invoke-RestMethod`
calls against `api.github.com`.

## Everything else here

| Script | Purpose | Documented in |
|---|---|---|
| `debt-helpers.ps1` / `debt-helpers.sh` | `debt`, `debt-all`, `debt-p0`, `debt-target`, `debt-next`, `debt-dashboard` shell commands over `docs/product/DOC_TEST_DEBT.md` | `CLAUDE.md` § Ship Gate (minor-version gate), `docs/product/PRODUCT_OPS.md` |
| `sync-stories-to-issues.js` | Parses `ROADMAP.md` → creates/links GitHub Issues, patches `<!-- #N -->` markers | `CLAUDE.md` § Issue & Backlog Hygiene |
| `setup-github-labels.ps1` | Bootstraps/resets the repo's label taxonomy | `CLAUDE.md` § Issue & Backlog Hygiene |
| `env-health-check.sh` | Backs the `env-health-check` skill — local dev + prod read-only health checks | `env-health-check` skill |
| `generate-product-activity.mjs` | Builds the public activity feed data from release notes | — |
| `smoke-test.js` | Post-deploy smoke checks (`/ping`, site load, share link) | `CLAUDE.md` § Rollback Procedure |
| `recon/` | Ad-hoc investigation scripts, not part of any standing workflow | — |
| `__tests__/` | Test coverage for the scripts above (e.g. `sync-patch.test.js`) | `docs/product/FEATURE_MAP.md` row 32 |
