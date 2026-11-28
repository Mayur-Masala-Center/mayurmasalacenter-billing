package in.stellarforge.billing.data.model

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "bill_items")
data class BillItem(
    @PrimaryKey val id: String,
    val billId: String,
    val itemId: String? = null,
    val itemName: String,
    val itemPrice: Double,
    val quantity: Int = 1,
    val shopId: String? = null,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis(),
    val deletedAt: Long? = null,
    val deviceId: String = "",
    val syncStatus: String = "pending"
)
