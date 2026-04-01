# Test Suite Setup Instructions

## 1. Add to backend/package.json scripts section

Find the "scripts" section in backend/package.json and add:

```json
"scripts": {
  "start": "node index.js",
  "dev": "node index.js",
  "test": "node scripts/tests/test-runner.js",
  "test:regression": "node -e \"require('./scripts/tests/suite-regression').run(require('./scripts/tests/test-runner').test, 'http://localhost:3000', {})\"",
  "test:auth": "node -e \"process.env.SUITE='auth' \" scripts/tests/test-runner.js"
}
```

Simplest version — just add "test" to existing scripts:
```json
"test": "node scripts/tests/test-runner.js"
```

## 2. Run the full suite

```powershell
# From backend folder
cd C:\Users\KKUBERANA1\Documents\lineup-generator\backend
npm test
```

## 3. Manual Test Checklist (cannot be automated — require live OTP)

Run these manually after npm test passes:

| # | Test | Steps | Expected |
|---|------|-------|----------|
| M-01 | OTP verify — valid code | 1. Run login for kaushik@gmail.com 2. Get code from inbox 3. POST /verify with code | 200 session token |
| M-02 | GET /me — valid session | Use access_token from M-01 as Bearer header | 200 profile + memberships with id field |
| M-03 | Approval email received | Approve any request | Email arrives at kaushik@gmail.com |
| M-04 | otp_verified in auth_events | After M-01 | Row in auth_events with event_type=otp_verified |
| M-05 | session_resumed in auth_events | After M-02 | Row in auth_events with event_type=session_resumed |
| M-06 | Logout clears session | POST /logout with Bearer token | 200, subsequent /me returns 401 |

## 4. Test Data Cleanup

The test runner auto-cleans all rows where app_version = 'test-suite-1.0'.
If you need to manually clean up:

```sql
delete from access_requests where app_version = 'test-suite-1.0';
delete from team_memberships where email like '%-suite@test.com' or email like '%-suite%@test.com';
delete from auth_events where app_version = 'test-suite-1.0';
```

## 5. CI/CD Integration (Phase 5)

When GitHub Actions CI gate is set up (Session 8 from backlog):
- Add npm test to the CI workflow
- Tests run on every push to main
- Failed tests block the deploy
