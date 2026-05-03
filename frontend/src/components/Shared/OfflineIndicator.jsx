/**
 * OfflineIndicator
 * Extracted from App.jsx v1.6.9
 * Connectivity status pill displayed in the app header.
 * Returns null when online and no local cache exists (the happy-path default).
 * Props:
 *   isOnline    {boolean}  navigator.onLine state
 *   hasCache    {boolean}  whether the active team has a local roster cache
 *   isLandscape {boolean}  true when device is in landscape orientation
 */

export function OfflineIndicator({ isOnline, hasCache, isLandscape }) {
  if (isOnline && !hasCache) return null;

  var dot, label, bg, border;
  if (!isOnline && !hasCache) {
    dot = "#c8102e"; label = "No Connection"; bg = "rgba(200,16,46,0.15)"; border = "rgba(200,16,46,0.35)";
  } else if (!isOnline && hasCache) {
    dot = "#d4a017"; label = "Offline Mode"; bg = "rgba(212,160,23,0.15)"; border = "rgba(212,160,23,0.35)";
  } else {
    dot = "#27ae60"; label = "Offline Ready"; bg = "rgba(39,174,96,0.12)"; border = "rgba(39,174,96,0.3)";
  }

  return (
    <div title={label} style={{ display:"flex", alignItems:"center", gap:"5px",
      padding:"3px 8px", borderRadius:"999px", background:bg, border:"1px solid " + border,
      cursor:"default", flexShrink:0 }}>
      <div style={{ width:"7px", height:"7px", borderRadius:"50%", background:dot, flexShrink:0 }} />
      {!isLandscape ? (
        <span style={{ fontSize:"12px", color:"rgba(255,255,255,0.75)", letterSpacing:"0.05em", whiteSpace:"nowrap" }}>
          {label}
        </span>
      ) : null}
    </div>
  );
}
