/**
 * faqs.js
 * Content for the Support → Help sub-tab.
 *
 * Task-oriented Help IA (replaces the persona-first FAQ model). Categories
 * and articles are organized around what a coach is trying to DO, not which
 * role is holding the phone. Every article title favors a task phrase
 * ("Replace an injured player") over a feature name ("Substitutions").
 *
 * Content accuracy rule: every article describes the workflow AS IMPLEMENTED
 * today, verified against the actual component/handler code — not the
 * workflow the product "ought to" support. Where a real capability requires
 * multiple manual steps (e.g. there is no single-tap "add player to active
 * game" action), the article says so explicitly rather than implying a
 * shortcut that doesn't exist. See GAME_DAY_HELP_IDS below for the curated
 * quick-access set surfaced above the category browser.
 *
 * Verified against code 2026-08-27 while retiring the old persona taxonomy:
 *   - QuickSwap (components/game-mode/QuickSwap.jsx) is a same-inning,
 *     two-way swap only. It does not cascade to future innings and does not
 *     remove a player from the rest of the game. "Replace an injured player"
 *     and "Player needs to leave early" are written to describe repeating
 *     Quick Swap per remaining inning — not a single "sub them out" action,
 *     because that single action does not exist.
 *   - QuickSwap filters out anyone in `absentTonight` (App.jsx toggleAbsentTonight)
 *     entirely — an Out-Tonight player cannot be swapped in until that flag
 *     is cleared from the Game Day → Lineups attendance panel, which lives
 *     outside Dugout View. "Player arrived late" is written to describe that
 *     real cross-screen path (pause → toggle Playing → return → Quick Swap
 *     them in inning by inning) rather than a one-tap "add to game."
 *   - toggleAbsentTonight (App.jsx) only flips the attendance list; it never
 *     touches the position grid. Nothing auto-places a newly-available
 *     player anywhere.
 *   - Lineup lock/unlock is PIN-gated (coachPin/lineupLocked, App.jsx) and is
 *     a real capability, but editing the grid happens in Game Day → Lineups,
 *     not inside Dugout View itself — "Fix the lineup during a game"
 *     describes the exit/edit/return path honestly.
 *   - No code path previews an upcoming inning without opening the
 *     inning-advance confirmation (InningModal). "Preview the next inning"
 *     describes canceling out of that confirmation, not a separate always-
 *     available peek control that isn't in the code.
 *
 * Known, deliberately-not-written gap: there is no single action that
 * removes a player from all remaining innings and rebalances the rest of
 * the lineup automatically. That's a real product gap, not a documentation
 * gap — do not paper over it with copy that implies it exists.
 */

