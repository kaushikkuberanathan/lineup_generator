import { tokens } from "../../theme/tokens";

export function MaintenanceScreen({ version }) {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      background: tokens.color.brand.navy,
      padding: tokens.space.xl2,
      boxSizing: "border-box",
    }}>
      <div style={{ fontSize: "48px", marginBottom: tokens.space.lg }}>⚾</div>
      <div style={{
        fontSize: tokens.font.size.xl2, // drift: font.size.xl2 (22px; -2px)
        fontWeight: "bold",
        color: tokens.color.brand.gold,
        fontFamily: tokens.font.family.serif,
        marginBottom: tokens.space.md,
        textAlign: "center",
      }}>
        We’ll be right back
      </div>
      <div style={{
        fontSize: tokens.font.size.md,
        color: tokens.color.overlay.whiteHeavy,
        textAlign: "center",
        maxWidth: "280px",
        lineHeight: tokens.font.lineHeight.comfortable,
      }}>
        Lineup Generator is getting an update. Check back in a few minutes.
      </div>
      {version && (
        <div style={{
          fontSize: tokens.font.size.xs,
          color: tokens.color.overlay.whiteMedium,
          marginTop: tokens.space.xl3,
        }}>
          v{version}
        </div>
      )}
    </div>
  );
}
