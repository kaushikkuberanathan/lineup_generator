import { OUTFIELD, INFIELD } from "./constants.js";
import { scorePosition } from "./scoring.js";

export function autoAssign(roster, innings) {
  var players = roster.map(function(r) { return r.name; });
  var n = players.length;
  var grid = {};
  for (var pi = 0; pi < players.length; pi++) {
    grid[players[pi]] = [];
    for (var ii = 0; ii < innings; ii++) { grid[players[pi]].push(""); }
  }

  var infieldOrder = ["P","SS","C","1B","2B","3B"];
  var ofOrder      = ["CF","LF","RF"];

  function hasPlayedPos(pName, pos) {
    var pg = grid[pName] || [];
    for (var i = 0; i < pg.length; i++) { if (pg[i] === pos) { return true; } }
    return false;
  }

  function totalOFCount(pName) {
    var pg = grid[pName] || [];
    var cnt = 0;
    for (var i = 0; i < pg.length; i++) {
      if (OUTFIELD.indexOf(pg[i]) >= 0) { cnt++; }
    }
    return cnt;
  }

  function benchCount(pName, upToInning) {
    var pg = grid[pName] || [];
    var cnt = 0;
    for (var i = 0; i < upToInning; i++) { if (pg[i] === "Bench") { cnt++; } }
    return cnt;
  }

  // Identify absent players (tagged "absent") — they sit Out every inning
  var absentSet = {};
  for (var absi = 0; absi < roster.length; absi++) {
    if ((roster[absi].tags || []).indexOf("absent") >= 0) {
      absentSet[roster[absi].name] = true;
    }
  }
  var activePlayers = players.filter(function(p) { return !absentSet[p]; });
  var activeN = activePlayers.length;

  for (var inning = 0; inning < innings; inning++) {
    // Mark absent players Out for this inning
    for (var abni = 0; abni < players.length; abni++) {
      if (absentSet[players[abni]]) { grid[players[abni]][inning] = "Out"; }
    }

    // benchSlots = active players beyond 9
    var benchSlots = activeN - 9;
    if (benchSlots < 0) { benchSlots = 0; }

    // Players who were benched last inning must play this inning
    var mustPlay = [];
    if (inning > 0) {
      for (var mp = 0; mp < activePlayers.length; mp++) {
        if (grid[activePlayers[mp]][inning - 1] === "Bench") { mustPlay.push(activePlayers[mp]); }
      }
    }

    // Select bench players.
    // Players with the "benchOnce" tag may only be benched once per game.
    // They are excluded from candidacy after their first bench inning.
    // Fallback: if not enough non-protected candidates, allow protected players
    // to sit again (unavoidable with very small rosters).
    function hasBenchOnce(pName) {
      for (var ri = 0; ri < roster.length; ri++) {
        if (roster[ri].name === pName) {
          return (roster[ri].tags || []).indexOf("benchOnce") >= 0;
        }
      }
      return false;
    }
    var benchCandidates = [];
    for (var bp = 0; bp < activePlayers.length; bp++) {
      var pn = activePlayers[bp];
      if (mustPlay.indexOf(pn) >= 0) { continue; }
      var bc = benchCount(pn, inning);
      var protected_ = hasBenchOnce(pn);
      // Skip protected players who have already sat once
      if (protected_ && bc >= 1) { continue; }
      benchCandidates.push({ name: pn, bc: bc, protected_: protected_ });
    }
    // Sort: unprotected first (they take bench first), then by fewest bench innings
    benchCandidates.sort(function(a, b) {
      if (a.protected_ !== b.protected_) { return a.protected_ ? 1 : -1; }
      return a.bc - b.bc;
    });
    // Fallback: if still not enough candidates, include protected players who have sat
    if (benchCandidates.length < benchSlots) {
      var fallback = [];
      for (var fbp = 0; fbp < activePlayers.length; fbp++) {
        var fpn = activePlayers[fbp];
        if (mustPlay.indexOf(fpn) >= 0) { continue; }
        var alreadyIn = false;
        for (var fbi = 0; fbi < benchCandidates.length; fbi++) {
          if (benchCandidates[fbi].name === fpn) { alreadyIn = true; break; }
        }
        if (!alreadyIn) { fallback.push({ name: fpn, bc: benchCount(fpn, inning), protected_: true }); }
      }
      fallback.sort(function(a, b) { return a.bc - b.bc; });
      benchCandidates = benchCandidates.concat(fallback);
    }
    var benched = [];
    for (var bsi = 0; bsi < benchSlots; bsi++) {
      if (benchCandidates[bsi]) { benched.push(benchCandidates[bsi].name); }
    }
    for (var bni = 0; bni < benched.length; bni++) {
      grid[benched[bni]][inning] = "Bench";
    }

    var available = [];
    for (var ai = 0; ai < activePlayers.length; ai++) {
      if (benched.indexOf(activePlayers[ai]) < 0) { available.push(activePlayers[ai]); }
    }

    // Fill outfield FIRST using rotation to prevent repeats
    // Priority: hasn't played this OF position > fewest total OF appearances > bench equity
    for (var ofi = 0; ofi < ofOrder.length; ofi++) {
      var ofPos = ofOrder[ofi];
      if (available.length === 0) { break; }
      var ofRanked = [];
      for (var ori = 0; ori < available.length; ori++) {
        var pName = available[ori];
        var alreadyPlayed = hasPlayedPos(pName, ofPos) ? 1 : 0;
        var totalOF = totalOFCount(pName);
        var bc = benchCount(pName, inning);
        ofRanked.push({ name: pName, score: -alreadyPlayed * 1000 - totalOF * 10 + bc });
      }
      ofRanked.sort(function(a, b) { return b.score - a.score; });
      var ofWinner = ofRanked[0].name;
      grid[ofWinner][inning] = ofPos;
      var owIdx = available.indexOf(ofWinner);
      if (owIdx >= 0) { available.splice(owIdx, 1); }
    }

    // Fill infield using skill-based scoring
    // Sort infield positions by most-constrained-first:
    // positions with fewest non-blocked candidates get filled before
    // positions with many options, preventing last-position deadlocks.
    var ifPositionsToFill = infieldOrder.slice();
    while (ifPositionsToFill.length > 0 && available.length > 0) {
      // Score each remaining position by number of valid (non-blocked) candidates
      var ifConstraint = [];
      for (var ifci = 0; ifci < ifPositionsToFill.length; ifci++) {
        var ifc = ifPositionsToFill[ifci];
        var validCount = 0;
        for (var ifvi = 0; ifvi < available.length; ifvi++) {
          if (scorePosition(available[ifvi], ifc, inning, grid, roster) > -998) { validCount++; }
        }
        ifConstraint.push({ pos: ifc, validCount: validCount });
      }
      // Fill most constrained position first (fewest valid candidates)
      ifConstraint.sort(function(a, b) { return a.validCount - b.validCount; });
      var ifPos = ifConstraint[0].pos;
      ifPositionsToFill.splice(ifPositionsToFill.indexOf(ifPos), 1);
      var ifRanked = [];
      for (var ifri = 0; ifri < available.length; ifri++) {
        ifRanked.push({ name: available[ifri], score: scorePosition(available[ifri], ifPos, inning, grid, roster) });
      }
      ifRanked.sort(function(a, b) { return b.score - a.score; });
      // If all candidates are blocked, pick the one who played this position least recently
      if (ifRanked[0].score <= -998) {
        ifRanked.sort(function(a, b) {
          var pgA = grid[a.name] || []; var pgB = grid[b.name] || [];
          var lastA = -1; var lastB = -1;
          for (var li = inning - 1; li >= 0; li--) {
            if (pgA[li] === ifPos && lastA < 0) { lastA = li; }
            if (pgB[li] === ifPos && lastB < 0) { lastB = li; }
          }
          return lastA - lastB;
        });
      }
      var ifWinner = ifRanked[0].name;
      grid[ifWinner][inning] = ifPos;
      var iwIdx = available.indexOf(ifWinner);
      if (iwIdx >= 0) { available.splice(iwIdx, 1); }
    }

    // Any remaining overflow players go to Bench
    for (var ovi = 0; ovi < available.length; ovi++) {
      grid[available[ovi]][inning] = "Bench";
    }
  }

  return grid;
}


