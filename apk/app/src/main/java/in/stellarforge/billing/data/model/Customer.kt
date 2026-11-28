package `in`.stellarforge.billing.data.model

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "customers")
data class Customer(
    @PrimaryKey val id: String,
    val name: String,
    val phone: String? = null,
    val balance: Double = 0.0,
    val shopId: String? = null,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis(),
    val deletedAt: Long? = null,
    val deviceId: String = "",
    val syncStatus: String = "pending"
)
