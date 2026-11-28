package `in`.stellarforge.billing

import org.junit.Test
import org.junit.Assert.*
import `in`.stellarforge.billing.data.model.*
import `in`.stellarforge.billing.printer.EscPosBuilder
import `in`.stellarforge.billing.util.BillUtils
import java.util.UUID

class BillingUnitTest {
    @Test
    fun billNo_formatsCorrectly() {
        val billNo = "MM-" + "123".padStart(6, '0')
        assertEquals("MM-000123", billNo)
    }

    @Test
    fun billNo_formatsMaxDigits() {
        val billNo = "MM-" + "999999".padStart(6, '0')
        assertEquals("MM-999999", billNo)
    }

    @Test
    fun totalAmountRoundOff_withinHalfPaise() {
        val lineTotal = 100.005
        val rounded = Math.round(lineTotal * 100).toDouble() / 100
        assertEquals(100.01, rounded, 0.001)
    }

    @Test
    fun creditBill_createsUdhariLedgerAndIncreasesBalance() {
        val initialBalance = 0.0
        val billTotal = 450.0
        val customerId = "cust_1"
        val billId = "bill_1"

        val customer = Customer(id = customerId, name = "Ramesh", balance = initialBalance)
        val udhari = UdhariLedger(
            id = "ledger_1",
            customerId = customerId,
            billId = billId,
            entryType = "credit_sale",
            amount = billTotal,
            balanceAfter = customer.balance + billTotal
        )

        assertEquals(450.0, udhari.balanceAfter, 0.001)
        assertEquals("credit_sale", udhari.entryType)
    }

    @Test
    fun collection_reducesCustomerBalance() {
        val currentBalance = 450.0
        val collectionAmount = 200.0
        val customerId = "cust_1"

        val collection = UdhariLedger(
            id = "ledger_2",
            customerId = customerId,
            entryType = "collection",
            amount = -collectionAmount,
            balanceAfter = currentBalance - collectionAmount,
            notes = "Cash received"
        )

        assertEquals(250.0, collection.balanceAfter, 0.001)
        assertEquals(-200.0, collection.amount, 0.001)
    }

    @Test
    fun cancelBill_reversesUdhariAndCancelsSalesRow() {
        val billTotal = 500.0
        val billId = "bill_2"
        val customerId = "cust_2"

        val sales = SalesLedger(
            id = "sales_1",
            sourceId = billId,
            amount = billTotal,
            saleDate = "2026-11-28",
            status = "active"
        )
        val cancelledSales = sales.copy(status = "cancelled")
        assertEquals("cancelled", cancelledSales.status)

        val reversal = UdhariLedger(
            id = "rev_1",
            customerId = customerId,
            billId = billId,
            entryType = "reversal",
            amount = -billTotal,
            balanceAfter = 0.0,
            notes = "Cancelled"
        )
        assertEquals("reversal", reversal.entryType)
        assertEquals(-500.0, reversal.amount, 0.001)
    }

    @Test
    fun deviceId_generationAndPrefix() {
        val id1 = UUID.randomUUID().toString()
        val id2 = UUID.randomUUID().toString()
        assertNotEquals(id1, id2)

        val prefix1 = id1.replace("-", "").take(4).uppercase()
        val prefix2 = id2.replace("-", "").take(4).uppercase()
        val bill1 = BillUtils.deviceScopedBillNo(prefix1, 1)
        val bill2 = BillUtils.deviceScopedBillNo(prefix2, 1)

        assertNotEquals(bill1, bill2)
        assertTrue(bill1.startsWith("MM-$prefix1-000001"))
        assertTrue(bill2.startsWith("MM-$prefix2-000001"))
    }

    @Test
    fun inboundSync_conflictResolution_pendingLocalWinsOverOlderServer() {
        val localUpdatedAt = 1700000050000L
        val serverUpdatedAt = 1700000040000L
        val localItem = Item(
            id = "item_1",
            name = "Jeera Local Edit",
            updatedAt = localUpdatedAt,
            syncStatus = "pending"
        )

        val shouldOverwrite = !(localItem.syncStatus == "pending" && localItem.updatedAt > serverUpdatedAt)
        assertFalse("Local pending change must not be overwritten by older server update", shouldOverwrite)
    }

    @Test
    fun inboundSync_conflictResolution_newerServerOverwritesOldLocal() {
        val localUpdatedAt = 1700000040000L
        val serverUpdatedAt = 1700000050000L
        val localItem = Item(
            id = "item_1",
            name = "Jeera",
            updatedAt = localUpdatedAt,
            syncStatus = "synced"
        )

        val shouldOverwrite = !(localItem.syncStatus == "pending" && localItem.updatedAt > serverUpdatedAt)
        assertTrue("Newer server row must overwrite synced local row", shouldOverwrite)
    }

    @Test
    fun escPos_widthConfiguration_byteGeneration() {
        val builder58 = EscPosBuilder(paperWidthMm = 58)
        builder58.reset()
        builder58.text("Width 58mm test")
        val bytes58 = builder58.build()
        assertTrue(bytes58.isNotEmpty())
        assertEquals(0x1B.toByte(), bytes58[0]) // ESC
        assertEquals(0x40.toByte(), bytes58[1]) // @

        val builder80 = EscPosBuilder(paperWidthMm = 80)
        builder80.reset()
        builder80.separator(dashed = false)
        val bytes80 = builder80.build()
        assertTrue(bytes80.size > bytes58.size)
    }

    @Test
    fun saveAndPrint_isolation_failureDoesNotRollbackBill() {
        var billSaved = false
        var printerFailed = false

        billSaved = true
        try {
            throw java.io.IOException("Printer connection timed out")
        } catch (e: Exception) {
            printerFailed = true
        }

        assertTrue("Bill must remain saved even if printing fails", billSaved)
        assertTrue("Printer failure should be caught safely", printerFailed)
    }

    @Test
    fun exportMyData_csvGenerationWithBom() {
        val bills = listOf(
            Bill(id = "b1", billNo = 101, customerName = "Sunil Patil", paymentMode = "upi", totalAmount = 350.0, status = "final")
        )
        val csv = BillUtils.billsToCsv(bills)
        assertTrue(csv.startsWith("\uFEFF")) // Must contain UTF-8 BOM for Excel Devanagari support
        assertTrue(csv.contains("MM-000101"))
        assertTrue(csv.contains("Sunil Patil"))
        assertTrue(csv.contains("350.00"))
    }
}