// ─────────────────────────────────────────────────────────────────
// autoAssign        — primary heuristic (most-constrained-first)
// autoAssignWithRetryFallback — production entry point with observability
//
// Output contract:
//   grid        {Record<playerName, string[]>}  — complete defensive grid
//   warnings    {Warning[]}                     — remaining constraint violations ([] = clean)
//   attempts    {number}                        — how many runs were needed (1 = clean first try)
//   usedFallback {boolean}                      — true if retry loop fired
//   isValid     {boolean}                       — true iff warnings.length === 0
//   explain     {string}                        — human-readable status for debugging
// ─────────────────────────────────────────────────────────────────
export function autoAssignWithRetryFallback(roster, innings) {
  var startTime = Date.now();

  // Attempt 1: primary heuristic on original roster order
  var grid = autoAssign(roster, innings);
  var warnings = validateGrid(grid, roster, innings);

  if (warnings.length === 0) {
    return {
      grid:        grid,
      warnings:    [],
      attempts:    1,
      usedFallback: false,
      isValid:     true,
      explain:     "Clean on first attempt (" + (Date.now() - startTime) + "ms)"
    };
  }

  // Attempts 2–8: shuffle roster order to escape local minima
  var best = grid;
  var bestWarnings = warnings;
  var shuffled = roster.slice();
  var attempt = 1;

  for (; attempt < 8; attempt++) {
    // Fisher-Yates shuffle
    for (var si = shuffled.length - 1; si > 0; si--) {
      var sj = Math.floor(Math.random() * (si + 1));
      var tmp = shuffled[si]; shuffled[si] = shuffled[sj]; shuffled[sj] = tmp;
    }
    var ng = autoAssign(shuffled, innings);
    var nw = validateGrid(ng, roster, innings);
    if (nw.length < bestWarnings.length) { best = ng; bestWarnings = nw; }
    if (bestWarnings.length === 0) { break; }
  }

  var elapsed = Date.now() - startTime;
  var isValid = bestWarnings.length === 0;
  var explain = isValid
    ? "Clean after " + (attempt + 1) + " attempts (" + elapsed + "ms)"
    : "Best result after " + (attempt + 1) + " attempts has " + bestWarnings.length
      + " warning(s): " + bestWarnings.map(function(w) { return w.msg; }).join("; ")
      + " (" + elapsed + "ms)";

  return {
    grid:        best,
    warnings:    bestWarnings,
    attempts:    attempt + 1,
    usedFallback: true,
    isValid:     isValid,
    explain:     explain
  };
}

// Backward-compatible alias so any direct autoAssignWithFallback calls still work
export var autoAssignWithFallback = autoAssignWithRetryFallback;
