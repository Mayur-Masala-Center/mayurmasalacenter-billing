package in.stellarforge.billing.data.dao

import androidx.room.*
import in.stellarforge.billing.data.model.SyncMeta

@Dao
interface SyncMetaDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertMeta(meta: SyncMeta)

    @Query("SELECT * FROM sync_meta WHERE tableName = :tableName LIMIT 1")
    suspend fun getMetaForTable(tableName: String): SyncMeta?
}
