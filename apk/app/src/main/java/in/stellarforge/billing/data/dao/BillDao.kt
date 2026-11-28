package `in`.stellarforge.billing.data.dao

import androidx.room.*
import `in`.stellarforge.billing.data.model.Bill
import kotlinx.coroutines.flow.Flow

@Dao
interface BillDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertBill(bill: Bill)

    @Update
    suspend fun updateBill(bill: Bill)

    @Query("SELECT * FROM bills WHERE id = :id AND deletedAt IS NULL")
    suspend fun getBillById(id: String): Bill?

    @Query("SELECT * FROM bills WHERE deletedAt IS NULL ORDER BY createdAt DESC")
    fun getAllBills(): Flow<List<Bill>>

    @Query("SELECT * FROM bills WHERE deletedAt IS NULL AND (billingDate = :date OR (billingDate IS NULL AND date(createdAt/1000, 'unixepoch', '+5 hours', '+30 minutes') = :date)) ORDER BY createdAt DESC")
    fun getBillsForDate(date: String): Flow<List<Bill>>

    @Query("SELECT * FROM bills WHERE syncStatus = 'pending' AND deletedAt IS NULL")
    suspend fun getPendingSyncBills(): List<Bill>

    @Query("SELECT MAX(billNo) FROM bills WHERE billNo IS NOT NULL")
    suspend fun getMaxBillNo(): Int?
}
