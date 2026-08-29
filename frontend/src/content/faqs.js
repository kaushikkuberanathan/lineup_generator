/**
 * faqs.js
 * Content for the Support → Help sub-tab.
 *
 * Flat article records (not nested-by-category) so each article is a
 * self-contained unit: stable id for analytics/deep-linking, a `category`
 * reference for the Browse Help picker, `gameDayCritical` for the
 * quick-access list (no separate id list to keep in sync), and `keywords`
 * so search can match on more than exact title/answer wording. Still
 * static, still bundled, still offline — this is a shape change only.
 *
 * Content accuracy rule: every article describes the workflow AS
 * IMPLEMENTED today, verified against the actual component/handler code —
 * not the workflow the product "ought to" support. Where a real capability
 * requires multiple manual steps (e.g. there is no single-tap "add player
 * to active game" action), the article says so explicitly.
 *
 * Verified against code 2026-08-27 while retiring the old persona taxonomy:
 *   - QuickSwap (components/game-mode/QuickSwap.jsx) is a same-inning,
 *     two-way swap only. It does not cascade to future innings and does not
 *     remove a player from the rest of the game. "Replace an injured player"
 *     and "Player needs to leave early" describe repeating Quick Swap per
 *     remaining inning — not a single "sub them out" action, because that
 *     single action does not exist.
 *   - QuickSwap filters out anyone in `absentTonight` (App.jsx
 *     toggleAbsentTonight) entirely — an Out-Tonight player cannot be
 *     swapped in until that flag is cleared from the Game Day → Lineups
 *     attendance panel, which lives outside Dugout View. "Player arrived
 *     late" describes that real cross-screen path.
 *   - toggleAbsentTonight (App.jsx) only flips the attendance list; it
 *     never touches the position grid. Nothing auto-places a newly-available
 *     player anywhere.
 *   - Lineup lock/unlock is PIN-gated (coachPin/lineupLocked, App.jsx) and is
 *     a real capability, but editing the grid happens in Game Day →
 *     Lineups, not inside Dugout View itself.
 *   - No code path previews an upcoming inning without opening the
 *     inning-advance confirmation (InningModal). "Preview the next inning"
 *     describes canceling out of that confirmation.
 *
 * Known, deliberately-not-written gap: there is no single action that
 * removes a player from all remaining innings and rebalances the rest of
 * the lineup automatically. That's a real product gap, not a documentation
 * gap — do not paper over it with copy that implies it exists.
 */

export var HELP_CATEGORY_META = [
  { id: "getting-started", label: "Getting Started", emoji: "🚀" },
  { id: "roster", label: "Players & Roster", emoji: "👥" },
  { id: "lineups", label: "Lineups", emoji: "⚾" },
  { id: "game-day", label: "Game Day", emoji: "🏟" },
  { id: "sharing-scoring", label: "Sharing & Scoring", emoji: "📲" },
  { id: "account-troubleshooting", label: "Account & Troubleshooting", emoji: "🔧" }
];

