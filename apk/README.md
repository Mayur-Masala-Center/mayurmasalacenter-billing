# Stellar Forge Billing — Android App

Native Android billing app for **Mayur Masala Center**, built with **Kotlin + Jetpack Compose**.

> This is a 100% native Android app — no WebView, no Capacitor, no Cordova.

---

## Configuration

Before building, set two environment variables (or add them as GitHub Secrets for CI):

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL (same as the web app) |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key (same as the web app) |

> **Never use the service-role key.** The app uses only the anon key + user session governed by RLS.

For the Android build, these will be injected as `BuildConfig` fields via `build.gradle.kts` in a later phase.

---

## Build

### Debug APK (GitHub Actions — no Android Studio needed)

Push to `main` → GitHub Actions automatically builds and uploads `app-debug.apk` as an artifact.

See [BUILD.md](BUILD.md) for download/install instructions.

### Local Build (if you have Android Studio or the Android SDK)

```bash
cd apk
./gradlew assembleDebug
# APK: app/build/outputs/apk/debug/app-debug.apk
```

---

## Run Unit Tests

```bash
cd apk
./gradlew testDebugUnitTest
```

---

## Project Structure

```
apk/
├── app/
│   └── src/
│       ├── main/
│       │   ├── java/in/stellarforge/billing/   ← Kotlin source
│       │   ├── res/                             ← Resources
│       │   └── AndroidManifest.xml
│       └── test/                               ← Unit tests
├── build.gradle.kts                            ← Root Gradle config
├── settings.gradle.kts
├── gradle.properties
├── BUILD.md                                    ← Keystore + CI/CD guide
└── PLAN.md                                     ← Architecture & phase plan
```

---

## Phases

| Phase | Description | Status |
|---|---|---|
| **Milestone 1** | Bare native Android app — builds in CI, installs on phone | ✅ Done |
| **Phase 1** | Login (Supabase auth), Items, New Bill, Room local DB | 🔜 Next |
| **Phase 2** | Offline sync, WorkManager outbox | 🔜 Planned |
| **Phase 3** | Native Bluetooth ESC/POS printing (58mm & 80mm) | 🔜 Planned |
| **Phase 4** | Quality, release signing, Play Store AAB | 🔜 Planned |
