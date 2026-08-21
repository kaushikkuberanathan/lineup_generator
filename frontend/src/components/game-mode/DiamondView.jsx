/**
 * DiamondView
 * SVG baseball diamond showing all 10 defensive positions for a given inning.
 * Each position circle is tappable — fires onTapPosition(positionKey).
 * Unassigned positions render as a faint dashed circle showing the position key.
 * Props:
 *   roster         {Array}     player objects with .name
 *   grid           {object}    player name → position[] per inning
 *   inning         {number}    0-based inning index to display
 *   onTapPosition  {function}  called with position key (e.g. "SS") on tap
 */

import { tokens } from '../../theme/tokens';

// Position group colors (battery / infield / outfield)
var TOKEN_COLORS = {
  P: tokens.color.gameDay.diamond.position.battery, C: tokens.color.gameDay.diamond.position.battery,                                   // Battery
  "1B":tokens.color.gameDay.diamond.position.infield,"2B":tokens.color.gameDay.diamond.position.infield,"3B":tokens.color.gameDay.diamond.position.infield, SS:tokens.color.gameDay.diamond.position.infield,     // Infield
  LF: tokens.color.gameDay.diamond.position.outfield, LC: tokens.color.gameDay.diamond.position.outfield, RC: tokens.color.gameDay.diamond.position.outfield,  RF: tokens.color.gameDay.diamond.position.outfield,    // Outfield
};

// SVG coordinate layout — viewBox "0 0 320 310"
// Diamond vertices (for basepath lines): Home(160,268) 1B(248,200) 2B(160,132) 3B(72,200)
var POSITIONS = [
  { key:"LF",  x:40,   y:68,  r:26 },
  { key:"LC",  x:112,  y:34,  r:26 },
  { key:"RC",  x:208,  y:34,  r:26 },
  { key:"RF",  x:280,  y:68,  r:26 },
  { key:"3B",  x:68,   y:200, r:28 },
  { key:"SS",  x:108,  y:158, r:28 },
  { key:"2B",  x:160,  y:130, r:28 },
  { key:"1B",  x:252,  y:200, r:28 },
  { key:"P",   x:160,  y:192, r:28 },
  { key:"C",   x:160,  y:282, r:28 },
];

// Diamond base corners (for line drawing only)
var HOME   = { x:160, y:268 };
var FIRST  = { x:248, y:200 };
var SECOND = { x:160, y:132 };
var THIRD  = { x:72,  y:200 };

function firstName(name) {
  if (!name) return "—";
  return name.split(" ")[0];
}

function playerAt(pos, inning, roster, grid) {
  for (var i = 0; i < roster.length; i++) {
    var p = roster[i];
    if ((grid[p.name] || [])[inning] === pos) return p.name;
  }
  return null;
}

