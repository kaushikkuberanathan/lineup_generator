/**
 * ParentView
 * Extracted from App.jsx v1.6.9
 * Game Day parent/player view: horizontal player picker + per-player inning card.
 * Props:
 *   roster                 {Array}        player objects with .name property
 *   battingOrder           {string[]}     ordered list of player names
 *   grid                   {object}       player name → position[] per inning
 *   selectedParentPlayer   {string|null}  currently selected player name
 *   setSelectedParentPlayer {function}   setter for selectedParentPlayer
 */

import { tokens } from '../../theme/tokens';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Text } from '../ui/Text';

function firstName(name) {
  if (!name) return name;
  return name.split(" ")[0];
}

var POS_FULL = {
  P:"Pitcher", C:"Catcher", "1B":"First Base", "2B":"Second Base",
  "3B":"Third Base", SS:"Shortstop", LF:"Left Field", LC:"Left Center",
  RC:"Right Center", RF:"Right Field", Bench:"Bench"
};

export function ParentView({ roster, battingOrder, grid, selectedParentPlayer, setSelectedParentPlayer }) {
  var batPos = selectedParentPlayer ? battingOrder.indexOf(selectedParentPlayer) : -1;
  var assignments = selectedParentPlayer ? (grid[selectedParentPlayer] || []) : [];

  return (
    <div style={{ padding:"12px 0" }}>
      {/* Player picker */}
      <div style={{ display:"flex", gap:"6px", overflowX:"auto", padding:"0 0 10px",
        WebkitOverflowScrolling:"touch", scrollbarWidth:"none", marginBottom:"8px" }}>
        {roster.map(function(p) {
          var fn = firstName(p.name);
          var sel = selectedParentPlayer === p.name;
          return (
            <Button key={p.name}
              variant={sel ? "primary" : "ghost"}
              size="sm"
              onClick={function(n, s) { return function() { setSelectedParentPlayer(s ? null : n); }; }(p.name, sel)}
              style={{ flexShrink:0 }}>
              {fn}
            </Button>
          );
        })}
      </div>
      {selectedParentPlayer ? (
        <Card padding="lg" style={{
          borderTop:    tokens.borderWidth.heavy + " solid " + tokens.color.brand.navy,
          border:       tokens.borderWidth.hairline + " solid " + tokens.color.border.subtle,
          borderRadius: tokens.radius.lg,
          boxShadow:    tokens.shadow.subtleCard,
          marginBottom: "14px",
        }}>
          {/* Player name */}
          <Text as="div" weight="bold" style={{ fontSize:"22px", color:tokens.color.brand.navy, marginBottom:"16px" }}>
            👤 {firstName(selectedParentPlayer)}
          </Text>
          {/* Batting position */}
          <div style={{ marginBottom:"16px" }}>
            <Text as="div" uppercase style={{ fontSize:"10px", color:tokens.color.text.muted, letterSpacing:"0.12em", marginBottom:"4px" }}>Batting Order</Text>
            <Text as="div" weight="bold" style={{ fontSize:"20px", color: batPos >= 0 ? tokens.color.brand.navy : tokens.color.text.muted }}>
              {batPos >= 0 ? "#" + (batPos + 1) + " of " + battingOrder.length : "Not in order"}
            </Text>
          </div>
          {/* Positions per inning */}
          <div>
            <Text as="div" uppercase style={{ fontSize:"10px", color:tokens.color.text.muted, letterSpacing:"0.12em", marginBottom:"8px" }}>Positions This Game</Text>
            {assignments.length > 0 ? assignments.map(function(pos, i) {
              var pc = tokens.color.position[pos] || tokens.color.position.Bench;
              var isBench = pos === "Bench";
              return (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:"12px",
                  padding:"8px 10px", marginBottom:"4px", borderRadius:"6px",
                  background: isBench ? tokens.color.overlay.benchWash : tokens.color.overlay.navyWash,
                  borderLeft: tokens.borderWidth.thick + " solid " + pc }}>
                  <Text as="div" style={{ fontSize:"11px", color:tokens.color.text.muted, minWidth:"40px" }}>Inn {i+1}</Text>
                  <Text as="div" weight="bold" style={{ fontSize:"18px", color: isBench ? tokens.color.text.muted : tokens.color.brand.navy }}>
                    {POS_FULL[pos] || pos}
                  </Text>
                </div>
              );
            }) : (
              <Text as="div" style={{ fontSize:"13px", color:tokens.color.text.muted }}>No assignments found</Text>
            )}
          </div>
        </Card>
      ) : (
        <Text as="div" style={{ padding:"40px 0", textAlign:"center", color:tokens.color.text.muted, fontSize:"13px" }}>
          Select a player above to view their game day info
        </Text>
      )}
    </div>
  );
}
