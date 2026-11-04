/**
 * Date picks on the Activities filter, as the range sent to the server.
 * Run: npm test
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { activityDateRange, filterCount } from './activityFilters.ts';

const now = new Date(2026, 10, 4, 15, 30);
const day = (date, h = 0, m = 0, s = 0, ms = 0) =>
  new Date(2026, 10, date, h, m, s, ms).toISOString();

describe('activityDateRange', () => {
  it('sends nothing when no date is picked', () => {
    assert.deepEqual(activityDateRange([], now), {});
  });

  it('starts today at local midnight, with no end', () => {
    assert.deepEqual(activityDateRange(['today'], now), {
      from: day(4),
      to: undefined,
    });
  });

  it('closes yesterday at the end of that day', () => {
    assert.deepEqual(activityDateRange(['yesterday'], now), {
      from: day(3),
      to: day(3, 23, 59, 59, 999),
    });
  });

  it('runs on to today when yesterday is picked with today', () => {
    assert.deepEqual(activityDateRange(['today', 'yesterday'], now), {
      from: day(3),
      to: undefined,
    });
  });

  it('counts today in the last 7 days and takes the widest pick', () => {
    assert.equal(activityDateRange(['last7'], now).from, new Date(2026, 9, 29).toISOString());
    assert.equal(
      activityDateRange(['today', 'last30'], now).from,
      new Date(2026, 9, 6).toISOString()
    );
  });
});

describe('filterCount', () => {
  it('counts every picked option', () => {
    assert.equal(filterCount({ types: ['call', 'email'], dates: ['today'] }), 3);
    assert.equal(filterCount({ types: [], dates: [] }), 0);
  });
});
