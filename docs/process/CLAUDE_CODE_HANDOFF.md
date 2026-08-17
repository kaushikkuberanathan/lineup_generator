# Claude Code Handoff — Lineup Generator

> Verified locally: 2026-08-17. This is an agent-facing orientation and setup
> record. It complements, but does not replace, `CLAUDE.md`, the scoped
> `frontend/CLAUDE.md` and `backend/CLAUDE.md`, or the coach-facing
> `docs/product/ONBOARDING.md`.

## 1. How to Work With KK

Kaushik Kuberanathan (KK) is the product owner, primary operator, coach, and
only human reviewer in this loop. The agent is therefore expected to function
as a careful engineering partner and QA layer, not merely a code generator.

### Working style

- Lead with the outcome and evidence. Give KK a clear recommendation, current
  state, risks, and the exact decision needed from him.
- Be proactive and finish safe, in-scope work. Do not repeatedly ask questions
  whose answers are discoverable from the repository, Git history, local
  environment, or service metadata.
- Push back when evidence says a deadline-driven shortcut creates game-day,
  production-data, or release-integrity risk. A prior release required a revert
  after deadline pressure overrode caution; “ship today” is not permission to
  weaken a gate.
- Treat every handoff, roadmap status, memory, and historical claim as a lead to
  verify. Date important claims and cite the branch, SHA, PR, issue, query, or
  test result that supports them. Correct stale documentation openly.
- When an incident reveals a repeatable failure mode, fix the immediate issue,
  record the lesson, and propose a durable rule, test, or guardrail.
- Keep updates concise and plain-spoken. KK often uses shorthand and typos when
  moving quickly; infer intent from context without making him restate obvious
  details. “T1” and “T2” mean parallel terminal/agent workstreams.
- This is a side project used in real youth baseball settings. Game-day speed,
  mobile usability, reliability, privacy, and recoverability outweigh elegant
  abstractions.
- KK may work from a Cox-managed corporate laptop or a personal PC. Windows
  security/network behavior can differ between machines. Diagnose environment
  flakes before changing correct application code.
- Do not confuse Lineup Generator with KK’s other initiatives (for example,
  KidCoord or Career Strategy Team).

### Product north star

When tradeoffs are otherwise close, prioritize:

1. A share link that opens quickly on a phone without login.
2. Game Mode/Dugout usability at the field.
3. Coach onboarding and team setup.

Viewing a lineup and opening a share link must never require authentication.

## 2. Mandatory Repository Rules

Read these completely before changing anything:

1. `CLAUDE.md`
2. The nearest scoped file: `frontend/CLAUDE.md` or `backend/CLAUDE.md`
3. `docs/product/MASTER_DEV_REFERENCE.md` for releases
4. `docs/product/ROADMAP.md`, `docs/product/FEATURE_MAP.md`, and
   `docs/product/DOC_TEST_DEBT.md` when planning or shipping product work

Do not rely on this summary if it conflicts with those files.

- Never commit or push directly to `develop` or `main`. Even documentation work
  begins on a short-lived `feature/*`, `fix/*`, or `chore/*` branch based on
  `develop`; declared production hotfixes begin from `main`.
- No push to `main` without KK’s exact phrase:
  `confirmed — push to main`.
- Obey every locked-file gate phrase in `CLAUDE.md`. In particular, do not edit
  `App.jsx`, package manifests, migrations/formatters, Game Mode/ScoringMode, or
  `CLAUDE.md` without its specified approval.
- Stage explicit paths only. Never use `git add .` or `git add -A`.
- Run `git branch --show-current` before every pull. Prefer fetch plus inspection
  when the target is uncertain.
- Verify merge shape after merging. The current root guidance requires genuine
  merge commits; use the current `CLAUDE.md`, not an older artifact that may
  describe a different policy.
- A fresh worktree needs `npm install` at repository root so Husky’s ignored
  wrapper exists. Confirm `.husky/_/pre-push` before the first push.
- Do not run destructive database probes against DEV or PROD. Never expose the
  Supabase service-role key to frontend code, logs, chat, commits, or artifacts.
- Production data must not be deleted, truncated, reset, or rewritten as part of
  testing. Prefer the ephemeral local Supabase RLS stack.

## 3. Repository and Worktrees

- GitHub: `kaushikkuberanathan/lineup_generator`
- Primary worktree:
  `C:\Users\kaush\OneDrive\Documents\Projects\lineup_generator`
- UX worktree:
  `C:\Users\kaush\OneDrive\Documents\Projects\lineup-generator-ux`
- Verified 2026-08-17: both point at `6c52976`; primary branch is `develop`, UX
  branch is `ux-local-base`, both tracking `origin/develop` at that SHA.
