import { useState } from "react";
import { LEGAL_DOCS } from "../../content/legal";

/**
 * LegalSection
 * Support tab → Legal sub-tab.
 * Two views: list (cards for each document) and detail (single document reader).
 *
 * Props:
 *   C   {object}  color constants from App.jsx (C.navy, C.text, C.textMuted, etc.)
 *   S   {object}  shared style helpers from App.jsx (S.card, S.btn)
 */
export function LegalSection({ C, S }) {
  var _open = useState(null);
  var openDoc = _open[0];
  var setOpenDoc = _open[1];

  if (openDoc) {
    return <LegalViewer doc={openDoc} onBack={function() { setOpenDoc(null); }} C={C} S={S} />;
  }

  return (
    <div>
      <div style={{ padding: "12px 16px 4px" }}>
        <div style={{ fontSize: "11px", fontWeight: "700", letterSpacing: "0.08em", color: C.textMuted, textTransform: "uppercase" }}>
          Legal &amp; Policies
        </div>
      </div>
      {LEGAL_DOCS.map(function(doc) {
        return (
          <button
            key={doc.id}
            onClick={function() { setOpenDoc(doc); }}
            style={{
              display: "flex",
              alignItems: "center",
              width: "100%",
              background: "#fff",
              border: "none",
              borderBottom: "1px solid " + C.border,
              padding: "14px 16px",
              cursor: "pointer",
              textAlign: "left",
              fontFamily: "Georgia, 'Times New Roman', serif"
            }}
          >
            <span style={{ fontSize: "20px", marginRight: "12px", flexShrink: 0 }}>{doc.emoji}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "14px", fontWeight: "600", color: C.navy, marginBottom: "2px" }}>{doc.title}</div>
              <div style={{ fontSize: "12px", color: C.textMuted }}>{doc.summary}</div>
            </div>
            <span style={{ fontSize: "16px", color: C.textMuted, marginLeft: "8px", flexShrink: 0 }}>›</span>
          </button>
        );
      })}
      <div style={{ padding: "16px", fontSize: "11px", color: C.textMuted, textAlign: "center", lineHeight: "1.6" }}>
        Last updated March 2026 &middot; Questions? Use the Feedback tab.
      </div>
    </div>
  );
}

function LegalViewer({ doc, onBack, C, S }) {
  return (
    <div>
      {/* Back header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "12px 16px",
        borderBottom: "1px solid " + C.border,
        background: "#fff"
      }}>
        <button
          onClick={onBack}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: "14px",
            color: C.navy,
            fontFamily: "Georgia, serif",
            fontWeight: "600",
            padding: "4px 0",
            display: "flex",
            alignItems: "center",
            gap: "4px"
          }}
        >
          ‹ Back
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "14px", fontWeight: "700", color: C.navy }}>
            {doc.emoji} {doc.title}
          </div>
        </div>
      </div>

      {/* Document body */}
      <div style={Object.assign({}, S.card, { margin: "12px 12px 4px" })}>
        <div style={{ fontSize: "11px", color: C.textMuted, marginBottom: "16px" }}>
          Last updated {doc.lastUpdated}
        </div>
        {doc.sections.map(function(section, idx) {
          if (section.type === "h3") {
            return (
              <div key={idx} style={{
                fontSize: "13px",
                fontWeight: "700",
                color: C.navy,
                marginTop: idx === 0 ? 0 : "16px",
                marginBottom: "6px",
                letterSpacing: "0.02em"
              }}>
                {section.text}
              </div>
            );
          }
          if (section.type === "p") {
            return (
              <div key={idx} style={{
                fontSize: "13px",
                color: C.text,
                lineHeight: "1.7",
                marginBottom: "10px"
              }}>
                {section.text}
              </div>
            );
          }
          if (section.type === "ul") {
            return (
              <ul key={idx} style={{
                margin: "0 0 10px",
                paddingLeft: "20px",
                fontSize: "13px",
                color: C.text,
                lineHeight: "1.7"
              }}>
                {section.items.map(function(item, i) {
                  return <li key={i} style={{ marginBottom: "4px" }}>{item}</li>;
                })}
              </ul>
            );
          }
          return null;
        })}
      </div>

      <div style={{ padding: "12px 16px 24px", fontSize: "11px", color: C.textMuted, textAlign: "center" }}>
        Questions about this policy? Use the Feedback tab.
      </div>
    </div>
  );
}
