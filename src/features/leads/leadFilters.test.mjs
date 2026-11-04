/**
 * Lead list filters: what the sheet's picks send to the server, and the
 * removable pills they show as.
 * Run: npm test
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  NO_LEAD_FILTERS,
  PRIORITY_OPTIONS,
  leadFilterCount,
  leadFilterParams,
  leadFilterPills,
} from './leadFilters.ts';

const now = new Date(2026, 10, 4, 15, 30);
const day = (date, h = 0, m = 0, s = 0, ms = 0, month = 10) =>
  new Date(2026, month, date, h, m, s, ms).toISOString();
const params = (picks) =>
  leadFilterParams({ ...NO_LEAD_FILTERS, ...picks }, now);
const sent = (picks) =>
  Object.fromEntries(
    Object.entries(params(picks)).filter(([, v]) => v !== undefined)
  );

describe('leadFilterParams', () => {
  it('sends nothing with no picks', () => {
    assert.deepEqual(sent({}), {});
  });

  it('joins priorities and sources into one param each', () => {
    assert.deepEqual(sent({ priorities: ['HIGH', 'LOW'], sourceIds: [3, 8] }), {
      priority: 'HIGH,LOW',
      leadSourceId: '3,8',
    });
  });

  it('leaves the default sort to the server', () => {
    assert.deepEqual(sent({ sort: 'newest' }), {});
    assert.deepEqual(sent({ sort: 'oldest' }), { sort: 'oldest' });
  });

  it('treats overdue as past its due time, even earlier today', () => {
    assert.deepEqual(sent({ followUp: 'overdue' }), {
      followupTo: now.toISOString(),
    });
  });

  it('bounds follow-up days by the local day', () => {
    assert.deepEqual(sent({ followUp: 'today' }), {
      followupFrom: day(4),
      followupTo: day(4, 23, 59, 59, 999),
    });
    assert.deepEqual(sent({ followUp: 'tomorrow' }), {
      followupFrom: day(5),
      followupTo: day(5, 23, 59, 59, 999),
    });
    assert.deepEqual(sent({ followUp: 'next7' }), {
      followupFrom: day(4),
      followupTo: day(10, 23, 59, 59, 999),
    });
  });

  it('asks for leads with no follow-up without a date range', () => {
    assert.deepEqual(sent({ followUp: 'none' }), { followupNone: true });
  });

  it('counts today in the created windows', () => {
    assert.deepEqual(sent({ created: 'last7' }), { dateFrom: day(29, 0, 0, 0, 0, 9) });
    assert.deepEqual(sent({ created: 'last30' }), { dateFrom: day(6, 0, 0, 0, 0, 9) });
  });

  it('closes created days and months at their end', () => {
    assert.deepEqual(sent({ created: 'yesterday' }), {
      dateFrom: day(3),
      dateTo: day(3, 23, 59, 59, 999),
    });
    assert.deepEqual(sent({ created: 'thisMonth' }), { dateFrom: day(1) });
    assert.deepEqual(sent({ created: 'lastMonth' }), {
      dateFrom: day(1, 0, 0, 0, 0, 9),
      dateTo: day(31, 23, 59, 59, 999, 9),
    });
  });
});

describe('leadFilterCount', () => {
  it('is zero with no picks', () => {
    assert.equal(leadFilterCount(NO_LEAD_FILTERS), 0);
  });

  it('counts each pick, and a changed sort as one', () => {
    assert.equal(
      leadFilterCount({
        ...NO_LEAD_FILTERS,
        sort: 'oldest',
        priorities: ['HIGH', 'MEDIUM'],
        sourceIds: [1],
        followUp: 'today',
        engagement: 'OPENED',
        created: 'last7',
      }),
      7
    );
  });
});

describe('leadFilterPills', () => {
  const filters = {
    ...NO_LEAD_FILTERS,
    sort: 'activity',
    priorities: ['HIGH', 'LOW'],
    followUp: 'overdue',
    created: 'last30',
    sourceIds: [4, 9],
  };
  const pills = leadFilterPills(filters, [{ id: 4, name: 'Facebook' }]);
  const pill = (key) => pills.find((p) => p.key === key);

  it('has one pill per pick', () => {
    assert.equal(pills.length, leadFilterCount(filters));
  });

  it('labels picks so they read on their own', () => {
    assert.deepEqual(
      pills.map((p) => p.label),
      [
        'Recently updated',
        'High priority',
        'Low priority',
        'Overdue',
        'Created: Last 30 days',
        'Facebook',
        'Source',
      ]
    );
  });

  it('removes only its own pick', () => {
    assert.deepEqual(pill('priority-HIGH').without.priorities, ['LOW']);
    assert.deepEqual(pill('source-4').without.sourceIds, [9]);
    assert.equal(pill('sort').without.sort, 'newest');
    assert.equal(pill('followUp').without.followUp, null);
    assert.equal(pill('followUp').without.created, 'last30');
  });

  it('lists nothing with no picks', () => {
    assert.deepEqual(leadFilterPills(NO_LEAD_FILTERS), []);
  });
});

describe('PRIORITY_OPTIONS', () => {
  it('runs from High to Low', () => {
    assert.deepEqual(
      PRIORITY_OPTIONS.map((o) => o.key),
      ['HIGH', 'MEDIUM', 'LOW']
    );
  });
});
