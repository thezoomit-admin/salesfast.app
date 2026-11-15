/**
 * WhatsApp call tracking — the parts that run in JS.
 * Run: npm test
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { describeActivity } from '../activities/activityDisplay.ts';
import { callBody, callKind, isWhatsAppCallNote } from '../leads/leadActivity.ts';

import { callLeadIdempotencyKey, pickCallLeadSourceId } from './callLeadLogic.ts';
import { keepLeadCalls } from './leadCallFilter.ts';
import {
  newestWhatsAppKey,
  parseCallLeadChannel,
  whatsAppUploadItem,
} from './whatsAppCallLogic.ts';

const row = {
  id: 'com.whatsapp:1731650000000:1622398341',
  app: 'com.whatsapp',
  number: '+880 1622-398341',
  direction: 'INCOMING',
  dateMs: 1731650000000,
  durationSec: 192,
};

/** The note the server writes for a synced WhatsApp call. */
const whatsAppNote = (headline) =>
  `[Call] ${headline}\nSynced from WhatsApp\nEmployeePhone: +8801700000000\n[call-sync:whatsapp:${row.id}]`;

describe('whatsAppUploadItem', () => {
  it('maps a WhatsApp call to the call-sync upload', () => {
    assert.deepEqual(whatsAppUploadItem(row), {
      deviceCallId: `whatsapp:${row.id}`,
      phone: '+880 1622-398341',
      direction: 'INCOMING',
      startedAt: new Date(row.dateMs).toISOString(),
      durationSec: 192,
      channel: 'WHATSAPP',
    });
  });

  it('never sends a direction or duration the server rejects', () => {
    const item = whatsAppUploadItem({ ...row, direction: 'WEIRD', durationSec: -4 });
    assert.equal(item.direction, 'UNKNOWN');
    assert.equal(item.durationSec, 0);
    assert.equal(whatsAppUploadItem({ ...row, durationSec: 99_999 }).durationSec, 86_400);
  });

  it('keeps ids apart from phone-line calls', () => {
    assert.match(whatsAppUploadItem(row).deviceCallId, /^whatsapp:/);
  });
});

describe('privacy gate', () => {
  it('drops WhatsApp calls whose number is not a CRM lead', () => {
    const personal = { ...row, id: 'x', number: '+8801999999999' };
    const kept = keepLeadCalls([row, personal], [{ phoneKey: '1622398341', leadId: 7 }]);
    assert.equal(kept.length, 1);
    assert.equal(kept[0].row.id, row.id);
  });
});

describe('newestWhatsAppKey', () => {
  it('changes when a new call arrives', () => {
    assert.equal(newestWhatsAppKey([]), 'none');
    assert.equal(newestWhatsAppKey([row]), row.id);
  });
});

describe('WhatsApp call notes', () => {
  it('are call history, read exactly like phone calls', () => {
    const note = whatsAppNote('Incoming · 3m 12s');
    assert.equal(isWhatsAppCallNote(note), true);
    assert.equal(callKind(note), 'incoming');
    assert.equal(callBody(note).duration, '3m 12s');
  });

  it('missed WhatsApp calls count as missed', () => {
    assert.equal(callKind(whatsAppNote('Missed · 0s')), 'missed');
  });

  it('label says WhatsApp in Activities', () => {
    const view = describeActivity({ note: whatsAppNote('Outgoing · 2m'), channel: { name: 'WhatsApp' } });
    assert.equal(view.label, 'WhatsApp outgoing call');
    assert.equal(view.kind, 'call');
    assert.equal(view.text, '2m');
  });

  it('phone-line notes are not WhatsApp', () => {
    const phone = '[Call] Incoming · 10s\nSynced from mobile\n[call-sync:android:1:2:1]';
    assert.equal(isWhatsAppCallNote(phone), false);
    assert.equal(describeActivity({ note: phone }).label, 'Incoming call');
  });
});

describe('call lead from a WhatsApp call', () => {
  it('reads the channel from the notification link', () => {
    assert.equal(parseCallLeadChannel('whatsapp'), 'whatsapp');
    assert.equal(parseCallLeadChannel(['WhatsApp']), 'whatsapp');
    assert.equal(parseCallLeadChannel(undefined), 'phone');
    assert.equal(parseCallLeadChannel('sms'), 'phone');
  });

  it('uses the same idempotency key as the notification', () => {
    assert.equal(
      callLeadIdempotencyKey('01622398341', 5, 'whatsapp'),
      'wa-call-lead:1622398341:5'
    );
    // Phone calls keep their old key, so in-flight saves still dedupe.
    assert.equal(callLeadIdempotencyKey('01622398341', 5), 'call-lead:1622398341:5');
  });

  it('preselects a WhatsApp source, then the phone sources', () => {
    const sources = [
      { id: 48, name: 'Phone Inquiry' },
      { id: 60, name: 'WhatsApp' },
    ];
    assert.equal(pickCallLeadSourceId(sources, 'whatsapp'), 60);
    assert.equal(pickCallLeadSourceId(sources), 48);
    assert.equal(pickCallLeadSourceId([{ id: 48, name: 'Phone Inquiry' }], 'whatsapp'), 48);
  });
});
