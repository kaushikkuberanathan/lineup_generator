import { useEffect, useState } from "react";
import { HELP_CATEGORIES, GAME_DAY_HELP_IDS } from "../../content/faqs";
import { Pill } from "../ui/Pill";
import { ListRow } from "../ui/ListRow";
import { Text } from "../ui/Text";
import { Stack } from "../ui/Stack";
import { tokens } from "../../theme/tokens";
import { track } from "../../utils/analytics";

// Flattened lookup used by search and the Game-Day Help quick-access list.
// Each entry carries its owning category so a result can be opened directly
// without the coach having to first pick the right category tab.
var ALL_ITEMS = HELP_CATEGORIES.reduce(function(acc, cat) {
  cat.items.forEach(function(item) {
    acc.push({ item: item, categoryId: cat.id, categoryLabel: cat.label, categoryEmoji: cat.emoji });
  });
  return acc;
}, []);

var GAME_DAY_ITEMS = GAME_DAY_HELP_IDS
  .map(function(id) { return ALL_ITEMS.find(function(e) { return e.item.id === id; }); })
  .filter(Boolean);

function matchesQuery(entry, query) {
  var q = query.toLowerCase();
  return entry.item.q.toLowerCase().indexOf(q) >= 0 || entry.item.a.toLowerCase().indexOf(q) >= 0;
}

/**
 * FAQSection
 * Support tab → Help sub-tab (component name/file kept as FAQSection to
 * avoid an App.jsx import-path change; the rendered content is "Help").
 *
 * Layout: Game-Day Help quick-access (curated, offline, no category-picking
 * required) → search → Browse Help (task-oriented categories, accordion).
 * Search results are a flat list across all categories so a coach doesn't
 * need to guess which bucket an article landed in.
 */
