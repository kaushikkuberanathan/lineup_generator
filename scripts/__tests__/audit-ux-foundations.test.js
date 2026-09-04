const test = require('node:test');
const assert = require('node:assert/strict');

const { auditSource, renderReport } = require('../audit-ux-foundations');

test('auditSource classifies raw visual declarations and shared-system adoption', function () {
  const result = auditSource(`
    import { Button } from './components/ui/Button';
    import { LuHouse } from 'react-icons/lu';
    const view = <button style={{ color: '#C8102E', fontFamily: 'Georgia' }}>🏠 Home</button>;
  `);

  assert.equal(result.rawHexColors, 1);
  assert.equal(result.inlineStyleObjects, 1);
  assert.equal(result.fontFamilyDeclarations, 1);
  assert.equal(result.emojiGlyphs, 1);
  assert.equal(result.directReactIconImports, 1);
  assert.equal(result.sharedUiImports, 1);
});

test('renderReport is deterministic and includes migration gates', function () {
  const report = renderReport({
    generatedAt: '2026-09-03',
    filesScanned: 1,
    totals: { rawHexColors: 1, inlineStyleObjects: 1, fontFamilyDeclarations: 1, emojiGlyphs: 1, directReactIconImports: 1, sharedUiImports: 1 },
    topFiles: [],
  });

  assert.match(report, /Contemporary UX Baseline/);
  assert.match(report, /375px/);
  assert.match(report, /Game Day Validation/);
});
