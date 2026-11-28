package in.stellarforge.billing.data.model

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "sales_ledger",
    indices = [
        Index(value = ["sourceType", "sourceId"], unique = true)
    ]
)
data class SalesLedger(
    @PrimaryKey val id: String,
    val sourceType: String = "bill",
    val sourceId: String,
    val amount: Double,
    val saleDate: String, // YYYY-MM-DD
    val paymentMode: String = "cash", // "cash", "upi", "credit"
    val status: String = "active", // "active", "cancelled"
    val shopId: String? = null,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis(),
    val deletedAt: Long? = null,
    val deviceId: String = "",
    val syncStatus: String = "pending"
)
