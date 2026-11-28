package in.stellarforge.billing.data.model

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "sync_outbox")
data class SyncOutbox(
    @PrimaryKey val id: String,
    val tableName: String,
    val recordId: String,
    val operation: String,
    val payloadJson: String,
    val retryCount: Int = 0,
    val lastError: String? = null,
    val createdAt: Long = System.currentTimeMillis()
)
