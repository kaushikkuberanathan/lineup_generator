# UptimeRobot Setup (Required — Prevents Render Cold Starts)

## Why

Render free tier spins down after 15 minutes of inactivity.
Cold starts take 30–50 seconds. A coach hitting this on game day = broken experience.

The `/ping` endpoint on the backend returns `{ status: "ok", timestamp: "..." }` in <100ms
with no DB or external calls — safe to hit every 5 minutes indefinitely.

## Setup Steps

1. Go to [uptimerobot.com](https://uptimerobot.com) → create free account
2. Click **Add New Monitor**:
   - **Monitor Type:** HTTP(s)
   - **Friendly Name:** Lineup Generator Backend
   - **URL:** `https://lineup-generator-backend.onrender.com/ping`
   - **Monitoring Interval:** 5 minutes
3. (Optional) Add email alert for downtime notification
4. Click **Create Monitor**

## Verification

After setup, the `/ping` endpoint should appear in the UptimeRobot dashboard with a green
status and response time. Target: **<500ms** response time consistently once warmed up.

To manually verify the endpoint is alive:
```
curl https://lineup-generator-backend.onrender.com/ping
# Expected: {"status":"ok","timestamp":"2026-03-29T..."}
```

To check full health metrics (uptime, version):
```
curl https://lineup-generator-backend.onrender.com/health
# Expected: {"status":"ok","uptime":3600.5,"timestamp":"...","version":"1.7.0"}
```

## Frontend Cold-Start UX

The frontend polls `/ping` on mount (and every 5 minutes) via `useBackendHealth`:

| State | What user sees |
|-------|---------------|
| `checking` (first 3s) | Small gray "Connecting..." pill in home screen header |
| `checking` (>3s) | Nothing (hide to avoid alarming users on fast connections) |
| `ok` (<2s response) | Nothing — silence is success |
| `slow` (2–8s response) | Amber pill "⏳ Server warming up..." + inline share warning |
| `down` (>8s or error) | Red pill "⚠️ Server unavailable — some features may not work" |

If a share action is attempted while `slow` or `down`, the share sheet shows:
> "⏳ Server is warming up — sharing may take up to 30 seconds"

## Status

- [x] UptimeRobot monitor created — **ACTIVE** (as of 2026-03-31)
- Status page: https://stats.uptimerobot.com/UwuyX1l0na
