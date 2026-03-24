const { parsePhoneNumber, isValidPhoneNumber } = require('libphonenumber-js');

/**
 * Normalizes any common US phone format to E.164.
 * Accepts: (404) 555-0123 | 4045550123 | +14045550123
 * Returns: +14045550123
 * Throws: { code: 'INVALID_PHONE', message: '...' }
 */
function normalizePhone(raw) {
  try {
    if (!raw || typeof raw !== 'string') {
      throw new Error('Input must be a non-empty string');
    }

    // parsePhoneNumber requires a default region for numbers without a country code
    const parsed = parsePhoneNumber(raw.trim(), 'US');

    if (!parsed || !parsed.isValid()) {
      throw new Error('Number failed validation');
    }

    return parsed.format('E.164');
  } catch {
    const err = new Error(`Invalid phone number: "${raw}"`);
    err.code = 'INVALID_PHONE';
    throw err;
  }
}

/**
 * Masks an E.164 phone number for safe logging.
 * Input:  +14045550123
 * Output: ***-***-0123
 */
function maskPhone(e164) {
  const digits = e164.replace(/\D/g, '');
  const last4 = digits.slice(-4);
  return `***-***-${last4}`;
}

module.exports = { normalizePhone, maskPhone };

if (require.main === module) {
  const tests = [
    { input: '(404) 555-0123', expectValid: true },
    { input: '4045550123',     expectValid: true },
    { input: '+14045550123',   expectValid: true },
    { input: '555-INVALID',    expectValid: false },
  ];

  let passed = 0;
  for (const { input, expectValid } of tests) {
    try {
      const e164 = normalizePhone(input);
      const masked = maskPhone(e164);
      if (expectValid) {
        console.log(`PASS  "${input}" → ${e164}  (masked: ${masked})`);
        passed++;
      } else {
        console.error(`FAIL  "${input}" — expected INVALID_PHONE but got ${e164}`);
      }
    } catch (err) {
      if (!expectValid && err.code === 'INVALID_PHONE') {
        console.log(`PASS  "${input}" → threw INVALID_PHONE as expected`);
        passed++;
      } else {
        console.error(`FAIL  "${input}" — unexpected error: ${err.message}`);
      }
    }
  }

  console.log(`\n${passed}/${tests.length} tests passed`);
}
