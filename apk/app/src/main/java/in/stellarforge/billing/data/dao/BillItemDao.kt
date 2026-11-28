package `in`.stellarforge.billing.data.dao

import androidx.room.*
import `in`.stellarforge.billing.data.model.BillItem
import kotlinx.coroutines.flow.Flow

@Dao
interface BillItemDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertBillItem(item: BillItem)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertBillItems(items: List<BillItem>)

    @Query("DELETE FROM bill_items WHERE billId = :billId")
    suspend fun deleteItemsForBill(billId: String)

    @Query("SELECT * FROM bill_items WHERE billId = :billId AND deletedAt IS NULL")
    suspend fun getItemsForBill(billId: String): List<BillItem>

    @Query("SELECT * FROM bill_items WHERE billId = :billId AND deletedAt IS NULL")
    fun getItemsForBillFlow(billId: String): Flow<List<BillItem>>
}
