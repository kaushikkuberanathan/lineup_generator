import { SKILLS, TAGS, DISLIKE_PENALTY, OUTFIELD, INFIELD } from "./constants.js";

export function scorePosition(playerName, pos, inning, grid, roster) {
  var info = null;
  for (var ri = 0; ri < roster.length; ri++) {
    if (roster[ri].name === playerName) { info = roster[ri]; break; }
  }
  if (!info) { return 0; }

  // Layer 1 - outfield hard block
  if (OUTFIELD.indexOf(pos) >= 0) {
    var ofCount = 0;
    var pGrid = grid[playerName] || [];
    for (var gi = 0; gi < pGrid.length; gi++) {
      if (pGrid[gi] === pos) { ofCount++; }
    }
    if (ofCount > 0) { return -999; }
  }

  var score = 0;

  // Layer 2 - skill weights (averaged)
  var playerSkills = info.skills || [];
  if (playerSkills.length > 0) {
    var totalWeight = 0;
    for (var si = 0; si < playerSkills.length; si++) {
      var sk = SKILLS[playerSkills[si]];
      if (sk && sk.weights && sk.weights[pos] !== undefined) {
        totalWeight += sk.weights[pos];
      }
    }
    score += totalWeight / playerSkills.length;
  }

  // Layer 3 - preferred positions (ranked, graduated bonus)
  // 1st pref: +30, 2nd: +24, 3rd: +18, 4th: +12, 5th+: +8
  // Each rank still meaningfully higher than the next, never zero.
  var prefs = info.prefs || [];
  var prefBonuses = [30, 24, 18, 12, 8];
  for (var prefi = 0; prefi < prefs.length; prefi++) {
    if (prefs[prefi] === pos) {
      score += prefBonuses[prefi] !== undefined ? prefBonuses[prefi] : 8;
      break;
    }
  }

  // Layer 4 - coach tags
  var playerTags = info.tags || [];
  for (var ti = 0; ti < playerTags.length; ti++) {
    var tag = TAGS[playerTags[ti]];
    if (tag && tag.mods && tag.mods[pos] !== undefined) {
      score += tag.mods[pos];
    }
  }

  // Layer 5 - dislikes
  var dislikes = info.dislikes || [];
  if (dislikes.indexOf(pos) >= 0) { score += DISLIKE_PENALTY; }

  // Layer 6 - consecutive innings hard block (max 1 inning at same infield position in a row)
  var pGrid2 = grid[playerName] || [];
  if (INFIELD.indexOf(pos) >= 0 && inning >= 1) {
    if (pGrid2[inning - 1] === pos) {
      return -998; // hard block: already played this infield position last inning
    }
  }

  // Layer 7 - spread penalty (stronger: -10 per prior inning to prevent monopoly)
  var priorCount = 0;
  for (var pi = 0; pi < inning; pi++) {
    if (pGrid2[pi] === pos) { priorCount++; }
  }
  score -= priorCount * 10;

  // Layer 8 - bench equity bonus
  var benchCount = 0;
  for (var bi = 0; bi < inning; bi++) {
    if (pGrid2[bi] === "Bench") { benchCount++; }
  }
  score += benchCount * 4;

  return score;
}
