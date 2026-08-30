import { useState } from "react";
import { LEGAL_DOCS, getLegalDoc } from "../../content/legal";
import { LegalDocBody } from "../Legal/LegalDocBody";
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
 *   Doc body  → LegalDocBody (shared with the registration-screen consent
 *               sheet, Legal/LegalDocSheet.jsx — single rendering path, see
 *               that file's header comment)
 *   Layout    → Stack
 *   Typography → Text
 *
 * initialDocId (optional): pre-opens a specific doc (e.g. "terms") instead
 * of the list view. Wired for the Account tab's "Terms of Service" entry
 * point — see the hand-off snippet for renderAccount() in App.jsx (not
 * applied here; App.jsx is a gated file). Passing null/omitting behaves
 * exactly as before this prop existed.
 */
export function LegalSection({ initialDocId = null }) {
  var _initial = initialDocId ? getLegalDoc(initialDocId) : null;
  var _open = useState(_initial || null);
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
            onClick={function() { setOpenDoc(getLegalDoc(doc.id)); }}
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
          Each document lists its own effective date &middot; Questions? Use the Feedback tab.
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
          <LegalDocBody doc={doc} />
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
