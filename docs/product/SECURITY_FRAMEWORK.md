# Security Framework — Dugout Lineup

**Status:** Draft v1.0
**Owner:** Kaushik
**Last Updated:** 2026-04-30
**Location:** `docs/product/SECURITY_FRAMEWORK.md`

---

## Purpose

Define a **phased, pick-and-choose security roadmap** for Dugout Lineup so we can incrementally raise the security bar without blocking product velocity. This doc is **not a checklist to do all at once** — it is a menu of prioritized work that K selects from per sprint.

Each item is structured for direct conversion into a Claude Code paste prompt or PR.

---

## Related Documents

| Document | Path | Relationship |
|---|---|---|
| Master Dev Reference | `docs/product/MASTER_DEV_REFERENCE.md` | Source of truth for ops & deploy gates — security work updates this |
| Product Roadmap | `docs/product/ROADMAP.md` | Schedule security phases as labeled epics here |
| Claude.md | `CLAUDE.md` | Update with any new patterns, conventions, or non-negotiable rules introduced by security work |
| Auth Principle | `docs/product/MASTER_DEV_REFERENCE.md#auth-principle` | Anchors share-link & game-mode no-auth requirements that constrain solution design |
| Game-Day Validation | `docs/product/MASTER_DEV_REFERENCE.md#game-day-validation` | Every security change touching lineup/share/game mode must still pass this |
| Rollback Procedure | `docs/product/MASTER_DEV_REFERENCE.md#rollback-procedure` | Used as escape hatch if a security change breaks prod |

> **Documentation rule:** When any item below is implemented, update `CLAUDE.md` (if a new convention is set), `ROADMAP.md` (mark item shipped), and append the change to `VERSION_HISTORY` per the standard deployment checklist.

---

## Threat Model Summary

The risks we are defending against, in priority order:

1. **Account takeover** — stolen tokens, weak passwords, no MFA → attacker edits/exfiltrates rosters
2. **Share link enumeration** — guessable IDs let strangers find rosters
3. **Authorization gaps** — authenticated user A modifies user B's lineup via direct API call (BOLA / IDOR)
4. **Secrets leakage** — `.env`, JWT keys, or DB creds in git history or CI logs
5. **Dependency vulnerabilities** — npm supply-chain attack
6. **XSS / injection** — unsanitized roster names render as executable HTML on share pages
7. **Abuse / scraping** — no rate limits enable brute-force or roster scraping
8. **PWA-specific** — service-worker cache poisoning, stale assets after a security fix

**Special context:** This app stores **minors' names + roster data**. COPPA-adjacent territory. Reputational damage from a breach is severe even if technical impact is small. Build accordingly.

---

## Phase Overview

| Phase | Theme | Target Window | Risk Reduction |
|---|---|---|---|
| **Phase 0** | Quick Wins | This week | Removes the 3–4 highest-impact, lowest-effort exposures |
| **Phase 1** | MVP Security Floor | 2–4 weeks | Establishes baseline that an indie production app should have |
| **Phase 2** | Hardening | 1–2 months | Defense-in-depth, observability, audit trail |
| **Phase 3** | Scale & Compliance | Pre-broader-launch | COPPA readiness, MFA, pen test, formal incident response |

---

## Phase 0 — Quick Wins (this week)

Each item is independently shippable. Pick any subset.

### 0.1 Audit share-link IDs for guessability
- **What:** Confirm every `share_token` is `crypto.randomUUID()` or 16-byte URL-safe random; nothing sequential or derivable from `gameId + date`.
- **Why:** A guessable share token is a roster-disclosure vulnerability with no auth wall.
- **Where:** `backend/src/routes/share.js`, lineup creation flow.
- **Validation:** Generate 50 share links; confirm IDs are uniformly random; confirm `/share/{guessed-id}` returns 404 for non-existent IDs (no enumeration signal).
- **Rollback:** No data migration if implemented as a forward-only check; existing tokens stay valid.

