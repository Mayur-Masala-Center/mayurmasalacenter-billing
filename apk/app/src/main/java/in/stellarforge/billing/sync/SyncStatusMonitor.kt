package in.stellarforge.billing.sync

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import java.text.SimpleDateFormat
import java.util.*

sealed class SyncState {
    object Synced : SyncState()
    data class Syncing(val message: String = "Syncing...") : SyncState()
    data class Pending(val count: Int) : SyncState()
    data class Error(val message: String) : SyncState()
}

object SyncStatusMonitor {
    private val _syncState = MutableStateFlow<SyncState>(SyncState.Synced)
    val syncState: StateFlow<SyncState> = _syncState

    private val _lastSyncedTime = MutableStateFlow("Never")
    val lastSyncedTime: StateFlow<String> = _lastSyncedTime

    fun setSyncing(msg: String = "Syncing...") {
        _syncState.value = SyncState.Syncing(msg)
    }

    fun setSynced() {
        _syncState.value = SyncState.Synced
        val sdf = SimpleDateFormat("hh:mm a", Locale("en", "IN")).apply {
            timeZone = TimeZone.getTimeZone("Asia/Kolkata")
        }
        _lastSyncedTime.value = sdf.format(Date())
    }

    fun setPending(count: Int) {
        if (count > 0) _syncState.value = SyncState.Pending(count)
        else _syncState.value = SyncState.Synced
    }

    fun setError(err: String) {
        _syncState.value = SyncState.Error(err)
    }
}
