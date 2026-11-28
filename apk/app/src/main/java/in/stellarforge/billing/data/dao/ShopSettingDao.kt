package `in`.stellarforge.billing.data.dao

import androidx.room.*
import `in`.stellarforge.billing.data.model.ShopSetting
import kotlinx.coroutines.flow.Flow

@Dao
interface ShopSettingDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertSetting(setting: ShopSetting)

    @Query("SELECT * FROM shop_settings WHERE `key` = :key AND deletedAt IS NULL LIMIT 1")
    suspend fun getSettingByKey(key: String): ShopSetting?

    @Query("SELECT * FROM shop_settings WHERE `key` = :key AND deletedAt IS NULL LIMIT 1")
    fun getSettingByKeyFlow(key: String): Flow<ShopSetting?>
}
