package in.stellarforge.billing.data.dao

import androidx.room.*
import in.stellarforge.billing.data.model.Item
import kotlinx.coroutines.flow.Flow

@Dao
interface ItemDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertItem(item: Item)

    @Update
    suspend fun updateItem(item: Item)

    @Query("UPDATE items SET deletedAt = :now, updatedAt = :now, syncStatus = 'pending' WHERE id = :id")
    suspend fun softDeleteItem(id: String, now: Long = System.currentTimeMillis())

    @Query("SELECT * FROM items WHERE deletedAt IS NULL ORDER BY name ASC")
    fun getAllItems(): Flow<List<Item>>

    @Query("SELECT * FROM items WHERE lower(name) = lower(:name) AND deletedAt IS NULL LIMIT 1")
    suspend fun getItemByName(name: String): Item?
}
