package `in`.stellarforge.billing.data.dao

import androidx.room.*
import `in`.stellarforge.billing.data.model.SalesLedger
import kotlinx.coroutines.flow.Flow

@Dao
interface SalesLedgerDao {
    @Insert(onConflict = OnConflictStrategy.ABORT)
    suspend fun insertSalesRow(row: SalesLedger)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertSalesRow(row: SalesLedger)

    @Query("SELECT * FROM sales_ledger WHERE sourceId = :billId AND sourceType = 'bill' LIMIT 1")
    suspend fun getByBillId(billId: String): SalesLedger?

    @Query("UPDATE sales_ledger SET status = 'cancelled', updatedAt = :now, syncStatus = 'pending' WHERE sourceId = :billId AND sourceType = 'bill'")
    suspend fun cancelByBillId(billId: String, now: Long = System.currentTimeMillis())

    @Query("UPDATE sales_ledger SET deletedAt = :now, updatedAt = :now, syncStatus = 'pending' WHERE sourceId = :billId AND sourceType = 'bill'")
    suspend fun softDeleteByBillId(billId: String, now: Long = System.currentTimeMillis())

    @Query("SELECT * FROM sales_ledger WHERE deletedAt IS NULL AND status = 'active' ORDER BY createdAt DESC")
    fun getAllActiveSales(): Flow<List<SalesLedger>>
}
