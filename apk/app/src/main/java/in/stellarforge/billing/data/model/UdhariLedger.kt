package in.stellarforge.billing.data.model

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "udhari_ledger")
data class UdhariLedger(
    @PrimaryKey val id: String,
    val customerId: String,
    val billId: String? = null,
    // "credit_sale" or "collection" or "reversal"
    val entryType: String,
    val amount: Double,
    val balanceAfter: Double,
    val notes: String? = null,
    val shopId: String? = null,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis(),
    val deletedAt: Long? = null,
    val deviceId: String = "",
    val syncStatus: String = "pending"
)
