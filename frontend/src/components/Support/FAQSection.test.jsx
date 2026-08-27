import React from 'react';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { FAQSection } from './FAQSection';
import { HELP_CATEGORY_META, HELP_ARTICLES } from '../../content/faqs';

var FAQ_SECTION_SOURCE_PATH = join(dirname(fileURLToPath(import.meta.url)), 'FAQSection.jsx');

vi.mock('../../utils/analytics', () => ({ track: vi.fn() }));
import { track } from '../../utils/analytics';

// ============================================================================
// FAQSection — task-oriented Help redesign regression guard
//
// FAQSection now renders the Support → Help sub-tab (file/component name
// kept as FAQSection to avoid an App.jsx locked-file import change): a
// Game-Day Help quick-access list, a search box, and a Browse Help
// category picker + accordion. Content is a flat HELP_ARTICLES list
// (id/category/title/answer/gameDayCritical/keywords), not nested by
// category. These tests pin BEHAVIOR, not computed styles — style
// assertions belong in primitive-level tests.
// ============================================================================

function firstCategoryFirstArticle() {
  var firstCategoryId = HELP_CATEGORY_META[0].id;
  return HELP_ARTICLES.find(function (a) { return a.category === firstCategoryId; });
}

describe('FAQSection — Help redesign', function () {

  beforeEach(function() { track.mockClear(); });

  test('H1: renders Help heading, Game-Day Help section, and Browse Help categories', function () {
    render(<FAQSection />);
    expect(screen.queryByText('Help')).not.toBeNull();
    expect(screen.queryByText('Game-Day Help')).not.toBeNull();
    expect(screen.queryByText('Browse Help')).not.toBeNull();
    // Not labeled "Popular" — no usage analytics exists yet to justify that claim.
    expect(screen.queryByText(/popular/i)).toBeNull();
  });

  test('H2: every gameDayCritical article renders in the Game-Day Help section, closed by default', function () {
    render(<FAQSection />);
    var gameDayArticles = HELP_ARTICLES.filter(function (a) { return a.gameDayCritical; });
    expect(gameDayArticles.length).toBeGreaterThan(0);
    gameDayArticles.forEach(function (article) {
      expect(screen.queryByText(article.title)).not.toBeNull();
      expect(screen.queryByText(article.answer)).toBeNull();
    });
  });

  test('H3: tapping a Game-Day Help item opens it and fires help_article_open with entry_point=game_day_quick_access', function () {
    render(<FAQSection />);
    var article = HELP_ARTICLES.find(function (a) { return a.gameDayCritical; });

    fireEvent.click(screen.getByText(article.title));
    expect(screen.queryByText(article.answer)).not.toBeNull();
    expect(track).toHaveBeenCalledWith('help_article_open', {
      article_id: article.id,
      category_id: article.category,
      entry_point: 'game_day_quick_access',
    });
  });

  test('H4: default Browse Help category is active and its first article is visible, closed', function () {
    render(<FAQSection />);
    var article = firstCategoryFirstArticle();
    expect(screen.queryByText(article.title)).not.toBeNull();
    expect(screen.queryByText(article.answer)).toBeNull();
  });

  test('H5: clicking a Browse Help question reveals its answer; clicking again hides it', function () {
    render(<FAQSection />);
    var article = firstCategoryFirstArticle();

    fireEvent.click(screen.getByText(article.title));
    expect(screen.queryByText(article.answer)).not.toBeNull();
    expect(track).toHaveBeenCalledWith('help_article_open', {
      article_id: article.id,
      category_id: article.category,
      entry_point: 'browse',
    });

    fireEvent.click(screen.getByText(article.title));
    expect(screen.queryByText(article.answer)).toBeNull();
  });

  test('H6: switching Browse Help category resets any open item and fires help_category_view', function () {
    if (HELP_CATEGORY_META.length < 2) {
      throw new Error('H6 requires at least 2 HELP_CATEGORY_META entries');
    }
    render(<FAQSection />);

    var cat0Article = firstCategoryFirstArticle();
    fireEvent.click(screen.getByText(cat0Article.title));
    expect(screen.queryByText(cat0Article.answer)).not.toBeNull();

    var cat1 = HELP_CATEGORY_META[1];
    var cat1Article = HELP_ARTICLES.find(function (a) { return a.category === cat1.id; });
    fireEvent.click(screen.getByText(cat1.emoji + ' ' + cat1.label));

    expect(screen.queryByText(cat0Article.answer)).toBeNull();
    expect(screen.queryByText(cat1Article.answer)).toBeNull();
    expect(track).toHaveBeenCalledWith('help_category_view', { category_id: cat1.id });
  });

  test('H7: every HELP_CATEGORY_META label renders in the Browse Help picker', function () {
    render(<FAQSection />);
    HELP_CATEGORY_META.forEach(function (cat) {
      expect(screen.queryByText(cat.emoji + ' ' + cat.label)).not.toBeNull();
    });
  });

  test('H8: footer hint text is rendered', function () {
    render(<FAQSection />);
    expect(screen.queryByText('Still have questions? Use the Feedback tab to ask.')).not.toBeNull();
  });

  describe('search', function () {
    beforeEach(function() { vi.useFakeTimers({ shouldAdvanceTime: true }); });
    afterEach(function() { vi.runOnlyPendingTimers(); vi.useRealTimers(); });

    test('H9: typing a query hides Game-Day Help / Browse Help and shows matching results across categories', function () {
      render(<FAQSection />);
      var input = screen.getByPlaceholderText('Search help...');

      // Pick a query guaranteed to match something outside the default category.
      var lastCategoryId = HELP_CATEGORY_META[HELP_CATEGORY_META.length - 1].id;
      var target = HELP_ARTICLES.find(function (a) { return a.category === lastCategoryId; });
      var word = target.title.split(' ')[0];

      fireEvent.change(input, { target: { value: word } });

      expect(screen.queryByText('Game-Day Help')).toBeNull();
      expect(screen.queryByText('Browse Help')).toBeNull();
      expect(screen.queryByText(target.title)).not.toBeNull();
    });

    test('H10: a query matching nothing shows the zero-results message', function () {
      render(<FAQSection />);
      var input = screen.getByPlaceholderText('Search help...');
      fireEvent.change(input, { target: { value: 'zzzznomatchzzzz' } });
      expect(screen.queryByText(/No results for/)).not.toBeNull();
    });

    test('H11: search matches on keywords, not just title/answer text', function () {
      render(<FAQSection />);
      var article = HELP_ARTICLES.find(function (a) { return (a.keywords || []).length > 0; });
      var keyword = article.keywords[0];
      // Guard: the keyword should not already appear in the title/answer,
      // otherwise this test wouldn't prove keyword-matching works.
      var alreadyInText = (article.title + ' ' + article.answer).toLowerCase().indexOf(keyword.toLowerCase()) >= 0;
      if (alreadyInText) return;

      var input = screen.getByPlaceholderText('Search help...');
      fireEvent.change(input, { target: { value: keyword } });
      expect(screen.queryByText(article.title)).not.toBeNull();
    });

    test('H12: help_search fires without the raw query text (privacy-safe fields only)', function () {
      render(<FAQSection />);
      var input = screen.getByPlaceholderText('Search help...');
      fireEvent.change(input, { target: { value: 'lineup' } });

      vi.advanceTimersByTime(500);

      expect(track).toHaveBeenCalledWith('help_search', expect.objectContaining({
        query_length: expect.any(Number),
        result_count: expect.any(Number),
        zero_results: expect.any(Boolean),
        category_match: expect.any(Boolean),
      }));
      var call = track.mock.calls.find(function (c) { return c[0] === 'help_search'; });
      expect(call[1]).not.toHaveProperty('query');
      expect(Object.keys(call[1])).not.toContain('lineup');
    });
  });

  test('H13: answer body <Text> must not override fontSize via inline style (anti-pattern check)', function () {
    var src = readFileSync(FAQ_SECTION_SOURCE_PATH, 'utf-8');
    var antiPattern = /<Text[^>]*style=\{\{[^}]*fontSize/;
    expect(antiPattern.test(src)).toBe(false);
  });

  test('H14: every HELP_ARTICLES entry has a stable, unique id and a valid category', function () {
    var validCategoryIds = HELP_CATEGORY_META.map(function (c) { return c.id; });
    var ids = HELP_ARTICLES.map(function (a) { return a.id; });
    var unique = new Set(ids);
    expect(ids.length).toBe(unique.size);
    HELP_ARTICLES.forEach(function (a) {
      expect(typeof a.id).toBe('string');
      expect(a.id.length).toBeGreaterThan(0);
      expect(validCategoryIds).toContain(a.category);
    });
  });

  test('H15: at least one gameDayCritical article exists and each resolves to a real category', function () {
    var gameDayArticles = HELP_ARTICLES.filter(function (a) { return a.gameDayCritical; });
    expect(gameDayArticles.length).toBeGreaterThan(0);
    var validCategoryIds = HELP_CATEGORY_META.map(function (c) { return c.id; });
    gameDayArticles.forEach(function (a) { expect(validCategoryIds).toContain(a.category); });
  });

});