export function DiamondView({ roster, grid, inning, onTapPosition }) {
  return (
    <div style={{
      width:"100%", display:"flex", justifyContent:"center",
      alignItems:"center", flex:1, padding:"4px 0",
      background:tokens.color.gameDay.diamond.surface.gradient,
    }}>
      <svg
        viewBox="0 0 320 310"
        width="100%"
        style={{ maxWidth:"420px", display:"block", overflow:"visible" }}
        xmlns="http://www.w3.org/2000/svg">

        {/* Outfield fence arc — decorative */}
        <path
          d={"M " + THIRD.x + " " + THIRD.y + " Q 40 20 " + SECOND.x + " " + SECOND.y +
             " Q 280 20 " + FIRST.x + " " + FIRST.y}
          fill="none"
          stroke={tokens.color.gameDay.diamond.stroke.fence}
          strokeWidth="1.2"
          strokeDasharray="5 4" />

        {/* Basepath diamond — faint fill + white border */}
        <polygon
          points={
            HOME.x + "," + HOME.y + " " +
            FIRST.x + "," + FIRST.y + " " +
            SECOND.x + "," + SECOND.y + " " +
            THIRD.x + "," + THIRD.y
          }
          fill={tokens.color.gameDay.diamond.fill.basepath}
          stroke={tokens.color.gameDay.diamond.stroke.basepath}
          strokeWidth="1.5" />

        {/* Pitcher mound — white outline circle */}
        <circle
          cx="160" cy="192" r="8"
          fill="none"
          stroke={tokens.color.gameDay.diamond.stroke.mound}
          strokeWidth="1.5" />

        {/* Home plate outline */}
        <polygon
          points="155,274 165,274 167,270 160,265 153,270"
          fill="none"
          stroke={tokens.color.gameDay.diamond.stroke.homePlate}
          strokeWidth="1.5" />

        {/* Foul lines from home to 1B and 3B corners */}
        <line x1={HOME.x} y1={HOME.y} x2="300" y2="130"
          stroke={tokens.color.gameDay.diamond.stroke.foulLine} strokeWidth="1" />
        <line x1={HOME.x} y1={HOME.y} x2="20"  y2="130"
          stroke={tokens.color.gameDay.diamond.stroke.foulLine} strokeWidth="1" />

        {/* Position tokens */}
        {POSITIONS.map(function(pos) {
          var name = playerAt(pos.key, inning, roster, grid);
          var assigned = name !== null;
          var color = TOKEN_COLORS[pos.key] || tokens.color.gameDay.diamond.position.fallback;
          var fn = assigned ? firstName(name) : null;
          var initial = fn ? fn.charAt(0).toUpperCase() : null;

          return (
            <g key={pos.key}
              onClick={function(k) { return function() { onTapPosition(k); }; }(pos.key)}
              style={{ cursor:"pointer" }}>

              {/* Invisible tap area — larger than visible circle */}
              <circle cx={pos.x} cy={pos.y} r={pos.r + 6} fill="transparent" />

              {assigned ? (
                <>
                  {/* Token background */}
                  <circle
                    cx={pos.x} cy={pos.y} r={pos.r}
                    fill={color}
                    opacity="0.92" />
                  {/* Subtle inner highlight ring */}
                  <circle
                    cx={pos.x} cy={pos.y} r={pos.r}
                    fill="none"
                    stroke={tokens.color.gameDay.diamond.stroke.highlight}
                    strokeWidth="1" />

                  {/* Line 1: Player initial — large, bold */}
                  <text
                    x={pos.x} y={pos.y - 7}
                    textAnchor="middle"
                    fontSize="14"
                    fontWeight="bold"
                    fontFamily="Georgia, serif"
                    fill={tokens.color.gameDay.diamond.text.primary}
                    style={{ pointerEvents:"none", userSelect:"none" }}>
                    {initial}
                  </text>

                  {/* Line 2: First name — small */}
                  <text
                    x={pos.x} y={pos.y + 4}
                    textAnchor="middle"
                    fontSize={fn && fn.length > 6 ? 6 : 7}
                    fontWeight="normal"
                    fontFamily="Georgia, serif"
                    fill={tokens.color.gameDay.diamond.text.secondary}
                    style={{ pointerEvents:"none", userSelect:"none" }}>
                    {fn}
                  </text>

                  {/* Line 3: Position abbreviation in parens */}
                  <text
                    x={pos.x} y={pos.y + 13}
                    textAnchor="middle"
                    fontSize="6.5"
                    fontWeight="normal"
                    fontFamily="Georgia, serif"
                    fill={tokens.color.gameDay.diamond.text.tertiary}
                    style={{ pointerEvents:"none", userSelect:"none" }}>
                    {"(" + pos.key + ")"}
                  </text>
                </>
              ) : (
                <>
                  {/* Unassigned — dashed outline, faint */}
                  <circle
                    cx={pos.x} cy={pos.y} r={pos.r}
                    fill={tokens.color.gameDay.diamond.fill.empty}
                    stroke={tokens.color.gameDay.diamond.stroke.empty}
                    strokeWidth="1.2"
                    strokeDasharray="4 3"
                    opacity="0.6" />
                  <text
                    x={pos.x} y={pos.y + 3.5}
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight="bold"
                    fontFamily="Georgia, serif"
                    fill={tokens.color.gameDay.diamond.text.empty}
                    style={{ pointerEvents:"none", userSelect:"none" }}>
                    {pos.key}
                  </text>
                </>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
