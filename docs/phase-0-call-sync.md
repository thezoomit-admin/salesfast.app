# Phase 0 — Call Sync Feasibility Spike

**Status:** NOT STARTED / NOT PASSED  
**Product:** Realist CRM Mobile (`salesapp.app`)  
**Gate:** Automatic `READ_CALL_LOG` synchronization must not ship until this document records a pass on physical Android devices.

## Why this gate exists

Android treats call-log access as a sensitive / restricted permission. OEM battery policies and WorkManager scheduling vary. Sideloading does **not** automatically bypass Google Play restricted-permission policy. Feasibility must be proven on real devices before Phases 4–6.

## Scope of the spike (when executed)

1. Expo **development build** (not Expo Go) with a minimal Kotlin Expo Module.
2. Request **only** `READ_CALL_LOG` (no contacts, phone state, or location).
3. Explicit consent screen before any collection.
4. Read a small recent call-log window after a test call.
5. Schedule a WorkManager job; verify it runs under typical OEM conditions (may be delayed).
6. Confirm distribution intent (internal APK vs Play) and policy risk.

## Devices to test

| Device / OEM | Android version | Permission grant | Call rows readable | WorkManager observed | Notes |
|---|---|---|---|---|---|
| Samsung | | | | | |
| Xiaomi / Redmi | | | | | |
| Oppo | | | | | |
| Realme | | | | | |
| Vivo | | | | | |

Fill cells with Pass / Fail / N/A and evidence (build number, screenshots, timestamps). Do **not** fabricate results.

## Pass criteria

- [ ] `READ_CALL_LOG` can be granted on intended target devices
- [ ] App can read call history on physical devices (not emulator-only)
- [ ] WorkManager executes at least once under tested conditions (document delay)
- [ ] Distribution approach documented and compatible with permission policy
- [ ] Privacy / consent copy reviewed
- [ ] Force-stop limitation communicated (jobs may not run until user reopens the app)

## Current product behavior (Phases 1–3)

- Agents can dial leads via `tel:` and open WhatsApp.
- Sync status in the app shows **`not_configured`**.
- No call-log permission is requested.
- No personal call history is uploaded.

## After a documented pass

Implement Phases 4–6 only:

1. Kotlin call-log module + consent UX  
2. Local lead-number matching (privacy-preserving)  
3. Backend upload / idempotency / unresolved queue  
4. WorkManager + scoped worker credentials  

## Sign-off

| Role | Name | Date | Decision |
|---|---|---|---|
| Mobile / engineering | | | Pass / Fail |
| Product / privacy | | | Pass / Fail |
