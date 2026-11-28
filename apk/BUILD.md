# BUILD.md — Stellar Forge Billing (Android)

## 1. Generate the Signing Keystore

Run this **once** on your local machine (keep the resulting `.jks` file safe — back it up externally, never commit it):

```bash
keytool -genkey -v \
  -keystore stellarforge-billing.jks \
  -alias stellarforge \
  -keyalg RSA -keysize 2048 \
  -validity 10000
```

You will be prompted for a keystore password, your name, organisation, etc.

---

## 2. Add GitHub Secrets

Go to your GitHub repo → **Settings → Secrets and variables → Actions → New repository secret** and add these four secrets:

| Secret Name | Value |
|---|---|
| `KEYSTORE_BASE64` | Base64-encoded content of your `.jks` file: `base64 -i stellarforge-billing.jks \| pbcopy` |
| `KEYSTORE_PASSWORD` | The keystore password you chose above |
| `KEY_ALIAS` | `stellarforge` (or whatever alias you used) |
| `KEY_PASSWORD` | The key password (same as keystore password if you kept it the same) |

> **Never commit** the `.jks` file or any of these values to the repository.

---

## 3. Download and Install the Debug APK

1. Go to your GitHub repo → **Actions** → click the latest **Android CI/CD** workflow run → scroll to **Artifacts**.
2. Download **debug-apk.zip** and unzip it → `app-debug.apk`.
3. On your Android phone:
   - Enable **Unknown sources**: Settings → Security → Install unknown apps → (your file manager or Chrome) → Allow.
   - Transfer `app-debug.apk` to the phone (USB, WhatsApp to yourself, Google Drive, etc.).
   - Tap the file to install.

---

## 4. Bump Version Code and Name

Edit `apk/app/build.gradle.kts`:

```kotlin
defaultConfig {
    versionCode = 2          // ← increment by 1 for every release
    versionName = "1.1.0"   // ← semantic version shown to users
}
```

Commit and push (or create a `v1.1.0` tag for a signed release AAB):

```bash
git tag v1.1.0
git push origin v1.1.0
```

---

## 5. Enrol in Play App Signing (Recommended)

After uploading the first AAB to the Play Console, choose **Google-managed key**. This lets Google re-sign the APK and protects you if your keystore is ever lost. You can still use your own keystore for signing the AAB upload; Google signs the final APKs delivered to users.

> **Important:** Back up your `.jks` file to a secure external location (password manager, encrypted drive). If you lose it without Play App Signing enrolled, you cannot update the app on the Play Store.
