const { test } = require('node:test');
const assert = require('node:assert');
const { assertNotProd, PROD_PROJECT_REF } = require('../../scripts/tests/prodGuard');

test('assertNotProd throws for a URL containing the PROD project ref', () => {
  assert.throws(
    () => assertNotProd(`https://${PROD_PROJECT_REF}.supabase.co`),
    /REFUSING TO RUN/
  );
});

test('assertNotProd passes for the DEV project URL', () => {
  assert.doesNotThrow(() => assertNotProd('https://psqvzppphdedqkpmarwx.supabase.co'));
});

test('assertNotProd passes for a local/ephemeral URL', () => {
  assert.doesNotThrow(() => assertNotProd('http://127.0.0.1:54321'));
});

test('assertNotProd passes when SUPABASE_URL is unset', () => {
  assert.doesNotThrow(() => assertNotProd(undefined));
});
