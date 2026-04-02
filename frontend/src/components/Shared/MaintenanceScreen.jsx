export function MaintenanceScreen({ version }) {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      background: "#0f1f3d",
      padding: "24px",
      boxSizing: "border-box",
    }}>
      <div style={{ fontSize: "48px", marginBottom: "16px" }}>⚾</div>
      <div style={{
        fontSize: "24px",
        fontWeight: "bold",
        color: "#f5c842",
        fontFamily: "Georgia, serif",
        marginBottom: "12px",
        textAlign: "center",
      }}>
        We'll be right back
      </div>
      <div style={{
        fontSize: "14px",
        color: "rgba(255,255,255,0.6)",
        textAlign: "center",
        maxWidth: "280px",
        lineHeight: "1.6",
      }}>
        Lineup Generator is getting an update. Check back in a few minutes.
      </div>
      {version && (
        <div style={{
          fontSize: "11px",
          color: "rgba(255,255,255,0.25)",
          marginTop: "32px",
        }}>
          v{version}
        </div>
      )}
    </div>
  );
}
