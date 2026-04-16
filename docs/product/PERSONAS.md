# Dugout Lineup — User Personas

## Overview

Dugout Lineup is a mobile-first platform designed for recreational baseball and softball teams to simplify lineup creation, scheduling, and communication.

Eight distinct roles interact with the product. All personas operate in real-world, time-constrained environments — field, dugout, bleachers — on a phone.

| # | Persona | Role | Auth Required | Primary Need |
|---|---------|------|---------------|--------------|
| 1 | **Head Coach** | Team owner, primary user | Phase 2 (Google OAuth + magic link, cutover pending) | Create fair lineup fast, share it instantly |
| 2 | **Dugout Parent** | Volunteer in-dugout assistant | Phase 2 (Google OAuth + magic link, cutover pending) | See current lineup, help manage substitutions |
| 3 | **DJ Parent** | Controls walk-up music | None (share link) | Know the batting order and song info per player |
| 4 | **Catcher Parent** | Supports catcher warmup between innings | None (share link) | Know who is catching which inning |
| 5 | **Base Coach** | First/third base volunteer | None (share link) | Know the batting order and who is on deck |
| 6 | **Scorekeeper** | Official scorer, tracks outs and at-bats | None (share link) | Batting order + defensive positions, clearly readable |
| 7 | **Parent Viewer** | Any parent in the stands | None (share link) | Know where their child is playing this inning |
| 8 | **Administrator** | Platform owner (KK only, platform_admin) | Active | System integrity, data recovery, team provisioning |

---

## Persona 1: Head Coach (Primary User — Power User)

### Description
Head coach or assistant coach responsible for managing the team, creating lineups, and ensuring player development.

### Goals
- Generate a fair and balanced lineup in under 2 minutes
- Ensure player development across positions
- Adjust in real time when attendance changes
- Communicate the lineup to everyone in the dugout without extra steps

### Pain Points
- Maintaining fairness across players
- Remembering player position history
- Adjusting lineups in real time
- Communicating changes clearly

### Key Features Needed
- One-click lineup generation
- Manual override capability
- Player profiles (positions, development areas)
- Fairness guardrails

### Permissions
- Full access to team data
- Create/edit/delete lineups
- Manage roster and games
- Share lineup links

### Success Metric
> Generate and share a complete lineup in under 2 minutes with confidence in fairness

### Feature Availability
| Feature | MVP (Live) | Phase 3 |
|---------|-----------|---------|
| Auto-assign lineup engine (V2, 8 scoring layers) | ✅ | — |
| Manual grid overrides with lock | ✅ | — |
| V2 player profiles (fielding, batting, running, constraints) | ✅ | — |
| Batting order with stats-driven suggest | ✅ | — |
| Schedule + game result logging | ✅ | — |
| PDF export + print view | ✅ | — |
| Export / import backup | ✅ | — |
| Out Tonight attendance panel (Game Day) | ✅ | — |
| Walk-up songs per player | ✅ | — |
| Game Ball — multiple recipients | ✅ | — |
| Game Mode — full-screen dugout view | ✅ | — |
| Multi-device sync | ❌ | ✅ |
| Invite assistant coaches | ❌ | ✅ |
| Role-based access control | ❌ | ✅ |

---

## Persona 2: Dugout Parent (Volunteer — In-Dugout Assistant)

### Description
Parent volunteer stationed in the dugout who assists with managing the batting strip, tracking substitutions, and moving kids to the right position between innings.

### Goals
- Follow the current lineup without texting the coach
- Know substitutions in advance
- Help move kids to the right position between innings

### Pain Points
- Unclear who bats next when the coach is on the field
- Confusion about mid-game substitutions
- No structured view of the current inning's assignments

### Key Features Needed
- Now Batting strip with next three batters visible
- Current inning's defensive positions at a glance
- Bench list per inning

### Permissions
- Read-only access via share link (no account required in MVP)
- Future: scoped write access for batting strip advance

### Success Metric
> Open the share link, understand the current inning's defensive assignments, and know who bats next — all without asking anyone.

### Feature Availability
| Feature | MVP (Live) | Phase 3 |
|---------|-----------|---------|
| Now Batting strip (Now / On Deck / In the Hole) | ✅ | — |
| Defensive grid per inning via share link | ✅ | — |
| Bench strip in Game Mode | ✅ | — |
| Quick Swap substitution sheet | ✅ | — |
| Dugout Parent role with scoped write | ❌ | ✅ |

---

