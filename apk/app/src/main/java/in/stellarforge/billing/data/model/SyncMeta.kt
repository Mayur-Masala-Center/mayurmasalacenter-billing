package in.stellarforge.billing.data.model

import androidx.room.Entity

@Entity(tableName = "sync_meta", primaryKeys = ["tableName"])
data class SyncMeta(
    val tableName: String,
    val lastPulledAt: Long = 0L
)
