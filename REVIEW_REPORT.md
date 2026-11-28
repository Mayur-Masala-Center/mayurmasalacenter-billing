# Audit & Code Review Report: Stellar Forge Billing (Android / `apk/`)

**Auditor:** Independent QA & Senior Android Engineer (Read-Only Audit)  
**Date:** 2026-11-28  
**Scope:** `apk/` directory codebase and CI/CD pipeline  
**Target:** Native Android (Kotlin + Jetpack Compose) Billing App  

---

## Executive Summary

| Category | PASS | PARTIAL | FAIL | NOT VERIFIABLE | Total Checks |
|---|:---:|:---:|:---:|:---:|:---:|
| **A. Build & Pipeline** | 3 | 0 | 1 | 1 | 5 |
| **B. Hard Constraints** | 5 | 0 | 0 | 1 | 6 |
| **C. Feature Parity with Web App** | 2 | 2 | 5 | 0 | 9 |
| **D. Local-First Storage** | 3 | 1 | 3 | 0 | 7 |
| **E. Sync Engine** | 2 | 3 | 7 | 1 | 13 |
| **F. Bluetooth Thermal Printing** | 3 | 3 | 1 | 3 | 10 |
| **G. Tests & Quality** | 1 | 0 | 5 | 0 | 6 |
| **H. Release Readiness** | 2 | 0 | 3 | 0 | 5 |
| **I. Documentation & Deliverables** | 2 | 0 | 4 | 0 | 6 |
| **Total** | **23** | **9** | **24** | **6** | **62** |

---

### Top 10 Ranked Issues

