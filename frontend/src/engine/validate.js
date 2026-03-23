import { OUTFIELD, INFIELD } from "./constants.js";

export function validateGrid(grid, roster, innings) {
  var warnings = [];
  var players = roster.map(function(r) { return r.name; });

  for (var i = 0; i < innings; i++) {
    var assigned = {};
    var benchCount = 0;
    for (var pi = 0; pi < players.length; pi++) {
      var p = players[pi];
      var pos = grid[p] ? grid[p][i] : "";
      if (!pos) {
        warnings.push({ type:"missing", msg: p + " unassigned in inning " + (i + 1) });
        continue;
      }
      if (pos === "Bench") {
        benchCount++;
        if (i > 0 && grid[p][i - 1] === "Bench") {
          warnings.push({ type:"backtoback", msg: p + " benched back-to-back innings " + i + " and " + (i + 1) });
        }
      } else {
        if (assigned[pos]) {
          warnings.push({ type:"conflict", msg: "Both " + assigned[pos] + " and " + p + " at " + pos + " inning " + (i + 1) });
        }
        assigned[pos] = p;
      }
    }
    if (benchCount > 2) {
      warnings.push({ type:"bench", msg: "Inning " + (i + 1) + ": " + benchCount + " players benched (max 2)" });
    }
  }

  // Outfield repeats
  for (var opi = 0; opi < players.length; opi++) {
    var p2 = players[opi];
    var pGrid = grid[p2] || [];
    for (var ofi = 0; ofi < OUTFIELD.length; ofi++) {
      var ofPos = OUTFIELD[ofi];
      var count = 0;
      for (var gi = 0; gi < pGrid.length; gi++) { if (pGrid[gi] === ofPos) { count++; } }
      if (count > 1) {
        warnings.push({ type:"outfield", msg: p2 + " plays " + ofPos + " " + count + " times" });
      }
    }
  }

  return warnings;
}

export function initGrid(roster, innings) {
  var grid = {};
  for (var i = 0; i < roster.length; i++) {
    grid[roster[i].name] = [];
    for (var j = 0; j < innings; j++) { grid[roster[i].name].push(""); }
  }
  return grid;
}

