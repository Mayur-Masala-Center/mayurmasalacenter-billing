package `in`.stellarforge.billing.data.dao

import androidx.room.*
import `in`.stellarforge.billing.data.model.SyncOutbox

@Dao
interface SyncOutboxDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertOutbox(entry: SyncOutbox)

    @Query("DELETE FROM sync_outbox WHERE id = :id")
    suspend fun deleteOutbox(id: String)

    @Query("SELECT * FROM sync_outbox ORDER BY createdAt ASC LIMIT :limit")
    suspend fun getPendingOutbox(limit: Int = 50): List<SyncOutbox>

    @Query("UPDATE sync_outbox SET retryCount = retryCount + 1, lastError = :error WHERE id = :id")
    suspend fun markError(id: String, error: String)
}
