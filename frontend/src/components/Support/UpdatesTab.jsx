import { Card } from '../ui/Card';
import { tokens } from '../../theme/tokens';

export function UpdatesTab({ versionHistory, appVersion, expandedVersion, onExpandedVersionChange, sectionTitleStyle }) {
  return (
    <Card padding="16px 18px" radius="md" style={{ border:"1px solid " + tokens.color.border.neutral, boxShadow: tokens.shadow.subtleCard, marginBottom:"14px" }}>
      <div style={sectionTitleStyle}>What&#x27;s New</div>
      {versionHistory.map(function(v, vi) {
        var isCurrent = v.version === appVersion;
        var isOpen = expandedVersion === v.version;
        return (
          <div key={v.version} style={{
            borderLeft: isCurrent ? "3px solid #27ae60" : "3px solid rgba(15,31,61,0.1)",
            background: isCurrent ? "rgba(39,174,96,0.04)" : "transparent",
            borderRadius: "0 6px 6px 0",
            padding: "10px 14px",
            marginBottom: vi < versionHistory.length - 1 ? "12px" : "0"
          }}>
            <div
              onClick={function() { onExpandedVersionChange(isOpen ? null : v.version); }}
              style={{ display:"flex", gap:"10px", alignItems:"baseline", marginBottom: isOpen ? "8px" : "0", flexWrap:"wrap", cursor:"pointer" }}>
              <span style={{ fontSize:"14px", fontWeight:"bold", color:tokens.color.brand.navy }}>v{v.version}</span>
              <span style={{ fontSize:"11px", color:tokens.color.text.muted }}>{v.date}</span>
              {isCurrent ? <span style={{ fontSize:"10px", padding:"1px 7px", borderRadius:"10px", background:"#27ae60", color:"#fff", fontWeight:"bold" }}>Current</span> : null}
              <span style={{ marginLeft:"auto", fontSize:"11px", color:tokens.color.text.muted }}>{isOpen ? "▲" : "▼"}</span>
            </div>
            {isOpen ? (
              <div>
                <div style={{ fontSize:"0.95rem", fontWeight:"600", color:tokens.color.text.ink, marginBottom:"6px", lineHeight:"1.4" }}>{v.headline}</div>
                {v.userChanges && v.userChanges.length > 0 ? (
                  <ul style={{ margin:"0 0 6px 0", paddingLeft:"0", listStyle:"none" }}>
                    {v.userChanges.map(function(ch, ci) {
                      return <li key={ci} style={{ fontSize:"0.875rem", color:tokens.color.text.muted, marginBottom:"3px", lineHeight:"1.5", display:"flex", gap:"6px" }}><span style={{ color:"#b8a040", flexShrink:0 }}>✦</span><span>{ch}</span></li>;
                    })}
                  </ul>
                ) : null}
                {v.techNote ? <div style={{ fontSize:"0.75rem", color:"#9ca3af", fontStyle:"italic" }}>🔧 {v.techNote}</div> : null}
              </div>
            ) : null}
          </div>
        );
      })}
    </Card>
  );
}
