# UptimeRobot Monitoring (Production Availability)

> **Last Updated:** April 27, 2026
> **Owner:** K (solo)

---

## Purpose

UptimeRobot monitors production backend availability and surfaces outages via push notification + email. This is **availability monitoring**, not cold-start prevention — production has been on Render Starter plan ($7/mo, no spin-down) since April 27, 2026.

For the broader infrastructure context (free-tier hours trap that triggered the upgrade), see `CLAUDE.md` → `## Key Infrastructure` → `### Free-tier hosting trap`.

---

## Current Setup

| Item | Value |
|---|---|
| Monitor name | Lineup Generator Backend |
| Monitor ID | #802733786 |
| URL monitored | `https://lineup-generator-backend.onrender.com/ping` |
| Interval | 5 minutes |
| Alert channels | Email + Push notification (mobile app) |
| Status page (public) | https://stats.uptimerobot.com/UwuyX1l0na |
| Active since | March 31, 2026 |

The `/ping` endpoint returns `{ status: "ok", timestamp: "..." }` in <100ms with no DB or external calls — safe to hit every 5 minutes indefinitely.

---

## Alert Channels — CRITICAL CONFIG

**Both email AND push notification must be active on this monitor.** Email alone is not sufficient for production-grade alerting.

### Why both
On April 25, 2026, production backend was suspended (Render free-tier hours cap). UptimeRobot correctly detected the outage and emailed alerts on April 25 at 10:03 AM ET. The email was delivered to K's primary inbox but was missed for 2 days because email is async by design — it doesn't physically interrupt the recipient.

The fix (April 27, 2026): added the UptimeRobot mobile app with push notifications enabled. Push notifications physically interrupt and persist in the notification tray until acknowledged.

### Setup notes
- Email contact: configured to K's primary Gmail
- Push contact: UptimeRobot mobile app installed on K's phone (iOS/Android), signed into the same UptimeRobot account
- Both contacts attached to monitor #802733786 in monitor settings → Alert Contacts

### Test occasionally
UptimeRobot has a "Send test" button on each alert contact. Test push notification delivery quarterly — push notification reliability degrades silently when phone settings change (Do Not Disturb, app permissions revoked after OS updates, etc).

---

## Response Protocol

When a UptimeRobot DOWN alert fires:

1. **Within 5 minutes**: open phone, check Render dashboard at https://dashboard.render.com
2. **If service is suspended (free-tier hours exceeded)**: upgrade plan in Render dashboard for instant reactivation, OR wait for billing reset on the 1st of the month
3. **If service is running but failing health check**: check Render logs for runtime errors; restart from dashboard if no fix is obvious
4. **If currently unable to act** (in a meeting, with kids, etc): reply to the UptimeRobot alert email with `Acknowledged, will resolve by [time]` for self-tracking
5. **Resolved**: UptimeRobot sends an automatic resolved-alert when the service responds 200 again

For the full incident response framework, see `docs/product/MASTER_DEV_REFERENCE.md` → `## Incident Response`.

---

## Frontend Health UX (`useBackendHealth`)

The frontend polls `/ping` on mount (and every 5 minutes) via the `useBackendHealth` hook. This UX still exists on Starter plan — Render's load balancer or transient network issues can still produce slow/error responses occasionally.

| State | What user sees |
|---|---|
| `checking` (first 3s) | Small gray "Connecting..." pill in home screen header |
| `checking` (>3s) | Nothing (hide to avoid alarming users on fast connections) |
| `ok` (<2s response) | Nothing — silence is success |
| `slow` (2–8s response) | Amber pill "⏳ Server warming up..." + inline share warning |
| `down` (>8s or error) | Red pill "⚠️ Server unavailable — some features may not work" |

If a share action is attempted while `slow` or `down`, the share sheet shows:
> "⏳ Server is warming up — sharing may take up to 30 seconds"

The "warming up" copy was originally tied to free-tier cold starts. On Starter plan it's now a transient-error message — copy is still accurate but the underlying cause has shifted.

---

## Manual Verification

Quick health checks for ad-hoc debugging:

```
curl https://lineup-generator-backend.onrender.com/ping
# Expected: {"status":"ok","timestamp":"<current ISO timestamp>"}

curl https://lineup-generator-backend.onrender.com/health
# Expected: {"status":"ok","uptime":<seconds>,"timestamp":"...","version":"<current backend version>"}
```

The `/health` endpoint returns the actual deployed backend version, useful for confirming a deploy completed correctly. As of v2.5.1 prod ship (April 27, 2026), version field returns `"2.5.1"`.

---

## Configuration History

- **March 31, 2026** — Monitor created. Email-only alerting. Render free tier.
- **April 25, 2026** — Production suspended due to free-tier hours cap (~720h/month from 5-min UptimeRobot pings × 24/7 keep-alive). Outage went undetected for 2 days because email alerts were missed in primary inbox.
- **April 27, 2026** — Backend upgraded to Render Starter ($7/mo). Push notifications added. Dev backend (`lineup-generator-backend-dev`) deleted entirely.

---

## Cross-References

- `CLAUDE.md` → `## Key Infrastructure` → free-tier hosting trap lessons learned
- `docs/product/MASTER_DEV_REFERENCE.md` → `## Incident Response` for full triage protocol
- Render dashboard: https://dashboard.render.com/web/srv-d70lkr9r0fns73cufidg
