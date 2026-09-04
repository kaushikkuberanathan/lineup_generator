import { useEffect, useState } from "react";
import { HELP_CATEGORY_META, HELP_ARTICLES, getGameDayCriticalArticles } from "../../content/faqs";
import { Pill } from "../ui/Pill";
import { ListRow } from "../ui/ListRow";
import { Text } from "../ui/Text";
import { Stack } from "../ui/Stack";
import { tokens } from "../../theme/tokens";
import { track } from "../../utils/analytics";

var CATEGORY_BY_ID = HELP_CATEGORY_META.reduce(function(acc, cat) {
  acc[cat.id] = cat;
  return acc;
}, {});

var GAME_DAY_ARTICLES = getGameDayCriticalArticles();

function matchesQuery(article, query) {
  var q = query.toLowerCase();
  var haystack = article.title.toLowerCase() + " " + article.answer.toLowerCase()
    + " " + (article.keywords || []).join(" ").toLowerCase();
  return haystack.indexOf(q) >= 0;
}

/**
 * FAQSection
 * Support tab → Help sub-tab (component name/file kept as FAQSection to
 * avoid an App.jsx import-path change; the rendered content is "Help").
 *
 * Layout: Game-Day Help quick-access (curated via gameDayCritical, offline,
 * no category-picking required) → search → Browse Help (task-oriented
 * categories, accordion). Search matches title, answer, and keywords, and
 * results are a flat list across all categories.
 */
export function FAQSection() {
  var _cat = useState(HELP_CATEGORY_META[0].id);
  var activeCategory = _cat[0];
  var setActiveCategory = _cat[1];

  var _open = useState(null);
  var openArticleId = _open[0];
  var setOpenArticleId = _open[1];

  var _query = useState("");
  var query = _query[0];
  var setQuery = _query[1];

  var categoryArticles = HELP_ARTICLES.filter(function(a) { return a.category === activeCategory; });
  var trimmedQuery = query.trim();
  var isSearching = trimmedQuery.length > 0;
  var searchResults = isSearching ? HELP_ARTICLES.filter(function(a) { return matchesQuery(a, trimmedQuery); }) : [];

  // Privacy-safe search analytics: never send the raw query text (see
  // content-rule discussion — coaches type player names, phone numbers,
  // etc. into search boxes). Fires once per settled query, not per keystroke.
  useEffect(function() {
    if (!isSearching) return;
    var timer = setTimeout(function() {
      var categoryMatch = searchResults.some(function(a) { return a.category === activeCategory; });
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

  function openArticle(article, entryPoint) {
    var willOpen = openArticleId !== article.id;
    setOpenArticleId(willOpen ? article.id : null);
    if (willOpen) {
      track("help_article_open", { article_id: article.id, category_id: article.category, entry_point: entryPoint });
    }
  }

  function selectCategory(catId) {
    setActiveCategory(catId);
    setOpenArticleId(null);
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

  function renderAnswerCard(article) {
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
          {article.answer}
        </Text>
      </div>
    );
  }

  function renderRow(article, entryPoint, showCategoryLabel) {
    var isOpen = openArticleId === article.id;
    var cat = CATEGORY_BY_ID[article.category];
    return (
      <div key={article.id}>
        <ListRow
          onClick={function() { openArticle(article, entryPoint); }}
          showDivider={!isOpen}
        >
          <Stack direction="row" justify="between" align="start" gap="md" style={{ flex: 1 }}>
            <Stack direction="col" gap="xs" style={{ flex: 1 }}>
              {showCategoryLabel && cat ? (
                <Text size="xs" color="tertiary" style={{ display: "block", textTransform: "uppercase", letterSpacing: tokens.font.letterSpacing.wider }}>
                  {cat.emoji} {cat.label}
                </Text>
              ) : null}
              <Text
                size="md"
                weight="semibold"
                family="serif"
                color="navy"
                style={{ lineHeight: tokens.font.lineHeight.body }}
              >
                {article.title}
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
        {isOpen ? renderAnswerCard(article) : null}
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
            searchResults.map(function(article) { return renderRow(article, "search", true); })
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
            {GAME_DAY_ARTICLES.map(function(article) { return renderRow(article, "game_day_quick_access", false); })}
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
              {HELP_CATEGORY_META.map(function(cat) {
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
            {categoryArticles.map(function(article) { return renderRow(article, "browse", false); })}
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
