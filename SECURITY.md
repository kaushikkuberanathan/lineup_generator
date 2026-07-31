# Security Policy

Dugout Lineup stores youth sports roster data (player names, team rosters, game schedules) on
behalf of volunteer coaches. Security reports are taken seriously and triaged promptly.

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
- Share-link access controls (read-only viewer links must never allow writes)

Out of scope:

- Third-party services (Supabase, Vercel, Render, Anthropic) — report directly to those
  providers
- Denial-of-service or load-testing against the production environment
