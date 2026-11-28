package `in`.stellarforge.billing.ui.viewmodels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import `in`.stellarforge.billing.data.dao.ItemDao
import `in`.stellarforge.billing.data.dao.SyncOutboxDao
import `in`.stellarforge.billing.data.model.Item
import `in`.stellarforge.billing.data.model.SyncOutbox
import `in`.stellarforge.billing.util.BillUtils
import `in`.stellarforge.billing.util.DeviceManager
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class ItemsViewModel @Inject constructor(
    private val itemDao: ItemDao,
    private val syncOutboxDao: SyncOutboxDao,
    private val deviceManager: DeviceManager
) : ViewModel() {

    val items: StateFlow<List<Item>> = itemDao.getAllItems()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    private val _search = MutableStateFlow("")
    val search: StateFlow<String> = _search
    fun updateSearch(q: String) { _search.value = q }

    val filteredItems: StateFlow<List<Item>> = combine(items, search) { list, q ->
        if (q.isBlank()) list else list.filter { it.name.contains(q, ignoreCase = true) }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    fun addItem(name: String) {
        viewModelScope.launch {
            val devId = deviceManager.deviceId
            val item = Item(id = BillUtils.generateId(), name = name.trim(), deviceId = devId)
            itemDao.insertItem(item)
            syncOutboxDao.insertOutbox(SyncOutbox(
                id = BillUtils.generateId(), tableName = "items", recordId = item.id,
                operation = "insert",
                payloadJson = """{"id":"${item.id}","name":"${item.name}","device_id":"${item.deviceId}"}"""
            ))
        }
    }

    fun deleteItem(item: Item) {
        viewModelScope.launch {
            itemDao.softDeleteItem(item.id)
            syncOutboxDao.insertOutbox(SyncOutbox(
                id = BillUtils.generateId(), tableName = "items", recordId = item.id,
                operation = "delete",
                payloadJson = """{"id":"${item.id}","deleted_at":"${System.currentTimeMillis()}"}"""
            ))
        }
    }
}
