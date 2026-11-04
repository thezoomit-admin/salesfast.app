/**
 * What the Activities page shows for each note format the backend stores.
 * Run: npm test
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { describeActivity } from './activityDisplay.ts';

const syncedCall = (headline) =>
  `[Call] ${headline}\nSynced from mobile\nEmployeePhone: +8801700000000\n[call-sync:abc-1]`;

describe('describeActivity', () => {
  it('shows a synced call as its direction and duration', () => {
    const view = describeActivity({
      note: syncedCall('Outgoing · 3m 12s'),
      channel: { name: 'Call' },
    });
    assert.equal(view.label, 'Outgoing call');
    assert.equal(view.kind, 'call');
    assert.equal(view.text, '3m 12s');
  });

  it('flags missed calls and hides a zero duration', () => {
    const view = describeActivity({ note: syncedCall('Missed · 0s') });
    assert.equal(view.label, 'Missed call');
    assert.equal(view.kind, 'callMissed');
    assert.equal(view.text, null);
  });

  it('keeps what the agent wrote on a manual call note', () => {
    const view = describeActivity({
      note: 'Client asked for the price list',
      channel: { name: 'Call' },
    });
    assert.equal(view.label, 'Call');
    assert.equal(view.text, 'Client asked for the price list');
  });

  it('drops the blocks appended after the agent text', () => {
    const view = describeActivity({
      note: 'Sent brochure\n\n[Activity Flow]\nNew · Contacted\n« called',
      channel: { name: 'WhatsApp' },
    });
    assert.equal(view.label, 'WhatsApp');
    assert.equal(view.text, 'Sent brochure');

    const done = describeActivity({
      note: 'Met at site\n\n[Next Follow-up · Completed] Completed for 2026-11-03.',
      channel: { name: 'In Person' },
    });
    assert.equal(done.label, 'In person');
    assert.equal(done.text, 'Met at site');
  });

  it('names system follow-up rows', () => {
    const set = describeActivity({ note: '[Next Follow-up] Scheduled for 2026-11-05.' });
    assert.equal(set.label, 'Follow-up set');
    assert.equal(set.text, 'Scheduled for 2026-11-05.');

    const done = describeActivity({
      note: '[Next Follow-up · Completed] Completed for 2026-11-03.',
    });
    assert.equal(done.kind, 'followUpDone');
    assert.equal(done.text, 'Completed for 2026-11-03.');
  });

  it('turns clip links into a voice note flag', () => {
    const withText = describeActivity({
      note: 'Listen to this\n[Voice note 0:12](https://cdn.example.com/a.m4a)',
    });
    assert.equal(withText.text, 'Listen to this');
    assert.equal(withText.hasVoiceNote, true);

    const only = describeActivity({
      note: '[Voice note 0:12](https://cdn.example.com/a.m4a)',
    });
    assert.equal(only.label, 'Note');
    assert.equal(only.text, null);
    assert.equal(only.hasVoiceNote, true);
  });

  it('leaves a plain note alone', () => {
    const view = describeActivity({ note: 'Prefers a call after 5pm [urgent]' });
    assert.equal(view.label, 'Note');
    assert.equal(view.text, 'Prefers a call after 5pm [urgent]');
    assert.equal(view.hasVoiceNote, false);
  });
});
