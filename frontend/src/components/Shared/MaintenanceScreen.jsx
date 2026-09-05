import { tokens } from "../../theme/tokens";
import { Stack } from "../ui/Stack";
import { Text } from "../ui/Text";
import { SystemStateScreen } from './SystemStateScreen';

export function MaintenanceScreen({ version, contemporary = false }) {
  if (contemporary) {
    return <SystemStateScreen state="maintenance" title="We’ll be right back" message="Dugout Lineup is getting an update. Check back in a few minutes." version={version} />;
  }
  return (
    <Stack direction="col" align="center" justify="center" style={{
      gap: 0,
      minHeight: "100vh",
      background: tokens.color.brand.navy,
      padding: tokens.space.xl2,
      boxSizing: "border-box",
    }}>
      <div style={{ fontSize: "48px", marginBottom: tokens.space.lg }}>⚾</div>
      <Text as="div" weight="bold" family="serif" style={{
        fontSize: tokens.font.size.xl2, // drift: font.size.xl2 (22px; -2px)
        color: tokens.color.brand.gold,
        marginBottom: tokens.space.md,
        textAlign: "center",
      }}>
        We’ll be right back
      </Text>
      <Text as="div" style={{
        fontSize: tokens.font.size.md,
        color: tokens.color.overlay.whiteHeavy,
        textAlign: "center",
        maxWidth: "280px",
        lineHeight: tokens.font.lineHeight.comfortable,
      }}>
        Lineup Generator is getting an update. Check back in a few minutes.
      </Text>
      {version && (
        <Text as="div" style={{
          fontSize: tokens.font.size.xs,
          color: tokens.color.overlay.whiteMedium,
          marginTop: tokens.space.xl3,
        }}>
          v{version}
        </Text>
      )}
    </Stack>
  );
}
