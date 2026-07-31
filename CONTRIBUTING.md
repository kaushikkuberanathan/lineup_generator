# Contributing to Dugout Lineup

Dugout Lineup is primarily a solo-maintained product — built and governed by
[@kaushikkuberanathan](https://github.com/kaushikkuberanathan) — but issues, bug reports, and
pull requests from the community are welcome.

## Before You Start

For anything beyond a small fix, please open an issue first using one of the templates below so
we can align on approach before you invest time in a PR.

- [Bug Report](https://github.com/kaushikkuberanathan/lineup_generator/issues/new?template=bug_report.yml) — something broken or not working as expected
- [Story](https://github.com/kaushikkuberanathan/lineup_generator/issues/new?template=story.yml) — a new coach-facing feature or product improvement
- [Governance](https://github.com/kaushikkuberanathan/lineup_generator/issues/new?template=governance.yml) — process, docs, or test-debt gaps

## Branch Model

- `main` — production, deployed to [dugoutlineup.com](https://dugoutlineup.com)
- `develop` — integration branch; every change soaks here (including an overnight cycle on
  `dev.dugoutlineup.com`) before it's promoted to `main`

Branch your work off `develop`, not `main`.

## Local Setup

```bash
git clone https://github.com/kaushikkuberanathan/lineup_generator
cd lineup_generator

# Frontend
cd frontend
npm install
cp .env.example .env.local   # add Supabase keys
npm run dev                  # http://localhost:5173

# Backend (separate terminal)
cd ../backend
npm install
cp .env.example .env.local   # add ANTHROPIC_API_KEY
npm start                    # http://localhost:3001
```

## Tests

```bash
cd frontend && npm run lint && npm run test
cd backend && npm test
```

New behavior needs test coverage. Bug fixes should include a regression test where practical.

## Pull Requests

- Target `develop`, not `main`.
- The PR template includes a ship-gate checklist (version bump, docs, tests, soak requirement).
  All items must be checked before merge.
- Files under [CODEOWNERS](.github/CODEOWNERS) (core app entry point, migration-sensitive
  utilities, locked component directories, package manifests) require owner review regardless of
  who opens the PR.
- Keep commits scoped and use conventional prefixes (`feat`, `fix`, `test`, `docs`, `chore`)
  where practical — commit history feeds the public activity summary.

## Code of Conduct

Participation in this project is governed by our [Code of Conduct](CODE_OF_CONDUCT.md).

## Reporting Security Issues

Do not open a public issue for vulnerabilities — see [SECURITY.md](SECURITY.md).
