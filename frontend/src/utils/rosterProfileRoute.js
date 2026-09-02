const PLAYER_PARAM = "player";
const ALL_PLAYERS_PARAM = "players";

export function readRosterProfileRoute(search) {
  const params = new URLSearchParams(search || "");
  if (params.get(ALL_PLAYERS_PARAM) === "all") return "all";
  const player = (params.get(PLAYER_PARAM) || "").trim();
  return player || null;
}

export function buildRosterProfileSearch(search, mode) {
  const params = new URLSearchParams(search || "");
  params.delete(PLAYER_PARAM);
  params.delete(ALL_PLAYERS_PARAM);

  if (mode === "all") params.set(ALL_PLAYERS_PARAM, "all");
  else if (mode) params.set(PLAYER_PARAM, mode);

  const next = params.toString();
  return next ? "?" + next : "";
}
