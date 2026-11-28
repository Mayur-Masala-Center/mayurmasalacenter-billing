package `in`.stellarforge.billing.ui.viewmodels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import `in`.stellarforge.billing.auth.AuthManager
import `in`.stellarforge.billing.data.dao.*
import `in`.stellarforge.billing.data.db.AppDatabase
import `in`.stellarforge.billing.data.model.*
import `in`.stellarforge.billing.printer.UpiConfig
import `in`.stellarforge.billing.util.BillUtils
import `in`.stellarforge.billing.util.DeviceManager
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class LineItem(
    val id: String = BillUtils.generateId(),
    val itemName: String = "",
    val itemPrice: String = "",
    val quantity: Int = 1
)

data class NewBillUiState(
    val customerName: String = "",
    val customerPhone: String = "",
    val paymentMode: String = "cash", // "cash", "upi", "credit"
    val billingDate: String = BillUtils.todayIST(),
    val lines: List<LineItem> = listOf(LineItem()),
    val discountPct: String = "",
    val discountAmt: String = "",
    val usePercentDiscount: Boolean = false,
    val isSaving: Boolean = false,
    val error: String? = null,
    val savedBillId: String? = null
)

@HiltViewModel
class BillViewModel @Inject constructor(
    private val db: AppDatabase,
    private val billDao: BillDao,
    private val billItemDao: BillItemDao,
    private val itemDao: ItemDao,
    private val customerDao: CustomerDao,
    private val shopSettingDao: ShopSettingDao,
    private val syncOutboxDao: SyncOutboxDao,
    private val deviceManager: DeviceManager,
    private val authManager: AuthManager
) : ViewModel() {

    val allBills: StateFlow<List<Bill>> = billDao.getAllBills()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val allItems: StateFlow<List<Item>> = itemDao.getAllItems()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val allCustomers: StateFlow<List<Customer>> = customerDao.getAllCustomers()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val upiConfigFlow: StateFlow<UpiConfig?> = shopSettingDao.getSettingByKeyFlow("upi_config")
        .map { setting ->
            if (setting != null) {
                try { UpiConfig.fromJson(setting.valueJson) } catch (_: Exception) { null }
            } else null
        }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), null)

    private val _newBillState = MutableStateFlow(NewBillUiState())
    val newBillState: StateFlow<NewBillUiState> = _newBillState

    fun updateCustomer(name: String) { _newBillState.update { it.copy(customerName = name) } }
    fun updateCustomerPhone(phone: String) { _newBillState.update { it.copy(customerPhone = phone) } }
    fun updatePaymentMode(mode: String) { _newBillState.update { it.copy(paymentMode = mode) } }
    fun updateDate(date: String) { _newBillState.update { it.copy(billingDate = date) } }
    fun updateLine(index: Int, line: LineItem) {
        _newBillState.update { s ->
            val lines = s.lines.toMutableList(); lines[index] = line; s.copy(lines = lines)
        }
    }
    fun addLine() { _newBillState.update { it.copy(lines = it.lines + LineItem()) } }
    fun removeLine(index: Int) {
        _newBillState.update { s ->
            if (s.lines.size <= 1) return@update s
            s.copy(lines = s.lines.toMutableList().also { it.removeAt(index) })
        }
    }
    fun updateDiscountPct(v: String) { _newBillState.update { it.copy(discountPct = v, usePercentDiscount = true) } }
    fun updateDiscountAmt(v: String) { _newBillState.update { it.copy(discountAmt = v, usePercentDiscount = false) } }
    fun resetSaved() { _newBillState.update { it.copy(savedBillId = null, error = null) } }

    fun getItemsForBill(billId: String) = billItemDao.getItemsForBillFlow(billId)

    fun cancelBill(billId: String, reason: String) {
        viewModelScope.launch {
            db.cancelBillWithLedger(billId, reason)
        }
    }

    fun saveBill(asFinal: Boolean) {
        viewModelScope.launch {
            val s = _newBillState.value
            val deviceId = deviceManager.deviceId
            val userEmail = authManager.getCurrentEmail()

            if (s.customerName.isBlank()) {
                _newBillState.update { it.copy(error = "Customer name is required") }; return@launch
            }
            val validLines = s.lines.filter { it.itemName.isNotBlank() && it.itemPrice.toDoubleOrNull() != null && it.itemPrice.toDouble() > 0 }
            if (validLines.isEmpty()) {
                _newBillState.update { it.copy(error = "Add at least one item with a valid price") }; return@launch
            }
            _newBillState.update { it.copy(isSaving = true, error = null) }

            val pct = s.discountPct.toDoubleOrNull() ?: 0.0
            val amt = s.discountAmt.toDoubleOrNull() ?: 0.0
            val items = validLines.map { l ->
                BillItem(id = BillUtils.generateId(), billId = "", itemName = l.itemName.trim(),
                    itemPrice = l.itemPrice.toDouble(), quantity = l.quantity, deviceId = deviceId)
            }
            val (_, discountVal, total) = BillUtils.computeTotals(items, pct, amt)

            val nextBillNo = if (asFinal) (billDao.getMaxBillNo() ?: 0) + 1 else null
            val billId = BillUtils.generateId()
            val now = System.currentTimeMillis()

            val existingCust = customerDao.getCustomerByName(s.customerName.trim())
            val customerId = existingCust?.id ?: BillUtils.generateId()
            val customer = existingCust ?: Customer(
                id = customerId,
                name = s.customerName.trim(),
                phone = s.customerPhone.ifBlank { null },
                balance = 0.0,
                deviceId = deviceId,
                createdAt = now,
                updatedAt = now
            )

            val bill = Bill(
                id = billId, billNo = nextBillNo, customerName = s.customerName.trim(),
                customerId = customerId,
                paymentMode = s.paymentMode,
                totalAmount = total, discountPercent = pct, discountAmount = discountVal,
                status = if (asFinal) "final" else "draft",
                billingDate = s.billingDate, createdBy = userEmail, deviceId = deviceId,
                createdAt = now, updatedAt = now
            )
            val billItems = items.map { it.copy(billId = billId) }

            val udhariEntry = if (asFinal && s.paymentMode == "credit" && total > 0) {
                val newBal = customer.balance + total
                UdhariLedger(
                    id = BillUtils.generateId(),
                    customerId = customerId,
                    billId = billId,
                    entryType = "credit_sale",
                    amount = total,
                    balanceAfter = newBal,
                    notes = "Credit bill ${BillUtils.billNo(bill)}",
                    deviceId = deviceId,
                    createdAt = now,
                    updatedAt = now
                )
            } else null

            val salesRow = if (asFinal && total > 0) {
                SalesLedger(
                    id = BillUtils.generateId(),
                    sourceType = "bill",
                    sourceId = billId,
                    amount = total,
                    saleDate = s.billingDate,
                    paymentMode = s.paymentMode,
                    status = "active",
                    deviceId = deviceId,
                    createdAt = now,
                    updatedAt = now
                )
            } else null

            val outbox = mutableListOf<SyncOutbox>()
            outbox.add(SyncOutbox(id = BillUtils.generateId(), tableName = "bills", recordId = billId, operation = "insert", payloadJson = billToJson(bill)))
            billItems.forEach { bi ->
                outbox.add(SyncOutbox(id = BillUtils.generateId(), tableName = "bill_items", recordId = bi.id, operation = "insert", payloadJson = billItemToJson(bi)))
            }
            if (existingCust == null) {
                outbox.add(SyncOutbox(id = BillUtils.generateId(), tableName = "customers", recordId = customer.id, operation = "insert", payloadJson = customerToJson(customer)))
            }
            if (udhariEntry != null) {
                outbox.add(SyncOutbox(id = BillUtils.generateId(), tableName = "udhari_ledger", recordId = udhariEntry.id, operation = "insert", payloadJson = udhariToJson(udhariEntry)))
            }
            if (salesRow != null) {
                outbox.add(SyncOutbox(id = BillUtils.generateId(), tableName = "sales_ledger", recordId = salesRow.id, operation = "insert", payloadJson = salesToJson(salesRow)))
            }

            db.createBillWithItemsAndLedger(
                bill = bill,
                items = billItems,
                customer = if (existingCust == null) customer else null,
                udhariEntry = udhariEntry,
                salesRow = salesRow,
                outboxEntries = outbox
            )
            _newBillState.update { it.copy(isSaving = false, savedBillId = billId) }
        }
    }

    fun saveUpiConfig(enabled: Boolean, upiId: String, payeeName: String) {
        viewModelScope.launch {
            val json = """{"enabled":$enabled,"upi_id":"$upiId","payee_name":"$payeeName"}"""
            val setting = ShopSetting(id = BillUtils.generateId(), key = "upi_config", valueJson = json)
            shopSettingDao.upsertSetting(setting)
            syncOutboxDao.insertOutbox(SyncOutbox(
                id = BillUtils.generateId(), tableName = "store_settings", recordId = "upi_config",
                operation = "update", payloadJson = """{"key":"upi_config","value":$json}"""
            ))
        }
    }

    private fun billToJson(b: Bill) = """{"id":"${b.id}","bill_no":${b.billNo},"customer_name":"${b.customerName}","customer_id":${if(b.customerId!=null)"\"${b.customerId}\"" else "null"},"payment_mode":"${b.paymentMode}","total_amount":${b.totalAmount},"discount_percent":${b.discountPercent},"discount_amount":${b.discountAmount},"status":"${b.status}","billing_date":${if(b.billingDate!=null) "\"${b.billingDate}\"" else "null"},"created_by":${if(b.createdBy!=null) "\"${b.createdBy}\"" else "null"},"device_id":"${b.deviceId}"}"""
    private fun billItemToJson(bi: BillItem) = """{"id":"${bi.id}","bill_id":"${bi.billId}","item_name":"${bi.itemName}","item_price":${bi.itemPrice},"quantity":${bi.quantity},"device_id":"${bi.deviceId}"}"""
    private fun customerToJson(c: Customer) = """{"id":"${c.id}","name":"${c.name}","phone":${if(c.phone!=null)"\"${c.phone}\"" else "null"},"balance":${c.balance},"device_id":"${c.deviceId}"}"""
    private fun udhariToJson(u: UdhariLedger) = """{"id":"${u.id}","customer_id":"${u.customerId}","bill_id":${if(u.billId!=null)"\"${u.billId}\"" else "null"},"entry_type":"${u.entryType}","amount":${u.amount},"balance_after":${u.balanceAfter},"device_id":"${u.deviceId}"}"""
    private fun salesToJson(s: SalesLedger) = """{"id":"${s.id}","source_type":"${s.sourceType}","source_id":"${s.sourceId}","amount":${s.amount},"sale_date":"${s.saleDate}","payment_mode":"${s.paymentMode}","status":"${s.status}","device_id":"${s.deviceId}"}"""
}
