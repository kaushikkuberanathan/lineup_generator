/**
 * ValidationBanner
 * Extracted from App.jsx v1.6.9
 * Lineup validation banner at the top of the Defense (renderGrid) tab.
 * Shows "Lineup Ready" (green) when all innings are valid and bench is balanced,
 * or a list of issues (amber) when problems are detected.
 * Props:
 *   bannerReady  {boolean}   true when no issues detected
 *   bannerIssues {string[]}  array of issue description strings
 */

export function ValidationBanner({ bannerReady, bannerIssues }) {
  return (
    <div style={{ borderRadius:"10px", padding:"12px 16px", marginBottom:"14px", display:"flex", alignItems:"flex-start", gap:"10px",
      background: bannerReady ? "#d1fae5" : "#fef3c7",
      border: "1px solid " + (bannerReady ? "rgba(16,185,129,0.3)" : "rgba(217,119,6,0.3)") }}>
      <span style={{ fontSize:"20px", lineHeight:1, flexShrink:0 }}>{bannerReady ? "✅" : "⚠️"}</span>
      <div style={{ flex:1 }}>
        {bannerReady ? (
          <div style={{ fontSize:"16px", fontWeight:"bold", color:"#065f46", fontFamily:"Georgia,serif" }}>
            Lineup Ready — All innings valid · Bench rotation balanced
          </div>
        ) : (
          <div>
            <div style={{ fontSize:"16px", fontWeight:"bold", color:"#92400e", fontFamily:"Georgia,serif", marginBottom:"4px" }}>
              {"Fix " + bannerIssues.length + (bannerIssues.length === 1 ? " issue" : " issues")}
            </div>
            <ul style={{ margin:0, paddingLeft:"18px" }}>
              {bannerIssues.map(function(msg, idx) {
                return <li key={idx} style={{ fontSize:"14px", color:"#78350f", lineHeight:1.6 }}>{msg}</li>;
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
