# Lineup Generator — User Personas

## Overview

Lineup Generator is a mobile-first platform designed for recreational baseball and softball teams to simplify lineup creation, scheduling, and communication.

This document defines the core user personas that shape product decisions, UX design, and system architecture.

---

## Persona 1: Coach (Primary User — Power User)

### Description
Head coach or assistant coach responsible for managing the team, creating lineups, and ensuring player development.

### Goals
- Create fair and balanced lineups
- Ensure player development across positions
- Quickly generate and adjust lineups
- Communicate clearly with parents and scorekeepers

### Responsibilities
- Manage team roster
- Track player development needs
- Generate:
  - Batting order
  - Defensive positions per inning
  - Bench rotation
- Share lineup with team

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
| Auto-assign lineup engine | ✅ | — |
| Manual grid overrides | ✅ | — |
| V2 player profiles with fielding, batting, running, and constraint attributes | ✅ | — |
| Batting order with stats-driven suggest | ✅ | — |
| Schedule + game result logging | ✅ | — |
| PDF export + print view | ✅ | — |
| Export / import backup | ✅ | — |
| Multi-device sync | ❌ | ✅ |
| Invite assistant coaches | ❌ | ✅ |
| Role-based access control | ❌ | ✅ |

---

## Persona 2: Parent (Viewer — Clarity Focused)

### Description
Parent or guardian of a player who needs quick and clear access to game information.

### Goals
- Know when and where games occur
- Understand where their child is playing
- Stay informed without asking the coach

### Responsibilities
- Ensure player attendance
- Stay updated on game details

### Pain Points
- Confusion about schedules and positions
- Reliance on group chats for updates

### Key Features Needed
- Simple game view
- Position visibility by inning
- Shareable link access
- Mobile-friendly UI

### Permissions
- Read-only access to:
  - Schedule
  - Lineups

### Success Metric
> Open a link and instantly know where their child is playing

### Feature Availability
| Feature | MVP (Live) | Phase 3 |
|---------|-----------|---------|
| View-only share link (URL snapshot) | ✅ | — |
| Diamond + inning filter in share view | ✅ | — |
| Persistent account with invite access | ❌ | ✅ |
| Push notifications for lineup changes | ❌ | ✅ |
| Schedule visibility without coach sharing a link | ❌ | ✅ |

---

## Persona 3: Scorekeeper (Operational User — Accuracy Focused)

### Description
Volunteer responsible for tracking game progress and stats.

### Goals
- Follow batting order accurately
- Track runs, outs, and performance
- Avoid confusion during gameplay

### Responsibilities
- Record game stats
- Ensure batting order consistency

### Pain Points
- Unclear or changing lineups
- Players batting out of order
- Lack of structured reference

### Key Features Needed
- Clean batting order view
- Defensive positions per inning
- Quick reference interface

### Permissions
- Read-only (MVP)
- Future: ability to update scores

### Success Metric
> Track the game without asking for lineup clarification

### Feature Availability
| Feature | MVP (Live) | Phase 3 |
|---------|-----------|---------|
| Batting order visible in share link | ✅ | — |
| Defensive grid visible in share link | ✅ | — |
| Print-ready PDF with batting + defense | ✅ | — |
| Live score entry by scorekeeper | ❌ | ✅ |
| Scorekeeper role with scoped write access | ❌ | ✅ |

---

## Persona 4: Team Coordinator (Organizer — Logistics Owner)

### Description
Parent volunteer responsible for managing team logistics.

### Goals
- Organize schedules and events
- Coordinate parent responsibilities
- Reduce communication overhead

### Responsibilities
- Manage:
  - Game schedules
  - Practice schedules
  - Snack duty assignments

### Pain Points
- Fragmented communication
- Last-minute coordination issues

### Key Features Needed
- Schedule management tools
- Assignment tracking (snacks, volunteers)
- Shared visibility

### Permissions
- Create/edit schedules
- Manage events
- View lineups

### Success Metric
> Manage team logistics without relying on group chats

### Feature Availability
| Feature | MVP (Live) | Phase 3 |
|---------|-----------|---------|
| Schedule visible via share link | ✅ | — |
| Practice tab (session + drill log) | ❌ (backlog P2) | — |
| Coordinator role with schedule write access | ❌ | ✅ |
| Snack / volunteer assignment tracking | ✅ | — |
| In-app team communication | ❌ | ✅ |

---

## Persona 5: Administrator (Platform Owner — System Control)

### Description
Platform owner responsible for system integrity, data quality, and operational support.

### Goals
- Maintain system reliability
- Fix data issues quickly
- Support users and resolve problems

### Responsibilities
- Manage:
  - Teams
  - Users
  - Games
  - Lineups
- Override system constraints
- Clean up invalid or stale data

### Pain Points
- Bad or inconsistent data
- Lack of visibility into system state
- No override mechanisms

### Key Features Needed
- Admin dashboard
- Direct data editing
- Data cleanup tools
- Audit visibility

### Permissions
- Full system access
- Override validation rules
- Manage all users and data

### Success Metric
> Resolve any system issue in under 2 minutes without code changes

### Feature Availability
| Feature | MVP (Live) | Phase 3 |
|---------|-----------|---------|
| Supabase direct SQL access (admin workaround) | ✅ | — |
| Schema versioning + auto-migration | ✅ | — |
| Export / import for manual data recovery | ✅ | — |
| Admin dashboard UI | ❌ | ✅ |
| Audit log (who changed what, when) | ❌ | ✅ |
| Override validation rules without code change | ❌ | ✅ |

---

## Role Summary

| Role | Access Level | Primary Function | Auth Required |
|------|-------------|-----------------|---------------|
| Coach | Full (Team Scoped) | Lineup creation & team management | Phase 3 |
| Parent | Read-only | View schedule & player positions | Phase 3 |
| Scorekeeper | Read-only (MVP) | Track game progress | Phase 3 |
| Team Coordinator | Limited Write | Manage schedules & logistics | Phase 3 |
| Admin | Full System | Platform control & data integrity | Phase 3 |

> **MVP note:** In the current MVP, all access is single-coach, single-device. The share link provides read-only access for Parents and Scorekeepers without auth. Full role enforcement ships with Phase 3 Supabase auth.

---

## Key Product Insights

### 1. Coach is the Primary User
All workflows should prioritize coach efficiency and simplicity.

### 2. Read vs Write Separation is Critical
Most users consume data; only a few create or modify it.

### 3. Single Source of Truth
Lineups and schedules must be consistent and shareable.

### 4. Mobile-First Design
All personas operate in real-world, time-constrained environments.

---

## Guiding Principle

> If a coach cannot use this in under 2 minutes before a game, the system is too complex.
