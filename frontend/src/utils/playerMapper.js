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
  // V1 → V2 skill bridge (only applies when V2 field not explicitly set)
  var v1 = player.skills || [];
  var inferredReliability = v1.includes('goodGlove') ? 'high'
    : v1.includes('needsWork') ? 'needs_support' : null;
  var inferredArm = v1.includes('strongArm') ? 'strong'
    : v1.includes('weakArm') ? 'developing' : null;
  // TODO(v2.5.x): wire speed/contact/power/discipline into return object
  // Pattern: `speed: player.speed ?? inferredSpeed ?? "average"`
  // V1 tag mapping is computed but not yet applied as V2 fallback.
  // Deferred from Phase 1b lint cleanup — wiring is a behavior change
  // (V1 tags would propagate into V2 scoring), out of
  // pipeline-restoration scope.
  // eslint-disable-next-line no-unused-vars -- see TODO(v2.5.x) above
  var inferredSpeed = v1.includes('fast') ? 'fast'
    : v1.includes('slow') ? 'developing' : null;
  var inferredReaction = v1.includes('gameAware') ? 'quick' : null;
  // eslint-disable-next-line no-unused-vars -- see TODO(v2.5.x) above
  var inferredContact = (player.batSkills || []).includes('goodContact') ? 'high'
    : (player.batSkills || []).includes('poorContact') ? 'developing' : null;
  // eslint-disable-next-line no-unused-vars -- see TODO(v2.5.x) above
  var inferredPower = (player.batSkills || []).includes('power') ? 'high' : null;
  // eslint-disable-next-line no-unused-vars -- see TODO(v2.5.x) above
  var inferredDiscipline = (player.batSkills || []).includes('patientHitter')
    ? 'disciplined' : null;

  return {
    ...player,

    name: player.name || player.playerName || "Unknown Player",

    // Fielding
    reliability: player.reliability ?? inferredReliability ?? "average",
    reaction: player.reaction ?? inferredReaction ?? "average",
    armStrength: player.armStrength ?? inferredArm ?? "average",
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
