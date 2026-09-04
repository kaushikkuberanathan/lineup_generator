import { describe, expect, it } from 'vitest';
import { HELP_ARTICLES, getGameDayCriticalArticles } from './faqs';

describe('getGameDayCriticalArticles', function() {
  it('returns only articles flagged gameDayCritical', function() {
    var result = getGameDayCriticalArticles();
    expect(result.length).toBeGreaterThan(0);
    result.forEach(function(a) {
      expect(a.gameDayCritical).toBe(true);
    });
  });

  it('matches the count of gameDayCritical: true entries in HELP_ARTICLES', function() {
    var expectedCount = HELP_ARTICLES.filter(function(a) { return a.gameDayCritical; }).length;
    expect(getGameDayCriticalArticles().length).toBe(expectedCount);
  });

  it('preserves HELP_ARTICLES order (stable order, not re-sorted)', function() {
    var expectedIds = HELP_ARTICLES
      .filter(function(a) { return a.gameDayCritical; })
      .map(function(a) { return a.id; });
    var actualIds = getGameDayCriticalArticles().map(function(a) { return a.id; });
    expect(actualIds).toEqual(expectedIds);
  });
});
