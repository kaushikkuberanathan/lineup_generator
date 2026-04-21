export function computeNextGames(upcoming, todayGame) {
  // Assumes `upcoming` is pre-sorted ascending by date (enforced upstream)
  var futurePool  = todayGame ? upcoming.slice(1) : upcoming;
  var soonestDate = futurePool.length > 0 ? futurePool[0].game.date : null;
  return soonestDate ? futurePool.filter(function(item) { return item.game.date === soonestDate; }) : [];
}

export default function ScoringModeEntry({
  activeTeam, schedule, selectedGame,
  onSelectGame, onClaimScorer, onJoinViewer,
  onPractice, onClose,
}) {
  // Partition schedule into today + next 2 upcoming
  var today = new Date(); today.setHours(0, 0, 0, 0);
  var upcoming = [];
  for (var i = 0; i < schedule.length; i++) {
    var g = schedule[i];
    if (!g.result && g.date) {
      var d = new Date(g.date + 'T12:00:00');
      if (d >= today) {
        upcoming.push({ game: g, d: d, days: Math.floor((d - today) / 86400000) });
      }
    }
  }
  upcoming.sort(function(a, b) { return a.d - b.d; });

  var todayGame  = upcoming.length > 0 && upcoming[0].days === 0 ? upcoming[0].game : null;
  var nextGames  = computeNextGames(upcoming, todayGame);
  var activeGame = selectedGame || todayGame;

  function fmtDate(dateStr) {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
    });
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0b1524',
      color: '#fff',
      fontFamily: "Georgia,'Times New Roman',serif",
      paddingBottom: 40,
    }}>

      {/* ── Header ────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#f5c842' }}>
            ⚾ Scoring Mode
          </span>
          <span style={{
            background: '#7c3aed', color: '#fff',
            fontSize: '10px', fontWeight: 'bold',
            letterSpacing: '0.1em', padding: '3px 8px',
            borderRadius: '20px', textTransform: 'uppercase',
          }}>
            BETA
          </span>
        </div>
        <button onClick={onClose} style={{
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.2)',
          color: '#fff', borderRadius: '8px',
          padding: '6px 12px', cursor: 'pointer',
          fontSize: '14px', fontFamily: 'inherit',
        }}>
          ✕
        </button>
      </div>

      <div style={{ padding: '20px' }}>

        {/* ── Game card ─────────────────────────────────────────── */}
        <div style={{
          background: '#0f1f3d', borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.10)',
          padding: '16px', marginBottom: '20px',
        }}>
          <div style={{
            fontSize: '11px', color: '#64748b',
            textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px',
          }}>
            Team
          </div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#f5c842', marginBottom: '14px' }}>
            {activeTeam ? activeTeam.name : '—'}
          </div>

          {todayGame ? (
            <div style={{
              background: 'rgba(245,200,66,0.08)', borderRadius: '8px',
              border: '1px solid rgba(245,200,66,0.25)', padding: '12px',
            }}>
              <div style={{
                fontSize: '10px', fontWeight: 'bold', color: '#f5c842',
                letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px',
              }}>
                Today's Game
              </div>
              <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                vs {todayGame.opponent}
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '3px' }}>
                {fmtDate(todayGame.date)}
                {todayGame.time ? ' · ' + todayGame.time : ''}
                {todayGame.location ? ' · ' + todayGame.location : ''}
              </div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '10px' }}>
                No game today
              </div>
              {nextGames.length > 0 ? (
                <div>
                  <div style={{
                    fontSize: '11px', color: '#475569',
                    textTransform: 'uppercase', letterSpacing: '0.08em',
                    marginBottom: '8px',
                  }}>
                    Upcoming
                  </div>
                  {nextGames.map(function(item) {
                    var isSel = selectedGame && selectedGame.id === item.game.id;
                    return (
                      <button
                        key={item.game.id}
                        onClick={function(g) { return function() { onSelectGame(g); }; }(item.game)}
                        style={{
                          width: '100%', textAlign: 'left', display: 'block',
                          background: isSel ? 'rgba(245,200,66,0.12)' : 'rgba(255,255,255,0.04)',
                          border: isSel
                            ? '1px solid rgba(245,200,66,0.4)'
                            : '1px solid rgba(255,255,255,0.08)',
                          borderRadius: '8px', padding: '10px 12px', marginBottom: '6px',
                          cursor: 'pointer', color: '#fff', fontFamily: 'inherit',
                        }}>
                        <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
                          vs {item.game.opponent}
                        </div>
                        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                          {item.days === 1 ? 'Tomorrow' : fmtDate(item.game.date)}
                          {item.game.time ? ' · ' + item.game.time : ''}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div style={{ fontSize: '12px', color: '#374151' }}>
                  No upcoming games scheduled
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Claim Scorer ──────────────────────────────────────── */}
        <button
          onClick={function() { if (activeGame) { onClaimScorer(activeGame); } }}
          disabled={!activeGame}
          style={{
            width: '100%', padding: '16px', borderRadius: '10px', border: 'none',
            background: activeGame ? '#1d4ed8' : 'rgba(255,255,255,0.06)',
            color: activeGame ? '#fff' : '#475569',
            fontSize: '15px', fontWeight: 'bold',
            cursor: activeGame ? 'pointer' : 'default',
            fontFamily: 'inherit', marginBottom: '12px',
            boxShadow: activeGame ? '0 4px 16px rgba(29,78,216,0.35)' : 'none',
            transition: 'background 150ms, box-shadow 150ms',
          }}>
          🎙 Claim Scorer
        </button>

        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <button
            onClick={function() { if (activeGame) { onJoinViewer(activeGame); } }}
            disabled={!activeGame}
            style={{
              background: 'none', border: 'none',
              color: activeGame ? '#60a5fa' : '#374151',
              fontSize: '14px',
              cursor: activeGame ? 'pointer' : 'default',
              fontFamily: 'inherit', padding: '4px 8px',
            }}>
            Join as Viewer →
          </button>
        </div>

        {/* ── Divider ───────────────────────────────────────────── */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginBottom: '20px' }} />

        {/* ── Practice Mode card ────────────────────────────────── */}
        <button
          onClick={onPractice}
          style={{
            width: '100%', textAlign: 'left', display: 'block',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: '12px', padding: '16px',
            cursor: 'pointer', color: '#fff', fontFamily: 'inherit',
          }}>
          <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '3px' }}>
            🏋 Practice Mode
          </div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            Practice without saving
          </div>
          <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>
            Pitches won't be recorded to the scorebook
          </div>
        </button>

      </div>
    </div>
  );
}
