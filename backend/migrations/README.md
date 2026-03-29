# Database Migrations

All migrations are run manually in the **Supabase dashboard → SQL Editor**.
They are append-only — no migration ever drops a table or removes data.

---

## How to Run a Migration

1. Open [Supabase dashboard](https://supabase.com/dashboard) → your project
2. Navigate to **SQL Editor** (left sidebar)
3. Paste the contents of the migration file
4. Click **Run**
5. Verify no errors in the output pane

Migrations are idempotent — `create table if not exists`, `create or replace function`, and `drop trigger if exists` guards mean re-running a migration is safe.

---

## Migration Files

### `roster_snapshots.sql`
**Purpose:** Roster safety net — stores the last 10 roster snapshots per team.
**When to run:** Already run in production (v1.3.3).
**Tables created:** `roster_snapshots`
**Triggers:** `trg_prune_roster_snapshots` (auto-prunes to 10 rows per team after insert)
**Views:** `roster_snapshots_latest` (most recent snapshot per team)

---

### `002_team_data_history.sql`
**Purpose:** Append-only audit log of every `team_data` write — full snapshot including roster, schedule, grid, and all other fields. Primary recovery mechanism for roster-wipe incidents.
**When to run:** Run before the next production data operation.
**Tables created:** `team_data_history (id, team_id, snapshot, roster_count, written_at, write_source)`
**Triggers:** `trg_snapshot_team_data` — fires `AFTER INSERT OR UPDATE` on `team_data`, inserts a snapshot row
**Functions:**
- `snapshot_team_data()` — trigger function; reads `app.write_source` session variable to tag each write
- `prune_team_data_history()` — keeps last 20 snapshots per team; run weekly or manually via `select prune_team_data_history()`

**Views:** `team_data_history_latest` — most recent snapshot metadata per team (no JSONB)

**Schema corrections from spec:**
- `team_id` is `text` (not `bigint`) — Mud Hens ID is `1774297491626`, non-UUID
- Trigger is on `team_data`, not `teams`
- `NEW.team_id` (not `NEW.id`); snapshot built from individual columns, not `NEW.data`

---

## Recovery Workflow

If a roster is wiped:

1. Call the history endpoint to find a good snapshot:
   ```
   GET /api/teams/{teamId}/history?limit=10&full=true
   ```
   (requires localhost or `X-Admin-Key` header)

2. Identify the snapshot with the expected `roster_count` and `written_at`

3. Extract `snapshot.roster` from the response

4. Restore via the safe-write endpoint:
   ```
   POST /api/teams/{teamId}/data
   X-Admin-Key: <your ADMIN_KEY>
   { "roster": [...], "force": true, "writeSource": "manual" }
   ```

---

## Rules

- **Never** drop or truncate `team_data_history` or `roster_snapshots`
- **Never** write `roster: []` to a team that has existing players without `force: true`
- Migrations go in `backend/migrations/` (ops-level) or `backend/src/db/migrations/` (auth schema)
