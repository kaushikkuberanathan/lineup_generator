# Supabase Auth security settings

## Leaked-password protection

Both hosted projects must keep **Prevent use of leaked passwords** enabled in
Supabase Dashboard → Authentication → Providers → Email. Supabase checks new
or changed passwords against Have I Been Pwned; existing magic-link and Google
OAuth flows do not submit passwords and are unaffected.

Current blocker (2026-08-30): both projects belong to a Free organization.
Supabase rejected the setting change with “available on Pro Plans and up.”
Issue #964 must remain open until the organization is upgraded; no database or
application-code workaround can clear this Auth advisor finding.

Projects:

- DEV: `psqvzppphdedqkpmarwx`
- PROD: `hzaajccyurlyeweekvma`

Verification:

1. Run the Supabase Security Advisor for each project.
2. Confirm `auth_leaked_password_protection` is absent.
3. Run the backend auth tests and a magic-link request smoke test.

Rollback: disable **Prevent use of leaked passwords** in the same Email
provider settings. Rollback is not expected to affect magic-link or OAuth
authentication; it only permits future password creation/change requests to
use passwords present in the leaked-password corpus.
