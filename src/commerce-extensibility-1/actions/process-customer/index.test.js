import { test } from 'node:test';
import assert from 'node:assert/strict';
import { main } from './index.js';

async function captureLogs(callback) {
  const original = { log: console.log, warn: console.warn, error: console.error };
  const entries = [];
  for (const level of Object.keys(original)) {
    console[level] = (...values) => entries.push({ level, values });
  }
  try {
    return { result: await callback(), entries };
  } finally {
    Object.assign(console, original);
  }
}

test('processes a committed customer and logs only the derived customer fields', async () => {
  const { result, entries } = await captureLogs(() => main({ data: {
    value: { id: '100245', firstname: 'John', lastname: 'Doe', email: 'john.doe@example.com', privateNote: 'DO_NOT_LOG_RAW_PAYLOAD' },
    _metadata: { secret: 'DO_NOT_LOG_METADATA' },
  } }));

  assert.deepEqual(result, { statusCode: 200, body: {
    customerId: 100245, fullName: 'John Doe', email: 'john.doe@example.com', processed: true,
  } });
  assert.deepEqual(entries.map(({ values }) => values[0]), [
    'Commerce customer event received',
    'Customer ID: 100245',
    'Full Name: John Doe',
    'Email: john.doe@example.com',
    'Processed: true',
  ]);
  assert.doesNotMatch(JSON.stringify(entries), /DO_NOT_LOG_RAW_PAYLOAD|DO_NOT_LOG_METADATA/);
});

for (const field of ['email', 'firstname', 'lastname']) {
  test(`rejects a missing ${field} without logging raw event data`, async () => {
    const value = { id: 100245, firstname: 'John', lastname: 'Doe', email: 'john.doe@example.com', privateNote: 'DO_NOT_LOG_RAW_PAYLOAD' };
    delete value[field];
    const { result, entries } = await captureLogs(() => main({ data: { value } }));
    assert.deepEqual(result, { statusCode: 400, body: {
      processed: false, error: 'validation_failed', missingFields: [field],
    } });
    assert.deepEqual(entries.map(({ level }) => level), ['warn', 'log']);
    assert.deepEqual(entries[0].values[0], {
      operation: 'process-customer', reason: 'validation_failed', missingFields: [field], processed: false,
    });
    assert.equal(entries[1].values[0], 'Processed: false');
    assert.doesNotMatch(JSON.stringify(entries), /DO_NOT_LOG_RAW_PAYLOAD/);
  });
}

test('rejects malformed event envelopes without throwing', async () => {
  const { result, entries } = await captureLogs(() => main({}));
  assert.equal(result.statusCode, 400);
  assert.deepEqual(result.body.missingFields, ['email', 'firstname', 'lastname']);
  assert.equal(entries.at(-1).values[0], 'Processed: false');
});

test('returns a sanitized server error if event access throws', async () => {
  const data = { get value() { throw new Error('DO_NOT_LOG_RAW_PAYLOAD'); } };
  const { result, entries } = await captureLogs(() => main({ data }));
  assert.deepEqual(result, { statusCode: 500, body: { processed: false, error: 'processing_failure' } });
  assert.deepEqual(entries[0], { level: 'error', values: [{
    operation: 'process-customer', reason: 'processing_failure', errorType: 'Error', processed: false,
  }] });
  assert.doesNotMatch(JSON.stringify(entries), /DO_NOT_LOG_RAW_PAYLOAD/);
});
