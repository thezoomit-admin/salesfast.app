# Realist CRM Mobile

Android-first React Native (Expo) client for SalesFast / Realist CRM.

## Phases 1–3 (current)

- Secure mobile login (`/api/auth/mobile/*`) with SecureStore tokens
- Agent dashboard, leads, follow-ups, activities, profile
- Manual call / WhatsApp from lead details
- **No automatic call-log sync** until [Phase 0](docs/phase-0-call-sync.md) passes

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

### Backend routes added

- `POST /api/auth/mobile/login`
- `POST /api/auth/mobile/refresh`
- `POST /api/auth/mobile/logout`
- `POST /api/auth/mobile/register-device`
- `GET /api/crm/mobile/dashboard`

Web cookie auth is unchanged.

## Development builds

Call-log modules (Phase 4+) require an Expo Development Build, not Expo Go. Phases 1–3 run in Expo Go for UI/API work.

```bash
npx expo start
# or later:
npx expo run:android
```
