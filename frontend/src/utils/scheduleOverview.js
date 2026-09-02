export function getScheduleOverview(schedule, now) {
  const games = Array.isArray(schedule) ? schedule : [];
  const today = now ? new Date(now) : new Date();
  today.setHours(0, 0, 0, 0);

  let wins = 0;
  let losses = 0;
  let ties = 0;
  for (const game of games) {
    if (game.result === "W") wins++;
    else if (game.result === "L") losses++;
    else if (game.result === "T") ties++;
  }

  const upcoming = games
    .filter(function(game) {
      return game.result !== "X"
        && !game.scoreReported
        && game.date
        && new Date(game.date + "T12:00:00") >= today;
    })
    .sort(function(a, b) {
      return new Date(a.date + "T12:00:00") - new Date(b.date + "T12:00:00");
    });

  return { wins, losses, ties, nextGame: upcoming[0] || null };
}
