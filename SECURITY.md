# Security Policy

Dugout Lineup stores youth sports roster and game data on behalf of volunteer
coaches. Depending on the feature used, this can include player names, team
rosters, schedules, live-game scoring, account email/profile data, access
requests, feedback, legal-consent audit records, and security/audit events.
Security reports are taken seriously and triaged promptly.

## Supported Versions

Dugout Lineup is a continuously deployed web application, not a versioned library. Only the
version currently live at [dugoutlineup.com](https://dugoutlineup.com) (tracked on the `main`
branch) is supported. There is no backport policy for older releases.

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Instead, report privately using one of the following:

- [GitHub Security Advisories](https://github.com/kaushikkuberanathan/lineup_generator/security/advisories/new) (preferred)
- Email: kaushikkumar.kuberanathan@cox.com

Please include:

- A description of the vulnerability and its potential impact
- Steps to reproduce, or a proof of concept if available
- Any affected endpoints, roles, or data

## What to Expect

- Acknowledgement within 3 business days
- An initial assessment of severity and scope within 7 days
- Coordinated disclosure — no public disclosure of the issue until a fix is deployed, unless
  otherwise agreed

## Scope

In scope:

- The production frontend (dugoutlineup.com) and backend (Render-hosted API)
- Authentication, authorization, and Row Level Security (RLS) policies in Supabase
- Project-controlled Vercel, Render, Supabase, email, and analytics configuration
- Share-link access controls (read-only viewer links must never allow writes)
- Authenticated coach/admin APIs and live-scoring authorization boundaries

Out of scope:

- Vulnerabilities in the third-party platforms themselves (Supabase, Vercel,
  Render, Anthropic, and other providers) — report those to the provider; a
  misconfiguration owned by Dugout Lineup remains in scope here
- Denial-of-service or load-testing against the production environment

## Safe Testing

Good-faith research that follows this policy will not be pursued merely for
reporting a vulnerability. Keep testing proportionate and stop when you have
enough evidence to report the issue. Do not access or retain another person's
data, alter production records, degrade service, run automated/high-volume
scans, attempt social engineering, or disclose a vulnerability before a fix is
deployed. If proof would require any of those actions, report the suspected path
without executing it and coordinate a safe reproduction with the maintainer.
