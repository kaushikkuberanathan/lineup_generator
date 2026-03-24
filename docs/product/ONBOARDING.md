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

---

## Step 2 — Create Your Team

When you open the app for the first time you'll land on the Home screen.

1. Tap **"Create New Team"**
2. Fill in:
   - **Team Name** — e.g. `Mud Hens`
   - **Age Group** — e.g. `8U`
   - **Season Year** — e.g. `2026`
3. Tap **Save**

Your team is created and you're taken straight to the Roster tab.

> If you coach multiple teams, you can create additional teams from the Home screen anytime. Switch between them using the team cards.

---

## Step 3 — Build Your Roster

Add each player on your team one at a time.

### Add a Player
1. Tap **"Add Player"**
2. Enter the player's full name — e.g. `Jackson Hershiser`
3. Tap **Save**

Repeat for all players. For an 8U rec team, you'll typically have 10–12 players.

### Set Player Profiles (Recommended)
Tap any player card to expand it and set:

**Skills** — select all that apply:
- `Game Aware` — reads the field, knows where to throw
- `Strong Arm` — can make longer throws accurately
- `Good Glove` — reliable fielder
- `Natural Catcher` — comfortable behind the plate
- `Fast Runner` — above-average speed
- `Left Handed` — affects 1B, outfield, and pitching assignments
- `Big Kid` — physical size suits certain positions
- `High Energy` — stays engaged throughout the game
- `Developing` — newer player, best in lower-pressure spots

**Coach Tags** — honest assessments used internally (not shown to parents):
- `Weak Thrower` — engine avoids P, SS, 3B
- `Slow Runner` — engine favors 1B, avoids CF
- `Fearful of Ball` — engine keeps them in lower-impact spots
- `Inconsistent Attention` — engine avoids high-responsibility positions
- `Bench Once` — player should sit no more than once per game
- `Needs Base Coaching` — flags for your own awareness

**Preferred Positions** — drag to rank up to 5 positions the player enjoys or excels at. The engine gives these a scoring bonus.

**Avoid Positions** — tap any positions the player should not play. The engine applies a soft block (you can still override manually).

> You don't need to fill in every field. Even just setting 2–3 skills per player dramatically improves the auto-assign quality.

### Example — Mud Hens Setup
Here's how a strong profile looks for a player like Jackson Hershiser:
- Skills: `Game Aware`, `Strong Arm`
- Preferred: `SS`, `P`
- Tags: none
- Avoid: none

And for a developing player like Benjamin Bieber:
- Skills: `Developing`
- Preferred: `RF`, `LF`
- Tags: `Bench Once`
- Avoid: `P`, `C`

---

## Step 4 — Set Your Schedule

1. Tap the **Schedule tab**
2. Tap **"Add Game"**
3. Choose your preferred method:
   - **AI Photo Import** — take a photo of your printed schedule; the app parses it automatically
   - **AI Text/Paste Import** — paste a text schedule from an email or group chat
   - **Manual** — enter each game one at a time (date, time, opponent, location)
   - **Bulk** — enter multiple games at once

> For the Mud Hens, the full 11-game schedule was imported via AI photo import in under 60 seconds.

---

## Step 5 — Generate Your First Lineup

1. Tap the **Field Grid tab**
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

## Step 6 — Set the Batting Order

1. Tap the **Batting tab**
2. Tap **"Suggest Order"** — the engine ranks players by batting skill score
3. Drag cards to reorder (desktop) or use the **up/down arrows** (mobile)
4. The order is saved automatically

> After logging game stats (Step 8), tap Suggest Order again — it will use cumulative batting averages to recommend an improved order for the next game.

---

## Step 7 — Share the Lineup

### Share with Parents or Scorekeepers
1. From the **Schedule tab**, tap the game
2. Tap **"Share Lineup"**
3. Copy the link and send it via text or group chat

The link opens a **read-only view** showing:
- The defensive diamond by inning
- The batting order

No account needed for the recipient — just a browser.

### Print or PDF
1. Tap the **Print tab**
2. Choose: **Both** (default) / **Defense Only** / **Batting Only**
3. Tap **Print** to send to a printer, or **Download PDF** to save to your phone

> Print one copy for your clipboard and text the share link to parents before leaving for the field.

---

## Step 8 — Log Game Results

After the game:

1. Tap the **Schedule tab** → tap the completed game
2. Enter the final score (your team / opponent)
3. Log each player's batting stats:
   - AB (at bats), H (hits), R (runs scored), RBI
   - AVG is calculated automatically and color-coded (green ≥ .300, amber ≥ .200)
4. You can paste a batting scorecard as text or upload a photo — the AI parser will extract the stats automatically

Stats accumulate across the season and feed into the **Suggest Order** engine for future games.

---

## Step 9 — Back Up Your Data

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

| Tab | What It Does |
|-----|-------------|
| **Roster** | Add players, set skills, tags, and position preferences |
| **Field Grid** | Auto-generate and manually adjust the defensive lineup |
| **Batting** | Set and manage the batting order |
| **Schedule** | Add games, log results, and share lineups |
| **Print** | Generate a printable / PDF lineup card |

---

## Tips for Game Day

- **2 minutes before warm-up:** Open Field Grid → Auto-Assign → review → Share Lineup link
- **At the field:** Use the installed PWA from your home screen — works without wifi
- **After the game:** Log stats while the game is fresh — takes under 3 minutes

---

## Getting Help

This app was built for 8U recreational baseball. If something doesn't look right:
- Use **Auto-Fix All** in the Field Grid tab to resolve assignment warnings
- Use **Export Backup** before making major roster changes
- Manual overrides are always available — the engine is a starting point, not a hard constraint

---

*Last updated: March 2026*
