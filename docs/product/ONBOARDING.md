# Lineup Generator — Coach Onboarding Guide

> For coaches opening the app for the first time via a shared URL.

---

## Step 1 — Open the App & Install It

1. Tap the URL your league or fellow coach shared with you
2. The app opens in your mobile browser
3. **Install it to your home screen** (recommended — it works like a native app):
   - **iPhone (Safari):** Tap the Share icon → "Add to Home Screen" → Add
   - **Android (Chrome):** Tap the three-dot menu → "Add to Home Screen" → Install
4. You'll now have a Lineup Generator icon on your home screen for quick access

> The app works offline after the first load — no internet needed at the field.
> **Viewing a shared lineup never requires signing in** — if you're a parent, scorekeeper, or base coach opening a share link, skip straight to it; nothing below in this guide applies to you. The sign-in steps that follow are only for coaches who will *edit* a team.

---

## Step 2 — Sign In

Editing a team's roster, schedule, or lineup requires a signed-in session. Viewing never does — but as a coach setting up your team, you'll sign in first.

1. Tap **Sign in**
2. Choose one:
   - **Sign in with Google** — one tap, no password
   - **Email magic link** — enter your email, tap the link sent to your inbox
3. You're signed in — no password to remember either way

**What happens next depends on whether you're already on a team:**
- **Already a member of a team** (invited by your head coach, or provisioned earlier) → you land on the Home screen with your team(s) visible. Skip to Step 4.
- **No team yet** → continue to Step 3.

---

## Step 3 — Get Access to Your Team

If you signed in and don't see any teams, you'll land on a screen telling you no team is linked to your account yet.

1. Tap **Request Access**
2. Fill in your name and which team you're requesting (new team, or an existing one your league already runs)
3. Submit — your request routes to the platform administrator for review
4. You'll see a **pending approval** screen until it's reviewed. Once approved, sign back in and your team will appear on the Home screen

> Today, a brand-new team is provisioned by the platform administrator on the backend as part of approving your request — it isn't a fully self-serve "create your own team" flow yet. If your approval is taking a while, reach out directly rather than assuming something's broken.
>
> **If you already have at least one team** and want to add a second one yourself, the Home screen has a **"Create New Team"** option that works immediately, no approval wait — this is for coaches who already have access, adding an additional team they coach.

---

## Step 4 — Build Your Roster

Add each player on your team one at a time.

### Add a Player
1. Tap **"Add Player"**
2. Enter the player's first name and last name in the two separate fields, then tap Add. Names are automatically capitalized.
3. Repeat for all players. For an 8U rec team, you'll typically have 10–12 players.

### Set Player Profiles (Recommended)

Each player has a collapsible profile card on the Roster tab. Tap a player to expand their card.

**Lineup Constraints** (shown first, expanded by default)
The most important section for game day. Set here before generating each lineup:
- **Out This Game** — marks a player absent; they will not appear in any lineup slot
- **Skip Bench** — player will never be assigned to bench (use for players who must play every inning)
- **Preferred Positions** — tap positions in order of preference (1st, 2nd, 3rd choice)
- **Avoid Positions** — positions the player should not be assigned to

**Fielding**
Rate the player's defensive ability:
- Reliability: how consistently they make plays (High / Average / Needs Support)
- Reaction Timing: how quickly they respond to the ball (Quick / Average / Slow)
- Arm Strength: throwing ability (Strong / Average / Developing)
- Ball Type: whether they are better with ground balls, fly balls, or both
- Field Awareness: specific behaviors (Knows Where to Throw, Calls for Ball, Backs Up Plays, Anticipates Plays)

**Batting**
Rate the player's hitting:
- Contact: how often they make contact (High / Medium / Developing)
- Power: hitting strength (High / Medium / Low)
- Swing Discipline: patient vs free swinger
- Batting Awareness: tracks ball well, patient at plate, confident hitter

**Base Running**
- Speed: Fast / Average / Developing
- Running Awareness: runs through first, listens to coaches, aware on bases

**Effort & Development Focus**
- Effort level and whether the player needs infield reps, outfield reps, or is balanced

The lineup engine uses all of these attributes to assign positions and batting order automatically when you tap Auto-Assign.

> You don't need to fill in every field. Even setting a few attributes per player dramatically improves auto-assign quality.

---

## Step 5 — Set Your Schedule

1. Tap **My Team** in the bottom nav, then the **Schedule** sub-tab
2. Tap **"Add Game"**
3. Choose your preferred method:
   - **AI Photo Import** — take a photo of your printed schedule; the app parses it automatically
   - **AI Text/Paste Import** — paste a text schedule from an email or group chat
   - **Manual** — enter each game one at a time (date, time, opponent, location)
   - **Bulk** — enter multiple games at once

> For the Mud Hens, the full 11-game schedule was imported via AI photo import in under 60 seconds.

---

## Step 6 — Generate Your First Lineup

1. Tap **Game Day** in the bottom nav, then **Defense**
2. Set the number of innings (4, 5, or 6) using the innings selector
3. Tap **"Auto-Assign"**

