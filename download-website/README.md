# SalesFast CRM — APK Download Website

Standalone React + Vite portal for distributing the official **SalesFast CRM** Android APK via GitHub Releases.

This folder is completely separate from the Expo mobile app. Building or deploying it does not modify the React Native application.

## Stack

- React + Vite + TypeScript
- Tailwind CSS
- Lucide React
- GitHub Releases API (with static config fallback)

## Local development

```bash
cd download-website
npm install
npm run dev
```

## Production build

```bash
cd download-website
# Match GitHub Pages project base path when testing the production build:
# set VITE_BASE_PATH=/salesfast.app/
npm run build
npm run preview
```

## GitHub Pages deployment

1. In the GitHub repo **Settings → Pages**:
   - Source: **GitHub Actions**
2. Push changes under `download-website/` (or `.github/workflows/deploy-download-website.yml`) to `main` or `abdullah`, or run the **Deploy Download Website** workflow manually.
3. Site URL (project Pages):  
   `https://thezoomit-admin.github.io/salesfast.app/`

The workflow only builds `download-website/` and never runs Expo/EAS builds.

## Publishing a future APK release

1. Build a **production** APK (not debug), e.g.:

   ```bash
   # from the Expo app root (salesapp.app)
   eas build --platform android --profile production-apk
   ```

2. Download the APK artifact from EAS (named like `SalesFast-CRM-v1.0.0.apk`).

3. Create a GitHub Release on `thezoomit-admin/salesfast.app`:
   - Tag: `v1.0.0` (match `app.config.ts` version)
   - Title: `SalesFast CRM v1.0.0`
   - Body: release notes (shown on the website)
   - Attach the production APK asset
   - Publish as a **stable** release (not draft / not pre-release)

4. The website fetches `releases/latest` automatically. No website redeploy is required for a new APK unless you also change static copy in `src/config/app.ts`.

5. Optional static fallback — edit `src/config/app.ts`:

   ```ts
   available: true,
   version: '1.0.0',
   versionCode: 1,
   apkDownloadUrl: 'https://github.com/thezoomit-admin/salesfast.app/releases/download/v1.0.0/SalesFast-CRM-v1.0.0.apk',
   apkFileSize: '42.5 MB',
   releaseDate: '2026-11-03',
   releaseNotes: ['…'],
   ```

## Configuration

| File | Purpose |
|---|---|
| `src/config/app.ts` | App branding + static release fallback |
| `src/lib/githubReleases.ts` | Live GitHub Releases API resolver |
| `vite.config.ts` | `VITE_BASE_PATH` for GitHub Pages |

## Security notes

- Links must be HTTPS GitHub Release assets
- Never distribute debug APKs
- Do not claim Google Play verification for this channel
- Android unknown-source warnings are expected for sideloading
