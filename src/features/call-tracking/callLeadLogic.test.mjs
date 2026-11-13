/**
 * "Is this your lead?" call prompt — pure helpers.
 * Run: npm test
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  callLeadIdempotencyKey,
  parseRingAt,
  pickCallLeadSourceId,
} from './callLeadLogic.ts';

const prodSources = [
  { id: 33, name: 'Facebook' },
  { id: 1, name: 'Website' },
  { id: 47, name: 'Manual Entry' },
  { id: 48, name: 'Phone Inquiry' },
  { id: 50, name: 'Other' },
];

describe('pickCallLeadSourceId', () => {
  it('prefers Phone Inquiry', () => {
    assert.equal(pickCallLeadSourceId(prodSources), 48);
  });

  it('falls back to another phone source', () => {
    assert.equal(
      pickCallLeadSourceId([
        { id: 1, name: 'Website' },
        { id: 9, name: 'Hotline' },
      ]),
      9
    );
  });

  it('does not pick an outbound "Cold Call" source', () => {
    assert.equal(pickCallLeadSourceId([{ id: 3, name: 'Cold Call' }]), null);
  });

  it('returns null when nothing fits, so the user chooses', () => {
    assert.equal(pickCallLeadSourceId([{ id: 1, name: 'Website' }]), null);
    assert.equal(pickCallLeadSourceId([]), null);
  });
});

describe('callLeadIdempotencyKey', () => {
  it('is the same for local and +880 forms of one call', () => {
    assert.equal(
      callLeadIdempotencyKey('01712345678', 1700000000000),
      callLeadIdempotencyKey('+8801712345678', 1700000000000)
    );
  });

  it('differs between two calls from the same number', () => {
    assert.notEqual(
      callLeadIdempotencyKey('01712345678', 1),
      callLeadIdempotencyKey('01712345678', 2)
    );
  });
});

describe('parseRingAt', () => {
  it('reads the ring time from the deep link', () => {
    assert.equal(parseRingAt('1700000000000'), 1700000000000);
    assert.equal(parseRingAt(['1700000000000']), 1700000000000);
  });

  it('ignores missing or bad values', () => {
    assert.equal(parseRingAt(undefined), null);
    assert.equal(parseRingAt('abc'), null);
    assert.equal(parseRingAt('0'), null);
  });
});
