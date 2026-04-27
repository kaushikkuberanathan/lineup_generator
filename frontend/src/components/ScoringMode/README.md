# Scoring Mode

<!-- Last reviewed: April 27, 2026 (v2.5.1) — guard stub current; expansion to full architecture doc tracked in DOC_TEST_DEBT.md backlog -->
Feature-flagged behind: live_scoring
Do NOT share state or components with GameMode.
Entry point: ScoringMode/index.jsx
Scorer lock enforced via RLS on game_scoring_sessions table.
