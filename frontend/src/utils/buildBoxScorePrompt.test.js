/**
 * DOC_TEST_DEBT.md P1 "Box-score AI parser test coverage (teamName fix,
 * PR #229)". Guards against the undefined-teamName bug shape v2.5.20/
 * v2.5.21 fixed (Story 84, PR #178 -> PR #228 -> PR #229) ever recurring
 * in App.jsx's parseGameResult() -> buildBoxScorePrompt().
 */

import { describe, it, expect } from 'vitest';
import { buildBoxScorePrompt } from './buildBoxScorePrompt.js';

var ACTIVE_TEAM = { name: 'Mud Hens' };
var ROSTER = [{ name: 'Aiden' }, { name: 'Benji' }, { name: 'Cassius' }];

describe('buildBoxScorePrompt', function() {

  it('happy path: extracts teamName from activeTeam.name into the system prompt', function() {
    var out = buildBoxScorePrompt('text', 'raw box score text', undefined, ACTIVE_TEAM, ROSTER);
    expect(out.systemPrompt).toContain('Team name is Mud Hens.');
    expect(out.systemPrompt).toContain('Aiden, Benji, Cassius');
    expect(out.systemPrompt).not.toContain('undefined');
  });

  it('regression guard: activeTeam null never produces the literal string "undefined"', function() {
    var out = buildBoxScorePrompt('text', 'raw box score text', undefined, null, ROSTER);
    expect(out.systemPrompt).toContain('Team name is .');
    expect(out.systemPrompt).not.toContain('undefined');
    expect(out.userContent).not.toContain('undefined');
  });

  it('regression guard: activeTeam present but .name falsy never produces "undefined"', function() {
    var out = buildBoxScorePrompt('text', 'raw box score text', undefined, { name: '' }, ROSTER);
    expect(out.systemPrompt).toContain('Team name is .');
    expect(out.systemPrompt).not.toContain('undefined');
  });

  it('empty roster still produces a valid prompt with no player names', function() {
    var out = buildBoxScorePrompt('text', 'raw box score text', undefined, ACTIVE_TEAM, []);
    expect(out.systemPrompt).toContain('Players to look for: .');
  });

  it('sourceType "image": userContent is [image block, text block] with teamName in the text block', function() {
    var out = buildBoxScorePrompt('image', 'base64data==', 'image/jpeg', ACTIVE_TEAM, ROSTER);
    expect(Array.isArray(out.userContent)).toBe(true);
    expect(out.userContent[0]).toEqual({
      type: 'image',
      source: { type: 'base64', media_type: 'image/jpeg', data: 'base64data==' },
    });
    expect(out.userContent[1].type).toBe('text');
    expect(out.userContent[1].text).toContain('Mud Hens players');
  });

  it('sourceType "image" with no mediaType defaults media_type to image/png', function() {
    var out = buildBoxScorePrompt('image', 'base64data==', undefined, ACTIVE_TEAM, ROSTER);
    expect(out.userContent[0].source.media_type).toBe('image/png');
  });

  it('sourceType "pdf": userContent is [document block, text block] with teamName in the text block', function() {
    var out = buildBoxScorePrompt('pdf', 'base64pdfdata==', undefined, ACTIVE_TEAM, ROSTER);
    expect(Array.isArray(out.userContent)).toBe(true);
    expect(out.userContent[0]).toEqual({
      type: 'document',
      source: { type: 'base64', media_type: 'application/pdf', data: 'base64pdfdata==' },
    });
    expect(out.userContent[1].text).toContain('Mud Hens players');
  });

  it('sourceType "text": userContent is a single string containing the raw sourceData and teamName', function() {
    var out = buildBoxScorePrompt('text', 'Final: 7-3 win', undefined, ACTIVE_TEAM, ROSTER);
    expect(typeof out.userContent).toBe('string');
    expect(out.userContent).toContain('Mud Hens players');
    expect(out.userContent).toContain('Final: 7-3 win');
  });
});
