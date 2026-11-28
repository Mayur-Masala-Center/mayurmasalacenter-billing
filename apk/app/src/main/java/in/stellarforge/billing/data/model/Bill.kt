package in.stellarforge.billing.data.model

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "bills")
data class Bill(
    @PrimaryKey val id: String,
    val billNo: Int? = null,
    val customerName: String,
    val customerId: String? = null,
    val paymentMode: String = "cash", // "cash", "upi", "credit"
    val totalAmount: Double = 0.0,
    val discountPercent: Double = 0.0,
    val discountAmount: Double = 0.0,
    val status: String = "draft",
    val billingDate: String? = null,
    val createdBy: String? = null,
    val cancelReason: String? = null,
    val cancelledAt: String? = null,
    val shopId: String? = null,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis(),
    val deletedAt: Long? = null,
    val deviceId: String = "",
    val syncStatus: String = "pending"
)
