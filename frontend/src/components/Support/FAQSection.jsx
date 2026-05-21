import { useState } from "react";
import { FAQ_CATEGORIES } from "../../content/faqs";
import { Pill } from "../ui/Pill";
import { ListRow } from "../ui/ListRow";
import { Text } from "../ui/Text";
import { Stack } from "../ui/Stack";
import { tokens } from "../../theme/tokens";

/**
 * FAQSection
 * Support tab → FAQ sub-tab.
 * Category picker at top; each category expands into accordion Q&A pairs.
 *
 * Phase 3 Step 3 migration: C/S props removed; consumes ui primitives.
 *   Category pills → Pill (active/inactive)
 *   Accordion rows → ListRow (full-width tap target)
 *   Layout         → Stack
 *   Typography     → Text
 */
export function FAQSection() {
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
        <Text
          size="xs"
          weight="bold"
          style={{
            display: "block",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: tokens.color.text.tertiary,
          }}
        >
          Frequently Asked Questions
        </Text>
      </div>

      {/* Category picker — Stack handles flex/gap; outer div holds bottom border + scroll hints */}
      <div style={{
        padding: "8px 16px 12px",
        borderBottom: "1px solid " + tokens.color.border.default,
        WebkitOverflowScrolling: "touch",
        scrollbarWidth: "none",
      }}>
        <Stack
          direction="row"
          gap="sm"
          style={{ overflowX: "auto", paddingBottom: tokens.space.xs }}
        >
          {FAQ_CATEGORIES.map(function(cat) {
            return (
              <Pill
                key={cat.id}
                active={activeCategory === cat.id}
                onClick={function() {
                  setActiveCategory(cat.id);
                  setOpenItem(null);
                }}
              >
                {cat.emoji} {cat.label}
              </Pill>
            );
          })}
        </Stack>
      </div>

      {/* Q&A accordion */}
      <div style={{ paddingBottom: tokens.space.xl2 }}>
        {category.items.map(function(item, idx) {
          var isOpen = openItem === idx;
          return (
            <div key={idx}>
              <ListRow
                onClick={function() { toggleItem(idx); }}
                showDivider={!isOpen}
              >
                <Stack
                  direction="row"
                  justify="between"
                  align="start"
                  gap="md"
                  style={{ flex: 1 }}
                >
                  <Text
                    size="md"
                    weight="semibold"
                    family="serif"
                    color="navy"
                    style={{ lineHeight: "1.4", flex: 1 }}
                  >
                    {item.q}
                  </Text>
                  <span style={{
                    fontSize: tokens.font.size.lg,
                    color: tokens.color.text.tertiary,
                    flexShrink: 0,
                    marginTop: "1px",
                    transform: isOpen ? "rotate(90deg)" : "none",
                    transition: "transform " + tokens.motion.duration.fast + " " + tokens.motion.easing.standard,
                    display: "inline-block",
                  }}>›</span>
                </Stack>
              </ListRow>
              {isOpen ? (
                <div style={{
                  padding: "12px 16px 16px",
                  background: tokens.color.surface.page,
                  borderTop: "1px solid " + tokens.color.border.default,
                  borderBottom: "1px solid " + tokens.color.border.default,
                }}>
                  <Text
                    size="body"
                    style={{
                      display: "block",
                      color: "#374151",
                      lineHeight: "1.75",
                    }}
                  >
                    {item.a}
                  </Text>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div style={{ padding: "4px 16px 24px" }}>
        <Text
          size="xs"
          color="tertiary"
          style={{ display: "block", textAlign: "center", lineHeight: "1.6" }}
        >
          Still have questions? Use the Feedback tab to ask.
        </Text>
      </div>
    </div>
  );
}
