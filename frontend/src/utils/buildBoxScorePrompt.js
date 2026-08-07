/**
 * Extracted from App.jsx's parseGameResult() (P1 test coverage gap,
 * DOC_TEST_DEBT.md "Box-score AI parser test coverage (teamName fix,
 * PR #229)") — the systemPrompt/userContent construction was inline,
 * closure-scoped over `activeTeam`/`roster` component state, with no way
 * to unit-test it independently of rendering the whole App. Pure data
 * transformation, no side effects — same extraction pattern already used
 * for buildSharePayload.js (Share Link Payload Integrity P0).
 *
 * v2.5.20/v2.5.21 (Story 84, PR #178; PR #228; PR #229) fixed an undefined
 * `teamName` reference here, replaced with `activeTeam.name` guarded by a
 * falsy check. This extraction preserves that exact guard — every team-name
 * interpolation site uses `(activeTeam && activeTeam.name ? activeTeam.name
 * : "")`, never a bare `activeTeam.name` that could reintroduce the
 * undefined-string bug shape if `activeTeam` is null.
 */

/**
 * @param {"image"|"pdf"|"text"} sourceType
 * @param {string} sourceData - base64 image/pdf data, or raw text for "text"
 * @param {string} [mediaType] - image MIME type, only used for sourceType "image"
 * @param {object|null} activeTeam - uses .name only
 * @param {Array} roster - player objects with .name
 * @returns {{ systemPrompt: string, userContent: string|Array }}
 */
export function buildBoxScorePrompt(sourceType, sourceData, mediaType, activeTeam, roster) {
  var teamName = (activeTeam && activeTeam.name) ? activeTeam.name : "";
  var rosterNames = (roster || []).map(function(r) { return r.name; }).join(", ");

  var systemPrompt = "You are a baseball box score parser. " +
    "Extract game result and individual batting stats. " +
    "Team name is " + teamName + ". Players to look for: " + rosterNames + ". " +
    "Return ONLY valid JSON with this structure: " +
    '{ "result": "W" or "L" or "T", "ourScore": "7", "theirScore": "3", ' +
    '"battingPerf": { "PlayerName": { "ab": 3, "h": 2, "r": 1, "rbi": 1, "bb": 0 } } }. ' +
    "Only include players you find stats for. No markdown, no explanation.";

  var userContent;
  if (sourceType === "image") {
    userContent = [
      { type: "image", source: { type: "base64", media_type: mediaType || "image/png", data: sourceData } },
      { type: "text", text: "Parse this box score or game result image. Extract the final score and individual batting stats for " + teamName + " players." }
    ];
  } else if (sourceType === "pdf") {
    userContent = [
      { type: "document", source: { type: "base64", media_type: "application/pdf", data: sourceData } },
      { type: "text", text: "Parse this box score or game result PDF. Extract the final score and individual batting stats for " + teamName + " players." }
    ];
  } else {
    userContent = "Parse this game result. Extract final score and batting stats for " + teamName + " players.\n\n" + sourceData;
  }

  return { systemPrompt: systemPrompt, userContent: userContent };
}
