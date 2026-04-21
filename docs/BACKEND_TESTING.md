# Backend Testing Reference

> Companion to `frontend/src/tests/README.md` and `docs/product/MASTER_DEV_REFERENCE.md`.

## Architecture

The backend uses a **custom test runner** at `backend/scripts/tests/test-runner.js`, not Vitest. Frontend = Vitest. Backend = custom runner. Don't mix them — the runner gives us:

- CI_SAFE mode (skip suites that write to DB) — needed because GitHub Actions runs against prod
- Shared `state` object passed across suites (auth tokens, seeded IDs, cleanup queue)
- Stable table-formatted output the deploy gate parses

## Suite Convention

Every suite is a CommonJS module exporting a single `run()` function:

```js
async function run(test, BASE_URL, state) { /* ... */ }
// or, when a suite needs admin DB access:
async function run(test, BASE_URL, supabaseAdmin, state) { /* ... */ }

module.exports = { run };
```

Each test is recorded via the `test()` helper:

```js
await test({
  id: 'AUTH-ML-01',                          // unique, prefixed by suite
  description: 'short, action + expected',
  expected: 'what should happen',
  fn: async () => true | false | 'SKIP',     // boolean or 'SKIP'
  skipReason: 'why skipped (optional)',
});
```

## CI_SAFE Contract

When `process.env.CI_SAFE === 'true'`, suites must:

1. **Skip any DB write** (creating users, inserting rows, mutating memberships)
2. **Skip any external service trigger** (real magic link sends, email dispatch, OpenAI calls)
3. **Still run validation, shape, and rejection-path tests** — these require no writes

Live-only tests inside a CI_SAFE-aware suite return `'SKIP'` with a `skipReason`.

## Suite Inventory

| Suite | CI_SAFE? | Covers |
|---|---|---|
| `suite-regression` | ✅ | Smoke checks, route reachability |
| `suite-validation` | ✅ | Input validation across endpoints |
| `suite-auth-flow` | ❌ | End-to-end magic link → session |
| `suite-auth-magic-link` | partial | POST /magic-link validation + rate limit (Layer A: CI_SAFE; Layer B: live) |
| `suite-auth-middleware` | ✅ | requireAuth Bearer token edge cases |
| `suite-rls-team-membership` | ❌ | RLS policies on team_data, team_memberships, history |
| `suite-idempotency` | ❌ | Duplicate request handling |
| `suite-admin` | ❌ | Approve/deny flows, admin-only routes |
| `suite-device-context` | ❌ | Device fingerprint propagation to auth_events |
| `suite-audit-trail` | ❌ | auth_events row creation |
| `suite-data-integrity` | ❌ | MERGE_FIELDS preservation, snapshot trigger |
| `suite-rate-limits` | ✅ | loginLimiter and per-route rate limits |

## Running Locally

```powershell
# All suites against local backend
cd C:\Users\KKUBERANA1\Documents\lineup-generator\backend
npm test

# CI_SAFE mode (skips DB writes — what CI runs)
$env:CI_SAFE="true"; npm test; Remove-Item Env:CI_SAFE

# Against the dev environment on Render
$env:BACKEND_URL="https://lineup-generator-backend-dev.onrender.com"; npm test
```

## Adding a New Suite

1. Create `backend/scripts/tests/suite-<name>.js` matching the convention above.
2. Register it in `test-runner.js`:
   ```js
   const suiteNew = require('./suite-new');
   // ...
   await suiteNew.run(test, BASE_URL, state);
   // or, if it needs admin access:
   await suiteNew.run(test, BASE_URL, supabaseAdmin, state);
   ```
3. Honor CI_SAFE — every DB write must be gated.
4. Use `state.testEmails` for cleanup tracking (the runner auto-deletes at end).
5. Never use real production user emails for write tests. Use `*-suite@test.com`.

## Cleanup Contract

The runner auto-deletes everything tagged with `app_version = 'test-suite-1.0'` at end of run, plus any rows matching emails in `state.testEmails`. New suites should:

- Set `app_version: 'test-suite-1.0'` on every inserted row that has the column
- Push test emails to `state.testEmails`
- For tables without `app_version`, do their own cleanup in a `finally`-style block

## Failure Severity Matrix

When a CI run fails, triage by suite:

| Suite | Failure means |
|---|---|
| `regression`, `validation` | Probable real bug. Block deploy. |
| `auth-magic-link` (Layer A) | Validation regression. Block deploy. |
| `auth-magic-link` (Layer B) | Could be Supabase rate limit from prior runs — re-run after 15 min before treating as block. |
| `rls-team-membership` | **Highest severity.** Security perimeter regression. Block deploy. Page on call. |
| `auth-flow`, `idempotency` | Block deploy. Likely auth or persistence bug. |
| `rate-limits` | Block only if 429 doesn't fire when expected. Spurious 429s in CI re-runs are tolerable. |

## Known Limitations

- **No fuzz / property-based testing** — deferred. Current suites are example-based.
- **No load testing** — deferred. Smoke-test handles reachability only.
- **JWT expiry test (RLS-TM-10 sibling)** — needs a frozen-clock fixture; not yet built.
- **Email content assertions** — Resend integration not mocked. Magic link content goes untested at the email body level.

## Deployment Checklist Hook

Before any deploy that touches `backend/src/routes/auth.js`, `backend/src/middleware/`, or any SQL migration:

```powershell
$env:CI_SAFE="false"; cd backend; npm test
```

Must pass full RLS suite + auth-magic-link Layer B before pushing.
