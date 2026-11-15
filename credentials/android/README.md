# Android Play signing (local builds)

One-time setup so `pnpm build-aab` / `pnpm build-apk` sign with the **same**
upload key Play already trusts (from earlier EAS builds).

1. Download keystores from Expo (uses your logged-in `eas` session once):

   ```bash
   pnpm keystore:download
   ```

2. From `.keystore-export/`, copy the Play-matching `.jks` to:

   `credentials/android/upload-keystore.jks`

3. Create `credentials/android/keystore.properties` from the example:

   ```bash
   copy keystore.properties.example keystore.properties
   ```

   Fill `storePassword`, `keyAlias`, and `keyPassword` from the matching
   `*.txt` next to the downloaded jks.

4. Build:

   ```bash
   pnpm build-aab
   pnpm build-apk
   ```

Output lands in `release/salesfast-crm-{version}.aab` (or `.apk`).
