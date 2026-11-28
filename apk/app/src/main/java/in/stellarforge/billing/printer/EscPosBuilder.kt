package `in`.stellarforge.billing.printer

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Typeface
import com.google.zxing.BarcodeFormat
import com.google.zxing.EncodeHintType
import com.google.zxing.qrcode.QRCodeWriter
import `in`.stellarforge.billing.data.model.Bill
import `in`.stellarforge.billing.data.model.BillItem
import `in`.stellarforge.billing.sync.DebugLog
import `in`.stellarforge.billing.util.BillUtils
import java.io.ByteArrayOutputStream
import java.text.SimpleDateFormat
import java.util.*

class EscPosBuilder(private val paperWidthMm: Int = 80) {

    // Dot width: 58mm=384, 80mm=576. At 203dpi: 58mm≈464 but ESC/POS printers use ~384 for 58mm.
    private val dotWidth = if (paperWidthMm == 58) 384 else 576
    private val charCols = if (paperWidthMm == 58) 32 else 48
    private val out = ByteArrayOutputStream()

    // ESC/POS command bytes
    private fun esc(vararg bytes: Int) { bytes.forEach { out.write(it) } }
    fun reset() { esc(0x1B, 0x40) }
    fun align(a: Int) { esc(0x1B, 0x61, a) }   // 0=left, 1=centre, 2=right
    fun bold(on: Boolean) { esc(0x1B, 0x45, if (on) 1 else 0) }
    fun doubleHeight(on: Boolean) { esc(0x1B, 0x21, if (on) 0x10 else 0x00) }
    fun feed(lines: Int = 1) { esc(0x1B, 0x64, lines) }
    fun cut() { esc(0x1D, 0x56, 0x00) }

    fun text(s: String) {
        // Write as UTF-8 bytes
        out.write(s.toByteArray(Charsets.UTF_8))
        out.write(0x0A) // LF
    }

    fun separator(dashed: Boolean = false) {
        val ch = if (dashed) '-' else '='
        text(ch.toString().repeat(charCols))
    }

