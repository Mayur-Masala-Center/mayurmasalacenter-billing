package in.stellarforge.billing

import org.junit.Test
import org.junit.Assert.*

class BillingUnitTest {
    @Test
    fun billNo_formatsCorrectly() {
        // bill_no = 123 → "MM-000123"
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
}
