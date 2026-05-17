/**
 * OfflineIndicator
 * Extracted from App.jsx v1.6.9
 * Connectivity status pill displayed in the app header.
 * Returns null when online and no local cache exists (the happy-path default).
 *
 * Phase 3 Step 4 migration: consumes Stack + Text primitives. Three dot
 * colors now reference tokens (brand.red, status.warning, status.success —
 * all exact matches). The rgba background/border tints remain literal —
 * no token equivalents for the alpha-blended variants.
 *
 * Non-interactive by contract: renders <div>, not Pill/Button.
 *
 * Props:
 *   isOnline    {boolean}  navigator.onLine state
 *   hasCache    {boolean}  whether the active team has a local roster cache
 *   isLandscape {boolean}  true when device is in landscape orientation
 */

import { Stack } from '../ui/Stack';
import { Text } from '../ui/Text';
import { tokens } from '../../theme/tokens';

export function OfflineIndicator({ isOnline, hasCache, isLandscape }) {
  if (isOnline && !hasCache) return null;

  var dot, label, bg, border;
  if (!isOnline && !hasCache) {
    dot = tokens.color.brand.red;       label = "No Connection";
    bg  = "rgba(200,16,46,0.15)";       border = "rgba(200,16,46,0.35)";
  } else if (!isOnline && hasCache) {
    dot = tokens.color.status.warning;  label = "Offline Mode";
    bg  = "rgba(212,160,23,0.15)";      border = "rgba(212,160,23,0.35)";
  } else {
    dot = tokens.color.status.success;  label = "Offline Ready";
    bg  = "rgba(39,174,96,0.12)";       border = "rgba(39,174,96,0.3)";
  }

  return (
    <Stack
      direction="row"
      align="center"
      gap="xs"
      title={label}
      style={{
        padding: "3px 8px",
        borderRadius: tokens.radius.pill,
        background: bg,
        border: "1px solid " + border,
        cursor: "default",
        flexShrink: 0,
      }}
    >
      <div style={{
        width: "7px",
        height: "7px",
        borderRadius: "50%",
        background: dot,
        flexShrink: 0,
      }} />
      {!isLandscape ? (
        <Text
          size="sm"
          // style escape: rgba alpha on text.onDark has no token;
          // letterSpacing 0.05em drifts from tokens.font.letterSpacing.wide (0.06em)
          style={{
            color: "rgba(255,255,255,0.75)",
            letterSpacing: "0.05em",
            whiteSpace: "nowrap",
            display: "block",
          }}
        >
          {label}
        </Text>
      ) : null}
    </Stack>
  );
}