The engine will generate a complete defensive grid across all innings using your player profiles. It enforces:
- No player repeats the same outfield position (LF, LC, RC, RF)
- No player sits the bench twice in a row
- Exactly 1 bench slot per inning (10 players on field, 1 sits)
- Skill and tag weights applied per position
- Preferred positions boosted, avoid positions soft-blocked

### Review the Grid
- Scan each inning row for any ⚠️ warnings
- Tap **"Auto-Fix All"** to resolve flagged issues automatically
- Tap any individual cell to manually override a position using the dropdown

### View the Diamond
Switch to the **position view** to see a visual diamond layout per inning. Useful for a quick sanity check before the game.

---

## Step 7 — Set the Batting Order

1. Tap the **Batting tab**
2. Tap **"Suggest Order"** — the engine ranks players by batting skill score
3. Drag cards to reorder (desktop) or use the **up/down arrows** (mobile)
4. The order is saved automatically

> After logging game stats (Step 9), tap Suggest Order again — it will use cumulative batting averages to recommend an improved order for the next game.

---

## Step 8 — Share the Lineup

### Share with Parents or Scorekeepers
1. From **My Team → Schedule**, tap the game
2. Tap **"Share Lineup"**
3. Copy the link and send it via text or group chat

The link opens a **read-only view** showing:
- The defensive diamond by inning
- The batting order

No account needed for the recipient — just a browser. This is true even while the auth gate is active for editing: viewing and share links never require signing in.

### Print or PDF
1. Tap the **Print tab**
2. Choose: **Both** (default) / **Defense Only** / **Batting Only**
3. Tap **Print** to send to a printer, or **Download PDF** to save to your phone

> Print one copy for your clipboard and text the share link to parents before leaving for the field.

---

## Step 9 — Log Game Results

After the game:

1. Tap **My Team → Schedule** → tap the completed game
2. Enter the final score (your team / opponent)
3. Log each player's batting stats:
   - AB (at bats), H (hits), R (runs scored), RBI
   - AVG is calculated automatically and color-coded (green ≥ .300, amber ≥ .200)
4. You can paste a batting scorecard as text or upload a photo — the AI parser will extract the stats automatically

Stats accumulate across the season and feed into the **Suggest Order** engine for future games.

---

## Step 9.5 — (Optional) Live Scoring

Live scoring tracks full game state — pitches, runs, batter advancement, and inning flow — directly in the app during a game, right alongside your lineup.

### Where it lives

Live scoring is not a separate tab — it's built into **Game Day → Dugout**, the same full-screen view you use to run the lineup on game day. Tap **Game Day**, then the **Dugout View** launcher.

### What live scoring does

- Track each at-bat as it happens (balls, strikes, outs, runs)
- Maintain inning-by-inning game state
- Generate a shareable scorekeeping view for parents and other coaches
- Capture detailed analytics for post-game review

### Getting access

Live scoring is rolling out gradually; not every team has it available yet. If you don't see scoring controls in Dugout View, contact KK directly — there's no in-app self-enroll today.

If your team doesn't have it yet, skip ahead to Step 10 — backup is recommended for everyone, scoring or not.

---

## Step 10 — Back Up Your Data

Before switching devices or clearing your browser:

1. Tap the **Settings / Export** option
2. Tap **"Export Backup"**
3. Save the JSON file to your phone or email it to yourself

To restore on a new device:
1. Open the app
2. Tap **"Import Backup"**
3. Select your saved JSON file

> Do this after every few games. It takes 10 seconds and protects your full season of data.

---

## Tab Reference

The app has a **4-tab** bottom nav. Tap any tab to switch:

| Tab | Icon | What's there |
|---|---|---|
| **Home** | 🏠 | Dashboard. Quick access to your team(s), Create New Team, and recent activity. |
| **My Team** | 👥 | Roster, Schedule, Snacks, batting hand setup, walk-up song info, attendance, and team settings. |
| **Game Day** | 🏟 | Field grid (Defense), batting order (Batting), walk-up songs (Songs), lineup share/print, and Dugout View (combined game-mode + live scoring, see Step 9.5). |
| **Support** | ⚙️ | Account (sign-out, switch teams), FAQ, feedback, version history, and About. |

---

## Tips for Game Day

- **2 minutes before warm-up:** Open Field Grid → Auto-Assign → review → Share Lineup link
- **At the field:** Use the installed PWA from your home screen — works without wifi
- **After the game:** Log stats while the game is fresh — takes under 3 minutes

---

## Getting Help

This app was built for 8U recreational baseball. If something doesn't look right:
- Use **Auto-Fix All** under **Game Day → Defense** to resolve assignment warnings
- Use **Export Backup** before making major roster changes
- Manual overrides are always available — the engine is a starting point, not a hard constraint

---

*Last updated: 2026-08-04 (Doc Audit Spike Story 3) — added the sign-in / request-access flow (live since v2.6.0, previously undocumented), removed the retired standalone Scoring tab (removed v2.5.9; live scoring now lives in Game Day → Dugout View), corrected Tab Reference to the real 4-tab nav, fixed Schedule references to My Team → Schedule.*
