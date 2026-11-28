package in.stellarforge.billing.data.model

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "shop_settings")
data class ShopSetting(
    @PrimaryKey val id: String,
    val key: String,
    val valueJson: String,
    val shopId: String? = null,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis(),
    val deletedAt: Long? = null,
    val deviceId: String = "",
    val syncStatus: String = "pending"
)
