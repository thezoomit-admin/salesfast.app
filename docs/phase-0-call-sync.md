# Phase 0 — Call Sync Feasibility Spike

**Status:** PRODUCT OVERRIDE — implementing auto sync (2026-11-01)  
**Product:** Realist CRM Mobile (`salesapp.app`)  
**Gate:** Originally blocked automatic `READ_CALL_LOG` until device pass. Product requested Call History auto-sync now.

## Shipping approach

1. Local Expo Module `modules/android-call-log` reads Android call log (permission: `READ_CALL_LOG` only).
2. Consent screen + `syncFromAt` privacy window (no history before enable).
3. Client matches numbers to CRM lead directory (any assignee — number match only), uploads only matches.
4. Backend `POST /api/crm/mobile/call-sync` creates Call-channel notes (idempotent via `[call-sync:…]` marker). `createdAt` = real call time → admin Call History “Called at”.
5. Requires **development build** (`expo-dev-client`). **Expo Go cannot read call logs.**

## Build / install

```bash
cd salesapp.app
npm install
npx expo install expo-dev-client
# With Android SDK + device/emulator:
npx expo run:android
# Or EAS (no local JDK required):
# eas build --profile development --platform android
```

## Pass criteria (still validate on devices)

- [ ] `READ_CALL_LOG` granted on intended OEM devices
- [ ] Matched inbound/outbound/missed calls appear under lead Call History
- [ ] Unmatched personal numbers are not uploaded
- [ ] Duplicate sync does not create duplicate notes
- [ ] Force-stop / Expo Go limitation communicated to agents

## Sign-off

| Role | Name | Date | Decision |
|---|---|---|---|
| Product | (requested) | 2026-11-01 | Proceed without waiting on full OEM matrix |
| Mobile / engineering | | | In progress |
