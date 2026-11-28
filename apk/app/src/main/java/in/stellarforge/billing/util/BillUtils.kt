package `in`.stellarforge.billing.util

import `in`.stellarforge.billing.data.model.Bill
import `in`.stellarforge.billing.data.model.BillItem
import java.text.SimpleDateFormat
import java.util.*

object BillUtils {
    private val IST = TimeZone.getTimeZone("Asia/Kolkata")

    fun billNo(bill: Bill): String = when {
        bill.status == "draft" -> "Draft"
        bill.billNo != null -> "MM-" + bill.billNo.toString().padStart(6, '0')
        else -> "MM-" + bill.id.takeLast(6).uppercase()
    }

    fun deviceScopedBillNo(devicePrefix: String, seq: Int): String {
        return "MM-$devicePrefix-" + seq.toString().padStart(6, '0')
    }

    fun todayIST(): String {
        val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.US)
        sdf.timeZone = IST
        return sdf.format(Date())
    }

    fun formatDate(epochMs: Long): String {
        val sdf = SimpleDateFormat("dd MMM yyyy", Locale("en", "IN"))
        sdf.timeZone = IST
        return sdf.format(Date(epochMs))
    }

    fun formatTime(epochMs: Long): String {
        val sdf = SimpleDateFormat("hh:mm a", Locale("en", "IN"))
        sdf.timeZone = IST
        return sdf.format(Date(epochMs))
    }

    fun computeTotals(items: List<BillItem>, discountPct: Double, discountAmt: Double): Triple<Double, Double, Double> {
        val subtotal = items.sumOf { it.itemPrice * it.quantity }
        val discount = when {
            discountPct > 0 -> subtotal * discountPct / 100.0
            else -> discountAmt
        }
        val raw = subtotal - discount
        val total = Math.round(raw).toDouble()
        return Triple(subtotal, discount, total)
    }

    fun whatsAppText(bill: Bill, items: List<BillItem>): String {
        val no = billNo(bill)
        val date = formatDate(bill.createdAt)
        val sb = StringBuilder()
        sb.appendLine("*Mayur Masala Billing*")
        sb.appendLine("Bill: $no | Date: $date")
        sb.appendLine("Customer: ${bill.customerName}")
        sb.appendLine("Payment: ${bill.paymentMode.uppercase()}")
        sb.appendLine("---")
        items.forEach { item ->
            sb.appendLine("${item.itemName} x${item.quantity} @ ₹${item.itemPrice} = ₹${String.format("%.2f", item.itemPrice * item.quantity)}")
        }
        sb.appendLine("---")
        sb.appendLine("*TOTAL: ₹${String.format("%.2f", bill.totalAmount)}*")
        sb.appendLine("Billing by Stellar Forge (www.stellarforgetech.in)")
        return sb.toString()
    }

    /**
     * Generates CSV format for "Export My Data" compatible with Excel / Google Sheets
     */
    fun billsToCsv(bills: List<Bill>): String {
        val sb = StringBuilder()
        sb.append("\uFEFF") // UTF-8 BOM so Excel opens Devanagari and currency symbols correctly
        sb.appendLine("Bill No,Date,Customer,Payment Mode,Status,Total Amount")
        bills.forEach { b ->
            val date = formatDate(b.createdAt)
            val cleanName = "\"" + b.customerName.replace("\"", "\"\"") + "\""
            sb.appendLine("${billNo(b)},$date,$cleanName,${b.paymentMode},${b.status},${String.format("%.2f", b.totalAmount)}")
        }
        return sb.toString()
    }

    fun generateId(): String = UUID.randomUUID().toString()
}
