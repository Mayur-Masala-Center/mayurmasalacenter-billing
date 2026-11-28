package `in`.stellarforge.billing.data.dao

import androidx.room.*
import `in`.stellarforge.billing.data.model.Customer
import kotlinx.coroutines.flow.Flow

@Dao
interface CustomerDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertCustomer(customer: Customer)

    @Update
    suspend fun updateCustomer(customer: Customer)

    @Query("SELECT * FROM customers WHERE id = :id AND deletedAt IS NULL LIMIT 1")
    suspend fun getCustomerById(id: String): Customer?

    @Query("SELECT * FROM customers WHERE lower(name) = lower(:name) AND deletedAt IS NULL LIMIT 1")
    suspend fun getCustomerByName(name: String): Customer?

    @Query("SELECT * FROM customers WHERE deletedAt IS NULL ORDER BY name ASC")
    fun getAllCustomers(): Flow<List<Customer>>

    @Query("UPDATE customers SET balance = balance + :delta, updatedAt = :now, syncStatus = 'pending' WHERE id = :id")
    suspend fun updateBalance(id: String, delta: Double, now: Long = System.currentTimeMillis())
}