export var HELP_CATEGORIES = [
  {
    id: "getting-started",
    label: "Getting Started",
    emoji: "🚀",
    items: [
      {
        id: "start-setup-team",
        q: "Set up your team",
        a: "Home screen → tap 'Create New Team.' Enter team name, sport, age group, and season. Once your team card exists, tap it to open Team → Roster and start adding players."
      },
      {
        id: "start-add-roster",
        q: "Add your roster",
        a: "Go to Team → Roster and tap 'Add Player' for each player. Fill in fielding attributes, batting attributes, and preferred positions on each player card — the more you fill in, the better Auto-Assign performs."
      },
      {
        id: "start-install-app",
        q: "Install the app so it works without signal at the field",
        a: "Look for the Install banner at the bottom of any tab. On Android: tap Install to add it to your home screen. On iPhone: follow the Share → Add to Home Screen prompt in Safari. Once installed, the app keeps working offline — no signal needed at the field."
      },
      {
        id: "start-first-lineup",
        q: "Create your first lineup",
        a: "Once you have 10+ players and at least one game on the schedule, a 'Generate Lineup' button appears on the team card. Tap it, then use Auto-Assign on the Game Day → Defense tab to fill every position across all innings."
      }
    ]
  },
  {
    id: "roster",
    label: "Players & Roster",
    emoji: "👥",
    items: [
      {
        id: "roster-add-remove-player",
        q: "Add or remove a player",
        a: "Go to Team → Roster. Tap 'Add Player' to add someone new. To remove a player, open their card and use the remove/delete option — this takes them out of future Auto-Assign runs but doesn't touch lineups you've already generated."
      },
      {
        id: "roster-mark-unavailable",
        q: "Mark a player unavailable before tonight's game",
        a: "Open Game Day. At the top of the Lineups tab you'll see Tonight's Attendance — tap any player to toggle them Out Tonight. Absent players are automatically excluded from Auto-Assign, batting order, PDF export, share links, and print view. This toggle resets automatically before the next game day. This is a pre-game toggle — see 'Player arrived late' in Game Day help for what to do once the game is already underway."
      },
      {
        id: "roster-update-info",
        q: "Update a player's information",
        a: "Go to Team → Roster, tap the player's card, and edit fielding attributes, batting attributes, running, preferred positions, or arm strength. Changes apply the next time Auto-Assign runs."
      },
      {
        id: "roster-walkup-song",
        q: "Set a player's walk-up song",
        a: "Open the player's card under Team → Roster and scroll to Walk-Up Song. Enter the song title, artist, and a link (YouTube, Spotify, Apple Music, or any URL). Optionally set a Start Time (e.g. 0:45) to skip ahead. It appears immediately in Game Day → Songs, filtered to tonight's active batting order."
      },
      {
        id: "roster-not-in-lineup",
        q: "Player isn't showing in today's lineup",
        a: "Check three things in order: (1) Team → Roster — are they still on the roster? (2) Game Day → Lineups → Tonight's Attendance — are they marked Out Tonight? (3) Have you re-run Auto-Assign since adding them or changing their attendance? Auto-Assign only reflects roster and attendance state as of when you last ran it."
      }
    ]
  },
  {
    id: "lineups",
    label: "Lineups",
    emoji: "⚾",
    items: [
      {
        id: "lineup-generate",
        q: "Generate a lineup",
        a: "Go to Game Day → Defense. Set your number of innings (4, 5, or 6), then tap Auto-Assign. The engine places 10 players per inning with 1 on the bench, rotating positions and bench time fairly across the game."
      },
      {
        id: "lineup-change-position",
        q: "Change a defensive position before the game",
        a: "On Game Day → Defense, tap the cell in the By Position grid for the inning and position you want to change, then pick a different player. This is the pre-game grid editor — for changing a position while the game is already in progress, see Game Day help → 'Swap two fielders.'"
      },
      {
        id: "lineup-lock-position",
        q: "Lock a position so Auto-Assign won't touch it",
        a: "After manually setting a cell in the By Position grid, tap the lock icon on that cell. The next Auto-Assign run will leave locked cells untouched. Lock sparingly — every locked cell reduces the engine's ability to balance bench equity across the rest of the lineup."
      },
      {
        id: "lineup-fix-fairness-warning",
        q: "Fix a fairness warning",
        a: "Fairness Check flags are advisory, not blocking: a player benched more than once, a player catching more than once, or the same position back-to-back. Review each one — if it's intentional (your strongest catcher catching twice, say), tap Ignore. If not, adjust the grid or re-run Auto-Assign."
      },
      {
        id: "lineup-change-batting-order",
        q: "Change the batting order",
        a: "Go to Game Day → Batting. Tap 'Suggest Order' for a stats-driven recommendation, or use the up/down arrows (drag on desktop) to set your own order manually."
      },
      {
        id: "lineup-finalize",
        q: "Lock the lineup before the game",
        a: "On Game Day, tap 'Finalize Lineup.' Once locked, all editing is disabled app-wide and a lock banner appears at the top. If you've set a coach PIN (Game Day → Lineups), only you can unlock it again — see Game Day help → 'Fix the lineup during a game' for how to make a change after locking."
      }
    ]
  },
  {
    id: "game-day",
    label: "Game Day",
    emoji: "🏟",
    items: [
      {
        id: "game-late-arrival",
        q: "Player arrived late",
        a: "There's no single-tap \"add to active game\" action today — a late player is still marked Out Tonight, and Quick Swap won't offer anyone on that list. The real path: (1) exit Dugout View (tap ✕ — this pauses, it doesn't end your session), (2) go to Game Day → Lineups → Tonight's Attendance and toggle them to Playing, (3) return to Dugout View, (4) tap the diamond position you want them in and use Quick Swap to bring them on. Quick Swap only changes one inning at a time, so repeat it for each remaining inning you want them in for.",
        gameDay: true
      },
      {
        id: "game-early-departure",
        q: "Player needs to leave early",
        a: "Tap their position on the diamond and use Quick Swap to bring in their replacement for the current inning. Quick Swap changes one inning at a time — repeat it for every remaining inning they're out for. If they're done for the rest of the game, also mark them Out Tonight from Game Day → Lineups so they drop out of the batting order and any future Auto-Assign runs; note this does not retroactively pull them out of innings you've already set.",
        gameDay: true
      },
      {
        id: "game-injury-substitution",
        q: "Replace an injured player",
        a: "Tap their position on the diamond — Quick Swap opens with everyone currently available. Pick their replacement. Important: this swaps that one position for the current inning only; it does not remove the injured player from the rest of the game automatically. If they're out for good, repeat Quick Swap for each remaining inning they were scheduled to play, and mark them Out Tonight so they're excluded from the batting order going forward.",
        gameDay: true
      },
      {
        id: "game-swap-fielders",
        q: "Swap two fielders",
        a: "Tap either player's position on the diamond. Quick Swap shows every available player — tap the other player's name and it's a true two-way swap: they trade positions for the current inning.",
        gameDay: true
      },
      {
        id: "game-fix-lineup-during-game",
        q: "Fix the lineup during a game",
        a: "For a single position in the current inning, use Quick Swap (tap the position on the diamond) — no unlocking needed. For a bigger change, you'll need to unlock: exit Dugout View, go to Game Day → Lineups, enter your coach PIN to unlock, make your changes on the Defense grid, then re-finalize and return to Dugout View.",
        gameDay: true
      },
      {
        id: "game-preview-next-inning",
        q: "Preview the next inning",
        a: "When you're ready to advance, the inning-change screen shows both the next inning's defense and batting order before anything changes. If you're just checking and not ready to move on, cancel out of that screen — nothing is committed until you confirm."
      },
      {
        id: "game-view-player-schedule",
        q: "See one player's position for every inning",
        a: "From Game Day, use the player-view option to select a player and see their position for every inning on one screen — field positions and bench innings both shown. Useful for spotting where a specific player should be without re-scanning the whole grid."
      }
    ]
  },
  {
    id: "sharing-scoring",
    label: "Sharing & Scoring",
    emoji: "📲",
    items: [
      {
        id: "share-lineup",
        q: "Share today's lineup",
        a: "After finalizing, tap 📤 Share Lineup on Game Day → Lineups (or from the game card on Team → Schedule). Choose to share a link, share as PDF, or download the PDF. The link works on any device, in a browser, with no account needed."
      },
      {
        id: "share-parent-view",
        q: "Open the parent / viewer view",
        a: "Send the share link from 'Share today's lineup.' Anyone who opens it gets full read-only access to the defense grid and batting order — no login, no app install required."
      },
      {
        id: "share-scorekeeper-view",
        q: "Open the scorekeeper view",
        a: "Go to Game Day → Dugout, choose which half your team bats (top or bottom), then tap Claim Scorer Role. This locks the scorer seat to your device so two people can't overwrite each other's entries."
      },
      {
        id: "scoring-start",
        q: "Start scoring",
        a: "Live scoring is on for teams it's enabled for. From Game Day → Dugout, pick your batting half and claim the scorer role. Use the pitch buttons (Ball, Strike, Strike-swinging, Foul, Contact) — outs and runs update automatically as plays resolve. Want to try it risk-free first? Tap Practice Mode (🏋) on the same entry screen — nothing you do there saves to the real game."
      },
      {
        id: "scoring-correct-mistake",
        q: "Correct a scoring mistake",
        a: "Open the inning editor and tap the run count you need to fix — changes are logged with a timestamp. For a full rollback, use Restore Score to return to the last saved snapshot."
      },
      {
        id: "scoring-track-opponent",
        q: "Track the opposing team's at-bat",
        a: "The scoring screen switches automatically when the inning half flips — you'll see an Opponent Batter card with a pitch counter. Tap Ball, Strike, or Foul as normal; the opponent's batter number cycles automatically, so you don't need their roster."
      }
    ]
  },
  {
    id: "account-troubleshooting",
    label: "Account & Troubleshooting",
    emoji: "🔧",
    items: [
      {
        id: "account-sign-in",
        q: "Sign in",
        a: "Signing in is only needed to edit a team — viewing a shared lineup never requires an account. Sign in with Google or an email magic link from the Support → Account tab or the Home screen."
      },
      {
        id: "account-switch-teams",
        q: "Switch between your teams",
        a: "Go to Support → Account. Every team you're on is listed there — tap any team to jump straight to it."
      },
      {
        id: "account-new-phone",
        q: "Move to a new phone",
        a: "On your old phone, tap ··· on the team card and choose 'Download Backup' to save a file. On the new phone, open the app, go to Team → Roster, and use 'Restore from backup file' to bring everything back."
      },
      {
        id: "trouble-app-not-loading",
        q: "App isn't loading",
        a: "If it was working before and installed to your home screen, it should still open offline with whatever was last loaded. If it's stuck on a blank or error screen, close and reopen it; if that doesn't help, reinstalling (Add to Home Screen again) will pull the latest version next time you're online."
      },
      {
        id: "trouble-data-not-syncing",
        q: "Data isn't syncing",
        a: "Your changes are always saved to this device first, so nothing is lost. Cloud sync happens in the background when you have a connection and are signed in — if the sync indicator shows an error, your local data is still safe; it'll retry the next time the app is online."
      },
      {
        id: "trouble-offline-usage",
        q: "Use the app without connectivity",
        a: "Once installed to your home screen and opened at least once, the app and everything in this Help section work fully offline — rosters, lineups, Game Day, and Help content are all stored on your device. Only cloud sync and sharing a link to someone else's device need a connection."
      }
    ]
  }
];

/**
 * Curated quick-access set shown above the category browser for coaches
 * mid-game under time pressure. Deliberately not called "Popular" — we have
 * no usage analytics yet, so labeling anything "popular" would be inventing
 * evidence we don't have. Revisit this list once help_article_open data
 * exists.
 */
export var GAME_DAY_HELP_IDS = [
  "game-late-arrival",
  "game-early-departure",
  "game-injury-substitution",
  "game-swap-fielders",
  "game-fix-lineup-during-game"
];
