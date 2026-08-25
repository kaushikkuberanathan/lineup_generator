/**
 * adminHtml.testRowFilter.test.js
 *
 * admin.html (#346) hides access_requests/team_memberships rows written by
 * the automated test suites (email ending `@test.com`, per
 * backend/scripts/tests/suite-validation.js's TEST_EMAIL pattern) from the
 * Pending Requests and Coaches tabs by default, behind a "Show test X (N)"
 * toggle — never deleted, always one click away.
 *
 * Same extraction approach as season.adminHtmlParity.test.js: pulls the
 * actual inline function source out of admin.html (not a hand-copied
 * restatement) so a future edit to the real implementation can't silently
 * drift from what this test asserts.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ADMIN_HTML_PATH = path.join(__dirname, '../../public/admin.html');

function extractFunctionSource(html, name) {
  var sigIndex = html.indexOf('function ' + name + '(');
  if (sigIndex === -1) {
    throw new Error('admin.html: could not find "function ' + name + '(" — has it been renamed or removed?');
  }
  var braceStart = html.indexOf('{', sigIndex);
  var depth = 0;
  var i = braceStart;
  for (; i < html.length; i++) {
    if (html[i] === '{') { depth++; }
    else if (html[i] === '}') {
      depth--;
      if (depth === 0) { break; }
    }
  }
  return html.slice(sigIndex, i + 1);
}

describe('admin.html — test-row filtering (#346)', function() {
  var isTestEmail, testToggleHtml;

  beforeAll(function() {
    var html = readFileSync(ADMIN_HTML_PATH, 'utf8');
    isTestEmail = new Function('return (' + extractFunctionSource(html, 'isTestEmail') + ')')();
    testToggleHtml = new Function('return (' + extractFunctionSource(html, 'testToggleHtml') + ')')();
  });

  describe('isTestEmail', function() {
    it('matches the exact @test.com pattern the test suites write', function() {
      expect(isTestEmail('val-suite-abc123@test.com')).toBe(true);
      expect(isTestEmail('val01-abc123@test.com')).toBe(true);
      expect(isTestEmail('val08-12345-1700000000000@test.com')).toBe(true);
    });

    it('is case-insensitive on the domain', function() {
      expect(isTestEmail('someone@TEST.COM')).toBe(true);
      expect(isTestEmail('someone@Test.Com')).toBe(true);
    });

    it('does not match real coach domains, including ones that merely contain "test"', function() {
      expect(isTestEmail('stan.hoover@gmail.com')).toBe(false);
      expect(isTestEmail('kaushik.kuberanathan@gmail.com')).toBe(false);
      // "test" appearing elsewhere in the address must not trip the filter -
      // only an exact @test.com domain does. This is the acceptance-criteria
      // guard against over-matching a real user's address.
      expect(isTestEmail('testimonial@dugoutlineup.com')).toBe(false);
      expect(isTestEmail('attester@example.com')).toBe(false);
    });

    it('handles null/undefined/empty without throwing', function() {
      expect(isTestEmail(null)).toBe(false);
      expect(isTestEmail(undefined)).toBe(false);
      expect(isTestEmail('')).toBe(false);
    });
  });

  describe('testToggleHtml', function() {
    it('renders nothing when count is 0 (no toggle needed, nothing to hide)', function() {
      expect(testToggleHtml('requests-show-test', 'requests', 0, false)).toBe('');
    });

    it('renders an unchecked checkbox with the count when rows are hidden', function() {
      var html = testToggleHtml('requests-show-test', 'requests', 593, false);
      expect(html).toContain('id="requests-show-test"');
      expect(html).not.toContain('checked');
      expect(html).toContain('593');
      expect(html).toContain('Show test requests');
    });

    it('renders a checked checkbox when the toggle is already on', function() {
      var html = testToggleHtml('coaches-show-test', 'coaches', 10, true);
      expect(html).toContain('checked');
      expect(html).toContain('10');
      expect(html).toContain('Show test coaches');
    });
  });
});
