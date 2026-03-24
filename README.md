# Lineup Generator ⚾🥎

**Baseball and softball lineup management for youth coaches.**

A Progressive Web App that auto-generates defensive lineups, tracks batting order, manages schedules, and syncs data to the cloud — built to be used on the sideline, on any device.

🌐 **Live app:** [line-up-generator.vercel.app](https://line-up-generator.vercel.app)

---

## What it does

### Auto-assign defensive lineup
The engine scores every player for every position using multiple layers of logic — skill badges, preferred positions, coach tags, dislike penalties, consecutive inning rules, outfield repeat prevention, and bench equity. It runs up to 8 attempts with shuffled ordering and returns the best valid result with warnings for any violations.

### Diamond view
Visual field layout showing all 10 positions on a realistic green field with dirt infield and outfield arc. Filter to a single inning (tap "4" to see only inning 4 assignments) or view all innings at once. Works in both the Defense tab and the Print/Share view.

### Realistic field diamond view
Green field background with dirt infield, outfield arc, base paths, and pitcher mound. Positions placed at true field coordinates — LF/LC/RC/RF in the outfield arc, SS/2B flanking second base, 3B/P/1B near the base corners, C below home plate.

### Batting order
Drag-to-reorder with full touch support on mobile. Season batting stats (AVG, AB, H, R, RBI) tracked per player from game results. AVG is calculated automatically from H ÷ AB and color-coded live.

### Schedule management
- Add games manually or import from text/photos using AI (Claude)
- Log game results with one tap (W / L / T / Rain)
- Track scores and individual batting performance per game

### Practice tracking
Log sessions with focus areas, drills, attendance, and notes.

### PDF + sharing
- Download a branded PDF of the lineup card
- Share via iOS/Android OS share sheet
- Generate a read-only share link for assistant coaches and score keepers — shows diamond view, batting order, inning filter, no editing possible

### Feedback & bug reporting
In-app tab for free-form coach feedback and bug reports. Submissions are persisted in localStorage and visible to the developer.

### Export / Import backup
Download the full team as a JSON file. Restore from backup on any device.

### Finalize lineup
Lock the lineup before game time. Prevents accidental edits while keeping the data visible.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite 5 |
| Database | Supabase (Postgres + JSONB) |
| Backend / AI proxy | Express on Render |
| AI features | Anthropic Claude API |
| PDF generation | jsPDF (loaded on demand) |
| PWA | vite-plugin-pwa + Workbox |
| Frontend hosting | Vercel |
| Backend hosting | Render |

---

## Project structure

```
lineup_generator/
├── frontend/               ← React + Vite PWA
│   ├── src/
│   │   ├── App.jsx         ← Main application (~4,300 lines)
│   │   ├── supabase.js     ← DB client + read/write helpers
│   │   └── main.jsx        ← React entry point
│   ├── public/             ← PWA icons
│   ├── index.html
│   ├── vite.config.js      ← Vite + PWA manifest
│   └── vercel.json         ← Vercel build config
└── backend/                ← Express API server
    └── index.js            ← /api/ai proxy + CORS
```

---

## How the data layer works

Data flows through three layers simultaneously on every save:

```
User action
    ↓
React state      ← instant, UI never waits
    ↓
localStorage     ← instant, offline fallback
    ↓
Supabase         ← async, fire-and-forget, cloud persistence
```

On app load, data is read from localStorage first (instant), then Supabase hydrates the state in the background with the latest cloud data (~500ms). The app is fully usable offline — coaches at a field with no signal still have their complete lineup.

### Database schema (Supabase)

```sql
teams (id, name, age_group, year, sport, owner_id, created_at)
team_data (team_id, roster, schedule, practices, batting_order, grid, innings, locked)
```

All team data is stored as JSONB in a single `team_data` row per team. This mirrors the localStorage key structure and requires no transformation. The `owner_id` field is reserved for the auth layer (Phase 3).

---

## Running locally

```bash
# Clone
git clone https://github.com/kaushikkuberanathan/lineup_generator
cd lineup_generator

# Frontend
cd frontend
npm install
cp .env.example .env.local   # fill in Supabase keys
npm run dev                   # http://localhost:5173

# Backend (separate terminal)
cd ../backend
npm install
cp .env.example .env.local   # fill in ANTHROPIC_API_KEY
npm start                     # http://localhost:3001
```

### Environment variables

**frontend/.env.local**
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**backend/.env.local**
```
ANTHROPIC_API_KEY=sk-ant-...
```

---

## Deploying

### Frontend → Vercel
The `frontend/vercel.json` handles build config automatically. Connect the repo to Vercel, add the two `VITE_SUPABASE_*` env vars, deploy.

### Backend → Render
Connect the repo to Render, set root directory to `backend/`, add `ANTHROPIC_API_KEY` env var. Render auto-deploys on push.

### Database → Supabase
Run the schema SQL from `SUPABASE-IMPLEMENTATION.md` in the Supabase SQL Editor.

---

## Lineup engine

The auto-assign engine (`App.jsx` — `autoAssign` function) works in two phases per inning:

**Phase 1 — Bench selection**
Players beyond 10 are benched (10 players on field, 1 bench slot per inning for an 11-player roster). Players with `benchOnce` tag can only sit once per game. Players who sat last inning must play this inning. Bench candidates are sorted by bench equity (fewest prior bench innings).

**Phase 2 — Field assignment**
Outfield is filled first (LC → RC → LF → RF) using a hard block on repeat outfield positions. There is no CF — the four outfield positions are LF, LC, RC, and RF. Infield is assigned most-constrained-first. Each position is scored with 8 layers:

1. Outfield repeat hard block (−999)
2. Skill badge weights (averaged across active badges)
3. Preferred position bonus (+30/+24/+18/+12/+8 by rank)
4. Coach tag modifiers (additive)
5. Position dislike penalty (−50)
6. Consecutive infield hard block (−998)
7. Spread penalty (−10 per prior inning at same position)
8. Bench equity bonus (+4 per prior bench inning)

The engine runs up to 8 times with shuffled roster order and returns the attempt with the fewest validation violations.

**Field layout (diamond view)**
The diamond view renders an SVG field (680×640 viewBox) with a green background, outfield arc, dirt infield ellipse, base diamond, and pitcher mound. All 10 position boxes are placed at true field coordinates. In single-inning mode, each box shows the assigned player's first name. In all-innings mode, each box shows a numbered list of assignments across all innings.

---

## Documentation

- [Roadmap](docs/product/ROADMAP.md)
- [User Personas](docs/product/PERSONAS.md)
- [Coach Onboarding Guide](docs/product/ONBOARDING.md)
- [Pre-Deploy Test Checklist](docs/testing/PRE_DEPLOY_CHECKLIST.md)

---

## Roadmap

- **Phase 3a** — Supabase Auth (magic link login, no passwords)
- **Phase 3b** — Role-based access (Coach / Assistant / Viewer)
- **Phase 3c** — Multi-device realtime sync via Supabase Realtime
- **Phase 3e** — iCal schedule import
- **Phase 4** — Season analytics (position frequency, bench equity charts)

---

## License

MIT