## Persona 3: DJ Parent (Volunteer — Walk-Up Music)

### Description
Parent volunteer responsible for cueing walk-up music as each batter approaches the plate. Needs the song title, artist, optional timestamp, and a quick Play button for each batter in order.

### Goals
- Know the batting order before the game starts
- Find each player's walk-up song title and any timestamp note
- Cue the right song at the right time, game to game

### Pain Points
- Maintaining a separate spreadsheet or paper list of songs
- Not knowing which players are absent and need to be skipped
- Spotify/YouTube links opening in the wrong app

### Key Features Needed
- Songs sub-tab filtered to tonight's active batting order
- Out Tonight filtering (absent players hidden automatically)
- Play button that opens the link directly in the right app

### Permissions
- Read-only via share link (no account required)

### Success Metric
> Play the right walk-up song for every batter, game to game, without a separate spreadsheet.

### Feature Availability
| Feature | MVP (Live) | Phase 3 |
|---------|-----------|---------|
| Songs sub-tab in Game Day → Batting | ✅ | — |
| Out Tonight filtering in Songs view | ✅ | — |
| Play button → Spotify / Apple Music / YouTube deep link | ✅ | — |
| Song start time (timestamp skip) | ✅ | — |
| Per-player song editing (title, artist, URL) | ✅ | — |

---

## Persona 4: Catcher Parent (Volunteer — Gear Coordinator)

### Description
Parent volunteer responsible for managing catcher gear rotation. Needs to know which inning their child is behind the plate far enough in advance to have full gear ready before the inning starts.

### Goals
- Know which inning their child is catching
- Know the full inning-by-inning catcher rotation
- Have gear ready before the inning starts, not scrambling mid-play

### Pain Points
- No advance notice of catching assignments before the game
- Coach making mid-game assignment changes without notice
- Gear taking time to put on — needs a full half-inning of warning

### Key Features Needed
- By Player view showing all inning assignments for the catcher
- Inning navigator to preview next inning while current is in progress
- Fairness Check flag when a player catches more than once

### Permissions
- Read-only via share link (no account required)

### Success Metric
> Be ready with gear before the inning starts, not scrambling when the coach calls for a position change.

### Feature Availability
| Feature | MVP (Live) | Phase 3 |
|---------|-----------|---------|
| By Player view — all-inning position assignments | ✅ | — |
| Inning navigator in Game Mode | ✅ | — |
| Fairness Check — catcher twice flag | ✅ | — |
| Avoid Position constraint (no repeat catcher) | ✅ | — |
| Quick Swap — mid-game catcher change | ✅ | — |

---

## Persona 5: Base Coach (Volunteer — First and Third Base)

### Description
Parent volunteer coaching first or third base. Needs the batting order and current defensive positions to communicate signals and make base-running decisions. No login, no app install — everything accessed from a share link the head coach sends before the game.

### Goals
- Know who is batting now and who is on deck
- Know the batting order for the full game
- Communicate effectively with batters and base runners
- Check outfielder positions and arm strength before key plays

### Pain Points
- Holding a paper lineup card in the dugout
- No quick way to know the next batter's hand or who is on deck
- Making base-running decisions without knowing outfielder arm strength

### Key Features Needed
- Now Batting strip (Now / On Deck / In the Hole) visible in share link
- L/R batter badge visible per player
- Diamond view showing current inning's field assignments

### Permissions
- Read-only via share link (no account required)

### Success Metric
> Coach third base without holding a paper lineup card.

### Feature Availability
| Feature | MVP (Live) | Phase 3 |
|---------|-----------|---------|
| Now Batting strip via share link | ✅ | — |
| L/R batter badge on batting strip | ✅ | — |
| Diamond view per inning via share link | ✅ | — |
| MyPlayer View — any player's full inning rotation | ✅ | — |
| Arm strength visible on player card (coach view) | ✅ | — |

---

## Persona 6: Scorekeeper (Operational — Accuracy Focused)

### Description
Volunteer responsible for tracking game progress and stats. Needs the batting order and defensive positions in a clean, readable format. For pilot teams (Mud Hens and Demo All-Stars), Live Scoring is enabled — the scorekeeper can claim the scorer role, enter runs inning by inning, and have the coach see real-time updates via share link.

### Goals
- Follow the batting order accurately inning by inning
- Track defensive positions per inning
- Enter runs in real time without ambiguity about who is scoring

### Pain Points
- Unclear or changing lineups mid-game
- Players batting out of order
- Lack of a structured reference when the coach makes substitutions

