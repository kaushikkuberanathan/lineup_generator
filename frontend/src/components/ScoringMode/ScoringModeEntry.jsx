import { useState } from 'react';
import { tokens } from '../../theme/tokens';

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
  var _half = useState('top');
  var myTeamHalf = _half[0]; var setMyTeamHalf = _half[1];

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
      background: tokens.color.gameDay.surface.shell,
      color: tokens.color.gameDay.text.primary,
      fontFamily: "Georgia,'Times New Roman',serif",
      paddingBottom: 40,
    }}>

      {/* ── Header ────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px',
        borderBottom: `1px solid ${tokens.color.overlay.whiteFaint}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '18px', fontWeight: 'bold', color: tokens.color.brand.gold }}>
            ⚾ Scoring Mode
          </span>
          <span style={{
            background: tokens.color.gameDay.scoringModeEntry.betaBadge.background, color: tokens.color.gameDay.text.primary,
            fontSize: '10px', fontWeight: 'bold',
            letterSpacing: '0.1em', padding: '3px 8px',
            borderRadius: '20px', textTransform: 'uppercase',
          }}>
            BETA
          </span>
        </div>
        <button onClick={onClose} style={{
          background: tokens.color.overlay.whiteFaint,
          border: `1px solid ${tokens.color.gameDay.scoringModeEntry.closeButton.border}`,
          color: tokens.color.gameDay.text.primary, borderRadius: '8px',
          padding: '6px 12px', cursor: 'pointer',
          fontSize: '14px', fontFamily: 'inherit',
        }}>
          ✕
        </button>
      </div>

      <div style={{ padding: '20px' }}>

        {/* ── Game card ─────────────────────────────────────────── */}
        <div style={{
          background: tokens.color.brand.navy, borderRadius: '12px',
          border: `1px solid ${tokens.color.gameDay.scoringModeEntry.cardBorder}`,
          padding: '16px', marginBottom: '20px',
        }}>
          <div style={{
            fontSize: '11px', color: tokens.color.gameDay.text.muted,
            textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px',
          }}>
            Team
          </div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: tokens.color.brand.gold, marginBottom: '14px' }}>
            {activeTeam ? activeTeam.name : '—'}
          </div>

          {todayGame ? (
            <div style={{
              background: tokens.color.gameDay.scoringModeEntry.todayGameCard.background, borderRadius: '8px',
              border: `1px solid ${tokens.color.gameDay.scoringModeEntry.todayGameCard.border}`, padding: '12px',
            }}>
              <div style={{
                fontSize: '10px', fontWeight: 'bold', color: tokens.color.brand.gold,
                letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px',
              }}>
                Today&apos;s Game
              </div>
              <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                vs {todayGame.opponent}
              </div>
              <div style={{ fontSize: '12px', color: tokens.color.gameDay.text.secondary, marginTop: '3px' }}>
                {fmtDate(todayGame.date)}
                {todayGame.time ? ' · ' + todayGame.time : ''}
                {todayGame.location ? ' · ' + todayGame.location : ''}
              </div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: '13px', color: tokens.color.gameDay.text.muted, marginBottom: '10px' }}>
                No game today
              </div>
              {nextGames.length > 0 ? (
                <div>
                  <div style={{
                    fontSize: '11px', color: tokens.color.gameDay.text.caption,
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
                          background: isSel ? tokens.color.overlay.goldTint : tokens.color.gameDay.scoringModeEntry.subtleRowBackground,
                          border: isSel
                            ? `1px solid ${tokens.color.overlay.goldStrong}`
                            : `1px solid ${tokens.color.overlay.whiteFaint}`,
                          borderRadius: '8px', padding: '10px 12px', marginBottom: '6px',
                          cursor: 'pointer', color: tokens.color.gameDay.text.primary, fontFamily: 'inherit',
                        }}>
                        <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
                          vs {item.game.opponent}
                        </div>
                        <div style={{ fontSize: '11px', color: tokens.color.gameDay.text.secondary, marginTop: '2px' }}>
                          {item.days === 1 ? 'Tomorrow' : fmtDate(item.game.date)}
                          {item.game.time ? ' · ' + item.game.time : ''}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div style={{ fontSize: '12px', color: tokens.color.gameDay.scoringModeEntry.disabledText }}>
                  No upcoming games scheduled
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Which half does our team bat? ─────────────────────── */}
        <div style={{display:'flex',gap:'8px',marginBottom:'12px',
                     justifyContent:'center'}}>
          <div style={{fontSize:'12px',color:tokens.color.gameDay.scoringModeEntry.mutedText,
                       alignSelf:'center',marginRight:'4px'}}>
            We bat:
          </div>
          <button
            onClick={function(){setMyTeamHalf('top');}}
            style={{
              padding:'6px 16px', borderRadius:'20px', border:'none',
              background: myTeamHalf==='top' ? tokens.color.gameDay.scoringModeEntry.halfToggle.activeBackground : tokens.color.overlay.whiteFaint,
              color: myTeamHalf==='top' ? tokens.color.gameDay.text.primary : tokens.color.gameDay.scoringModeEntry.mutedText,
              fontWeight: myTeamHalf==='top' ? 700 : 400,
              fontSize:'13px', cursor:'pointer'
            }}>▲ Top</button>
          <button
            onClick={function(){setMyTeamHalf('bottom');}}
            style={{
              padding:'6px 16px', borderRadius:'20px', border:'none',
              background: myTeamHalf==='bottom' ? tokens.color.gameDay.scoringModeEntry.halfToggle.activeBackground : tokens.color.overlay.whiteFaint,
              color: myTeamHalf==='bottom' ? tokens.color.gameDay.text.primary : tokens.color.gameDay.scoringModeEntry.mutedText,
              fontWeight: myTeamHalf==='bottom' ? 700 : 400,
              fontSize:'13px', cursor:'pointer'
            }}>▼ Bottom</button>
        </div>

        {/* ── Claim Scorer ──────────────────────────────────────── */}
        <button
          onClick={function() { if (activeGame) { onClaimScorer(activeGame, myTeamHalf); } }}
          disabled={!activeGame}
          style={{
            width: '100%', padding: '16px', borderRadius: '10px', border: 'none',
            background: activeGame ? tokens.color.gameDay.scoringModeEntry.claimButton.background : tokens.color.gameDay.scoringModeEntry.claimButton.disabledBackground,
            color: activeGame ? tokens.color.gameDay.text.primary : tokens.color.gameDay.text.caption,
            fontSize: '15px', fontWeight: 'bold',
            cursor: activeGame ? 'pointer' : 'default',
            fontFamily: 'inherit', marginBottom: '12px',
            boxShadow: activeGame ? `0 4px 16px ${tokens.color.gameDay.scoringModeEntry.claimButton.shadow}` : 'none',
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
              color: activeGame ? tokens.color.gameDay.scoringModeEntry.viewerLink.color : tokens.color.gameDay.scoringModeEntry.disabledText,
              fontSize: '14px',
              cursor: activeGame ? 'pointer' : 'default',
              fontFamily: 'inherit', padding: '4px 8px',
            }}>
            Join as Viewer →
          </button>
        </div>

        {/* ── Divider ───────────────────────────────────────────── */}
        <div style={{ borderTop: `1px solid ${tokens.color.overlay.whiteFaint}`, marginBottom: '20px' }} />

        {/* ── Practice Mode card ────────────────────────────────── */}
        <button
          onClick={onPractice}
          style={{
            width: '100%', textAlign: 'left', display: 'block',
            background: tokens.color.gameDay.scoringModeEntry.subtleRowBackground,
            border: `1px solid ${tokens.color.gameDay.scoringModeEntry.cardBorder}`,
            borderRadius: '12px', padding: '16px',
            cursor: 'pointer', color: tokens.color.gameDay.text.primary, fontFamily: 'inherit',
          }}>
          <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '3px' }}>
            🏋 Practice Mode
          </div>
          <div style={{ fontSize: '12px', color: tokens.color.gameDay.text.muted }}>
            Practice without saving
          </div>
          <div style={{ fontSize: '11px', color: tokens.color.gameDay.text.caption, marginTop: '2px' }}>
            Pitches won&apos;t be recorded to the scorebook
          </div>
        </button>

      </div>
    </div>
  );
}