- Always re-run `git worktree list`, `git status --short --branch`, `git fetch`,
  and `git log --decorate -10` at session start. This paragraph will age.

Setup-generated local changes currently present in the primary worktree:

- `frontend/.gitignore` modified by Vercel linking.
- `supabase/.branches/` untracked local Supabase metadata.

The UX worktree also had `frontend/.gitignore` modified by Vercel linking at the
last successful check. These are not product changes. Do not stage or discard
them without inspecting the exact diff and getting agreement on cleanup.

## 4. System and Architecture

Lineup Generator is a mobile-first PWA for youth baseball/softball coaches.

- Frontend: React + Vite, deployed on Vercel.
- Backend: Express, deployed on Render.
- Data/Auth: Supabase Postgres, JSONB, Auth, and RLS.
- Persistence is intentionally layered: React state, then localStorage, then
  asynchronous Supabase synchronization. Offline field use matters.
- Auth is Google OAuth plus email magic link. Password and SMS/phone OTP flows
  are retired.
- Live scoring has temporary auth shims and open-policy history documented in
  `CLAUDE.md` and `docs/ops/PHASE4C_CUTOVER.md`. Do not “clean them up” casually.
- The database tolerates seven legacy membership roles while application code
  normalizes toward a smaller target model. Query actual database constraints
  before changing role behavior.

The coach-facing `docs/product/ONBOARDING.md` was read in full. It describes the
real user journey: install PWA, sign in only to edit, request team access, build
a roster, import a schedule, generate defense and batting order, share without
login, log results, optionally score live in Dugout View, and export backups.
It is product documentation, not an infrastructure setup guide. Its last-updated
date is 2026-08-04, so verify UI labels and known-issue statements before relying
on them for a release.

## 5. Local Tooling and Access Snapshot

Installed on this Windows machine:

- Node `24.19.0`, npm `11.17.0`, Git `2.55.0.windows.3`
- GitHub CLI `2.97.0`; authenticated as `kaushikkuberanathan` through
  `GITHUB_TOKEN`
- Vercel CLI `59.1.3`; project link metadata targets team
  `kaushikkuberanathans-projects`, project `lineup-generator`
- Supabase CLI `2.84.2`, intentionally matching `.github/workflows/ci.yml`
- Docker Desktop `4.86.0`, Docker CLI/Engine `29.7.2`, WSL 2

Important qualifications:

- Docker was installed and the local RLS stack previously passed 35 tests with
  0 failures and 7 intentional skips. At the final 2026-08-17 recheck, Docker
  Desktop was not running, so start Docker Desktop before `supabase start`.
- Vercel had authenticated successfully earlier, but a final `vercel whoami`
  recheck hit a transient network `fetch failed`. Re-run it before remote work.
- The current GitHub token can authenticate and operate Git, but it received
  HTTP 403 when listing Actions secret metadata. Do not assume it has repo-admin
  or Actions-secrets scope.
- Supabase CLI is pinned for CI parity even though `2.114.0` is available. The
  isolated npm install reports advisories in the pinned dependency tree. Upgrade
  only as a deliberate CI/tooling change with the full RLS suite rerun.
- Current Codex connectors can inspect both hosted Supabase projects. The CLI’s
  own remote login/link state still needs to be verified before using CLI remote
  commands.

## 6. Environments and Variables

Never put values in this document. Record names, owners, storage locations, and
verification dates only.

### Frontend

Required or referenced:

