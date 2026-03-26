# ⚾ Lineup Generator

> **Baseball and softball lineup management for youth coaches — built on the sideline, for the sideline.**

🌐 **Live app: [line-up-generator.vercel.app](https://line-up-generator.vercel.app)**

---

## The Problem Every Youth Coach Knows

It's 10 minutes before game time. You've got 11 kids, parents watching, and a blank lineup card.

Recreational youth baseball and softball coaches face the same impossible puzzle every single week:

- 🧒 **Every kid must play** — league rules mandate minimum innings, and they will be enforced
- ⚖️ **Fairness is everything** — if one kid never plays shortstop while another always does, you *will* hear about it
- 🔄 **Position variety matters** — player development means rotating kids through new spots, not defaulting to what's easy
- 🤯 **No two games are the same** — absences, injuries, a player who just can't catch today — last week's lineup doesn't apply

Most coaches solve this with a mental spreadsheet, a scribbled notepad, or a chaotic group text. The result: **more time spent on logistics than on actually coaching kids.**

---

## What This App Does

Lineup Generator eliminates the pre-game scramble.

Input your roster once. Tap generate. Walk onto the field with a complete, constraint-validated lineup in under 60 seconds.

### Core Workflows

**🏟️ Auto-Generate Defensive Lineup**
The engine scores every player for every position across all innings — preferred positions, skill attributes, bench equity, back-to-back rules, outfield repeat prevention, and more. It runs up to 8 attempts and returns the best valid result. Coaches see warnings for any violations, not silent failures.

**📋 Batting Order**
Drag-to-reorder with full touch support. Season stats (AVG, AB, H, R, RBI) tracked per player from game results. Averages calculated and color-coded live — so decisions are backed by data, not guesswork.

**💎 Diamond View**
A realistic SVG field layout showing all 10 positions. Filter to a single inning ("show me inning 4 only") or view the full rotation at once. Built for a phone screen in a dugout, not a desktop dashboard.

**📅 Schedule + Game Logging**
Add games manually or let AI parse a schedule from a photo or a text paste. Log results with one tap. Track individual batting stats per game across the full season.

**📄 Print & Share**
Download a branded PDF lineup card. Generate a read-only share link for assistant coaches and scorekeepers — they see the diamond view, batting order, and inning filter with zero editing access. Works on any device, no app install required.

**☁️ Cloud Sync + Offline**
Data lives in Supabase and localStorage simultaneously. Fully usable with no signal — coaches always have their complete lineup at the field.

**📱 PWA — Install Like a Native App**
Installable on iOS and Android from the browser. No App Store. No Play Store. Tap "Add to Home Screen" and it works like a native app from that point forward.

---

## Who This Is For

| User | What They Need | How the App Serves Them |
|---|---|---|
| 🧢 **Head Coach** | Fair lineup, fast — under 2 min before a game | Auto-assign engine + manual overrides + print/share |
| 🤝 **Assistant Coach** | Read access to the current lineup | Read-only share link, no login required |
| 📊 **Scorekeeper** | Batting order + defensive positions, clearly laid out | Share link with inning filter + PDF card |
| 👨‍👩‍👧 **Parent** | Know where their kid is playing, without texting the coach | Share link — opens on any phone, no account needed |
| 🗂️ **Team Coordinator** | Schedule visibility and logistics | Schedule tab + game result logging |

> **Guiding principle:** If a coach can't use this in under 2 minutes before a game, the system is too complex.

---

## Built With Claude Code + Vibe Coding

This is a real-world example of what **AI-assisted development** makes possible for a domain expert who isn't a full-time engineer.

### What "Vibe Coding" Actually Means Here

Vibe coding isn't about pasting prompts and hoping for the best. It's a disciplined, iterative co-design process — human judgment drives *what* to build, AI capability accelerates *how* it gets built.

Here's what that looked like in practice:

| Challenge | How Claude Code helped |
|---|---|
| Constraint scoring engine with 8+ logic layers | Designed the algorithm in plain language, iterated on edge cases, shipped production-ready code |
| V2 player attribute system (fielding, batting, running) | Co-designed the data model and 9 position-specific scoring formulas |
| Diamond SVG field with realistic coordinates | Described the visual intent, iterated on layout, got the real-geometry output |
| Supabase + localStorage dual-sync architecture | Talked through the data flow, failure modes, and tradeoffs — got working implementation, not just a diagram |
| PWA setup with Workbox | Resolved service worker edge cases through conversation |
| Schema versioning + auto-migration | Designed the V1→V2 migration runner to remap fields without data loss |
| Deployment pipeline + cold-start mitigation | Identified the Render free-tier cold-start problem, designed the UptimeRobot keep-alive pattern |

### Why This Matters Beyond This App

This project is a **proof of concept for a new way to build software**:

- A domain expert (coach + product leader) can ship a production-quality, cloud-connected PWA without a dedicated engineering team
- Claude Code compresses the gap between "I know exactly what coaches need" and "it's live, versioned, and working"
- The result isn't a prototype — it's a deployed app with real users, a real schema, a test checklist, and a multi-phase roadmap

**Total time from idea to live MVP: days, not months.**

This is vibe coding at its best — not generating boilerplate, but genuinely co-designing a system end-to-end with a human setting direction at every decision point.

---

## Feature Status

| Feature | Status |
|---|---|
| Auto-assign defensive lineup (V2 engine) | ✅ Live |
| Manual grid overrides + Auto-Fix | ✅ Live |
| Diamond view with inning filter | ✅ Live |
| Batting order with drag-to-reorder + season stats | ✅ Live |
| AI schedule import (photo + text paste) | ✅ Live |
| Game result + per-player batting stat logging | ✅ Live |
| Walk-up songs per player (title, artist, link, timestamps) | ✅ Live |
| Snack Duty tab — per-game assignment with notes | ✅ Live |
| PDF export + print view | ✅ Live |
| Read-only share link (no login required) | ✅ Live |
| Cloud sync (Supabase) + offline (localStorage) | ✅ Live |
| PWA — installable on iOS + Android | ✅ Live |
| Phone OTP login + multi-device sync | 🔵 Phase 3 |
| Role-based access (Coach / Assistant / Viewer) | 🔵 Phase 3 |
| Season-long position fairness tracking | 🔵 Phase 3 |
| Practice session log | 🟡 Backlog |

---

## Roadmap

See [`ROADMAP.md`](./docs/product/ROADMAP.md) for the full prioritized backlog.

**Coming next:**
- Mobile batting reorder arrow fallback (touch drag gap on iOS)
- Print card metadata — team name, date, opponent pulled from game context
- "Revert to Generated" button after manual grid edits
- GitHub Actions CI — block deploys on failing engine tests
- Phase 3: Supabase OTP auth + multi-coach invite flow

---

## Quick Start (Local)

```bash
# Clone
git clone https://github.com/kaushikkuberanathan/lineup_generator
cd lineup_generator

# Frontend
cd frontend
npm install
cp .env.example .env.local   # add Supabase keys
npm run dev                   # http://localhost:5173

# Backend (separate terminal)
cd ../backend
npm install
cp .env.example .env.local   # add ANTHROPIC_API_KEY
npm start                     # http://localhost:3001
```

---

## Technical Deep Dive

For architecture, data models, scoring engine logic, API design, database schema, deployment setup, and version management — see:

📄 **[Solution Design →](./docs/SOLUTION_DESIGN.md)**

---

## Documentation

- 📋 [Product Roadmap](./docs/product/ROADMAP.md)
- 👤 [User Personas](./docs/product/PERSONAS.md)
- 🧭 [Coach Onboarding Guide](./docs/product/ONBOARDING.md)
- 🏗️ [Solution Design](./docs/SOLUTION_DESIGN.md)

---

## License

MIT — use it, fork it, build your own version for soccer or lacrosse or whatever sport is running your weekends.

---

*Built with ❤️, Claude Code, and hard-won knowledge of what actually matters at 8U.*
