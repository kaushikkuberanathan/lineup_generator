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
- [ ] Pre-push hook runs `npm test` and passes on this branch

### Final gate
- [ ] Vercel preview deployed and phone-smoke-tested on a real device
- [ ] Branch protection CI checks green — no bypass

---

## Ship Gate
- [ ] Overnight soak on `dev.dugoutlineup.com` confirmed (non-negotiable — no exceptions)
- [ ] Share link opens on mobile without login
- [ ] Game Mode tested: open, advance inning, positions visible
- [ ] Lineup generates in under 60 seconds
- [ ] Bottom nav pinned while scrolling

---

## Screenshots / Notes
Add screenshots if UI changed. Note any manual verification steps taken.
