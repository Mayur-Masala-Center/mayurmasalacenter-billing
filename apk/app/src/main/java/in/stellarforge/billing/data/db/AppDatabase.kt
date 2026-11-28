package in.stellarforge.billing.data.db

import androidx.room.*
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase
import in.stellarforge.billing.data.dao.*
import in.stellarforge.billing.data.model.*

val MIGRATION_1_2 = object : Migration(1, 2) {
    override fun migrate(db: SupportSQLiteDatabase) {
        // Alter bills table to add customerId and paymentMode
        db.execSQL("ALTER TABLE bills ADD COLUMN customerId TEXT DEFAULT NULL")
        db.execSQL("ALTER TABLE bills ADD COLUMN paymentMode TEXT NOT NULL DEFAULT 'cash'")

        // Create customers table
        db.execSQL("""
            CREATE TABLE IF NOT EXISTS customers (
                id TEXT PRIMARY KEY NOT NULL,
                name TEXT NOT NULL,
                phone TEXT DEFAULT NULL,
                balance REAL NOT NULL DEFAULT 0.0,
                shopId TEXT DEFAULT NULL,
                createdAt INTEGER NOT NULL,
                updatedAt INTEGER NOT NULL,
                deletedAt INTEGER DEFAULT NULL,
                deviceId TEXT NOT NULL DEFAULT '',
                syncStatus TEXT NOT NULL DEFAULT 'pending'
            )
        """.trimIndent())

        // Create udhari_ledger table
        db.execSQL("""
            CREATE TABLE IF NOT EXISTS udhari_ledger (
                id TEXT PRIMARY KEY NOT NULL,
                customerId TEXT NOT NULL,
                billId TEXT DEFAULT NULL,
                entryType TEXT NOT NULL,
                amount REAL NOT NULL,
                balanceAfter REAL NOT NULL,
                notes TEXT DEFAULT NULL,
                shopId TEXT DEFAULT NULL,
                createdAt INTEGER NOT NULL,
                updatedAt INTEGER NOT NULL,
                deletedAt INTEGER DEFAULT NULL,
                deviceId TEXT NOT NULL DEFAULT '',
                syncStatus TEXT NOT NULL DEFAULT 'pending'
            )
        """.trimIndent())

        // Create sales_ledger table with UNIQUE index on (sourceType, sourceId)
        db.execSQL("""
            CREATE TABLE IF NOT EXISTS sales_ledger (
                id TEXT PRIMARY KEY NOT NULL,
                sourceType TEXT NOT NULL DEFAULT 'bill',
                sourceId TEXT NOT NULL,
                amount REAL NOT NULL,
                saleDate TEXT NOT NULL,
                paymentMode TEXT NOT NULL DEFAULT 'cash',
                status TEXT NOT NULL DEFAULT 'active',
                shopId TEXT DEFAULT NULL,
                createdAt INTEGER NOT NULL,
                updatedAt INTEGER NOT NULL,
                deletedAt INTEGER DEFAULT NULL,
                deviceId TEXT NOT NULL DEFAULT '',
                syncStatus TEXT NOT NULL DEFAULT 'pending'
            )
        """.trimIndent())

        db.execSQL("CREATE UNIQUE INDEX IF NOT EXISTS index_sales_ledger_sourceType_sourceId ON sales_ledger(sourceType, sourceId)")
    }
}

@Database(
    entities = [
        Bill::class,
        BillItem::class,
        Item::class,
        ShopSetting::class,
        SyncOutbox::class,
        SyncMeta::class,
        Customer::class,
        UdhariLedger::class,
        SalesLedger::class
    ],
    version = 2,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun billDao(): BillDao
    abstract fun billItemDao(): BillItemDao
    abstract fun itemDao(): ItemDao
    abstract fun shopSettingDao(): ShopSettingDao
    abstract fun syncOutboxDao(): SyncOutboxDao
    abstract fun syncMetaDao(): SyncMetaDao
    abstract fun customerDao(): CustomerDao
    abstract fun udhariLedgerDao(): UdhariLedgerDao
    abstract fun salesLedgerDao(): SalesLedgerDao

    @Transaction
    suspend fun createBillWithItemsAndLedger(
        bill: Bill,
        items: List<BillItem>,
        customer: Customer?,
        udhariEntry: UdhariLedger?,
        salesRow: SalesLedger?,
        outboxEntries: List<SyncOutbox>
    ) {
        billDao().insertBill(bill)
        billItemDao().insertBillItems(items)

        if (customer != null) {
            customerDao().insertCustomer(customer)
        }
        if (udhariEntry != null) {
            udhariLedgerDao().insertEntry(udhariEntry)
            customerDao().updateBalance(udhariEntry.customerId, udhariEntry.amount)
        }
        if (salesRow != null) {
            salesLedgerDao().insertSalesRow(salesRow)
        }
        outboxEntries.forEach { syncOutboxDao().insertOutbox(it) }
    }

    @Transaction
    suspend fun cancelBillWithLedger(
        billId: String,
        reason: String,
        now: Long = System.currentTimeMillis()
    ) {
        val bill = billDao().getBillById(billId) ?: return
        val updatedBill = bill.copy(
            status = "cancelled",
            cancelReason = reason,
            cancelledAt = now.toString(),
            updatedAt = now,
            syncStatus = "pending"
        )
        billDao().updateBill(updatedBill)

        // Cancel sales_ledger row
        salesLedgerDao().cancelByBillId(billId, now)

        // If credit bill, reverse udhari_ledger
        val udhariEntries = udhariLedgerDao().getEntriesForBill(billId)
        for (entry in udhariEntries) {
            if (entry.entryType == "credit_sale") {
                val cust = customerDao().getCustomerById(entry.customerId)
                val newBal = (cust?.balance ?: 0.0) - entry.amount
                val reversal = UdhariLedger(
                    id = java.util.UUID.randomUUID().toString(),
                    customerId = entry.customerId,
                    billId = billId,
                    entryType = "reversal",
                    amount = -entry.amount,
                    balanceAfter = newBal,
                    notes = "Bill cancelled: $reason",
                    shopId = bill.shopId,
                    createdAt = now,
                    updatedAt = now,
                    deviceId = bill.deviceId,
                    syncStatus = "pending"
                )
                udhariLedgerDao().insertEntry(reversal)
                customerDao().updateBalance(entry.customerId, -entry.amount, now)
                syncOutboxDao().insertOutbox(SyncOutbox(
                    id = java.util.UUID.randomUUID().toString(),
                    tableName = "udhari_ledger",
                    recordId = reversal.id,
                    operation = "insert",
                    payloadJson = """{"id":"${reversal.id}","customer_id":"${reversal.customerId}","bill_id":"$billId","entry_type":"reversal","amount":${reversal.amount},"balance_after":$newBal}"""
                ))
            }
        }

        // Outbox for bill cancel and sales_ledger cancel
        syncOutboxDao().insertOutbox(SyncOutbox(
            id = java.util.UUID.randomUUID().toString(),
            tableName = "bills",
            recordId = billId,
            operation = "update",
            payloadJson = """{"id":"$billId","status":"cancelled","cancel_reason":"$reason","cancelled_at":"$now"}"""
        ))
        syncOutboxDao().insertOutbox(SyncOutbox(
            id = java.util.UUID.randomUUID().toString(),
            tableName = "sales_ledger",
            recordId = billId,
            operation = "update",
            payloadJson = """{"source_id":"$billId","source_type":"bill","status":"cancelled"}"""
        ))
    }
}