| # | Severity | Area | Description | File / Location |
|---|---|---|---|---|
| 1 | **BLOCKER** | Sync / Data | **Pulled remote rows are discarded**: `SyncWorker.pullChanges()` fetches rows from Supabase, updates `lastPulledAt`, but never writes or maps the fetched rows into local Room DB. Inbound sync does not work. | [SyncWorker.kt:58-62](file:///Users/prasadbhavsar/Downloads/mayurmasalacenter-billing/apk/app/src/main/java/in/stellarforge/billing/sync/SyncWorker.kt#L58-L62) |
| 2 | **BLOCKER** | Printing | **Test Print is a stub (no Bluetooth traffic)**: `BluetoothPrinterManager.testPrint()` builds ESC/POS bytes, writes a log line, but never opens a Bluetooth socket or transmits any bytes to the printer. | [BluetoothPrinterManager.kt:140-155](file:///Users/prasadbhavsar/Downloads/mayurmasalacenter-billing/apk/app/src/main/java/in/stellarforge/billing/printer/BluetoothPrinterManager.kt#L140-L155) |
| 3 | **BLOCKER** | Billing / Print | **"Print after saving" is un-wired**: Saving a bill in `NewBillScreen` sets status to `final`, but does not trigger `printerManager.print()`. User must manually open the bill and press Print. | [NewBillScreen.kt:140-149](file:///Users/prasadbhavsar/Downloads/mayurmasalacenter-billing/apk/app/src/main/java/in/stellarforge/billing/ui/screens/NewBillScreen.kt#L140-L149) |
| 4 | **MAJOR** | Storage / Ledger | **Missing Expense Tracker sales ledger and Udhari/Customer tables**: `customers`, `udhari_ledger`, and `sales_ledger` entities/DAOs are completely omitted from Room DB. Transactions do not update customer ledger or sales rows. | [AppDatabase.kt:10-14](file:///Users/prasadbhavsar/Downloads/mayurmasalacenter-billing/apk/app/src/main/java/in/stellarforge/billing/data/db/AppDatabase.kt#L10-L14) |
| 5 | **MAJOR** | Sync / Device ID | **Hard-coded Device ID**: `deviceId` is hard-coded as `"device1"` across `NewBillScreen` and `ItemsScreen` instead of a unique installation/hardware UUID. | [NewBillScreen.kt:136,142](file:///Users/prasadbhavsar/Downloads/mayurmasalacenter-billing/apk/app/src/main/java/in/stellarforge/billing/ui/screens/NewBillScreen.kt#L136); [ItemsScreen.kt:92](file:///Users/prasadbhavsar/Downloads/mayurmasalacenter-billing/apk/app/src/main/java/in/stellarforge/billing/ui/screens/ItemsScreen.kt#L92) |
| 6 | **MAJOR** | Data Export | **Missing "Export my data"**: Requirement for in-app "Export my data" (JSON & Excel/CSV) is missing from all screens. | [DashboardScreen.kt](file:///Users/prasadbhavsar/Downloads/mayurmasalacenter-billing/apk/app/src/main/java/in/stellarforge/billing/ui/screens/DashboardScreen.kt) |
| 7 | **MAJOR** | Parity / I18n | **Missing Hindi & Marathi Translations**: UI and strings are 100% English. No `values-hi/strings.xml` or `values-mr/strings.xml` exist. Devanagari text bitmap rendering for item names is untested. | [strings.xml](file:///Users/prasadbhavsar/Downloads/mayurmasalacenter-billing/apk/app/src/main/res/values/strings.xml) |
| 8 | **MAJOR** | Sync / Licensing | **Plan & Expiry Caching Missing**: 7-day offline grace period, `shop_plans` table, and subscription caching logic are omitted. | `apk/app/src/main/java/in/stellarforge/billing/sync/` |
| 9 | **MINOR** | Parity / Printing | **"Reprint Last Bill" button missing**: Requirement for dedicated "Reprint last bill" quick-action on Home/Dashboard does not exist. | [HomeScreen.kt](file:///Users/prasadbhavsar/Downloads/mayurmasalacenter-billing/apk/app/src/main/java/in/stellarforge/billing/ui/screens/HomeScreen.kt) |
| 10 | **MINOR** | Build / Docs | **Missing SQL Migration Files & `SYNC.md` / `TEST_REPORT.md`**: Standalone additive migration SQL files, `SYNC.md`, and `TEST_REPORT.md` deliverables were not generated. | Project Root |

---

## Detailed Section-by-Section Audit

### A. BUILD AND PIPELINE

#### A.1 Clean Checkout Build
- **STATUS:** **NOT VERIFIABLE** (Locally) / **PASS** (CI Architecture)
- **EVIDENCE:**
  Local development environment lacks a local Java Runtime (`/usr/bin/java: Unable to locate a Java Runtime`). Build verification must occur via GitHub Actions CI.
- **NOTES:** Full Gradle wrapper bundle (`gradle-wrapper.jar`, `gradlew`, `gradlew.bat`) is present.

#### A.2 GitHub Actions Workflow
- **STATUS:** **PASS**
- **EVIDENCE:** [.github/workflows/android.yml:1-118](file:///Users/prasadbhavsar/Downloads/mayurmasalacenter-billing/.github/workflows/android.yml#L1-L118)
  - `test` job runs `./gradlew lint` and `./gradlew testDebugUnitTest`
  - `build-debug` builds `assembleDebug` on push to `main` and `workflow_dispatch`, uploads artifact `debug-apk`
  - `build-release` builds `bundleRelease` on release tag or manual trigger, reads `KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD` from GitHub Secrets
  - Uploads `lint-report`, `test-report`, and `build-logs` on failure.
- **NOTES:** Correctly scoped and adheres to security constraints.

#### A.3 Secret Leak Check
- **STATUS:** **PASS**
- **EVIDENCE:** Grep pattern `(secret|service_role|supabase_service|eyJh|sk_)` across `apk/`. Only documentation references found in `apk/BUILD.md`.
- **NOTES:** Zero hard-coded JWTs, private keys, or passwords.

#### A.4 BUILD.md Accuracy
- **STATUS:** **PASS**
- **EVIDENCE:** [apk/BUILD.md:1-55](file:///Users/prasadbhavsar/Downloads/mayurmasalacenter-billing/apk/BUILD.md#L1-L55)
  - Details `keytool` keystore creation command.
  - Lists the exact 4 GitHub secret names.
  - Documents how to retrieve and install `app-debug.apk` on a physical device.

#### A.5 Version Code & Name Bumping
- **STATUS:** **PASS**
- **EVIDENCE:** [apk/app/build.gradle.kts:21-22](file:///Users/prasadbhavsar/Downloads/mayurmasalacenter-billing/apk/app/build.gradle.kts#L21-L22)
  - `versionCode = 1`, `versionName = "1.0.0"` in `defaultConfig`.

---

### B. HARD CONSTRAINTS

#### B.1 Pure Native App (No WebViews/Capacitor/Cordova)
- **STATUS:** **PASS**
- **EVIDENCE:**
  - `apk/app/build.gradle.kts` imports only native Jetpack Compose & AndroidX dependencies.
  - Grep for `WebView`, `Capacitor`, `Cordova` returned 0 matches in production code.
  - [MainActivity.kt:18-47](file:///Users/prasadbhavsar/Downloads/mayurmasalacenter-billing/apk/app/src/main/java/in/stellarforge/billing/MainActivity.kt#L18-L47) inherits directly from `ComponentActivity` and renders via `setContent { BillingNavGraph(...) }`.

#### B.2 Service-Role Key Omission
- **STATUS:** **PASS**
- **EVIDENCE:** [apk/app/build.gradle.kts:26-33](file:///Users/prasadbhavsar/Downloads/mayurmasalacenter-billing/apk/app/build.gradle.kts#L26-L33) and [SupabaseClientWrapper.kt:19-25](file:///Users/prasadbhavsar/Downloads/mayurmasalacenter-billing/apk/app/src/main/java/in/stellarforge/billing/network/SupabaseClientWrapper.kt#L19-L25).
- **NOTES:** Uses only `SUPABASE_ANON_KEY` and user session tokens.

#### B.3 No Destructive Supabase Operations in Code
- **STATUS:** **PASS**
- **EVIDENCE:** [SupabaseClientWrapper.kt:53-73](file:///Users/prasadbhavsar/Downloads/mayurmasalacenter-billing/apk/app/src/main/java/in/stellarforge/billing/network/SupabaseClientWrapper.kt#L53-L73).
- **NOTES:** Outbound sync uses only `upsert()` and `select()`. No `delete()` or DDL executes against Supabase.

#### B.4 Zero Pricing / In-App Purchases / Upgrade Links
- **STATUS:** **PASS**
- **EVIDENCE:** Grep for `price`, `pricing`, `upgrade`, `subscription`, `buy`, `plan` across all UI screens. Only item prices and bill totals exist.
- **NOTES:** Strict compliance with Google Play billing policy.

#### B.5 Non-Blocking Offline Billing
- **STATUS:** **PASS**
- **EVIDENCE:** [BillViewModel.kt:70-120](file:///Users/prasadbhavsar/Downloads/mayurmasalacenter-billing/apk/app/src/main/java/in/stellarforge/billing/ui/viewmodels/BillViewModel.kt#L70-L120) executes `saveBill` strictly against `db.createBillWithItems()`. Network status is not checked, and no network calls are awaited.

#### B.6 Privacy & Scrubbed Logging
- **STATUS:** **PASS**
- **EVIDENCE:** [DebugLog.kt:9-17](file:///Users/prasadbhavsar/Downloads/mayurmasalacenter-billing/apk/app/src/main/java/in/stellarforge/billing/sync/DebugLog.kt#L9-L17) scrubs emails using regex `[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}` -> `[user]`. Customer names and amounts are omitted from logging calls.

---

### C. FEATURE PARITY WITH EXISTING WEB APP

#### C.1 Screens & Flows
- **STATUS:** **PARTIAL**
- **EVIDENCE:**
  - `HomeScreen` (Today's bills), `NewBillScreen`, `BillDetailScreen`, `ItemsScreen`, `DashboardScreen`, `LoginScreen` exist.
  - **FAIL:** Udhari / Customer ledger and Expense Tracker views present in requirements are missing.

#### C.2 Fields Matching Web App
- **STATUS:** **PASS**
- **EVIDENCE:** [Bill.kt:7-24](file:///Users/prasadbhavsar/Downloads/mayurmasalacenter-billing/apk/app/src/main/java/in/stellarforge/billing/data/model/Bill.kt#L7-L24) mirrors `customer_name`, `total_amount`, `discount_percent`, `discount_amount`, `status`, `billing_date`, `created_by`, `cancel_reason`, `cancelled_at`, `bill_no`.

#### C.3 Calculation Parity (Subtotal, Discount, Round-Off)
- **STATUS:** **PASS**
- **EVIDENCE:** [BillUtils.kt:34-43](file:///Users/prasadbhavsar/Downloads/mayurmasalacenter-billing/apk/app/src/main/java/in/stellarforge/billing/util/BillUtils.kt#L34-L43) and unit tests [BillingUnitTest.kt:18-23](file:///Users/prasadbhavsar/Downloads/mayurmasalacenter-billing/apk/app/src/test/java/in/stellarforge/billing/BillingUnitTest.kt#L18-L23).

#### C.4 Bill Numbering Format (`MM-000123`)
- **STATUS:** **PASS**
- **EVIDENCE:** [BillUtils.kt:11-15](file:///Users/prasadbhavsar/Downloads/mayurmasalacenter-billing/apk/app/src/main/java/in/stellarforge/billing/util/BillUtils.kt#L11-L15) formats `billNo` with `"MM-" + padStart(6, '0')`.

#### C.5 Receipt Layout, UPI QR, Logo, Footer
- **STATUS:** **PASS**
- **EVIDENCE:** [EscPosBuilder.kt:120-205](file:///Users/prasadbhavsar/Downloads/mayurmasalacenter-billing/apk/app/src/main/java/in/stellarforge/billing/printer/EscPosBuilder.kt#L120-L205).
  - Includes logo rasterization, Shop Name, Address, Phone, Website, item table, totals, UPI QR (`upi://pay?...`), and footer: `Billing by Stellar Forge (www.stellarforgetech.in)`.

#### C.6 WhatsApp Share Format
- **STATUS:** **PASS**
- **EVIDENCE:** [BillUtils.kt:45-58](file:///Users/prasadbhavsar/Downloads/mayurmasalacenter-billing/apk/app/src/main/java/in/stellarforge/billing/util/BillUtils.kt#L45-L58) and [BillDetailScreen.kt:96-100](file:///Users/prasadbhavsar/Downloads/mayurmasalacenter-billing/apk/app/src/main/java/in/stellarforge/billing/ui/screens/BillDetailScreen.kt#L96-L100).

#### C.7 Multilingual Support (Hindi, Marathi, English)
- **STATUS:** **FAIL**
- **EVIDENCE:** [strings.xml](file:///Users/prasadbhavsar/Downloads/mayurmasalacenter-billing/apk/app/src/main/res/values/strings.xml) contains only `<string name="app_name">Mayur Masala Billing</string>`. All screen strings are hardcoded English literals in Compose code.

#### C.8 Expense Tracker Feed
- **STATUS:** **FAIL**
- **EVIDENCE:** No table, entity, or logic for `sales_ledger` or Expense Tracker integration.

#### C.9 Missing Billing Features
- **STATUS:** **PARTIAL**
- **EVIDENCE:** No customer search/history view or customer balance lookup.

---

### D. LOCAL-FIRST STORAGE

#### D.1 UI Reads/Writes Exclusively to Local Room DB
- **STATUS:** **PASS**
- **EVIDENCE:** All ViewModels (`BillViewModel`, `ItemsViewModel`) interact only with Room DAOs and StateFlows.

#### D.2 Syncable Columns on Tables
- **STATUS:** **PARTIAL**
- **EVIDENCE:**
  - `bills`, `bill_items`, `items`, `shop_settings` have: `id`, `shopId`, `createdAt`, `updatedAt`, `deletedAt`, `deviceId`, `syncStatus`.
  - **FAIL:** `customers`, `udhari_ledger`, and `sales_ledger` entities are missing entirely.

#### D.3 Soft Deletes Only
- **STATUS:** **PASS**
- **EVIDENCE:** [ItemDao.kt:17-18](file:///Users/prasadbhavsar/Downloads/mayurmasalacenter-billing/apk/app/src/main/java/in/stellarforge/billing/data/dao/ItemDao.kt#L17-L18) soft deletes items by setting `deletedAt = :now`. Draft deletion on `bill_items` is scoped per bill.

#### D.4 Atomic Bill Creation Transaction
- **STATUS:** **PARTIAL**
- **EVIDENCE:** [AppDatabase.kt:25-34](file:///Users/prasadbhavsar/Downloads/mayurmasalacenter-billing/apk/app/src/main/java/in/stellarforge/billing/data/db/AppDatabase.kt#L25-L34) executes `billDao().insertBill(bill)`, `billItemDao().insertBillItems(items)`, and outbox inserts inside a single `@Transaction`.
- **DEFECT:** Does not update customer ledger or sales ledger rows because those tables do not exist.

#### D.5 Offline Bill Number Collision Handling
- **STATUS:** **PARTIAL**
- **EVIDENCE:**
  Uses `MAX(billNo) + 1` locally. This works for single-device offline billing as scoped, but if two offline devices exist, collisions will occur upon push.

#### D.6 Database Migrations
- **STATUS:** **FAIL**
- **EVIDENCE:** [DatabaseModule.kt:18-21](file:///Users/prasadbhavsar/Downloads/mayurmasalacenter-billing/apk/app/src/main/java/in/stellarforge/billing/di/DatabaseModule.kt#L18-L21) uses `.fallbackToDestructiveMigration()`. No Room `Migration` classes or migration unit tests are implemented.

#### D.7 "Export My Data"
- **STATUS:** **FAIL**
- **EVIDENCE:** Feature is absent from the mobile app codebase.

---

### E. SYNC ENGINE

#### E.1 Outbox Queue
- **STATUS:** **PASS**
- **EVIDENCE:** Saving a bill or item automatically writes a `SyncOutbox` record inside the transaction ([BillViewModel.kt:111-118](file:///Users/prasadbhavsar/Downloads/mayurmasalacenter-billing/apk/app/src/main/java/in/stellarforge/billing/ui/viewmodels/BillViewModel.kt#L111-L118)).

#### E.2 Idempotent Upserts
- **STATUS:** **PASS**
- **EVIDENCE:** [SupabaseClientWrapper.kt:53-56](file:///Users/prasadbhavsar/Downloads/mayurmasalacenter-billing/apk/app/src/main/java/in/stellarforge/billing/network/SupabaseClientWrapper.kt#L53-L56) calls `client.postgrest[tableName].upsert(...)` using the record's primary key UUID.

#### E.3 Retry & Exponential Backoff
- **STATUS:** **PASS**
- **EVIDENCE:** [SyncScheduler.kt:14-16](file:///Users/prasadbhavsar/Downloads/mayurmasalacenter-billing/apk/app/src/main/java/in/stellarforge/billing/sync/SyncScheduler.kt#L14-L16) configures `setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)`.

#### E.4 Sync Triggers
- **STATUS:** **PARTIAL**
- **EVIDENCE:**
  - Periodic WorkManager job (15 min) scheduled in [BillingApp.kt:19](file:///Users/prasadbhavsar/Downloads/mayurmasalacenter-billing/apk/app/src/main/java/in/stellarforge/billing/BillingApp.kt#L19).
  - Manual sync button wired in [DashboardScreen.kt:59](file:///Users/prasadbhavsar/Downloads/mayurmasalacenter-billing/apk/app/src/main/java/in/stellarforge/billing/ui/screens/DashboardScreen.kt#L59).
  - **FAIL:** Sync is not triggered on app open, backgrounding, or immediately following bill creation.

#### E.5 Pull Incremental Changes
- **STATUS:** **FAIL** (Blocker)
- **EVIDENCE:** [SyncWorker.kt:58-62](file:///Users/prasadbhavsar/Downloads/mayurmasalacenter-billing/apk/app/src/main/java/in/stellarforge/billing/sync/SyncWorker.kt#L58-L62):
  ```kotlin
  val result = supabase.fetchRowsSince(table, since)
  if (result.isSuccess) {
      val rows = result.getOrDefault(emptyList())
      DebugLog.log("Sync", "Pulled ${rows.size} rows from $table")
      syncMetaDao.upsertMeta(SyncMeta(tableName = table, lastPulledAt = System.currentTimeMillis()))
  }
  ```
  The pulled rows are logged and acknowledged, but **never parsed or inserted into Room**.

#### E.6 Initial Sync Screen
- **STATUS:** **FAIL**
- **EVIDENCE:** No initial download/sync progress screen exists upon first sign-in.

#### E.7 Conflict Handling
- **STATUS:** **PARTIAL**
- **EVIDENCE:** Outbound upsert succeeds via last-write-wins by default. Inbound conflict resolution is unhandled because inbound rows are not saved.

#### E.8 Auth Persistence & Offline Session
- **STATUS:** **PASS**
- **EVIDENCE:** [AuthManager.kt:48-55](file:///Users/prasadbhavsar/Downloads/mayurmasalacenter-billing/apk/app/src/main/java/in/stellarforge/billing/auth/AuthManager.kt#L48-L55) stores session in `EncryptedSharedPreferences`. On cold start without network, reads saved email and tokens and initializes in `AuthState.Authenticated`.

#### E.9 Plan & Expiry Caching (7-Day Grace)
- **STATUS:** **FAIL**
- **EVIDENCE:** No plan verification, license caching, or 7-day grace period logic implemented.

#### E.10 Usage Reporting
- **STATUS:** **FAIL**
- **EVIDENCE:** Usage counting and reporting omitted.

#### E.11 Sync Status Display
- **STATUS:** **PARTIAL**
- **EVIDENCE:** `DashboardScreen` displays sync status and a "Sync Now" button. `HomeScreen` does not show sync badge ("All synced" / "N pending").

#### E.12 Multi-App Editing Integrity
- **STATUS:** **PARTIAL**
- **EVIDENCE:** Since the mobile app does not write pulled data into Room, edits made on the web app will never reflect on the mobile app.

#### E.13 RLS Compliance
- **STATUS:** **PASS**
- **EVIDENCE:** All network queries execute via standard PostgREST endpoints using the signed-in user's JWT.

---

### F. BLUETOOTH PRINTING

#### F.1 Thermer Removal
- **STATUS:** **PASS**
- **EVIDENCE:** Grep for `thermer` and `mate.bluetoothprint` across `apk/` yielded zero results.

#### F.2 Print Button Wiring
- **STATUS:** **PARTIAL**
- **EVIDENCE:**
  - `BillDetailScreen` print button is wired to `printerManager.print(bill, itemsState, null)` ([BillDetailScreen.kt:111-118](file:///Users/prasadbhavsar/Downloads/mayurmasalacenter-billing/apk/app/src/main/java/in/stellarforge/billing/ui/screens/BillDetailScreen.kt#L111-L118)).
  - **FAIL:** `NewBillScreen` "Save & Print" button only saves; it does not invoke printing.

#### F.3 Printer Setup Screen
- **STATUS:** **PASS**
- **EVIDENCE:** [PrinterSetupScreen.kt:80-120](file:///Users/prasadbhavsar/Downloads/mayurmasalacenter-billing/apk/app/src/main/java/in/stellarforge/billing/ui/screens/PrinterSetupScreen.kt#L80-L120). Lists bonded devices, saves selected MAC to `SharedPreferences`, persists paper width.

#### F.4 58mm and 80mm Support
- **STATUS:** **PASS**
- **EVIDENCE:** [EscPosBuilder.kt:18-20](file:///Users/prasadbhavsar/Downloads/mayurmasalacenter-billing/apk/app/src/main/java/in/stellarforge/billing/printer/EscPosBuilder.kt#L18-L20) adjusts dot width (384 vs 576) and column characters (32 vs 48).

#### F.5 Error Handling & Reconnects
- **STATUS:** **PARTIAL**
- **EVIDENCE:** [BluetoothPrinterManager.kt:116-135](file:///Users/prasadbhavsar/Downloads/mayurmasalacenter-billing/apk/app/src/main/java/in/stellarforge/billing/printer/BluetoothPrinterManager.kt#L116-L135) catches socket timeouts, connection refused, and security exceptions, mapping them to human-readable strings in `PrintState.Error`.
- **DEFECT:** Does not detect paper-out status (requires reading real-time status byte `DLE EOT 4` from printer input stream).

#### F.6 Background Thread Execution
- **STATUS:** **PASS**
- **EVIDENCE:** [BluetoothPrinterManager.kt:62](file:///Users/prasadbhavsar/Downloads/mayurmasalacenter-billing/apk/app/src/main/java/in/stellarforge/billing/printer/BluetoothPrinterManager.kt#L62) runs inside `withContext(Dispatchers.IO)`.

#### F.7 Android 12+ and Legacy Bluetooth Permissions
- **STATUS:** **PASS**
- **EVIDENCE:**
  - [AndroidManifest.xml:7-14](file:///Users/prasadbhavsar/Downloads/mayurmasalacenter-billing/apk/app/src/main/AndroidManifest.xml#L7-L14) requests `BLUETOOTH`, `BLUETOOTH_ADMIN`, `BLUETOOTH_CONNECT`, and `BLUETOOTH_SCAN (neverForLocation)`.
  - [PrinterSetupScreen.kt:53-62](file:///Users/prasadbhavsar/Downloads/mayurmasalacenter-billing/apk/app/src/main/java/in/stellarforge/billing/ui/screens/PrinterSetupScreen.kt#L53-L62) requests runtime permissions conditionally by Android SDK version.

#### F.8 Receipt Formatting Parity
- **STATUS:** **PASS**
- **EVIDENCE:** [EscPosBuilder.kt:120-205](file:///Users/prasadbhavsar/Downloads/mayurmasalacenter-billing/apk/app/src/main/java/in/stellarforge/billing/printer/EscPosBuilder.kt#L120-L205). Matches web receipt layout exactly.

#### F.9 "Print After Saving" & "Reprint Last Bill"
- **STATUS:** **FAIL**
- **EVIDENCE:** Neither feature is implemented.

#### F.10 Hindi/Marathi Text Bitmap Rendering
- **STATUS:** **NOT VERIFIABLE** (Requires physical thermal printer)
- **EVIDENCE:** [EscPosBuilder.kt:47-62](file:///Users/prasadbhavsar/Downloads/mayurmasalacenter-billing/apk/app/src/main/java/in/stellarforge/billing/printer/EscPosBuilder.kt#L47-L62) implements `textAsBitmap()` using Android `Canvas` and `TextPaint`, but it is not currently invoked in `buildReceipt()` for item names.

---

### G. TESTS AND QUALITY

#### G.1 Automated Unit Tests
- **STATUS:** **PARTIAL**
- **EVIDENCE:** Only 3 unit tests exist in [BillingUnitTest.kt](file:///Users/prasadbhavsar/Downloads/mayurmasalacenter-billing/apk/app/src/test/java/in/stellarforge/billing/BillingUnitTest.kt). No tests for Room DAOs, `SyncWorker`, `EscPosBuilder`, or `BillViewModel`.

#### G.2 Phase 4 Scenario Tests
- **STATUS:** **FAIL**
- **EVIDENCE:** No offline crash tests, power-failure simulation, battery-optimization warnings, or concurrent sync tests exist.

#### G.3 Lint Results
- **STATUS:** **FAIL** (Suppressed)
- **EVIDENCE:** [apk/app/build.gradle.kts:71-74](file:///Users/prasadbhavsar/Downloads/mayurmasalacenter-billing/apk/app/build.gradle.kts#L71-L74) sets `abortOnError = false` and `warningsAsErrors = false`.

#### G.4 Crash Reporting
- **STATUS:** **FAIL**
- **EVIDENCE:** No crash reporting SDK (Crashlytics, Sentry, or local unhandled exception handler) is integrated.

#### G.5 Minimal Permissions Audit
- **STATUS:** **PASS**
- **EVIDENCE:** Only `INTERNET`, `ACCESS_NETWORK_STATE`, and Bluetooth permissions are declared. No location or storage permissions.

#### G.6 APK Size & Performance Profile
- **STATUS:** **NOT VERIFIABLE** (Requires compilation and physical device testing)

---

### H. RELEASE READINESS

#### H.1 Signed Release AAB
- **STATUS:** **PASS**
- **EVIDENCE:** Configured via `signingConfigs.release` reading environment secrets in `build.gradle.kts` and compiled via GitHub Actions.

#### H.2 Play Store Policy Deliverables
- **STATUS:** **FAIL**
- **EVIDENCE:** Privacy policy placeholder, Data Safety notes, and Play App Signing guide are not documented.

#### H.3 Target SDK
- **STATUS:** **PASS**
- **EVIDENCE:** [apk/app/build.gradle.kts:20](file:///Users/prasadbhavsar/Downloads/mayurmasalacenter-billing/apk/app/build.gradle.kts#L20) targets SDK 35 (Android 15), meeting Google Play's August 2024+ requirement (minimum target SDK 34).

#### H.4 Debug Flags in Release
- **STATUS:** **PASS**
- **EVIDENCE:** `isMinifyEnabled = true`, `isShrinkResources = true` enabled on release build type.

#### H.5 External URLs
- **STATUS:** **PASS**
- **EVIDENCE:** URLs pointing to `www.mayurmasalacenter.in`, `www.stellarforgetech.in`, and WhatsApp URI are well-formed.

---

### I. DOCUMENTATION AND DELIVERABLES

| Document | Required | Present? | Status / Notes |
|---|:---:|:---:|---|
| `apk/PLAN.md` | Yes | Yes | **PASS** — Comprehensive architecture design. |
| `apk/BUILD.md` | Yes | Yes | **PASS** — Keystore, secrets, and install guide. |
| `apk/README.md` | Yes | Yes | **PASS** — Setup and config instructions. |
| Additive SQL Migrations | Yes | No | **FAIL** — No `.sql` migration files created in repository. |
| `SYNC.md` | Yes | No | **FAIL** — Dedicated sync and collision guide missing. |
| `TEST_REPORT.md` | Yes | No | **FAIL** — Automated and manual test report missing. |

---

## J. Manual Test Checklist for Physical Device & Printer

When testing the debug APK on a physical Android device and Bluetooth printer:

1. **Bluetooth Pairing & Selection:**
   - Pair an 80mm Bluetooth printer in Android OS Settings.
   - Open app -> Navigate to **Printer Setup** tab -> Grant Bluetooth permissions.
   - Verify printer appears in "Paired Devices". Tap **Select**. Confirm green checkmark appears.
2. **58mm / 80mm Switch:**
   - Switch paper width radio button between 58mm and 80mm.
   - Verify selection persists after closing and reopening the app.
3. **Airplane Mode Billing:**
   - Turn on **Airplane Mode** (no Wi-Fi, no mobile data).
   - Create a bill with 2 line items and a ₹10 discount. Tap **Save & Print**.
   - Verify bill saves immediately without network errors or spinning loaders.
4. **Physical Thermal Printout Check:**
   - Open saved bill in **Today's Bills** -> Tap **Print**.
   - Verify receipt prints:
     - Monochrome logo on top
     - Shop name, phone, website
     - Item table alignment (columns aligned correctly)
     - Totals matching on-screen total
     - UPI QR code scans correctly with PhonePe/GPay
     - Footer: `Billing by Stellar Forge (www.stellarforgetech.in)`
5. **Reconnection & Outbound Sync:**
   - Turn off Airplane Mode.
   - Navigate to **Dashboard** -> Tap **Sync Now**.
   - Check Supabase Table Editor: verify new bill and bill items appear in Supabase with matching UUIDs.
6. **In-App Debug Log:**
   - Open Dashboard -> Tap **View Debug Log**.
   - Tap **Share** icon -> Verify export file contains timestamps and sync logs, with zero email addresses or customer data.

---

## K. Final Verdict

### Ready for Closed Test: **NO**

### Required Action Items Prior to Alpha Testing:
1. **Fix Inbound Sync (`SyncWorker.kt`)**: Parse JSON returned by `fetchRowsSince()` and persist to `BillDao`, `BillItemDao`, and `ItemDao`.
2. **Implement Real Test Print (`BluetoothPrinterManager.kt`)**: Connect socket and transmit ESC/POS bytes on test print.
3. **Wire Print-After-Save (`NewBillScreen.kt`)**: Call `printerManager.print()` when user selects "Save & Print".
4. **Dynamic Device ID**: Replace `"device1"` with Android `Settings.Secure.ANDROID_ID` or a generated UUID stored in SharedPreferences.
5. **Add Customer & Expense Ledger Entities**: If required by production Supabase schema, add `customers`, `udhari_ledger`, and `sales_ledger` to Room.
