# SalesFast CRM Mobile

Android-first React Native (Expo) client for SalesFast CRM.

## Features

- Secure mobile login (`/api/auth/mobile/*`) with SecureStore tokens
- Agent dashboard, leads, follow-ups, activities, profile
- Manual call / WhatsApp from lead details
- **Automatic call sync** → lead Call History (Android development build + `READ_CALL_LOG`)

See [Phase 0 / call sync](docs/phase-0-call-sync.md).

## Setup

```bash
cd salesapp.app
npm install
cp .env.example .env   # set EXPO_PUBLIC_API_URL
npx expo start
```

### API URL

| Environment | Example |
|---|---|
| Android emulator | `http://10.0.2.2:6001/api` |
| Physical device | `http://<your-lan-ip>:6001/api` |
| Production | `https://api.example.com/api` |

Set `EXPO_PUBLIC_API_URL` in `.env` or `app.config.ts` `extra.apiUrl`.

### Backend routes

- `POST /api/auth/mobile/login`
- `POST /api/auth/mobile/refresh`
- `POST /api/auth/mobile/logout`
- `POST /api/auth/mobile/register-device`
- `GET /api/crm/mobile/dashboard`
- `GET /api/crm/mobile/call-sync/match-directory`
- `POST /api/crm/mobile/call-sync`

## Call sync (required for auto Call History)

Expo Go **cannot** read Android call logs. Use a development build:

```bash
npx expo run:android
# or EAS development build, then:
npx expo start --dev-client
```

1. Enable call sync in the app (consent).
2. Grant `READ_CALL_LOG`.
3. Open the app or tap **Sync now** after a lead calls you.
4. Matched calls appear on that lead’s **Call History** tab in admin.
