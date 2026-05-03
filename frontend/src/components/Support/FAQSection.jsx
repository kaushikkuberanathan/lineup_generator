import { useState } from "react";
import { FAQ_CATEGORIES } from "../../content/faqs";

/**
 * FAQSection
 * Support tab → FAQ sub-tab.
 * Category picker at top; each category expands into accordion Q&A pairs.
 *
 * Props:
 *   C   {object}  color constants from App.jsx
 */
export function FAQSection({ C }) {
  var _cat = useState(FAQ_CATEGORIES[0].id);
  var activeCategory = _cat[0];
  var setActiveCategory = _cat[1];

  var _open = useState(null);
  var openItem = _open[0];
  var setOpenItem = _open[1];

  var category = FAQ_CATEGORIES.find(function(c) { return c.id === activeCategory; });

  function toggleItem(idx) {
    setOpenItem(openItem === idx ? null : idx);
  }

  return (
    <div>
      {/* Section header */}
      <div style={{ padding: "12px 16px 4px" }}>
        <div style={{ fontSize: "11px", fontWeight: "700", letterSpacing: "0.08em", color: C.textMuted, textTransform: "uppercase" }}>
          Frequently Asked Questions
        </div>
      </div>

      {/* Category picker */}
      <div style={{
        display: "flex",
        overflowX: "auto",
        gap: "8px",
        padding: "8px 16px 12px",
        borderBottom: "1px solid " + C.border,
        WebkitOverflowScrolling: "touch",
        scrollbarWidth: "none"
      }}>
        {FAQ_CATEGORIES.map(function(cat) {
          var active = cat.id === activeCategory;
          return (
            <button
              key={cat.id}
              onClick={function() { setActiveCategory(cat.id); setOpenItem(null); }}
              style={{
                flexShrink: 0,
                padding: "6px 12px",
                borderRadius: "20px",
                border: "1px solid " + (active ? C.navy : C.border),
                background: active ? C.navy : "#fff",
                color: active ? "#fff" : C.textMuted,
                fontSize: "12px",
                fontWeight: active ? "700" : "500",
                fontFamily: "Georgia, serif",
                cursor: "pointer",
                whiteSpace: "nowrap"
              }}
            >
              {cat.emoji} {cat.label}
            </button>
          );
        })}
      </div>

      {/* Q&A accordion */}
      <div style={{ paddingBottom: "24px" }}>
        {category.items.map(function(item, idx) {
          var isOpen = openItem === idx;
          return (
            <div
              key={idx}
              style={{
                borderBottom: "1px solid " + C.border,
                background: "#fff"
              }}
            >
              <button
                onClick={function() { toggleItem(idx); }}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  width: "100%",
                  background: "none",
                  border: "none",
                  padding: "14px 16px",
                  cursor: "pointer",
                  textAlign: "left",
                  gap: "10px"
                }}
              >
                <div style={{
                  fontSize: "14px",
                  fontWeight: "600",
                  color: C.navy,
                  lineHeight: "1.4",
                  flex: 1,
                  fontFamily: "Georgia, serif"
                }}>
                  {item.q}
                </div>
                <span style={{
                  fontSize: "16px",
                  color: C.textMuted,
                  flexShrink: 0,
                  marginTop: "1px",
                  transform: isOpen ? "rotate(90deg)" : "none",
                  transition: "transform 0.15s ease",
                  display: "inline-block"
                }}>›</span>
              </button>
              {isOpen ? (
                <div style={{
                  padding: "12px 16px 16px",
                  fontSize: "13px",
                  color: "#374151",
                  lineHeight: "1.75",
                  background: "#f8fafc",
                  borderTop: "1px solid " + C.border
                }}>
                  {item.a}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div style={{ padding: "4px 16px 24px", fontSize: "11px", color: C.textMuted, textAlign: "center", lineHeight: "1.6" }}>
        Still have questions? Use the Feedback tab to ask.
      </div>
    </div>
  );
}
