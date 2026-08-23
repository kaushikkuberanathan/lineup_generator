## Summary
What changed and why?

## Related Issue
Closes #

## Type of Change
- [ ] Bug fix
- [ ] Feature / Story
- [ ] UX improvement
- [ ] Tech debt / refactor
- [ ] Documentation only
- [ ] Deployment / config
- [ ] Hotfix (include `[hotfix-exception]` in commit message body)

---

## Pre-release Docs Checklist

### Version + changelog
- [ ] `APP_VERSION` bumped in `frontend/src/App.jsx`
- [ ] `VERSION_HISTORY` entry prepended — `userChanges` answers "what does the coach experience differently tomorrow?"; refactors/CI/tooling go in `internalChanges` only
- [ ] `frontend/package.json` version bumped
- [ ] `backend/package.json` version bumped
- [ ] `docs/product/ROADMAP.md` updated

### Architecture + ops docs
- [ ] `docs/SOLUTION_DESIGN.md` updated if architecture, auth, scoring, or CI/CD changed
- [ ] `docs/product/MASTER_DEV_REFERENCE.md` updated if infra identifiers or deploy steps changed
- [ ] `docs/product/FEATURE_MAP.md` row updated for any changed feature
- [ ] `CLAUDE.md` updated with new architectural conventions or pitfalls

### User-facing
- [ ] `frontend/src/content/faqs.js` updated if coach-facing behavior changed
- [ ] `README.md` updated if install / deploy / usage changed

### Test hygiene
- [ ] New test files listed in `docs/product/DOC_TEST_DEBT.md`
- [ ] Test count in `CLAUDE.md` matches actual suite total
- [ ] CI is green on this PR (the pre-push hook only enforces the branch guard — the Vitest suite was removed from it in Story 75/PR #155; **CI, not the local hook, is the authoritative test gate**)

### Final gate
- [ ] Vercel preview deployed and phone-smoke-tested on a real device
- [ ] Branch protection CI checks green — no bypass
- [ ] Merge dropdown set to **Create a merge commit**, not Squash — verify after merge with `git show -s --format=%P HEAD` (2 parents). This has squash-landed by accident twice despite stated intent (see root `CLAUDE.md` → Merge-type policy, issue #573).

---

## Ship Gate

**Which items below apply depends on whether this PR targets `develop` or `main`** — see root `CLAUDE.md` → Release Ritual. A `feature/*` → `develop` PR is CI + preview + review; the full Ship Gate below (soak, docs checklist, prod smoke) is asked of the `develop` → `main` promote PR, not every feature PR.

- [ ] Overnight soak on `dev.dugoutlineup.com` confirmed **(develop → main only)** — the standing rule is non-negotiable, but KK has explicitly overridden it citing release-readiness on multiple releases (v2.9.0, v2.10.0, v2.11.0, v2.12.0 — see each entry in `CLAUDE.md` → Current Version). An override must be an explicit, logged decision by KK, not a default — check the version-history entry for the override statement before treating a promote as soak-exempt.
- [ ] Share link opens on mobile without login
- [ ] Game Mode tested: open, advance inning, positions visible
- [ ] Lineup generates in under 60 seconds
- [ ] Bottom nav pinned while scrolling

---

## Screenshots / Notes
Add screenshots if UI changed. Note any manual verification steps taken.
