/**
 * suite-regression.js
 * Verifies existing features haven't broken.
 * Category 10: health, ping, lineup generation, AI proxy — type validation (400).
 */

async function run(test, BASE_URL, state) {

  await test('REG-01', 'GET /health returns ok', async () => {
    const res = await fetch(`${BASE_URL}/health`);
    const data = await res.json();
    return {
      pass: res.status === 200 && data.status === 'ok',
      expected: '200 { status: ok }',
      actual: `${res.status} status=${data.status}`,
    };
  });

  await test('REG-02', 'GET /ping returns ok', async () => {
    const res = await fetch(`${BASE_URL}/ping`);
    const data = await res.json();
    return {
      pass: res.status === 200 && data.status === 'ok',
      expected: '200 { status: ok }',
      actual: `${res.status} status=${data.status}`,
    };
  });

  await test('REG-03', 'POST /generate-lineup returns shuffled array', async () => {
    const players = ['Alice','Bob','Charlie','Dave','Eve','Frank','Grace','Henry','Iris','Jack','Karen'];
    const res = await fetch(`${BASE_URL}/generate-lineup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ players }),
    });
    const data = await res.json();
    return {
      pass: res.status === 200 && Array.isArray(data.lineup) && data.lineup.length === 11,
      expected: '200 lineup[11]',
      actual: `${res.status} lineup.length=${data.lineup?.length}`,
    };
  });

  await test('REG-04', 'POST /generate-lineup rejects empty players', async () => {
    const res = await fetch(`${BASE_URL}/generate-lineup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ players: [] }),
    });
    return {
      pass: res.status === 400,
      expected: '400',
      actual: String(res.status),
    };
  });

  await test('REG-05', 'POST /api/ai rejects invalid type with 400', async () => {
    const res = await fetch(`${BASE_URL}/api/ai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'bad_type', content: 'test' }),
    });
    const data = await res.json();
    return {
      pass: res.status === 400 && typeof data.error === 'string',
      expected: '400 error:string',
      actual: `${res.status} error=${data.error}`,
    };
  });

  await test('REG-06', 'POST /api/ai rejects missing type field with 400', async () => {
    const res = await fetch(`${BASE_URL}/api/ai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'test' }),
    });
    const data = await res.json();
    return {
      pass: res.status === 400 && typeof data.error === 'string',
      expected: '400 error:string',
      actual: `${res.status} error=${data.error}`,
    };
  });

}

module.exports = { run };
