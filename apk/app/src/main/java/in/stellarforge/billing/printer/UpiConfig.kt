package `in`.stellarforge.billing.printer

import org.json.JSONObject

data class UpiConfig(
    val enabled: Boolean,
    val upiId: String,
    val payeeName: String
) {
    companion object {
        fun fromJson(json: String): UpiConfig? = try {
            val obj = JSONObject(json)
            UpiConfig(
                enabled = obj.optBoolean("enabled", false),
                upiId = obj.optString("upi_id", ""),
                payeeName = obj.optString("payee_name", "")
            )
        } catch (e: Exception) { null }
    }

    fun upiUri(amount: Double, billNote: String): String {
        val encodedName = java.net.URLEncoder.encode(payeeName, "UTF-8")
        val encodedNote = java.net.URLEncoder.encode(billNote, "UTF-8")
        return "upi://pay?pa=$upiId&pn=$encodedName&am=${String.format("%.2f", amount)}&cu=INR&tn=$encodedNote"
    }
}