- `VITE_BACKEND_URL`
- `VITE_DEFAULT_TEAM_ID`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` (publishable, but still manage intentionally)
- `VITE_MIXPANEL_TOKEN`
- `VITE_APP_VERSION` is injected by build configuration; do not set it manually

Primary local `frontend/.env` currently contains all except
`VITE_MIXPANEL_TOKEN`. `frontend/.env.development` contains DEV Supabase and a
localhost backend URL. Vercel linking created ignored `frontend/.env.local` with
`VERCEL_OIDC_TOKEN`; never commit or paste that token.

At the last successful Vercel check, the linked project reported no configured
environment variables. Confirm this again, because deployment state can change.
The UX worktree does not have a complete local frontend environment.

### Backend

Runtime variables referenced by code and docs:

- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- Local target selector: `SUPABASE_TARGET`
- Local paired credentials: `SUPABASE_URL_DEV`, `SUPABASE_ANON_KEY_DEV`,
  `SUPABASE_SERVICE_ROLE_KEY_DEV`, `SUPABASE_URL_PROD`,
  `SUPABASE_ANON_KEY_PROD`, `SUPABASE_SERVICE_ROLE_KEY_PROD`
- `ANTHROPIC_API_KEY`
- `ADMIN_KEY`, `ADMIN_EMAIL`
- `RESEND_API_KEY`, `RESEND_DOMAIN_VERIFIED`, optional test recipient
- `APP_URL`, `DEFAULT_TEAM_ID`, `PORT`, `NODE_ENV`
- Test/automation variables: `BACKEND_URL`, `CI`, `CI_SAFE`, `TEST_TEAM_IDS`,
  `RLS_TEST_SUPABASE_URL`, `RLS_TEST_SUPABASE_ANON_KEY`,
  `RLS_TEST_SUPABASE_SERVICE_ROLE_KEY`, `GITHUB_TOKEN`, `GITHUB_REPOSITORY`,
  `ACTIVITY_SOURCE_BRANCH`, and `SUITE`

The current local `backend/.env` contains DEV and PROD Supabase triplets plus
`SUPABASE_TARGET`, `PORT`, and `NODE_ENV`. It does not contain the Anthropic,
admin, Resend, app URL, or default-team variables. Do not copy PROD secrets into
another file merely for convenience.

### Smoke tests

`.env.smoke` (gitignored) may require:

- DEV/PROD backend and frontend URLs
- DEV/PROD Supabase URLs and anon keys
- DEV/PROD team IDs
- `ANTHROPIC_API_KEY`

Start from `.env.smoke.example`. Confirm whether a smoke action is read-only
before pointing it at PROD.

### Hosted systems

- Supabase PROD: project `dugout-lineup`, ref `hzaajccyurlyeweekvma`
- Supabase DEV: project `dugout-lineup-dev`, ref `psqvzppphdedqkpmarwx`
- Production backend: `https://lineup-generator-backend.onrender.com`
- Production frontend/domain: `https://dugoutlineup.com`
- Render management access is not currently available to this agent; only the
  public production health endpoint was verified.

## 7. First-Session Bootstrap and Verification

Run read-only checks before changing files:

```powershell
git worktree list
git branch --show-current
git status --short --branch
git fetch origin --prune
git log --oneline --decorate -10
gh auth status
vercel whoami
docker version
supabase --version
```

Then:

1. Read all applicable `CLAUDE.md` files and inspect existing dirty changes.
2. Run `npm install` at root, `frontend`, and `backend` only when lockfiles and
   installed dependencies justify it; do not update manifests incidentally.
3. Verify `.husky/_/pre-push` exists.
4. Start Docker Desktop if local Supabase testing is needed.
5. Treat `supabase/config.toml` as an ephemeral RLS-test stack, not a full local
   clone of hosted DEV.
6. Use the repository bootstrap script and `npm run test:rls`; never point the
   RLS suite at DEV or PROD.
7. Start the backend with `SUPABASE_TARGET=dev` and frontend with `npm run dev`.
8. Verify backend `/ping`, the browser UI, login where relevant, and a no-login
   share link. For game-day surfaces, use a real phone before release.
9. Run proportional gates: frontend build/test/lint, backend unit tests, and
   relevant integration/smoke tests. Watch frontend test-file counts for the
   documented Windows Vitest cold-start flake.

Useful scripts:

- Root: `npm run smoke:dev`, `npm run smoke:prod`
- Frontend: `npm run dev`, `build`, `lint`, `test`, `test:watch`, `test:ui`
- Backend: `npm test`, `npm run test:unit`, `test:rls`, `test:auth`, `test:admin`

## 8. Release Ritual in One Screen

The authoritative ritual is in `docs/product/MASTER_DEV_REFERENCE.md`.

1. Audit branches/worktrees and fetch remote state.
2. Work on a short-lived branch based on current `develop`.
3. Test locally and open a draft PR to `develop`.
4. Require CI green and verify the Vercel preview on a real device.
5. Merge using the current repository merge policy and verify commit parents.
6. Allow the required develop soak unless a documented hotfix exception applies.
7. Answer the Ship Gate and complete release/version documentation.
8. Open the `develop` to `main` promotion PR; obtain KK’s exact push/merge gate.
9. Within 10 minutes of production deployment, verify site, `/ping`, login,
   share link, and Game Mode. Roll back promptly on failure.
10. Immediately sync the production merge commit back into `develop` and clean
    up merged branches.

## 9. Known Traps

- `App.jsx` may have `skip-worktree`; an empty diff is not proof it was unchanged.
- Windows Vitest can silently drop a file yet exit successfully. Compare file and
  test counts, then retry once before diagnosing application regressions.
- Historical handoffs and ROADMAP status fields have been stale. Verify Git
  history and live state.
- Do not re-run old RLS migrations in hosted projects merely because a doc says
  “not applied.” Query the live policy/constraint state first.
- Render free-tier plus continuous uptime monitoring previously caused service
  suspension. Confirm the production plan before changing monitoring/hosting.
