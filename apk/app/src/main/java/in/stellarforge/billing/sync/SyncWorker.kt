package `in`.stellarforge.billing.sync

import android.content.Context
import androidx.hilt.work.HiltWorker
import androidx.room.withTransaction
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject
import `in`.stellarforge.billing.data.dao.*
import `in`.stellarforge.billing.data.db.AppDatabase
import `in`.stellarforge.billing.data.model.*
import `in`.stellarforge.billing.network.SupabaseClientWrapper
import kotlinx.serialization.json.*
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone

@HiltWorker
class SyncWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted params: WorkerParameters,
    private val db: AppDatabase,
    private val supabase: SupabaseClientWrapper,
    private val syncOutboxDao: SyncOutboxDao,
    private val syncMetaDao: SyncMetaDao,
    private val billDao: BillDao,
    private val billItemDao: BillItemDao,
    private val itemDao: ItemDao,
    private val customerDao: CustomerDao,
    private val udhariLedgerDao: UdhariLedgerDao,
    private val salesLedgerDao: SalesLedgerDao,
    private val shopSettingDao: ShopSettingDao
) : CoroutineWorker(context, params) {

    private val isoFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US).apply {
        timeZone = TimeZone.getTimeZone("UTC")
    }

    override suspend fun doWork(): Result {
        DebugLog.log("Sync", "Starting sync cycle")
        pushOutbox()
        pullChanges()
        DebugLog.log("Sync", "Sync cycle completed successfully")
        return Result.success()
    }

    private suspend fun pushOutbox() {
        val pending = syncOutboxDao.getPendingOutbox(50)
        DebugLog.log("Sync", "Pushing ${pending.size} outbox entries")
        for (entry in pending) {
            val result = supabase.upsertRow(entry.tableName, entry.payloadJson)
            if (result.isSuccess) {
                syncOutboxDao.deleteOutbox(entry.id)
            } else {
                val err = result.exceptionOrNull()?.message ?: "unknown error"
                syncOutboxDao.markError(entry.id, err)
                DebugLog.log("Sync", "Push failed on ${entry.tableName}: $err")
            }
        }
    }

    private suspend fun pullChanges() {
        val tables = listOf("store_settings", "items", "customers", "bills", "bill_items", "udhari_ledger", "sales_ledger")
        for (table in tables) {
            pullTable(table)
        }
    }

    private suspend fun pullTable(tableName: String) {
        val meta = syncMetaDao.getMetaForTable(tableName)
        var since = meta?.lastPulledAt ?: 0L
        var hasMore = true

        while (hasMore) {
            val result = supabase.fetchRowsSince(tableName, since, pageSize = 100)
            if (result.isFailure) {
                DebugLog.log("Sync", "Pull failed for $tableName: ${result.exceptionOrNull()?.message}")
                return
            }

            val page = result.getOrNull() ?: emptyList()
            if (page.isEmpty()) {
                break
            }

            DebugLog.log("Sync", "Fetched ${page.size} rows for $tableName")

            var maxUpdatedInPage = since

            // Apply all rows in this page atomically in one local transaction
            try {
                db.withTransaction {
                    for (json in page) {
                        val rowUpdatedAt = parseIsoToEpoch(json["updated_at"]?.jsonPrimitive?.contentOrNull)
                        if (rowUpdatedAt > maxUpdatedInPage) {
                            maxUpdatedInPage = rowUpdatedAt
                        }

                        when (tableName) {
                            "items" -> applyItemRow(json, rowUpdatedAt)
                            "customers" -> applyCustomerRow(json, rowUpdatedAt)
                            "bills" -> applyBillRow(json, rowUpdatedAt)
                            "bill_items" -> applyBillItemRow(json, rowUpdatedAt)
                            "store_settings" -> applySettingRow(json, rowUpdatedAt)
                            "udhari_ledger" -> applyUdhariRow(json, rowUpdatedAt)
                            "sales_ledger" -> applySalesRow(json, rowUpdatedAt)
                        }
                    }
                    // ONLY update lastPulledAt after the entire page is committed
                    syncMetaDao.upsertMeta(SyncMeta(tableName = tableName, lastPulledAt = maxUpdatedInPage + 1))
                }
                since = maxUpdatedInPage + 1
                if (page.size < 100) {
                    hasMore = false
                }
            } catch (e: Exception) {
                DebugLog.log("Sync", "Transaction commit failed for $tableName page: ${e.message}")
                // Do NOT advance lastPulledAt on transaction failure
                return
            }
        }
    }

    private suspend fun applyItemRow(json: JsonObject, serverUpdatedAt: Long) {
        val id = json["id"]?.jsonPrimitive?.content ?: return
        val local = itemDao.getItemByName(json["name"]?.jsonPrimitive?.content ?: "")
        if (local != null && local.syncStatus == "pending" && local.updatedAt > serverUpdatedAt) {
            // Pending local changes win over older server rows
            return
        }
        val item = Item(
            id = id,
            name = json["name"]?.jsonPrimitive?.content ?: "",
            shopId = json["shop_id"]?.jsonPrimitive?.contentOrNull,
            createdAt = parseIsoToEpoch(json["created_at"]?.jsonPrimitive?.contentOrNull),
            updatedAt = serverUpdatedAt,
            deletedAt = parseIsoToEpochOrNull(json["deleted_at"]?.jsonPrimitive?.contentOrNull),
            deviceId = json["device_id"]?.jsonPrimitive?.contentOrNull ?: "",
            syncStatus = "synced" // Pulled rows are marked synced so they do NOT re-enter outbox
        )
        itemDao.insertItem(item)
    }

    private suspend fun applyCustomerRow(json: JsonObject, serverUpdatedAt: Long) {
        val id = json["id"]?.jsonPrimitive?.content ?: return
        val local = customerDao.getCustomerById(id)
        if (local != null && local.syncStatus == "pending" && local.updatedAt > serverUpdatedAt) {
            return
        }
        val customer = Customer(
            id = id,
            name = json["name"]?.jsonPrimitive?.content ?: "",
            phone = json["phone"]?.jsonPrimitive?.contentOrNull,
            balance = json["balance"]?.jsonPrimitive?.doubleOrNull ?: 0.0,
            shopId = json["shop_id"]?.jsonPrimitive?.contentOrNull,
            createdAt = parseIsoToEpoch(json["created_at"]?.jsonPrimitive?.contentOrNull),
            updatedAt = serverUpdatedAt,
            deletedAt = parseIsoToEpochOrNull(json["deleted_at"]?.jsonPrimitive?.contentOrNull),
            deviceId = json["device_id"]?.jsonPrimitive?.contentOrNull ?: "",
            syncStatus = "synced"
        )
        customerDao.insertCustomer(customer)
    }

    private suspend fun applyBillRow(json: JsonObject, serverUpdatedAt: Long) {
        val id = json["id"]?.jsonPrimitive?.content ?: return
        val local = billDao.getBillById(id)
        if (local != null && local.syncStatus == "pending" && local.updatedAt > serverUpdatedAt) {
            return
        }
        val bill = Bill(
            id = id,
            billNo = json["bill_no"]?.jsonPrimitive?.intOrNull,
            customerName = json["customer_name"]?.jsonPrimitive?.content ?: "",
            customerId = json["customer_id"]?.jsonPrimitive?.contentOrNull,
            paymentMode = json["payment_mode"]?.jsonPrimitive?.contentOrNull ?: "cash",
            totalAmount = json["total_amount"]?.jsonPrimitive?.doubleOrNull ?: 0.0,
            discountPercent = json["discount_percent"]?.jsonPrimitive?.doubleOrNull ?: 0.0,
            discountAmount = json["discount_amount"]?.jsonPrimitive?.doubleOrNull ?: 0.0,
            status = json["status"]?.jsonPrimitive?.content ?: "draft",
            billingDate = json["billing_date"]?.jsonPrimitive?.contentOrNull,
            createdBy = json["created_by"]?.jsonPrimitive?.contentOrNull,
            cancelReason = json["cancel_reason"]?.jsonPrimitive?.contentOrNull,
            cancelledAt = json["cancelled_at"]?.jsonPrimitive?.contentOrNull,
            shopId = json["shop_id"]?.jsonPrimitive?.contentOrNull,
            createdAt = parseIsoToEpoch(json["created_at"]?.jsonPrimitive?.contentOrNull),
            updatedAt = serverUpdatedAt,
            deletedAt = parseIsoToEpochOrNull(json["deleted_at"]?.jsonPrimitive?.contentOrNull),
            deviceId = json["device_id"]?.jsonPrimitive?.contentOrNull ?: "",
            syncStatus = "synced"
        )
        billDao.insertBill(bill)
    }

    private suspend fun applyBillItemRow(json: JsonObject, serverUpdatedAt: Long) {
        val id = json["id"]?.jsonPrimitive?.content ?: return
        val item = BillItem(
            id = id,
            billId = json["bill_id"]?.jsonPrimitive?.content ?: "",
            itemId = json["item_id"]?.jsonPrimitive?.contentOrNull,
            itemName = json["item_name"]?.jsonPrimitive?.content ?: "",
            itemPrice = json["item_price"]?.jsonPrimitive?.doubleOrNull ?: 0.0,
            quantity = json["quantity"]?.jsonPrimitive?.intOrNull ?: 1,
            shopId = json["shop_id"]?.jsonPrimitive?.contentOrNull,
            createdAt = parseIsoToEpoch(json["created_at"]?.jsonPrimitive?.contentOrNull),
            updatedAt = serverUpdatedAt,
            deletedAt = parseIsoToEpochOrNull(json["deleted_at"]?.jsonPrimitive?.contentOrNull),
            deviceId = json["device_id"]?.jsonPrimitive?.contentOrNull ?: "",
            syncStatus = "synced"
        )
        billItemDao.insertBillItem(item)
    }

    private suspend fun applySettingRow(json: JsonObject, serverUpdatedAt: Long) {
        val key = json["key"]?.jsonPrimitive?.content ?: return
        val local = shopSettingDao.getSettingByKey(key)
        if (local != null && local.syncStatus == "pending" && local.updatedAt > serverUpdatedAt) {
            return
        }
        val setting = ShopSetting(
            id = json["id"]?.jsonPrimitive?.contentOrNull ?: key,
            key = key,
            valueJson = json["value"]?.toString() ?: "{}",
            shopId = json["shop_id"]?.jsonPrimitive?.contentOrNull,
            createdAt = parseIsoToEpoch(json["created_at"]?.jsonPrimitive?.contentOrNull),
            updatedAt = serverUpdatedAt,
            deletedAt = parseIsoToEpochOrNull(json["deleted_at"]?.jsonPrimitive?.contentOrNull),
            deviceId = json["device_id"]?.jsonPrimitive?.contentOrNull ?: "",
            syncStatus = "synced"
        )
        shopSettingDao.upsertSetting(setting)
    }

    private suspend fun applyUdhariRow(json: JsonObject, serverUpdatedAt: Long) {
        val id = json["id"]?.jsonPrimitive?.content ?: return
        val entry = UdhariLedger(
            id = id,
            customerId = json["customer_id"]?.jsonPrimitive?.content ?: "",
            billId = json["bill_id"]?.jsonPrimitive?.contentOrNull,
            entryType = json["entry_type"]?.jsonPrimitive?.content ?: "credit_sale",
            amount = json["amount"]?.jsonPrimitive?.doubleOrNull ?: 0.0,
            balanceAfter = json["balance_after"]?.jsonPrimitive?.doubleOrNull ?: 0.0,
            notes = json["notes"]?.jsonPrimitive?.contentOrNull,
            shopId = json["shop_id"]?.jsonPrimitive?.contentOrNull,
            createdAt = parseIsoToEpoch(json["created_at"]?.jsonPrimitive?.contentOrNull),
            updatedAt = serverUpdatedAt,
            deletedAt = parseIsoToEpochOrNull(json["deleted_at"]?.jsonPrimitive?.contentOrNull),
            deviceId = json["device_id"]?.jsonPrimitive?.contentOrNull ?: "",
            syncStatus = "synced"
        )
        udhariLedgerDao.insertEntry(entry)
    }

    private suspend fun applySalesRow(json: JsonObject, serverUpdatedAt: Long) {
        val id = json["id"]?.jsonPrimitive?.content ?: return
        val row = SalesLedger(
            id = id,
            sourceType = json["source_type"]?.jsonPrimitive?.content ?: "bill",
            sourceId = json["source_id"]?.jsonPrimitive?.content ?: "",
            amount = json["amount"]?.jsonPrimitive?.doubleOrNull ?: 0.0,
            saleDate = json["sale_date"]?.jsonPrimitive?.content ?: "",
            paymentMode = json["payment_mode"]?.jsonPrimitive?.content ?: "cash",
            status = json["status"]?.jsonPrimitive?.content ?: "active",
            shopId = json["shop_id"]?.jsonPrimitive?.contentOrNull,
            createdAt = parseIsoToEpoch(json["created_at"]?.jsonPrimitive?.contentOrNull),
            updatedAt = serverUpdatedAt,
            deletedAt = parseIsoToEpochOrNull(json["deleted_at"]?.jsonPrimitive?.contentOrNull),
            deviceId = json["device_id"]?.jsonPrimitive?.contentOrNull ?: "",
            syncStatus = "synced"
        )
        salesLedgerDao.upsertSalesRow(row)
    }

    private fun parseIsoToEpoch(iso: String?): Long {
        if (iso.isNullOrBlank()) return System.currentTimeMillis()
        return try {
            isoFormat.parse(iso.take(19))?.time ?: System.currentTimeMillis()
        } catch (_: Exception) {
            System.currentTimeMillis()
        }
    }

    private fun parseIsoToEpochOrNull(iso: String?): Long? {
        if (iso.isNullOrBlank()) return null
        return try {
            isoFormat.parse(iso.take(19))?.time
        } catch (_: Exception) {
            null
        }
    }
}
