/**
 * playerMapper — stub
 * Maps a V1 roster player object to the V2 player shape.
 * Expand this as V2 needs more player attributes.
 */

/**
 * @param {Object} player - Raw roster player from App state
 * @returns {{ name: string, outThisGame: boolean, tags: string[], skills: string[] }}
 */
export function mapPlayerToV2(player) {
  return {
    ...player,

    name: player.name || player.playerName || "Unknown Player",

    // Fielding
    reliability: player.reliability ?? "average",
    reaction: player.reaction ?? "average",
    armStrength: player.armStrength ?? "average",
    ballType: player.ballType ?? "developing",

    // Field awareness
    knowsWhereToThrow: player.knowsWhereToThrow ?? false,
    callsForBall: player.callsForBall ?? false,
    backsUpPlays: player.backsUpPlays ?? false,
    anticipatesPlays: player.anticipatesPlays ?? false,

    // Batting
    contact: player.contact ?? "medium",
    power: player.power ?? "low",
    swingDiscipline: player.swingDiscipline ?? "free_swinger",

    // Batting awareness
    tracksBallWell: player.tracksBallWell ?? false,
    patientAtPlate: player.patientAtPlate ?? false,
    confidentHitter: player.confidentHitter ?? false,

    // Running
    speed: player.speed ?? "average",
    runsThroughFirst: player.runsThroughFirst ?? false,
    listensToCoaches: player.listensToCoaches ?? false,
    awareOnBases: player.awareOnBases ?? false,

    // V1 arrays (passed through with safe defaults)
    skills:    player.skills    ?? [],
    tags:      player.tags      ?? [],
    batSkills: player.batSkills ?? [],

    // Constraints
    skipBench: player.skipBench ?? false,
    outThisGame: player.outThisGame ?? (player.tags || []).includes("absent"),
    preferredPositions: Array.isArray(player.prefs)             ? player.prefs
                      : Array.isArray(player.preferredPositions) ? player.preferredPositions
                      : [],
    avoidPositions:     Array.isArray(player.dislikes)          ? player.dislikes
                      : Array.isArray(player.avoidPositions)     ? player.avoidPositions
                      : [],

    // Development
    developmentFocus: player.developmentFocus ?? "balanced",

    // Name parts
    firstName: player.firstName ?? (player.name ? player.name.split(" ")[0] : ""),
    lastName:  player.lastName  ?? (player.name ? player.name.split(" ").slice(1).join(" ") : ""),

    // Walk-up songs
    walkUpSong:   player.walkUpSong   ?? null,
    walkUpArtist: player.walkUpArtist ?? null,
    walkUpStart:  player.walkUpStart  ?? null,
    walkUpEnd:    player.walkUpEnd    ?? null,
    walkUpNotes:  player.walkUpNotes  ?? null,
    walkUpLink:   player.walkUpLink   ?? null,
  };
}
