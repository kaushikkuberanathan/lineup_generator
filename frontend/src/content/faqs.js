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
        a: "Game Day → Batting → Songs sub-tab. Players are listed in batting order with their song title, artist, and a Play button. When the previous at-bat ends, scroll to the next batter and tap Play — it opens their link directly."
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
    id: "setup-sharing",
    label: "Setup & Sharing",
    emoji: "📲",
    items: [
      {
        q: "Do I need an account to use the app?",
        a: "No. The app works fully offline without any account. Teams, roster, schedule, and lineups are all saved on your device. An account is only needed if you want to sync data across multiple devices."
      },
      {
        q: "How do I install this on my phone so it works at the field without Wi-Fi?",
        a: "On iPhone: open the app in Safari, tap the Share button (box with arrow), then tap 'Add to Home Screen.' On Android: open it in Chrome, tap the ⋮ menu, then tap 'Add to Home Screen' or 'Install App.' Once installed it works offline — no signal needed at the field."
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
