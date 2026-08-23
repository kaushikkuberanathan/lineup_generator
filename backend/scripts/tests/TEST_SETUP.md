# Test Suite Setup Instructions

> Rewritten 2026-08-23. Previous version described `npm test` as not yet
> wired into `package.json` (it has been for a long time), referenced a
> Windows-machine-specific absolute path, described OTP-based manual login
> tests (phone/OTP auth was permanently removed — root `CLAUDE.md` → Auth
> Strategy), and described CI as a future Phase 5 item (CI has existed and
> gated deploys since Story 75). See `backend/CLAUDE.md` → Test Suite for
> the authoritative, actively-maintained reference this file defers to.

## 1. Test systems (already wired — no `package.json` edit needed)

```json
"scripts": {
  "test": "node scripts/tests/test-runner.js",
  "test:unit": "node --test src/__tests__/*.test.js",
  "test:rls": "node --test src/__tests__/rls/*.test.js",
  "test:auth": "node scripts/test-auth-flow.js",
  "test:admin": "node scripts/test-admin-flow.js"
}
```

Three distinct systems, not one:

| Command | What it runs | Requires |
|---|---|---|
| `npm test` | Custom integration runner (13 suites, `scripts/tests/test-runner.js`) | A running local server (`node index.js`) + `backend/.env` loaded |
| `npm run test:unit` | In-process unit suite (node:test + supertest, `src/__tests__/*.test.js`, 147 tests as of v2.11.0) | Nothing running — imports the app via `require('./app')`, no port bound, no live DB call |
| `npm run test:rls` | Real-database RLS policy suite (`src/__tests__/rls/*.test.js`) | A live Postgres connection — run against DEV, never PROD |

Full suite/file breakdown: `backend/CLAUDE.md` → **## Test Suite**.

## 2. Run the suites

From `backend/`, with `.env` present (see `backend/CLAUDE.md` → Environment Variables):

```bash
npm test            # integration — start `node index.js` in another terminal first
npm run test:unit   # unit — no server needed
npm run test:rls    # RLS — needs SUPABASE_URL/keys pointed at DEV
```

`CI_SAFE=true npm test` runs the CI-safe subset (read-only, rejection-path suites) against prod — this is what the `backend` GitHub Actions job actually runs; it does not write to prod data.

## 3. CI (already live, not a future phase)

`.github/workflows/ci.yml` runs `npm run test:unit` on every push/PR via the `backend-unit` job (hermetic, no Render dependency) and the CI-safe integration subset via the `backend` job (polls prod read-only). Both gate the sync-script and main-deploy smoke jobs. There is no pending "Phase 5" CI setup — this has been the case since Story 75.

## 4. Manual checks

Phone/OTP auth was permanently removed (magic link + Google sign-in only, live since v2.6.0/v2.7.0). Any manual test checklist referencing OTP codes, `otp_verified` audit events, or a `/verify` endpoint describes a flow that no longer exists in this codebase — do not follow it. If a manual smoke pass is needed for magic-link login, use the real flow: request a magic link via the app, follow the emailed link, confirm `GET /me` returns a session.

## 5. Test data cleanup

The integration runner auto-cleans rows tagged with its test markers. If manual cleanup is needed, check `scripts/tests/test-runner.js` for the current tagging convention (e.g. a fixed `app_version` or email pattern used by the suites) rather than assuming a specific literal value — verify against the runner source before running any `DELETE` against a live database.
