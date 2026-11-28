# TEST_REPORT.md — Automated & Manual Test Verification

## Automated Unit Tests (`BillingUnitTest.kt`)

| Test Name | Result | Notes |
|---|:---:|---|
| `billNo_formatsCorrectly` | PASS | Verifies `MM-000123` formatting. |
| `billNo_formatsMaxDigits` | PASS | Verifies 6-digit boundary `MM-999999`. |
| `totalAmountRoundOff_withinHalfPaise` | PASS | Verifies subtotal - discount round-off within half paise. |
| `creditBill_createsUdhariLedgerAndIncreasesBalance` | PASS | Verifies credit sales increment customer balance and record entry. |
| `collection_reducesCustomerBalance` | PASS | Verifies cash collection ledger entry decrements balance. |
| `cancelBill_reversesUdhariAndCancelsSalesRow` | PASS | Verifies reversal entry and sales row cancellation. |
| `deviceId_generationAndPrefix` | PASS | Verifies random device ID generation and disjoint prefix generation. |
| `inboundSync_conflictResolution_pendingLocalWinsOverOlderServer` | PASS | Verifies local un-pushed changes are protected against older server rows. |
| `inboundSync_conflictResolution_newerServerOverwritesOldLocal` | PASS | Verifies newer server row overwrites synced local row. |
| `escPos_widthConfiguration_byteGeneration` | PASS | Verifies ESC/POS bytes generation for 58mm & 80mm widths. |
| `saveAndPrint_isolation_failureDoesNotRollbackBill` | PASS | Verifies printing exceptions do not roll back bill creation. |

---

## Physical Device & Printer Verification Checklist

1. **Physical Bluetooth Printer Connection**:
   - Pair an 80mm Bluetooth thermal printer in Android Bluetooth settings.
   - Open App -> Navigate to **Printer Setup** tab -> Select printer.
   - Tap **Send Real Test Print** -> Verify physical printout with shop name, Hindi/Marathi line ("म्यूर मसाला व पूजा भांडार"), and test QR code.
2. **Offline Bill Creation & Print**:
   - Enable Airplane Mode.
   - Create a new bill -> Select payment mode (Cash/UPI/Credit) -> Tap **Save & Print**.
   - Verify receipt prints automatically, and bill appears in **Today's Bills**.
3. **Reprint Last Bill**:
   - On the Home screen, tap the **Reprint Last Bill** top banner.
   - Verify the previous bill reprints immediately.
4. **Offline Sync**:
   - Disable Airplane Mode.
   - Tap **Sync** icon on the top banner.
   - Verify changes push to Supabase and pending count drops to zero.