### 0.2 Lock down CORS to exact frontend origin
- **What:** Replace any `*` or `Origin`-reflecting CORS config with an explicit allowlist of `https://lineup-generator-frontend.onrender.com` (and dev origin).
- **Why:** Permissive CORS lets any origin make authenticated requests if a user is logged in.
- **Where:** Backend Express CORS middleware.
- **Validation:** Cross-origin request from a different domain should fail with CORS error in browser console.

### 0.3 Add `helmet` middleware with safe defaults
- **What:** Install `helmet`; enable defaults; add HSTS with 1-year max-age + preload.
- **Why:** Free hardening — sets `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, etc.
- **Where:** Backend Express app entrypoint.
- **Validation:** `curl -I https://lineup-generator-backend.onrender.com/ping` shows the new headers.

### 0.4 Run secret-scan against full git history
- **What:** Run `gitleaks detect --source . --log-opts="--all"` (or `trufflehog git file://.`).
- **Why:** Confirms no secrets ever leaked. If anything is found → rotate immediately, then optionally scrub history with `git-filter-repo`.
- **Where:** Run locally; add to CI in Phase 1.
- **Validation:** Clean run, no findings.
- **Rollback:** N/A — diagnostic only.

### 0.5 Audit Mixpanel events for PII
- **What:** Review all 32+ Mixpanel events; confirm **no kid names, no emails, no roster details** are sent. Only IDs, counts, and behavioral events.
- **Why:** PII in analytics = data sprawl, third-party exposure, GDPR/COPPA risk.
- **Where:** All `mixpanel.track()` calls in frontend.
- **Validation:** Spot-check 5 events in Mixpanel dashboard; confirm props contain only abstract identifiers.

---

## Phase 1 — MVP Security Floor (2–4 weeks)

This is the "you wouldn't ship a real product without this" baseline.

### 1.1 Move JWTs out of `localStorage` into httpOnly cookies
- **What:** Refactor auth to use httpOnly + Secure + SameSite=Strict cookies. Access token (15-min expiry) + rotating refresh token.
- **Why:** `localStorage` is XSS-readable. One reflected XSS = full session takeover.
- **Tradeoff:** Requires CSRF protection (double-submit cookie or `SameSite=Strict` is usually sufficient for first-party-only flows).
- **Where:** `backend/src/auth/*`, `frontend/src/hooks/useAuth.js`.
- **Game-Day impact:** Must verify auth flow + share-link rendering both still work post-change.

### 1.2 Centralized ownership-check middleware
- **What:** Every protected write endpoint runs an ownership assertion via shared middleware: `req.user.id === resource.coach_id`. No per-route reimplementation.
- **Why:** Authentication ≠ authorization. The classic IDOR bug. Logged-in user A hitting `PATCH /lineups/{B's-id}` must 403.
- **Where:** `backend/src/middleware/authorize.js` (new); apply to every write route.
- **Validation gate:** Add a Vitest suite that, for every write endpoint, asserts user B receives 403 when targeting user A's resource. **Make this a CI-blocking test.**

### 1.3 Schema validation on every endpoint
- **What:** Adopt `zod` for request body, query, and path-param validation. Reject unknown fields (`.strict()`). Validate UUID formats and length caps.
- **Why:** Defense against injection, type confusion, oversized payloads.
- **Where:** All API routes; standardize via a `validate(schema)` middleware.
- **Pattern for `CLAUDE.md`:** "Every API route has a zod schema; unknown fields rejected; UUIDs format-checked."

### 1.4 Rate limiting on auth + share endpoints
- **What:** `express-rate-limit` (Redis-backed if available, in-memory acceptable for MVP):
  - `/auth/login`: 5 attempts / 15 min / IP+username
  - `/auth/reset`: 3 / hour / email
  - `/share/:token`: 60 / min / IP
- **Why:** Prevents brute force + share-link enumeration scraping.
- **Where:** Backend Express middleware.
- **Validation:** Hit `/auth/login` with bad creds 6 times; expect 429 on the 6th.