export function FAQSection() {
  var _cat = useState(HELP_CATEGORIES[0].id);
  var activeCategory = _cat[0];
  var setActiveCategory = _cat[1];

  var _open = useState(null);
  var openItemId = _open[0];
  var setOpenItemId = _open[1];

  var _query = useState("");
  var query = _query[0];
  var setQuery = _query[1];

  var category = HELP_CATEGORIES.find(function(c) { return c.id === activeCategory; });
  var trimmedQuery = query.trim();
  var isSearching = trimmedQuery.length > 0;
  var searchResults = isSearching ? ALL_ITEMS.filter(function(e) { return matchesQuery(e, trimmedQuery); }) : [];

  // Privacy-safe search analytics: never send the raw query text (see
  // content-rule discussion — coaches type player names, phone numbers,
  // etc. into search boxes). Fires once per settled query, not per keystroke.
  useEffect(function() {
    if (!isSearching) return;
    var timer = setTimeout(function() {
      var categoryMatch = searchResults.some(function(e) { return e.categoryId === activeCategory; });
      track("help_search", {
        query_length: trimmedQuery.length,
        result_count: searchResults.length,
        zero_results: searchResults.length === 0,
        category_match: categoryMatch
      });
    }, 400);
    return function() { clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trimmedQuery]);

  function openArticle(itemId, categoryId, entryPoint) {
    var willOpen = openItemId !== itemId;
    setOpenItemId(willOpen ? itemId : null);
    if (willOpen) {
      track("help_article_open", { article_id: itemId, category_id: categoryId, entry_point: entryPoint });
    }
  }

  function selectCategory(catId) {
    setActiveCategory(catId);
    setOpenItemId(null);
    track("help_category_view", { category_id: catId });
  }

  var searchInputStyle = {
    width: "100%",
    boxSizing: "border-box",
    padding: "10px 14px",
    borderRadius: tokens.radius.md,
    border: "1px solid " + tokens.color.border.default,
    background: tokens.color.surface.card,
    color: tokens.color.text.ink,
    fontFamily: tokens.font.family.serif,
    fontSize: tokens.font.size.body,
  };

  function renderAnswerCard(item) {
    return (
      <div style={{
        padding: "12px 16px 16px",
        background: tokens.color.surface.page,
        borderTop: "1px solid " + tokens.color.border.default,
        borderBottom: "1px solid " + tokens.color.border.default,
      }}>
        <Text
          size="body"
          style={{ display: "block", color: tokens.color.text.body, lineHeight: tokens.font.lineHeight.loose }}
        >
          {item.a}
        </Text>
      </div>
    );
  }

  function renderRow(entry, entryPoint, showCategoryLabel) {
    var item = entry.item;
    var isOpen = openItemId === item.id;
    return (
      <div key={item.id}>
        <ListRow
          onClick={function() { openArticle(item.id, entry.categoryId, entryPoint); }}
          showDivider={!isOpen}
        >
          <Stack direction="row" justify="between" align="start" gap="md" style={{ flex: 1 }}>
            <Stack direction="col" gap="xs" style={{ flex: 1 }}>
              {showCategoryLabel ? (
                <Text size="xs" color="tertiary" style={{ display: "block", textTransform: "uppercase", letterSpacing: tokens.font.letterSpacing.wider }}>
                  {entry.categoryEmoji} {entry.categoryLabel}
                </Text>
              ) : null}
              <Text
                size="md"
                weight="semibold"
                family="serif"
                color="navy"
                style={{ lineHeight: tokens.font.lineHeight.body }}
              >
                {item.q}
              </Text>
            </Stack>
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
        {isOpen ? renderAnswerCard(item) : null}
      </div>
    );
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
            letterSpacing: tokens.font.letterSpacing.wider,
            textTransform: "uppercase",
            color: tokens.color.text.tertiary,
          }}
        >
          Help
        </Text>
      </div>

      {/* Search */}
      <div style={{ padding: "4px 16px 12px" }}>
        <input
          type="search"
          value={query}
          onChange={function(e) { setQuery(e.target.value); }}
          placeholder="Search help..."
          aria-label="Search help"
          style={searchInputStyle}
        />
      </div>

      {isSearching ? (
        <div style={{ paddingBottom: tokens.space.xl2 }}>
          {searchResults.length === 0 ? (
            <div style={{ padding: "4px 16px 20px" }}>
              <Text size="body" color="secondary" style={{ display: "block" }}>
                No results for &ldquo;{trimmedQuery}&rdquo;. Try different words, or use the Feedback tab to ask us directly.
              </Text>
            </div>
          ) : (
            searchResults.map(function(entry) { return renderRow(entry, "search", true); })
          )}
        </div>
      ) : (
        <>
          {/* Game-Day Help — curated quick-access, not labeled "Popular":
              we have no usage analytics yet to justify that claim. */}
          <div style={{ padding: "4px 16px 4px" }}>
            <Text
              size="xs"
              weight="bold"
              style={{
                display: "block",
                letterSpacing: tokens.font.letterSpacing.wider,
                textTransform: "uppercase",
                color: tokens.color.brand.red,
              }}
            >
              Game-Day Help
            </Text>
          </div>
          <div style={{ paddingBottom: tokens.space.md }}>
            {GAME_DAY_ITEMS.map(function(entry) { return renderRow(entry, "game_day_quick_access", false); })}
          </div>

          {/* Browse Help — task-oriented category picker + accordion */}
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
              Browse Help
            </Text>
          </div>
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
              {HELP_CATEGORIES.map(function(cat) {
                return (
                  <Pill
                    key={cat.id}
                    active={activeCategory === cat.id}
                    onClick={function() { selectCategory(cat.id); }}
                  >
                    {cat.emoji} {cat.label}
                  </Pill>
                );
              })}
            </Stack>
          </div>

          <div style={{ paddingBottom: tokens.space.xl2 }}>
            {category.items.map(function(item) {
              return renderRow({ item: item, categoryId: category.id, categoryLabel: category.label, categoryEmoji: category.emoji }, "browse", false);
            })}
          </div>
        </>
      )}

      <div style={{ padding: "4px 16px 24px" }}>
        <Text
          size="xs"
          color="tertiary"
          style={{ display: "block", textAlign: "center", lineHeight: tokens.font.lineHeight.comfortable }}
        >
          Still have questions? Use the Feedback tab to ask.
        </Text>
      </div>
    </div>
  );
}
