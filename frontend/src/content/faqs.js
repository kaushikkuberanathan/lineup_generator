/**
 * faqs.js
 * FAQ content for the Support → FAQ sub-tab.
 * Written from the perspective of real roles at a youth baseball game:
 * head coach, dugout parent, DJ parent, catcher parent, base coaches, and general setup.
 */

export var FAQ_CATEGORIES = [
  {
    id: "head-coach",
    label: "Head Coach",
    emoji: "⚾",
    items: [
      {
        q: "I need to set up my team before our first game. Where do I start?",
        a: "Home screen → tap 'Create New Team.' Enter team name, sport, and age group. Then go to Team → Roster and add each player. Once you have 10+ players and at least one game on the schedule, a 'Generate Lineup' button appears on the team card. Tap it, then use Auto-Assign on the Game Day → Defense tab to fill all positions across every inning."
      },
      {
        q: "One of my players didn't show up. How do I pull them out without redoing everything?",
        a: "Go to Team → Roster, tap the player's card, and toggle 'Out This Game.' They're immediately removed from Auto-Assign. Re-run Auto-Assign and the engine fills their spots with available players. The toggle resets automatically — you'll need to set it again next game if they're absent again."
      },
      {
        q: "Auto-Assign put my weakest fielder at shortstop. Can I fix just that one spot?",
        a: "Yes. On Game Day → Defense, tap the cell in the By Position grid and change the player. You can then tap the lock icon on that cell so the next Auto-Assign run won't touch it. Use locking sparingly — the more cells you lock, the less flexibility the engine has to balance bench equity across the rest of the lineup."
      },
      {
        q: "How do I make sure my pitcher only pitches inning 1 and doesn't get re-assigned there?",
        a: "Assign your pitcher to P for inning 1 and lock that cell. For later innings, the engine automatically avoids repeating the same position back-to-back. You can also open the player card under Team → Roster, go to Lineup Constraints, and set 'Avoid Positions: P' to keep them off the mound for the entire lineup."
      },
      {
        q: "The Fairness Check flagged my lineup. Do I have to fix it?",
        a: "No — flags are advisory. The check highlights three things: a player benched more than once, a player catching more than once, and back-to-back same position. Review each warning and tap Ignore if the situation is intentional. Some flags (like your strongest catcher catching twice) are deliberate choices the engine just wants you to confirm."
      },
      {
        q: "How do I lock the lineup so parents stop asking me to make changes at the field?",
        a: "On Game Day, tap 'Finalize Lineup.' Once locked, all editing is disabled across the app. If you've set a coach PIN (under Game Day → Lineups), only you can unlock it. A lock banner appears at the top so everyone can see the lineup is official."
      },
      {
        q: "Can my assistant coach follow along on their own phone?",
        a: "Yes. Tap the Share button in Game Day or from Team → Schedule on the game card. They get a read-only link they can open on any device without an account — full defense grid and batting order, no editing. If you want them to be able to edit, they'd need to use your device or a shared account."
      },
      {
        q: "We added a player mid-season. Will it break my existing lineups?",
        a: "No. Add the player in Team → Roster and they'll appear as an option from the next Auto-Assign onward. Previous saved lineups are untouched. Set their Preferred Positions and skill tags right away so the engine knows how to place them."
      },
      {
        q: "How do I mark players out for tonight's game before generating the lineup?",
        a: "Open Game Day. At the top of the Lineups tab you'll see Tonight's Attendance. Tap any player to toggle them Out Tonight. Absent players are automatically excluded from auto-assign, batting order, PDF export, share links, print view, and the Songs tab. Attendance syncs across your devices and auto-clears the next game day."
      },
      {
        q: "How do I award the Game Ball — can I pick more than one player?",
        a: "Yes. Go to Team → Schedule, tap the game card, tap Edit. Scroll to Game Ball and use the search to find players. Tap as many as you want — Game Ball now supports multiple recipients. The awards show as a read-only 🏆 label on the schedule card after saving."
      },
      {
        q: "Why can't I take screenshots on Android?",
        a: "This is a known Android limitation for installed PWA apps — Android treats standalone PWAs like native apps and applies its secure window policy, which blocks screenshots on some devices and OS versions. This is not something we can override in the app. On iOS, screenshots work normally. On Android, use the Share Link feature instead — tap Share Lineup from the Game Day tab to send a live link that anyone can view and screenshot from their browser."
      },
      {
        q: "The share link works but I can't screenshot the lineup on Android — what should I do?",
        a: "Open the share link in Chrome browser (not the installed app) and screenshot from there. The link works on any device without login and always shows the current lineup."
      }
    ]
  },
  {
    id: "dugout-parent",
    label: "Dugout Parent",
    emoji: "📋",
    items: [
      {
        q: "I'm managing the batting order from the dugout. Where do I track who's up?",
        a: "The Now Batting strip is your tool — it's the sticky bar at the bottom of the Game Day tab. It shows three pills side by side: Now Batting, On Deck, and In the Hole. Tap › to advance to the next batter after each at-bat. The batting order loops automatically at the end."
      },
      {
        q: "What does 'In the Hole' mean and why does it show three batters?",
        a: "In the Hole is the third batter coming up — the player who should be putting on their helmet and getting mentally ready while the On Deck batter warms up. Seeing all three at once means you can prep kids in advance instead of scrambling when the at-bat ends."
      },
      {
        q: "Can I hand my phone to a parent volunteer to run the batting strip without them messing up the lineup?",
        a: "Yes — finalize the lineup first. Once finalized, all editing is locked. The volunteer can safely tap ‹ › on the Now Batting strip to advance batters without any risk of accidentally changing positions or swapping players."
      },
      {
        q: "A kid isn't in the dugout when it's their turn. How do I see who's available on the bench?",
        a: "In Game Mode (tap the ▶ Game View Mode button), the bench strip shows every player sitting that inning. If you need to make a substitution, tap any position on the diamond to open the Quick Swap sheet and choose a replacement from the available list."
      },
      {
        q: "The batting order wrapped around — how do I know we're back at the top?",
        a: "The Now Batting strip loops automatically and the inning label above the strip updates each inning. If you lose track, tap ‹ to go back. The strip always reflects the batting order exactly as it was set — it never changes mid-game unless you or the coach unlocks and re-orders it."
      },
      {
        q: "What are the L and R badges I see next to player names?",
        a: "L = left-handed batter, R = right-handed batter — set by the coach on each player card. Useful for quickly reminding a kid which side of the plate they're on, especially for younger players who sometimes forget in the heat of the moment."
      }
    ]
  },
  {
    id: "dj-parent",
    label: "DJ Parent",
    emoji: "🎵",
    items: [
      {
        q: "I'm running walk-up songs. Where do I find each kid's song during the game?",
        a: "Game Day → Batting → Songs sub-tab. Players are listed in tonight's batting order only — players marked Out Tonight are automatically filtered out, so what you see is exactly who will walk up. Tap Play on the current batter to open their song — if they have a Spotify link and the Spotify app is installed, it opens straight in Spotify; same for Apple Music and YouTube. If no app is installed, it falls back to the mobile browser."
      },
      {
        q: "How do I add or update a player's walk-up song?",
        a: "Go to Team → Roster, tap the player's card, and scroll to the Walk-Up Song section. Enter the song title, artist name, and a link (YouTube, Spotify, Apple Music, or any URL). Save the card and the song shows up immediately in the Songs tab."
      },
      {
        q: "Can the song start at the chorus instead of the beginning?",
        a: "Yes. In the Walk-Up Song form on the player card, set the Start Time field (format: 0:45 to skip to 45 seconds in). YouTube links support time parameters natively — the app opens the link and the browser picks up the timestamp automatically."
      },
      {
        q: "A kid wants to switch their song for today's game. How fast can I change it?",
        a: "Go to Team → Roster, tap the player card, update the Walk-Up Song field, and save. The Songs tab reflects the change immediately. Do it before the coach finalizes the lineup — once locked, the roster goes read-only and song editing is blocked."
      },
      {
        q: "The song link isn't opening. What should I check?",
        a: "Make sure the URL starts with https:// and is a direct link, not a share sheet preview. Spotify links require the Spotify app installed on the device. YouTube links work best in a mobile browser. If the link opens but the song starts at the wrong point, double-check the start time field in the player card."
      },
      {
        q: "The song is a Spotify link but it's opening in my browser instead of the Spotify app. What's going on?",
        a: "The link behavior depends on whether the Spotify app is installed on the device and signed in. On iPhone, the Spotify app intercepts the link automatically when installed. On Android, you may need to set Spotify as the default handler for Spotify links (Settings → Apps → Spotify → Open by default). YouTube and Apple Music behave the same way. If nothing is installed, everything falls back to the browser and plays in a web player."
      }
    ]
  },
  {
    id: "catcher-parent",
    label: "Catcher Parent",
    emoji: "🧤",
    items: [
      {
        q: "I'm managing catcher gear swaps. How do I see exactly which innings my kid is catching?",
        a: "Game Day → Defense → tap 'By Player' and select the catcher. You'll see their position for every inning listed in one view. Look for innings labeled C — those are your gear-up innings. Check this before the first pitch so you know the full rotation."
      },
      {
        q: "How much notice will I have before my kid goes behind the plate?",
        a: "The full lineup is set before the game, so you can see the entire catching schedule at once in By Player view. During the game, use Game Mode's inning navigator to preview the next inning while the current one is still going — you'll have the full half-inning to get gear on before they need to take the field."
      },
      {
        q: "My kid just finished catching. Will the engine put them back there next inning?",
        a: "The engine avoids back-to-back catcher assignments by default. It will not repeat C for the same player the very next inning unless you manually force it. If you want to guarantee they never catch again after inning 1, open their player card, go to Lineup Constraints, and add C to Avoid Positions."
      },
      {
        q: "The Fairness Check says my kid is catching twice. Is that a problem?",
        a: "It's a flag, not a block. The check alerts the coach any time a player catches more than once so it's a conscious decision rather than an accident. If the coach is fine with it (strong catcher, short game), they can tap Ignore on the warning and move on."
      },
      {
        q: "We're mid-game and the coach wants to move my kid out of catcher early. How does that work?",
        a: "In Game Mode, tap the catcher's position circle on the diamond. A Quick Swap sheet slides up with all available players. Tap whoever is taking over behind the plate. The swap applies to the current inning only — the rest of the pre-set lineup stays intact."
      }
    ]
  },
  {
    id: "base-coaches",
    label: "Base Coaches",
    emoji: "🏃",
    items: [
      {
        q: "I'm coaching first base. How do I quickly see who's playing where this inning?",
        a: "Game Mode gives you the clearest picture — it shows the full diamond with every position labeled and filled for the current inning. Tap ▶ Game View Mode from the home screen or Game Day tab to launch it. The diamond updates automatically when the coach advances to the next inning."
      },
      {
        q: "How do I look ahead to next inning before we take the field?",
        a: "In Game Mode, tap the next inning number in the inning bar at the top. The diamond previews that inning's assignments. Tap back to the current inning when you're done — no changes are made just by previewing."
      },
      {
        q: "What are LC and RC on the field? I don't always see those in youth ball.",
        a: "Left Center and Right Center — the two center field positions used in 10-player youth baseball. LC covers the left-center gap, RC covers the right-center gap. Important for base coaching: the gap between LC and RC is often the fastest route to extra bases. Knowing who is out there — and how fast they are — helps you decide whether to wave a runner home on a ball hit in the gap."
      },
      {
        q: "As third base coach, how do I know who's coming up to bat so I can give them signals?",
        a: "The Now Batting strip at the bottom of the Game Day tab shows the current batter and the next two. When you're in the coach's box, the dugout parent managing the strip can call out the name. The L/R badge on the strip tells you which side of the plate they hit from — useful for knowing whether to expect a pull or oppo situation."
      },
      {
        q: "I want to see a specific player's position assignments for the whole game, not just now.",
        a: "Tap the 👁 MyPlayer View button on the Game Day tab. Select the player from the picker. You'll see their position for every inning on one screen — field positions color-coded, bench slots clearly marked. Coaches use this to spot a player mid-game and confirm where they should be going."
      },
      {
        q: "There's a runner on second and I want to know the outfielder's arm strength before I wave them home. Is that in here?",
        a: "The coach sets arm strength and fielding ratings on each player card under the Fielding section in Team → Roster. Ask the head coach to pull up that player's card, or check it yourself from By Player view in Defense. It's most useful to review key matchups before the game starts rather than mid-play."
      }
    ]
  },
  {
    id: "scorekeeper",
    label: "Scorekeeper",
    emoji: "📊",
    items: [
      {
        q: "How do I record the score during the game?",
        a: "Tap the Scoring tab on the bottom nav, then tap Claim Scorer Role — this locks the scorer seat to your device so two people don't overwrite each other. Enter runs inning by inning as they happen. The coach can see the score update in real time on their device via share link."
      },
      {
        q: "Someone else already claimed the scorer role. What do I do?",
        a: "Only one person can be the active scorer at a time. If you need to take over, ask them to release the role from their device, or wait for the session to time out. This prevents accidental overwrites mid-game."
      },
      {
        q: "I made a mistake in an earlier inning. Can I fix it?",
        a: "Yes. Open the inning editor and tap the run count you need to correct. Changes are logged with timestamp so there's an audit trail. For full score restore, tap Restore Score — it rolls back to the last saved snapshot."
      },
      {
        q: "I want to try the scoring features without messing up a real game. Is there a way to practice?",
        a: "Yes — Practice Mode is built for exactly this. From Game Day, open any game and tap the Practice Mode toggle (🏋) before claiming the scorer role. Everything works the same — pitches, runs, outs, runners on bases, half-inning flips — but nothing saves to the cloud. Nobody else sees your practice session and the real game data is untouched. Great for walking through scoring with an assistant coach before your first game, or testing scenarios like how a runner-out-at-3rd affects the count."
      },
      {
        q: "How do I track the opposing team's pitches during their at-bat?",
        a: "When the inning flips to opponent batting, the scoring screen switches automatically — you'll see the Opponent Batter card above the diamond showing the opponent team name and batter number, plus a pitch counter. For each pitch, tap Ball, Strike, or Foul. The counter shows 'Pitches: X of 5' — at 5 pitches the batter is automatically out (8U five-and-out rule). If the opponent scores a run, tap the +1 button next to their score in the scoreboard row at the top. Their batter number cycles from #1 through #11 and wraps back to #1 — you don't need to know the opposing roster."
      },
      {
        q: "How does the app know when to switch from our at-bat to the opponent's?",
        a: "The app flips the inning half automatically when the current team reaches 3 outs. When your team gets 3 outs (from a strikeout, tap-out-at-base, or runner-out), the scoring screen flips to the opponent's half and the batter card changes to OPPONENT BATTER · Player #N. Same thing in reverse — opponent gets 3 outs and it flips back to your team. You'll see the runners clear from the diamond at each flip because it's a new half. The inning number at the top advances when the bottom half ends, not the top."
      },
      {
        q: "Sometimes my phone lags during scoring — will the runners and pitches sync correctly?",
        a: "Yes. The app writes to the cloud after every action and has a guard that prevents delayed messages from overwriting the current state. If the app feels slow mid-game, trust the screen you're looking at: the displayed state is always the most recent valid state, even if background network is catching up. If you ever see something clearly wrong (a runner you know scored is still on base), tap the gear menu and refresh the scoring view."
      }
    ]
  },
  {
    id: "setup-sharing",
    label: "Setup & Sharing",
    emoji: "📲",
    items: [
      {
        q: "Do I need an account to use the app?",
        a: "Not for viewing. Anyone can open a share link without an account — parents, base coaches, scorekeepers — full read-only access. Coaches editing the team can sign in with a Google account or an email magic link to sync their data across devices. Accounts are required only for editing."
      },
      {
        q: "How do I install this on my phone so it works at the field without Wi-Fi?",
        a: "Dugout Lineup prompts you automatically. Look for the Install banner at the bottom of every tab (above the nav). On Android: tap Install to add it to your home screen in one step. On iPhone: the banner shows Share → Add to Home Screen instructions — follow them in Safari. Once installed, the app works offline — no signal needed at the field."
      },
      {
        q: "How do I share the lineup with parents before the game?",
        a: "Go to Team → Schedule, tap the game card, then tap Share Lineup. This creates a short link parents can open on any device — they see the full defense grid and batting order but cannot edit anything. No account needed to view."
      },
      {
        q: "I got a new phone. How do I move all my data?",
        a: "On your old phone, tap ··· on the team card on the Home screen and choose 'Download Backup.' This saves a file to your device. On the new phone, open the app, go to Team → Roster, and tap 'Restore from backup file.' All roster, schedule, and lineup data is restored."
      },
      {
        q: "My roster disappeared. What do I do?",
        a: "Do not add new players or make changes yet — that could overwrite recovery options. Go to Team → Roster and look for a 'Restore Previous Roster' option. The app keeps automatic snapshots after every change. If you have a backup file saved, use 'Restore from backup file' to recover everything."
      },
      {
        q: "Can two coaches use the app on different phones for the same team?",
        a: "With a cloud account, data syncs across devices automatically so both coaches stay in sync. Without an account, each phone is independent — changes on one don't appear on the other. The simplest workaround today is to designate one phone as the primary and share the lineup link to others for read-only viewing."
      }
    ]
  }
];