export var HELP_ARTICLES = [
  // ── Getting Started ──────────────────────────────────────────────────
  {
    id: "start-setup-team",
    category: "getting-started",
    title: "Set up your team",
    answer: "Home screen → tap 'Create New Team.' Enter team name, sport, age group, and season. Once your team card exists, tap it to open Team → Roster and start adding players.",
    keywords: ["create team", "new team", "onboarding"]
  },
  {
    id: "start-add-roster",
    category: "getting-started",
    title: "Add your roster",
    answer: "Go to Team → Roster and tap 'Add Player' for each player. Fill in fielding attributes, batting attributes, and preferred positions on each player card — the more you fill in, the better Auto-Assign performs.",
    keywords: ["players", "add players", "onboarding"]
  },
  {
    id: "start-install-app",
    category: "getting-started",
    title: "Install the app so it works without signal at the field",
    answer: "Look for the Install banner at the bottom of any tab. On Android: tap Install to add it to your home screen. On iPhone: follow the Share → Add to Home Screen prompt in Safari. Once installed, the app keeps working offline — no signal needed at the field.",
    keywords: ["pwa", "home screen", "offline", "add to home screen"]
  },
  {
    id: "start-first-lineup",
    category: "getting-started",
    title: "Create your first lineup",
    answer: "Once you have 10+ players and at least one game on the schedule, a 'Generate Lineup' button appears on the team card. Tap it, then use Auto-Assign on the Game Day → Defense tab to fill every position across all innings.",
    keywords: ["generate lineup", "auto-assign", "first game"]
  },

  // ── Players & Roster ─────────────────────────────────────────────────
  {
    id: "roster-add-remove-player",
    category: "roster",
    title: "Add or remove a player",
    answer: "Go to Team → Roster. Tap 'Add Player' to add someone new. To remove a player, open their card and use the remove/delete option — this takes them out of future Auto-Assign runs but doesn't touch lineups you've already generated.",
    keywords: ["delete player", "new player", "cut player"]
  },
  {
    id: "roster-mark-unavailable",
    category: "roster",
    title: "Mark a player unavailable before tonight's game",
    answer: "Open Game Day. At the top of the Lineups tab you'll see Tonight's Attendance — tap any player to toggle them Out Tonight. Absent players are automatically excluded from Auto-Assign, batting order, PDF export, share links, and print view. This toggle resets automatically before the next game day. This is a pre-game toggle — see 'Player arrived late' in Game Day help for what to do once the game is already underway.",
    keywords: ["out tonight", "absent", "attendance", "sick", "can't make it"]
  },
  {
    id: "roster-update-info",
    category: "roster",
    title: "Update a player's information",
    answer: "Go to Team → Roster, tap the player's card, and edit fielding attributes, batting attributes, running, preferred positions, or arm strength. Changes apply the next time Auto-Assign runs.",
    keywords: ["fielding rating", "batting hand", "edit player", "attributes"]
  },
  {
    id: "roster-walkup-song",
    category: "roster",
    title: "Set a player's walk-up song",
    answer: "Open the player's card under Team → Roster and scroll to Walk-Up Song. Enter the song title, artist, and a link (YouTube, Spotify, Apple Music, or any URL). Optionally set a Start Time (e.g. 0:45) to skip ahead. It appears immediately in Game Day → Songs, filtered to tonight's active batting order.",
    keywords: ["music", "spotify", "youtube", "at-bat song", "dj"]
  },
  {
    id: "roster-not-in-lineup",
    category: "roster",
    title: "Player isn't showing in today's lineup",
    answer: "Check three things in order: (1) Team → Roster — are they still on the roster? (2) Game Day → Lineups → Tonight's Attendance — are they marked Out Tonight? (3) Have you re-run Auto-Assign since adding them or changing their attendance? Auto-Assign only reflects roster and attendance state as of when you last ran it.",
    keywords: ["missing player", "player not showing", "troubleshooting"]
  },

  // ── Lineups ───────────────────────────────────────────────────────────
  {
    id: "lineup-generate",
    category: "lineups",
    title: "Generate a lineup",
    answer: "Go to Game Day → Defense. Set your number of innings (4, 5, or 6), then tap Auto-Assign. The engine places 10 players per inning with 1 on the bench, rotating positions and bench time fairly across the game.",
    keywords: ["auto-assign", "auto assign", "create lineup"]
  },
  {
    id: "lineup-change-position",
    category: "lineups",
    title: "Change a defensive position before the game",
    answer: "On Game Day → Defense, tap the cell in the By Position grid for the inning and position you want to change, then pick a different player. This is the pre-game grid editor — for changing a position while the game is already in progress, see Game Day help → 'Swap two fielders.'",
    keywords: ["edit position", "defense grid", "move player"]
  },
  {
    id: "lineup-lock-position",
    category: "lineups",
    title: "Lock a position so Auto-Assign won't touch it",
    answer: "After manually setting a cell in the By Position grid, tap the lock icon on that cell. The next Auto-Assign run will leave locked cells untouched. Lock sparingly — every locked cell reduces the engine's ability to balance bench equity across the rest of the lineup.",
    keywords: ["pin cell", "keep position", "protect assignment"]
  },
  {
    id: "lineup-fix-fairness-warning",
    category: "lineups",
    title: "Fix a fairness warning",
    answer: "Fairness Check flags are advisory, not blocking: a player benched more than once, a player catching more than once, or the same position back-to-back. Review each one — if it's intentional (your strongest catcher catching twice, say), tap Ignore. If not, adjust the grid or re-run Auto-Assign.",
    keywords: ["fairness check", "ignore warning", "benched twice"]
  },
  {
    id: "lineup-change-batting-order",
    category: "lineups",
    title: "Change the batting order",
    answer: "Go to Game Day → Batting. Tap 'Suggest Order' for a stats-driven recommendation, or use the up/down arrows (drag on desktop) to set your own order manually.",
    keywords: ["suggest order", "reorder batters", "lineup card"]
  },
  {
    id: "lineup-finalize",
    category: "lineups",
    title: "Lock the lineup before the game",
    answer: "On Game Day, tap 'Finalize Lineup.' Once locked, all editing is disabled app-wide and a lock banner appears at the top. If you've set a coach PIN (Game Day → Lineups), only you can unlock it again — see Game Day help → 'Fix the lineup during a game' for how to make a change after locking.",
    keywords: ["finalize", "coach pin", "lock lineup"]
  },

  // ── Game Day ──────────────────────────────────────────────────────────
  {
    id: "game-late-arrival",
    category: "game-day",
    title: "Player arrived late",
    answer: "There's no single-tap \"add to active game\" action today — a late player is still marked Out Tonight, and Quick Swap won't offer anyone on that list. The real path: (1) exit Dugout View (tap ✕ — this pauses, it doesn't end your session), (2) go to Game Day → Lineups → Tonight's Attendance and toggle them to Playing, (3) return to Dugout View, (4) tap the diamond position you want them in and use Quick Swap to bring them on. Quick Swap only changes one inning at a time, so repeat it for each remaining inning you want them in for.",
    gameDayCritical: true,
    keywords: ["add player mid-game", "tardy", "showed up late", "out tonight toggle"]
  },
  {
    id: "game-early-departure",
    category: "game-day",
    title: "Player needs to leave early",
    answer: "Tap their position on the diamond and use Quick Swap to bring in their replacement for the current inning. Quick Swap changes one inning at a time — repeat it for every remaining inning they're out for. If they're done for the rest of the game, also mark them Out Tonight from Game Day → Lineups so they drop out of the batting order and any future Auto-Assign runs; note this does not retroactively pull them out of innings you've already set.",
    gameDayCritical: true,
    keywords: ["leaving early", "pulled from game", "sub out"]
  },
  {
    id: "game-injury-substitution",
    category: "game-day",
    title: "Replace an injured player",
    answer: "Tap their position on the diamond — Quick Swap opens with everyone currently available. Pick their replacement. Important: this swaps that one position for the current inning only; it does not remove the injured player from the rest of the game automatically. If they're out for good, repeat Quick Swap for each remaining inning they were scheduled to play, and mark them Out Tonight so they're excluded from the batting order going forward.",
    gameDayCritical: true,
    keywords: ["hurt", "injury", "sub for injured player"]
  },
  {
    id: "game-swap-fielders",
    category: "game-day",
    title: "Swap two fielders",
    answer: "Tap either player's position on the diamond. Quick Swap shows every available player — tap the other player's name and it's a true two-way swap: they trade positions for the current inning.",
    gameDayCritical: true,
    keywords: ["quick swap", "trade positions", "move fielders"]
  },
  {
    id: "game-fix-lineup-during-game",
    category: "game-day",
    title: "Fix the lineup during a game",
    answer: "For a single position in the current inning, use Quick Swap (tap the position on the diamond) — no unlocking needed. For a bigger change, you'll need to unlock: exit Dugout View, go to Game Day → Lineups, enter your coach PIN to unlock, make your changes on the Defense grid, then re-finalize and return to Dugout View.",
    gameDayCritical: true,
    keywords: ["unlock lineup", "coach pin", "edit mid-game"]
  },
  {
    id: "game-preview-next-inning",
    category: "game-day",
    title: "Preview the next inning",
    answer: "When you're ready to advance, the inning-change screen shows both the next inning's defense and batting order before anything changes. If you're just checking and not ready to move on, cancel out of that screen — nothing is committed until you confirm.",
    keywords: ["look ahead", "inning modal", "next half inning"]
  },
  {
    id: "game-view-player-schedule",
    category: "game-day",
    title: "See one player's position for every inning",
    answer: "From Game Day, use the player-view option to select a player and see their position for every inning on one screen — field positions and bench innings both shown. Useful for spotting where a specific player should be without re-scanning the whole grid.",
    keywords: ["my player view", "player positions all innings"]
  },

  // ── Sharing & Scoring ─────────────────────────────────────────────────
  {
    id: "share-lineup",
    category: "sharing-scoring",
    title: "Share today's lineup",
    answer: "After finalizing, tap 📤 Share Lineup on Game Day → Lineups (or from the game card on Team → Schedule). Choose to share a link, share as PDF, or download the PDF. The link works on any device, in a browser, with no account needed.",
    keywords: ["share link", "pdf", "print", "send to parents"]
  },
  {
    id: "share-parent-view",
    category: "sharing-scoring",
    title: "Open the parent / viewer view",
    answer: "Send the share link from 'Share today's lineup.' Anyone who opens it gets full read-only access to the defense grid and batting order — no login, no app install required.",
    keywords: ["read-only link", "no login", "viewer"]
  },
  {
    id: "share-scorekeeper-view",
    category: "sharing-scoring",
    title: "Open the scorekeeper view",
    answer: "Go to Game Day → Dugout, choose which half your team bats (top or bottom), then tap Claim Scorer Role. This locks the scorer seat to your device so two people can't overwrite each other's entries.",
    keywords: ["claim scorer", "dugout view", "scoring role"]
  },
  {
    id: "scoring-start",
    category: "sharing-scoring",
    title: "Start scoring",
    answer: "Live scoring is on for teams it's enabled for. From Game Day → Dugout, pick your batting half and claim the scorer role. Use the pitch buttons (Ball, Strike, Strike-swinging, Foul, Contact) — outs and runs update automatically as plays resolve. Want to try it risk-free first? Tap Practice Mode (🏋) on the same entry screen — nothing you do there saves to the real game.",
    keywords: ["live scoring", "claim scorer role", "practice mode"]
  },
  {
    id: "scoring-correct-mistake",
    category: "sharing-scoring",
    title: "Correct a scoring mistake",
    answer: "Open the inning editor and tap the run count you need to fix — changes are logged with a timestamp. For a full rollback, use Restore Score to return to the last saved snapshot.",
    keywords: ["restore score", "undo run", "fix scoring error"]
  },
  {
    id: "scoring-track-opponent",
    category: "sharing-scoring",
    title: "Track the opposing team's at-bat",
    answer: "The scoring screen switches automatically when the inning half flips — you'll see an Opponent Batter card with a pitch counter. Tap Ball, Strike, or Foul as normal; the opponent's batter number cycles automatically, so you don't need their roster.",
    keywords: ["opponent batter", "visitor at-bat", "5 and out"]
  },

  // ── Account & Troubleshooting ─────────────────────────────────────────
  {
    id: "account-sign-in",
    category: "account-troubleshooting",
    title: "Sign in",
    answer: "Signing in is only needed to edit a team — viewing a shared lineup never requires an account. Sign in with Google or an email magic link from the Support → Account tab or the Home screen.",
    keywords: ["google sign-in", "magic link", "log in"]
  },
  {
    id: "account-switch-teams",
    category: "account-troubleshooting",
    title: "Switch between your teams",
    answer: "Go to Support → Account. Every team you're on is listed there — tap any team to jump straight to it.",
    keywords: ["multiple teams", "change team"]
  },
  {
    id: "account-new-phone",
    category: "account-troubleshooting",
    title: "Move to a new phone",
    answer: "On your old phone, tap ··· on the team card and choose 'Download Backup' to save a file. On the new phone, open the app, go to Team → Roster, and use 'Restore from backup file' to bring everything back.",
    keywords: ["backup", "restore", "transfer data"]
  },
  {
    id: "trouble-app-not-loading",
    category: "account-troubleshooting",
    title: "App isn't loading",
    answer: "If it was working before and installed to your home screen, it should still open offline with whatever was last loaded. If it's stuck on a blank or error screen, close and reopen it; if that doesn't help, reinstalling (Add to Home Screen again) will pull the latest version next time you're online.",
    keywords: ["blank screen", "crash", "won't open"]
  },
  {
    id: "trouble-data-not-syncing",
    category: "account-troubleshooting",
    title: "Data isn't syncing",
    answer: "Your changes are always saved to this device first, so nothing is lost. Cloud sync happens in the background when you have a connection and are signed in — if the sync indicator shows an error, your local data is still safe; it'll retry the next time the app is online.",
    keywords: ["sync error", "cloud sync", "not saving"]
  },
  {
    id: "trouble-offline-usage",
    category: "account-troubleshooting",
    title: "Use the app without connectivity",
    answer: "Once installed to your home screen and opened at least once, the app and everything in this Help section work fully offline — rosters, lineups, Game Day, and Help content are all stored on your device. Only cloud sync and sharing a link to someone else's device need a connection.",
    keywords: ["no signal", "airplane mode", "works offline"]
  }
];
