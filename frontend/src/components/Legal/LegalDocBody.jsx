import { Card } from "../ui/Card";
import { Text } from "../ui/Text";
import { tokens } from "../../theme/tokens";

/**
 * LegalDocBody
 * Renders one LEGAL_DOCS entry (content/legal.js): the "last updated" line,
 * an optional "Plain English" summary card (doc.tldr), and the full
 * sections[] (h3 / p / ul).
 *
 * This is the single rendering path for legal-doc content — both
 * Support/LegalSection.jsx (Account-tab-adjacent Legal list) and
 * Legal/LegalDocSheet.jsx (the registration-screen consent viewer) call
 * this, so the two surfaces can never drift into showing different text
 * for the same doc.
 */
export function LegalDocBody({ doc }) {
  if (!doc) return null;

  return (
    <>
      <Text
        size="xs"
        color="tertiary"
        style={{ display: "block", marginBottom: tokens.space.lg }}
      >
        Effective {doc.effectiveDate}
        {doc.version ? " · v" + doc.version : ""}
      </Text>

      {Array.isArray(doc.tldr) && doc.tldr.length > 0 ? (
        <Card
          radius="md"
          shadow={false}
          style={{
            padding: "14px 16px",
            marginBottom: tokens.space.lg,
            background: tokens.color.surface.subtle || tokens.color.surface.page,
            border: "1px solid " + tokens.color.border.default,
          }}
        >
          <Text
            size="xs"
            weight="bold"
            color="navy"
            style={{
              display: "block",
              marginBottom: "8px",
              letterSpacing: tokens.font.letterSpacing.wider,
              textTransform: "uppercase",
            }}
          >
            In Plain English
          </Text>
          <ul style={{
            margin: 0,
            paddingLeft: tokens.space.xl,
            fontSize: tokens.font.size.body,
            color: tokens.color.text.primary,
            lineHeight: tokens.font.lineHeight.relaxed,
          }}>
            {doc.tldr.map(function(line, i) {
              return <li key={i} style={{ marginBottom: tokens.space.xs }}>{line}</li>;
            })}
          </ul>
          <Text
            size="xs"
            color="tertiary"
            style={{ display: "block", marginTop: "8px" }}
          >
            This summary isn&apos;t a substitute for the full text below — it&apos;s just a way in.
          </Text>
        </Card>
      ) : null}

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
    </>
  );
}
