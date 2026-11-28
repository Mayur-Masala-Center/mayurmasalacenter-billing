package `in`.stellarforge.billing.data.dao

import androidx.room.*
import `in`.stellarforge.billing.data.model.UdhariLedger
import kotlinx.coroutines.flow.Flow

@Dao
interface UdhariLedgerDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertEntry(entry: UdhariLedger)

    @Query("SELECT * FROM udhari_ledger WHERE customerId = :customerId AND deletedAt IS NULL ORDER BY createdAt DESC")
    fun getLedgerForCustomer(customerId: String): Flow<List<UdhariLedger>>

    @Query("SELECT * FROM udhari_ledger WHERE billId = :billId AND deletedAt IS NULL")
    suspend fun getEntriesForBill(billId: String): List<UdhariLedger>

    @Query("UPDATE udhari_ledger SET deletedAt = :now, updatedAt = :now, syncStatus = 'pending' WHERE billId = :billId")
    suspend fun softDeleteForBill(billId: String, now: Long = System.currentTimeMillis())
}
