import { useState } from "react";
import { LEGAL_DOCS } from "../../content/legal";
import { ListRow } from "../ui/ListRow";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Text } from "../ui/Text";
import { Stack } from "../ui/Stack";
import { tokens } from "../../theme/tokens";

/**
 * LegalSection
 * Support tab → Legal sub-tab.
 * Two views: list (cards for each document) and detail (single document reader).
 *
 * Phase 3 Step 3 migration: C/S props removed; consumes ui primitives.
 *   Doc rows  → ListRow
 *   Back nav  → Button variant="ghost" + border:none style escape
 *   Doc body  → Card (style escape — S.card has no clean token equivalent)
 *   Layout    → Stack
 *   Typography → Text
 */
export function LegalSection() {
  var _open = useState(null);
  var openDoc = _open[0];
  var setOpenDoc = _open[1];

  if (openDoc) {
    return <LegalViewer doc={openDoc} onBack={function() { setOpenDoc(null); }} />;
  }

  return (
    <div>
      <div style={{ padding: "12px 16px 4px" }}>
        <Text
          size="xs"
          weight="bold"
          style={{
            display: "block",
            letterSpacing: tokens.font.letterSpacing.wider,
            textTransform: "uppercase",
            color: tokens.color.text.tertiary,
          }}
        >
          Legal &amp; Policies
        </Text>
      </div>
      {LEGAL_DOCS.map(function(doc, idx, arr) {
        var isLast = idx === arr.length - 1;
        return (
          <ListRow
            key={doc.id}
            onClick={function() { setOpenDoc(doc); }}
            showDivider={!isLast}
          >
            <span style={{
              fontSize: "20px",
              marginRight: tokens.space.md,
              flexShrink: 0,
            }}>
              {doc.emoji}
            </span>
            <Stack
              direction="col"
              gap="xs"
              style={{ flex: 1, minWidth: 0 }}
            >
              <Text size="md" weight="semibold" family="serif" color="navy">
                {doc.title}
              </Text>
              <Text size="sm" color="secondary">
                {doc.summary}
              </Text>
            </Stack>
            <Text
              size="lg"
              color="secondary"
              style={{ marginLeft: tokens.space.sm, flexShrink: 0 }}
            >
              ›
            </Text>
          </ListRow>
        );
      })}
      <div style={{ padding: tokens.space.lg }}>
        <Text
          size="xs"
          color="tertiary"
          style={{ display: "block", textAlign: "center", lineHeight: tokens.font.lineHeight.comfortable }}
        >
          Last updated April 2026 &middot; Questions? Use the Feedback tab.
        </Text>
      </div>
    </div>
  );
}

function LegalViewer({ doc, onBack }) {
  return (
    <div>
      {/* Back header */}
      <div style={{
        padding: "12px 16px",
        borderBottom: "1px solid " + tokens.color.border.default,
        background: tokens.color.surface.card,
      }}>
        <Stack direction="row" align="center" gap="md">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            style={{ border: "none" }}
          >
            ‹ Back
          </Button>
          <Text
            size="md"
            weight="bold"
            color="navy"
            style={{ display: "block", flex: 1 }}
          >
            {doc.emoji} {doc.title}
          </Text>
        </Stack>
      </div>

      {/* Document body */}
      <div style={{ margin: "12px 12px 4px", marginBottom: "14px" /* drift: no space token */ }}>
        {/* Story 64: shadow tokenized as shadow.subtleCard; radius drifts to
            radius.md (8px, was 10px); padding 16px 18px stays raw (drift —
            no asymmetric Card padding token). Full S.card remediation deferred
            to App.jsx-unlock session per Story 64 recommendation (a). */}
        <Card
          radius="md"
          shadow={false}
          style={{
            // padding drift: 16px (tokens.space.lg) vertical, 18px raw horizontal — no asymmetric token
            padding: "16px 18px",
            boxShadow: tokens.shadow.subtleCard,
            border: "1px solid " + tokens.color.border.default,
          }}
        >
          <Text
            size="xs"
            color="tertiary"
            style={{ display: "block", marginBottom: tokens.space.lg }}
          >
            Last updated {doc.lastUpdated}
          </Text>
          {doc.sections.map(function(section, idx) {
            if (section.type === "h3") {
              return (
                <Text
                  key={idx}
                  size="body"
                  weight="bold"
                  color="navy"
                  style={{
                    display: "block",
                    marginTop: idx === 0 ? 0 : tokens.space.lg,
                    marginBottom: "6px",
                    letterSpacing: "0.02em",
                  }}
                >
                  {section.text}
                </Text>
              );
            }
            if (section.type === "p") {
              return (
                <Text
                  key={idx}
                  size="body"
                  color="primary"
                  style={{
                    display: "block",
                    lineHeight: tokens.font.lineHeight.relaxed,
                    marginBottom: "10px",
                  }}
                >
                  {section.text}
                </Text>
              );
            }
            if (section.type === "ul") {
              return (
                <ul key={idx} style={{
                  margin: "0 0 10px",
                  paddingLeft: tokens.space.xl,
                  fontSize: tokens.font.size.body,
                  color: tokens.color.text.primary,
                  lineHeight: tokens.font.lineHeight.relaxed,
                }}>
                  {section.items.map(function(item, i) {
                    return <li key={i} style={{ marginBottom: tokens.space.xs }}>{item}</li>;
                  })}
                </ul>
              );
            }
            return null;
          })}
        </Card>
      </div>

      <div style={{ padding: "12px 16px 24px" }}>
        <Text
          size="xs"
          color="tertiary"
          style={{ display: "block", textAlign: "center" }}
        >
          Questions about this policy? Use the Feedback tab.
        </Text>
      </div>
    </div>
  );
}