- After a production promotion, failing to sync `main` into `develop` creates
  avoidable conflicts in the next release.
- The agent onboarding artifact said `gh` was unavailable; that is obsolete.
  GitHub CLI is now installed. Its token still lacks at least Actions-secret-list
  permission, so capability must be checked per operation.

## 10. Questions KK or the Prior Claude Agent Must Answer

These are the remaining inputs needed for fully independent operation. Secret
answers should be stored in the correct provider/local secret store, never pasted
into this Markdown file or chat.

### Access and ownership

1. Can this agent be granted authenticated Render access, or a scoped Render API
   key, to inspect deployments, logs, service plan, and environment-variable
   names for both PROD and DEV? Is there currently a separate Render DEV service?
2. Should the GitHub token be expanded to read Actions secret metadata and branch
   protection, or should those remain owner-only operations?
3. Should Supabase CLI be authenticated and linked to hosted projects, or should
   remote work stay connector/dashboard-only? Who approves migrations separately
   for DEV and PROD?
4. Which account/workspace owns Mixpanel, Resend, Anthropic, UptimeRobot, domain
   DNS, and Vercel billing, and what is the recovery path if KK is unavailable?

### Missing configuration

5. Is the absence of Vercel environment variables intentional? If not, which
   values belong in Development, Preview, and Production, and should they be
   managed in Vercel or injected through another integration?
6. What should `VITE_BACKEND_URL` be for Vercel Preview and Production? Does DEV
   deliberately use the production Render backend, or is a new isolated backend
   expected?
7. What is the authoritative `VITE_MIXPANEL_TOKEN`, and should analytics be on in
   local, preview, production, or only some of them?
8. Should the UX worktree receive its own ignored local `.env`, or deliberately
   reuse a documented bootstrap command from the primary worktree?
9. Are `ANTHROPIC_API_KEY`, `ADMIN_KEY`, `RESEND_API_KEY`,
   `RESEND_DOMAIN_VERIFIED`, `ADMIN_EMAIL`, `APP_URL`, and `DEFAULT_TEAM_ID`
   expected locally? Which flows should gracefully remain unavailable without
   them?
10. What are the approved DEV and PROD smoke-test team IDs, and are the smoke
    suites guaranteed non-destructive for those records?

### Product and operating preferences

11. Confirm the north-star order: share link, Game Mode/Dugout, then onboarding.
    Are there current-season deadlines or teams beyond Mud Hens that change it?
12. What communication cadence does KK prefer during long tasks and releases?
    Which actions always require a checkpoint beyond the documented gates?
13. When speed conflicts with completeness, which test or documentation debts may
    KK explicitly accept, and where should that acceptance be recorded?
14. Should a new incident automatically result in a GitHub issue plus a proposed
    permanent rule/test, or does KK want approval before adding governance work?
15. Are there privacy rules beyond repository guidance for youth player names,
    emails, screenshots, analytics, logs, exports, and AI-assisted imports?

### Current state reconciliation

16. Is `docs/product/ONBOARDING.md` still accurate for the four-tab UI, additional
    team creation bug `#561`, Live Scoring availability, backup controls, and all
    displayed labels? Who performs the coach-facing walkthrough before release?
17. Should the Vercel-generated `.gitignore` edits and `supabase/.branches/`
    metadata be normalized in a dedicated setup branch, retained locally, or
    removed?
18. Is Supabase CLI `2.84.2` expected to remain pinned despite its dependency
    advisories, or should a separate CI upgrade issue be opened?
19. What is the current canonical release target after v2.10.0 preparation? Do
    not use the old artifact’s readiness snapshot without checking GitHub and the
    live deployments.
20. Please provide any prior-agent-only context that is not in Git: unresolved
    promises, manual dashboard changes, temporary exceptions, unfiled bugs,
    production incidents, account recovery details, and decisions made verbally.

## 11. Definition of “Fully Ready” for a New Agent

A new agent is ready only when it can demonstrate, without revealing secrets:

- Both worktrees and their dirty state are understood.
- GitHub read/PR capabilities and all write limitations are known.
- Vercel project link, environments, and deployment variables are verified.
- Render services, plans, deployments, logs, and variable names are inspectable.
- Supabase DEV/PROD identities are fenced and migration authority is explicit.
- Local frontend, backend, Docker, and ephemeral RLS stack start successfully.
- Frontend build/tests and backend unit/RLS tests pass with expected counts.
- A DEV end-to-end flow works, including a no-login share link.
- Production smoke procedures and rollback authority are explicit.
- KK has answered or consciously deferred every question above.

Until then, local development is operational, but infrastructure administration
is only partially onboarded.
