package `in`.stellarforge.billing.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Print
import androidx.compose.material.icons.filled.Sync
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import `in`.stellarforge.billing.data.model.Bill
import `in`.stellarforge.billing.printer.BluetoothPrinterManager
import `in`.stellarforge.billing.sync.SyncScheduler
import `in`.stellarforge.billing.sync.SyncState
import `in`.stellarforge.billing.sync.SyncStatusMonitor
import `in`.stellarforge.billing.ui.viewmodels.BillViewModel
import `in`.stellarforge.billing.util.BillUtils
import kotlinx.coroutines.flow.firstOrNull
import kotlinx.coroutines.launch

@Composable
fun HomeScreen(
    onBillClick: (String) -> Unit,
    onNewBill: () -> Unit,
    printerManager: BluetoothPrinterManager? = null,
    viewModel: BillViewModel = hiltViewModel()
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    val bills by viewModel.allBills.collectAsState()
    val syncState by SyncStatusMonitor.syncState.collectAsState()
    val lastSynced by SyncStatusMonitor.lastSyncedTime.collectAsState()
    val today = BillUtils.todayIST()
    val todayBills = bills.filter {
        (it.billingDate ?: BillUtils.formatDate(it.createdAt).let { _ -> today }) == today ||
        it.billingDate == null
    }

    // Last final bill for reprint
    val lastFinalBill = bills.firstOrNull { it.status == "final" }

    Scaffold(
        containerColor = Color(0xFF0D1117),
        floatingActionButton = {
            FloatingActionButton(
                onClick = onNewBill,
                containerColor = Color(0xFF00C9A7)
            ) {
                Icon(Icons.Default.Add, contentDescription = "New Bill", tint = Color.Black)
            }
        }
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding)) {
            // Sync status header banner
            Surface(
                color = Color(0xFF161B22),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    val statusText = when (syncState) {
                        is SyncState.Synced -> "✅ All synced ($lastSynced)"
                        is SyncState.Syncing -> "⏳ Syncing changes..."
                        is SyncState.Pending -> "⏳ ${(syncState as SyncState.Pending).count} waiting to sync"
                        is SyncState.Error -> "⚠️ Sync error"
                    }
                    Text(statusText, fontSize = 12.sp, color = Color(0xFF8B949E), modifier = Modifier.weight(1f))
                    IconButton(
                        onClick = { SyncScheduler.enqueueImmediate(context) },
                        modifier = Modifier.size(24.dp)
                    ) {
                        Icon(Icons.Default.Sync, contentDescription = "Sync", tint = Color(0xFF00C9A7), modifier = Modifier.size(16.dp))
                    }
                }
            }

            // Quick reprint banner if a bill exists
            if (lastFinalBill != null) {
                Surface(
                    color = Color(0xFF00C9A7).copy(alpha = 0.08f),
                    modifier = Modifier.fillMaxWidth().clickable {
                        coroutineScope.launch {
                            val items = viewModel.getItemsForBill(lastFinalBill.id).firstOrNull() ?: emptyList()
                            printerManager?.print(lastFinalBill, items, null)
                        }
                    }
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Default.Print, contentDescription = null, tint = Color(0xFF00C9A7), modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(8.dp))
                        Text(
                            "🖨️ Reprint Last Bill (${BillUtils.billNo(lastFinalBill)} · ${lastFinalBill.customerName})",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = Color(0xFF00C9A7),
                            modifier = Modifier.weight(1f)
                        )
                    }
                }
            }

            // Header
            Row(
                modifier = Modifier.fillMaxWidth().padding(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("🌶️", fontSize = 20.sp)
                Spacer(Modifier.width(8.dp))
                Text("Today's Bills", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = Color.White)
                Spacer(Modifier.weight(1f))
                Text(today, fontSize = 12.sp, color = Color(0xFF8B949E))
            }

            if (todayBills.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("🧾", fontSize = 48.sp)
                        Spacer(Modifier.height(8.dp))
                        Text("No bills today", color = Color(0xFF8B949E))
                        Spacer(Modifier.height(4.dp))
                        Text("Tap + to create one", color = Color(0xFF8B949E), fontSize = 13.sp)
                    }
                }
            } else {
                LazyColumn(contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp)) {
                    items(todayBills, key = { it.id }) { bill ->
                        BillCard(bill = bill, onClick = { onBillClick(bill.id) })
                        Spacer(Modifier.height(8.dp))
                    }
                }
            }
        }
    }
}

@Composable
fun BillCard(bill: Bill, onClick: () -> Unit) {
    val statusColor = when (bill.status) {
        "final" -> Color(0xFF00C9A7)
        "cancelled" -> Color(0xFFFF6B6B)
        else -> Color(0xFF8B949E)
    }
    val statusLabel = when (bill.status) {
        "final" -> "Printed"
        "cancelled" -> "Cancelled"
        else -> "Draft"
    }
    Card(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick),
        colors = CardDefaults.cardColors(containerColor = Color(0xFF161B22))
    ) {
        Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(modifier = Modifier.weight(1f)) {
                Text(BillUtils.billNo(bill), fontSize = 13.sp, color = Color(0xFF8B949E))
                Text(bill.customerName, fontSize = 16.sp, fontWeight = FontWeight.SemiBold, color = Color.White)
                Text(BillUtils.formatTime(bill.createdAt), fontSize = 12.sp, color = Color(0xFF8B949E))
            }
            Column(horizontalAlignment = Alignment.End) {
                Text("₹${String.format("%.2f", bill.totalAmount)}", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = Color.White)
                Spacer(Modifier.height(4.dp))
                Surface(color = statusColor.copy(alpha = 0.15f), shape = MaterialTheme.shapes.small) {
                    Text(statusLabel, modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
                        fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = statusColor)
                }
            }
        }
    }
}
