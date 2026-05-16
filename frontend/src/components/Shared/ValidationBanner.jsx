/**
 * ValidationBanner
 * Extracted from App.jsx v1.6.9
 * Lineup validation banner at the top of the Defense (renderGrid) tab.
 * Shows "Lineup Ready" (green) when all innings are valid and bench is balanced,
 * or a list of issues (amber) when problems are detected.
 *
 * Phase 3 Step 4 migration: consumes Stack + Text primitives.
 * Token gaps: success/warning bg + border tints + dark-on-tint text colors
 * (#065f46, #92400e, #78350f) have no token equivalents — style escapes
 * preserve the literal values. Filed as follow-up to Story 60.
 *
 * Props:
 *   bannerReady  {boolean}   true when no issues detected
 *   bannerIssues {string[]}  array of issue description strings
 */

import { Stack } from '../ui/Stack';
import { Text } from '../ui/Text';

export function ValidationBanner({ bannerReady, bannerIssues }) {
  return (
    <Stack
      direction="row"
      align="start"
      gap="md"
      style={{
        // style escape: 10px is in tokens.js documented drift zone, no token
        borderRadius: "10px",
        padding: "12px 16px",
        marginBottom: "14px",
        background: bannerReady ? "#d1fae5" : "#fef3c7",
        border: "1px solid " + (bannerReady ? "rgba(16,185,129,0.3)" : "rgba(217,119,6,0.3)"),
      }}
    >
      <span style={{ fontSize: "20px", lineHeight: 1, flexShrink: 0 }}>
        {bannerReady ? "✅" : "⚠️"}
      </span>
      <Stack direction="col" gap="xs" style={{ flex: 1 }}>
        {bannerReady ? (
          <Text
            size="lg"
            weight="bold"
            family="serif"
            // style escape: no success-text token
            style={{ color: "#065f46", display: "block" }}
          >
            Lineup Ready — All innings valid · Bench rotation balanced
          </Text>
        ) : (
          <>
            <Text
              size="lg"
              weight="bold"
              family="serif"
              // style escape: no warning-text token
              style={{ color: "#92400e", display: "block" }}
            >
              {"Fix " + bannerIssues.length + (bannerIssues.length === 1 ? " issue" : " issues")}
            </Text>
            <ul style={{
              margin: 0,
              paddingLeft: "18px",
              // style escapes: dark-on-tint body + 14px + 1.6 line-height all lack tokens
              fontSize: "14px",
              color: "#78350f",
              lineHeight: 1.6,
            }}>
              {bannerIssues.map(function(msg, idx) {
                return <li key={idx}>{msg}</li>;
              })}
            </ul>
          </>
        )}
      </Stack>
    </Stack>
  );
}