    /**
     * Render a text string as a 1-bit raster bitmap and send via GS v 0.
     * Required for Devanagari (Hindi/Marathi) and custom font styling.
     */
    fun textAsBitmap(s: String, textSizeSp: Float = 24f, bold: Boolean = false) {
        val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.BLACK
            textSize = textSizeSp
            typeface = if (bold) Typeface.DEFAULT_BOLD else Typeface.DEFAULT
        }
        val width = dotWidth
        val height = (textSizeSp * 1.4f).toInt().coerceAtLeast(32)
        val bmp = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bmp)
        canvas.drawColor(Color.WHITE)
        canvas.drawText(s, (width - paint.measureText(s)) / 2f, textSizeSp, paint)
        rasterImage(bmp)
        bmp.recycle()
    }

    /**
     * Convert a Bitmap to 1-bit ESC/POS raster (GS v 0).
     */
    fun rasterImage(bmp: Bitmap) {
        val w = bmp.width.coerceAtMost(dotWidth)
        val h = bmp.height
        val bytesPerRow = (w + 7) / 8

        // GS v 0 header: GS 0x76 0x30 m xL xH yL yH
        esc(0x1D, 0x76, 0x30, 0x00)
        esc(bytesPerRow and 0xFF, (bytesPerRow shr 8) and 0xFF)
        esc(h and 0xFF, (h shr 8) and 0xFF)

        for (y in 0 until h) {
            for (xByte in 0 until bytesPerRow) {
                var b = 0
                for (bit in 0 until 8) {
                    val x = xByte * 8 + bit
                    if (x < w) {
                        val pixel = bmp.getPixel(x, y)
                        val luminance = (Color.red(pixel) * 0.299 + Color.green(pixel) * 0.587 + Color.blue(pixel) * 0.114).toInt()
                        if (luminance < 128) b = b or (1 shl (7 - bit)) // dark pixel → 1
                    }
                }
                out.write(b)
            }
        }
    }

    /**
     * Generate a ZXing QR code and send as raster.
     */
    fun qrCodeFromUri(value: String, sizePx: Int = 200) {
        try {
            val writer = QRCodeWriter()
            val hints = mapOf(EncodeHintType.MARGIN to 1)
            val matrix = writer.encode(value, BarcodeFormat.QR_CODE, sizePx, sizePx, hints)
            val bmp = Bitmap.createBitmap(sizePx, sizePx, Bitmap.Config.ARGB_8888)
            for (x in 0 until sizePx) for (y in 0 until sizePx) {
                bmp.setPixel(x, y, if (matrix[x, y]) Color.BLACK else Color.WHITE)
            }
            align(1) // centre
            rasterImage(bmp)
            bmp.recycle()
        } catch (e: Exception) {
            DebugLog.log("Printer", "QR encode failed: ${e.message}")
        }
    }

    fun padRight(s: String, len: Int) = s.take(len).padEnd(len)
    fun padLeft(s: String, len: Int) = s.take(len).padStart(len)

    /**
     * Build the complete receipt matching web app SHOP config and format:
     * - Store Logo
     * - Store Name: Mayur Masala Center
     * - Subtitle: and Pooja Bhandar
     * - Address 1: Shagun Chowk, Pimpri
     * - Address 2: Pimpri-Chinchwad, Maharashtra 411017
     * - Phone: +919359117213
     * - Website: www.mayurmasalacenter.in
     * - Bill No, Date & Time (IST)
     * - Customer Name & Staff name
     * - Items table (#, Item, Qty, Rate, Amt)
     * - Subtotal, Discount, Round-off, Total
     * - Dynamic UPI QR code with amount pre-filled
     * - Footer: Thank you for shopping with us! / Tagline / Stellar Forge credit
     */
    fun buildReceipt(bill: Bill, items: List<BillItem>, upiConfig: UpiConfig?, logoBitmap: Bitmap?): ByteArray {
        out.reset()
        reset()

        // 1. Logo
        if (logoBitmap != null) {
            align(1)
            val scaled = Bitmap.createScaledBitmap(
                logoBitmap,
                dotWidth,
                (logoBitmap.height.toFloat() / logoBitmap.width * dotWidth).toInt(),
                true
            )
            rasterImage(scaled)
            feed(1)
        }

        // 2. Header (Matching web app SHOP object exactly)
        align(1)
        bold(true); doubleHeight(true); text("Mayur Masala Center"); doubleHeight(false); bold(false)
        text("and Pooja Bhandar")
        text("Shagun Chowk, Pimpri")
        text("Pimpri-Chinchwad, Maharashtra 411017")
        text("Ph: +919359117213")
        text("www.mayurmasalacenter.in")
        separator(false)

        // 3. Bill Metadata
        align(0)
        val billingDateStr = bill.billingDate ?: BillUtils.formatDate(bill.createdAt)
        val timeStr = BillUtils.formatTime(bill.createdAt)
        text("Bill: ${BillUtils.billNo(bill)}")
        text("Date: $billingDateStr $timeStr")
        text("Customer: ${bill.customerName}")
        bill.createdBy?.let { staff ->
            text("Staff: ${staff.substringBefore("@")}")
        }
        separator(true)

        // 4. Items Table Header
        bold(true)
        val h = "#  ${padRight("Item", charCols - 20)}  ${padLeft("Qty", 4)} ${padLeft("Rate", 7)} ${padLeft("Amt", 8)}"
        text(h)
        bold(false)
        separator(true)

        // 5. Line items
        var subtotal = 0.0
        items.forEachIndexed { i, item ->
            val amt = item.itemPrice * item.quantity
            subtotal += amt
            val num = padRight("${i + 1}", 2)
            val name = padRight(item.itemName, charCols - 23)
            val qty = padLeft("${item.quantity}", 4)
            val rate = padLeft(String.format(Locale.US, "%.2f", item.itemPrice), 7)
            val amtS = padLeft(String.format(Locale.US, "%.2f", amt), 8)
            text("$num $name $qty $rate $amtS")
        }

        separator(false)

        // 6. Totals Breakdown (Subtotal, Discount, Round-off, Total)
        val discount = if (bill.discountPercent > 0) subtotal * bill.discountPercent / 100.0 else bill.discountAmount
        val raw = (subtotal - discount).coerceAtLeast(0.0)
        val total = bill.totalAmount
        val roundDiff = total - raw

        text("${padRight("Subtotal", charCols - 12)}${padLeft(String.format(Locale.US, "%.2f", subtotal), 12)}")
        if (discount > 0.01) {
            text("${padRight("Discount", charCols - 12)}${padLeft("-" + String.format(Locale.US, "%.2f", discount), 12)}")
        }
        if (Math.abs(roundDiff) >= 0.005) {
            val sign = if (roundDiff > 0) "+" else "-"
            text("${padRight("Round-off", charCols - 12)}${padLeft(sign + String.format(Locale.US, "%.2f", Math.abs(roundDiff)), 12)}")
        }
        separator(false)
        bold(true); doubleHeight(true)
        text("${padRight("TOTAL", charCols - 12)}${padLeft("Rs. " + String.format(Locale.US, "%.2f", total), 12)}")
        doubleHeight(false); bold(false)

        // 7. Dynamic UPI QR Code (Generated on the fly with bill amount prefilled)
        if (upiConfig != null && upiConfig.enabled && upiConfig.upiId.isNotBlank() && bill.status != "cancelled" && total > 0) {
            feed(1)
            align(1)
            bold(true); text("Scan & Pay via UPI"); bold(false)
            val upiUri = upiConfig.upiUri(total, BillUtils.billNo(bill))
            qrCodeFromUri(upiUri, sizePx = if (paperWidthMm == 58) 200 else 300)
            align(1)
            text(upiConfig.upiId)
            separator(true)
        }

        // 8. Footer (Matching web app)
        feed(1); align(1)
        bold(true); text("Thank you for shopping with us!"); bold(false)
        text("Quality Masala & Pooja Items")
        text("Billing by Stellar Forge")
        text("(www.stellarforgetech.in)")
        feed(3)
        cut()

        return out.toByteArray()
    }

    fun build(): ByteArray = out.toByteArray()
}