### Key Features Needed
- Clean batting order view (defensive grid + batting order, same screen)
- Claim Scorer Role to lock the scorer seat to one device
- Inning-by-inning run entry with audit trail

### Permissions
- Read-only (MVP) via share link
- Live Scoring write access — Mud Hens and Demo All-Stars (pilot)

### Success Metric
> Score the entire game without asking the coach to repeat the lineup.

### Feature Availability
| Feature | MVP (Live) | Phase 3 |
|---------|-----------|---------|
| Batting order visible in share link | ✅ | — |
| Defensive grid visible in share link | ✅ | — |
| Print-ready PDF with batting + defense | ✅ | — |
| Live score entry — Claim Scorer Role | ✅ MVP (Pilot Teams) | Full rollout |
| Scorer lock (prevents concurrent writes) | ✅ MVP (Pilot Teams) | Full rollout |
| Scorekeeper role with scoped write access | ❌ | ✅ |

> **Pilot note:** Live Scoring is enabled for Mud Hens and Demo All-Stars by team name. All other teams require the `LIVE_SCORING` feature flag.

---

## Persona 7: Parent Viewer (Passive — Clarity Focused)

### Description
Parent or guardian of a player who needs quick and clear access to game information. Opens a share link the coach sends before or during the game and wants to know where their child is playing.

### Goals
- Know when and where games occur
- Understand where their child is playing each inning
- Stay informed without asking the coach or texting the group chat

### Pain Points
- Confusion about schedules and positions
- Reliance on group chats for updates

### Key Features Needed
- Simple game view via share link
- Position visibility by inning
- Mobile-friendly UI, no install required

### Permissions
- Read-only access via share link (no account required)

### Success Metric
> Open a link and instantly know where their child is playing — total time under 15 seconds.

### Feature Availability
| Feature | MVP (Live) | Phase 3 |
|---------|-----------|---------|
| View-only share link (Supabase-backed, 8-char ID) | ✅ | — |
| Diamond + inning filter in share view | ✅ | — |
| Batting order in share view | ✅ | — |
| Persistent account with invite access | ❌ | ✅ |
| Push notifications for lineup changes | ❌ | ✅ |
| Schedule visibility without coach sharing a link | ❌ | ✅ |

---

## Persona 8: Administrator (Platform Owner — System Control)

### Description
Platform owner responsible for system integrity, data quality, and operational support. KK only. Accesses the system via admin.html (live at dugoutlineup.com/admin.html) or the Supabase SQL Editor for data operations.

### Goals
- Provision teams and users
- Recover from data corruption
- Override system constraints without a code deploy
- Resolve any issue in under 2 minutes

### Pain Points
- Bad or inconsistent data from coaches
- No override mechanisms without a SQL query
- Approval routing and access request visibility

### Key Features Needed
- Admin dashboard with team management, user management, and approval routing
- Direct data editing via Supabase
- Data cleanup tools and audit visibility

### Permissions
- Full system access (platform_admin role)
- Override validation rules
- Manage all users and data

### Success Metric
> Fix any data problem using admin.html or Supabase SQL Editor without requiring an app update or coach downtime.

### Feature Availability
| Feature | MVP (Live) | Phase 3 |
|---------|-----------|---------|
| Supabase direct SQL access | ✅ | — |
| Schema versioning + auto-migration | ✅ | — |
| Export / import for manual data recovery | ✅ | — |
| team_data_history trigger (last 20 snapshots) | ✅ | — |
| Admin dashboard UI (admin.html) | ✅ MVP | — |
| Approval routing — pending access requests | ✅ MVP | — |
| Audit log (who changed what, when) | ❌ | ✅ |
| Override validation rules without code change | ❌ | ✅ |

---

## Guiding Principle

> If a coach cannot use this in under 2 minutes before a game, the system is too complex.

---

## Revision History

| Version | Date | Changes |
|---------|------|---------|
| v1.0 | March 2026 | Initial 5 personas (Coach, Parent Viewer, Scorekeeper, Team Coordinator, Administrator) |
| v2.0 | April 2026 (v2.2.31) | Rewritten to 8 personas. Added Dugout Parent, DJ Parent, Catcher Parent, Base Coach. Flipped Live Scoring and Admin Dashboard to MVP. Auth Required updated to Phase 2 (Google OAuth + magic link, cutover pending). Removed Team Coordinator (deferred to Phase 3). |