### 1.5 Password hardening
- **What:** Bcrypt cost factor ≥ 12. Min 10 chars. Check signups/resets against [HaveIBeenPwned k-anonymity API](https://haveibeenpwned.com/API/v3#PwnedPasswords). Generic error on login ("invalid credentials") — never reveal whether email exists.
- **Why:** Reduces credential-stuffing success rate.

### 1.6 CI security gates
- **What:** GitHub Actions additions:
  - `npm audit --audit-level=high` (fail build)
  - `gitleaks` step
  - `npm ci` only (no `npm install`)
  - Pin all third-party actions to commit SHA
  - `permissions: contents: read` on every workflow
- **Where:** `.github/workflows/*`.
- **Why:** Supply-chain + secret-leak prevention.

### 1.7 Branch protection on `main`
- **What:** Require PR; require CI green; require linear history. (No reviewer requirement since solo dev — but PR forces a self-review pause.)
- **Why:** Already partially in place per branch strategy (main/develop). Formalize and enforce.

### 1.8 Dependabot enabled
- **What:** Weekly Dependabot for npm + GitHub Actions.
- **Why:** Catches CVEs in transitive deps automatically.

### 1.9 Content Security Policy (report-only first)
- **What:** Start with `Content-Security-Policy-Report-Only` for 1 week to surface violations, then enforce.
  ```
  default-src 'self';
  script-src 'self' https://cdn.mxpnl.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  connect-src 'self' https://api.mixpanel.com https://lineup-generator-backend.onrender.com;
  frame-ancestors 'none';
  ```
- **Tradeoff:** `'unsafe-inline'` for `style-src` is required by the inline-`style={{}}` convention (per `CLAUDE.md` styling rules). `'unsafe-inline'` for `script-src` is **not acceptable** — fix any inline scripts before enforcing.
- **Why:** Strongest single mitigation against XSS impact.

### 1.10 PWA service-worker cache versioning
- **What:** Version cache keys (`dugout-cache-v2.2.18`); purge old caches on `activate`. Bump cache key on any security-relevant release.
- **Why:** Ensures users force-refresh after a security fix lands. Prevents stale-asset poisoning.
- **Where:** `frontend/public/service-worker.js` (or equivalent).

### 1.11 Approve-link HMAC token signing
- **What:** Replace UUID-only approve/deny links in admin emails with HMAC-signed tokens carrying a 24hr expiry. Server validates signature + expiry before honoring the action.
- **Why:** Current UUID-only links are guessable/forwardable indefinitely. Anyone with the link — leaked from email forwarding, screenshots, or enumeration — can approve or deny. HMAC signing binds the token to a server secret; expiry caps blast radius.
- **Where:** Backend approve/deny handler; admin email template.
- **Implementation spec:** See `docs/TODO_approve_link_security.md` for the existing implementation plan.
- **Validation:** Tampered token → 401. Expired token (>24h) → 410 with friendly "link expired, request a new one" message. Valid unexpired token → action proceeds.
- **Blocks:** Required before opening to multiple teams.
- **Origin:** Absorbed from legacy ROADMAP.md "Phase 5 — Security Hardening" section.

---

## Phase 2 — Hardening (1–2 months)

Defense-in-depth. Does not block launch but materially reduces blast radius.

### 2.1 Audit log table (append-only)
- **What:** New table `audit_events` capturing: login (success/fail), password reset, token refresh, lineup writes, share-token generation/rotation. Retain 90 days. No deletes — append-only.
- **Why:** Forensic capability after an incident. Required for any compliance posture.
- **Schema sketch:**
  ```
  audit_events(
    id uuid pk,
    actor_id uuid null,
    actor_ip inet,
    event_type text,
    resource_type text,
    resource_id uuid null,
    metadata jsonb,
    created_at timestamptz default now()
  )
  ```

### 2.2 Structured logging with request IDs
- **What:** JSON logs; request ID propagated client → backend → DB. Use `pino` or similar.
- **Why:** Makes incident investigation tractable.

### 2.3 Sentry (or equivalent) error tracking with PII scrubbing
- **What:** Frontend + backend error tracking. **Scrub PII before sending** — denylist for kid names, emails, tokens.
- **Tradeoff:** Costs ~$26/mo at low volume; alternative is structured logs + manual review (worse signal).

### 2.4 Anomaly alerting
- **What:** Alerts on:
  - Spike in 401s/403s (account-takeover attempt)
  - Spike in 5xxs
  - Sequential 404s on `/share/:token` from one IP (enumeration attempt)
- **Where:** Render dashboards, UptimeRobot extensions, or Sentry alerts.

### 2.5 Share-link revocation + expiry
- **What:** Coach can rotate the share token from settings (old link 404s). Default expiry: 90 days post game date. `X-Robots-Tag: noindex` on share pages.
- **Why:** Data minimization + recovery path for accidentally shared links.
- **UX consideration:** "Send to grandma" workflow — recommend long expiry (90 days) over short. Easy regeneration is more important than short TTL.

### 2.6 Output sanitization & DTO discipline
- **What:** Every response body goes through an explicit DTO/serializer. Strip `password_hash`, internal IDs, soft-delete flags. No accidental field leaks.
- **Pattern for `CLAUDE.md`:** "API responses use explicit DTOs — never return raw DB rows."

### 2.7 XSS hardening
- **What:** Audit for any `dangerouslySetInnerHTML`. If present, route through `DOMPurify`. Confirm React's default escaping covers all roster-name renders.
- **Where:** Frontend, especially `ShareView` and `GameMode` components.

### 2.8 Backup + restore drill
- **What:** Confirm Render Postgres backups are encrypted at rest. **Actually run a restore once** to verify it works.
- **Why:** Untested backups don't count. Half of production restore attempts fail on first try.

### 2.9 Environment variable hygiene audit
- **What:** Inventory every env var in Render. Confirm none are duplicated in `.env.example` with real values. Confirm CI never echoes secrets (`::add-mask::` for any computed secret).

### 2.10 Migration to managed auth provider (decision point)
- **What:** Evaluate **Clerk**, **Auth0**, or **Supabase Auth**. Migrate before adding 2FA in-house.
- **Why:** Managed providers give MFA, breach-pwd checks, magic links, session management, audit logs out of the box. Cost (~$25–100/mo at scale) is far less than the engineering time + bug surface of rolling auth yourself.
- **Decision criteria:** Are we projecting >100 active coaches in 6 months? If yes, migrate. If no, defer to Phase 3.

---

## Phase 3 — Scale & Compliance (pre-broader-launch)

Required before any paid tier, public marketing push, or onboarding beyond personal network.

### 3.1 COPPA review + parental consent flow
- **What:** Engage a privacy lawyer (1–2 hour consult, ~$500). If storing data on under-13s, implement parental consent flow. Update privacy policy.
- **Why:** COPPA penalties are real and per-record.

### 3.2 Account & data deletion (GDPR/CCPA-aligned)
- **What:** "Delete my account and all kids' data" flow. 30-day soft delete → hard purge. Export-my-data endpoint.
- **Why:** Required under multiple privacy regimes; also the right thing.

### 3.3 Multi-factor authentication
- **What:** TOTP via `otpauth` library, or rely on managed auth provider's MFA if 2.10 was taken.
- **Why:** Removes 99%+ of credential-stuffing risk for accounts that enable it.

### 3.4 Field-level encryption for highest-sensitivity PII
- **What:** Envelope encryption for kid full names + DOB (if stored). Application-layer encrypt; KMS-managed key.
- **Tradeoff:** Adds complexity to queries; only do this for fields where DB-at-rest encryption isn't sufficient assurance.

### 3.5 Penetration test
- **What:** One-time external pen test. Budget ~$3–8K.
- **When:** After Phase 2 ships, before any paid tier or marketing launch.
- **Why:** Finds the things internal review can't see.

### 3.6 Formal incident response runbook
- **What:** Document at `docs/product/INCIDENT_RESPONSE.md`. Cover: detection sources, severity tiers, comms templates (user-facing), rollback steps (link to `MASTER_DEV_REFERENCE.md#rollback-procedure`), forensic steps, post-mortem template.
- **Why:** Decisions made calmly in advance beat decisions made at 11pm during an incident.

### 3.7 Data minimization review
- **What:** Quarterly review: do we still need every PII field we store? Remove DOB if unused. Consider redacting last names → "Eshaan K." on shared views unless explicitly opted in.

---

## Cross-Phase: Standing Practices

Once adopted, these become permanent rules in `CLAUDE.md`:

- **No secrets in git, ever.** Verified by gitleaks in CI.
- **No PII in analytics events.** Verified by manual audit pre-release of any new event.
- **Every write endpoint has an ownership-check unit test.** CI-blocking.
- **Every API route has a zod schema with `.strict()`.**
- **API responses use explicit DTOs — never raw DB rows.**
- **Auth tokens live in httpOnly cookies — never `localStorage`.**

---

## Implementation Workflow

When K picks an item from this doc:

1. Create a branch from `develop` named `security/<phase>-<item-number>-<short-name>` (e.g. `security/1-2-ownership-checks`).
2. Implement; add tests; verify locally.
3. Update `docs/product/ROADMAP.md` — mark the item in-progress.
4. Run full deployment checklist per `MASTER_DEV_REFERENCE.md`.
5. After merge, update this doc — mark item ✅ shipped with date and version.
6. If a new permanent rule was introduced → add to `CLAUDE.md` Standing Practices.

---

## Status Tracker

| Phase | Item | Status | Shipped Version | Date |
|---|---|---|---|---|
| 0.1 | Share-link ID audit | ☐ Not started | — | — |
| 0.2 | CORS lockdown | ☐ Not started | — | — |
| 0.3 | Helmet middleware | ☐ Not started | — | — |
| 0.4 | Gitleaks history scan | ☐ Not started | — | — |
| 0.5 | Mixpanel PII audit | ☐ Not started | — | — |
| 1.1 | JWT → httpOnly cookies | ☐ Not started | — | — |
| 1.2 | Ownership-check middleware | ☐ Not started | — | — |
| 1.3 | Zod schema validation | ☐ Not started | — | — |
| 1.4 | Rate limiting | ☐ Not started | — | — |
| 1.5 | Password hardening | ☐ Not started | — | — |
| 1.6 | CI security gates | ☐ Not started | — | — |
| 1.7 | Branch protection | ☐ Not started | — | — |
| 1.8 | Dependabot | ☐ Not started | — | — |
| 1.9 | CSP enforcement | ☐ Not started | — | — |
| 1.10 | SW cache versioning | ☐ Not started | — | — |
| 1.11 | Approve-link HMAC tokens | ☐ Not started | — | — |
| 2.1 | Audit log table | ☐ Not started | — | — |
| 2.2 | Structured logging | ☐ Not started | — | — |
| 2.3 | Sentry + PII scrubbing | ☐ Not started | — | — |
| 2.4 | Anomaly alerting | ☐ Not started | — | — |
| 2.5 | Share-link revocation/expiry | ☐ Not started | — | — |
| 2.6 | DTO discipline | ☐ Not started | — | — |
| 2.7 | XSS audit | ☐ Not started | — | — |
| 2.8 | Backup restore drill | ☐ Not started | — | — |
| 2.9 | Env var hygiene audit | ☐ Not started | — | — |
| 2.10 | Managed auth decision | ☐ Not started | — | — |
| 3.1 | COPPA review | ☐ Not started | — | — |
| 3.2 | Account deletion flow | ☐ Not started | — | — |
| 3.3 | MFA | ☐ Not started | — | — |
| 3.4 | Field-level encryption | ☐ Not started | — | — |
| 3.5 | Pen test | ☐ Not started | — | — |
| 3.6 | Incident response runbook | ☐ Not started | — | — |
| 3.7 | Data minimization review | ☐ Not started | — | — |

---

## Recommended Starting Point

If picking just **one item to start with**, K should pick **1.2 (centralized ownership-check middleware + CI-blocking ownership tests)**. Reasons:

- Highest blast-radius mitigation (IDOR is the #3 risk in the threat model and the most common indie-app bug).
- Forces architectural clarity — the test suite makes future regressions impossible.
- Zero UX impact, zero rollback risk.
- Surfaces any latent authorization gaps before they become incidents.

Second pick: **0.1 (share-link ID audit)** — fast, diagnostic, and either confirms the exposure is closed or surfaces a critical issue.
