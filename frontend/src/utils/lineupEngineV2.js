import { mapPlayerToV2 } from "./playerMapper";
import {
  getBattingOrderScore,
  getBenchCandidateScore,
  getPositionScore,
} from "./scoringEngine";

const FIELD_POSITIONS = ["P", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF"];
const ASSIGNMENT_PRIORITY = ["P", "SS", "CF", "C", "2B", "3B", "1B", "LF", "RF"];

function buildEmptyGrid(players, innings) {
  const grid = {};
  players.forEach((p) => {
    grid[p.name] = Array(innings).fill(null);
  });
  return grid;
}

function chooseBenchPlayers(players, benchCount) {
  if (benchCount <= 0) return [];

  const benchEligible = players.filter((p) => !p.skipBench);

  if (benchEligible.length < benchCount) {
    throw new Error(
      "Unable to generate lineup because too many players are marked Skip Bench for available field slots. Please remove Skip Bench from one or more players."
    );
  }

  return [...benchEligible]
    .sort((a, b) => getBenchCandidateScore(a) - getBenchCandidateScore(b))
    .slice(0, benchCount);
}

function assignPositionsForInning(activePlayers) {
  const assignments = {};
  const usedNames = new Set();

  ASSIGNMENT_PRIORITY.forEach((position) => {
    let bestPlayer = null;
    let bestScore = -Infinity;

    activePlayers.forEach((player) => {
      if (usedNames.has(player.name)) return;

      const score = getPositionScore(player, position);
      if (score > bestScore) {
        bestScore = score;
        bestPlayer = player;
      }
    });

    if (bestPlayer) {
      assignments[position] = bestPlayer.name;
      usedNames.add(bestPlayer.name);
    }
  });

  return assignments;
}

export function generateLineupV2(roster, innings) {
  console.log("[V2] Smart lineup generation");

  const players = roster
    .map(mapPlayerToV2)
    .filter((p) => !p.outThisGame);

  if (players.length === 0) {
    throw new Error("No active players available for lineup generation.");
  }

  const grid = buildEmptyGrid(players, innings);
  const warnings = [];

  const benchCountPerInning = Math.max(players.length - FIELD_POSITIONS.length, 0);

  // Batting order is calculated now for future use/debugging.
  // We are not yet wiring it into the UI because current grid format is defensive-position based.
  const battingOrder = [...players].sort(
    (a, b) => getBattingOrderScore(b) - getBattingOrderScore(a)
  );
  console.log(
    "[V2] Batting order preview:",
    battingOrder.map((p) => p.name)
  );

  for (let inning = 0; inning < innings; inning++) {
    let inningBench = [];

    if (benchCountPerInning > 0) {
      inningBench = chooseBenchPlayers(players, benchCountPerInning);
    }

    const benchNames = new Set(inningBench.map((p) => p.name));
    const activePlayers = players.filter((p) => !benchNames.has(p.name));

    if (activePlayers.length < Math.min(players.length, FIELD_POSITIONS.length)) {
      warnings.push(`Inning ${inning + 1}: not enough active players to fill all field positions.`);
    }

    const assignments = assignPositionsForInning(activePlayers);

    players.forEach((player) => {
      const assignedPosition = Object.entries(assignments).find(
        ([, playerName]) => playerName === player.name
      )?.[0];

      grid[player.name][inning] = assignedPosition || "BENCH";
    });
  }

  return {
    grid,
    attempts: 1,
    warnings,
    isValid: warnings.length === 0,
    usedFallback: false,
    explain:
      warnings.length === 0
        ? "V2 smart assignment complete"
        : `V2 completed with ${warnings.length} warning(s)`,
  };
}
