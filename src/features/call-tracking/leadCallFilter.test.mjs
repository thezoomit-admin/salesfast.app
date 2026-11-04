/**
 * The call-log privacy gate: only calls with a CRM lead's number get through.
 * Run: npm test
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { keepLeadCalls } from './leadCallFilter.ts';

const leads = [
  { phoneKey: '1712345678', leadId: 1, leadName: 'Lead One' },
  { phoneKey: '1898765432', leadId: 2, leadName: 'Lead Two' },
];

const call = (number) => ({ id: number, number });

describe('keepLeadCalls', () => {
  it('drops every call whose number is not a lead', () => {
    const rows = [call('01700000000'), call('01712345678'), call('01900000000')];
    const matched = keepLeadCalls(rows, leads);
    assert.deepEqual(
      matched.map((m) => m.row.number),
      ['01712345678']
    );
  });

  it('attaches the lead a call belongs to', () => {
    const [match] = keepLeadCalls([call('01898765432')], leads);
    assert.equal(match.lead.leadId, 2);
  });

  it('matches local, +880 and spaced forms of the same number', () => {
    const rows = [
      call('01712345678'),
      call('+8801712345678'),
      call('8801712345678'),
      call('+880 1712-345678'),
    ];
    assert.equal(keepLeadCalls(rows, leads).length, 4);
  });

  it('drops hidden, empty and short-code numbers', () => {
    const rows = [call(''), call('-2'), call('Private'), call('121'), call('16216')];
    assert.deepEqual(keepLeadCalls(rows, leads), []);
  });

  it('keeps nothing when there are no lead numbers to match', () => {
    assert.deepEqual(keepLeadCalls([call('01712345678')], []), []);
  });
});
