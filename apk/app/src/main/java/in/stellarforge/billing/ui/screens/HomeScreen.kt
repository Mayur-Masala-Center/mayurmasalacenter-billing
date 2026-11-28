package `in`.stellarforge.billing.ui.screens

import android.content.Intent
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Print
import androidx.compose.material.icons.filled.Sync
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import `in`.stellarforge.billing.auth.AppUser
import `in`.stellarforge.billing.data.model.Bill
import `in`.stellarforge.billing.printer.BluetoothPrinterManager
import `in`.stellarforge.billing.sync.SyncScheduler
import `in`.stellarforge.billing.sync.SyncState
import `in`.stellarforge.billing.sync.SyncStatusMonitor
import `in`.stellarforge.billing.ui.viewmodels.BillViewModel
import `in`.stellarforge.billing.util.BillUtils
import kotlinx.coroutines.flow.firstOrNull
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    currentUser: AppUser? = null,
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

    val isOwner = currentUser?.isOwner ?: false

    // Status filter: "all", "draft", "final", "cancelled"
    var selectedStatus by remember { mutableStateOf("all") }
    // Date range filter: "today", "yesterday", "7d", "30d", "all"
    var selectedRange by remember { mutableStateOf("today") }
    var searchQuery by remember { mutableStateOf("") }

    val todayStr = BillUtils.todayIST()

    // Helper date bounds
    val (startDate, endDate) = remember(selectedRange, todayStr) {
        val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.US).apply {
            timeZone = TimeZone.getTimeZone("Asia/Kolkata")
        }
        val cal = Calendar.getInstance(TimeZone.getTimeZone("Asia/Kolkata"))
        when (selectedRange) {
            "today" -> todayStr to todayStr
            "yesterday" -> {
                cal.add(Calendar.DAY_OF_YEAR, -1)
                val y = sdf.format(cal.time)
                y to y
            }
            "7d" -> {
                cal.add(Calendar.DAY_OF_YEAR, -6)
                sdf.format(cal.time) to todayStr
            }
            "30d" -> {
                cal.add(Calendar.DAY_OF_YEAR, -29)
                sdf.format(cal.time) to todayStr
            }
            else -> "0000-00-00" to "9999-99-99"
        }
    }

    // Counts for tabs
    val draftsCount = remember(bills) { bills.count { it.status == "draft" } }

    // Filter bills
    val filteredBills = remember(bills, selectedStatus, selectedRange, startDate, endDate, searchQuery) {
        bills.filter { bill ->
            // Status filter
            val statusMatches = when (selectedStatus) {
                "all" -> true
                else -> bill.status == selectedStatus
            }
            // Date filter (drafts are not restricted by date range unless user changed it)
            val billDate = bill.billingDate ?: SimpleDateFormat("yyyy-MM-dd", Locale.US).apply {
                timeZone = TimeZone.getTimeZone("Asia/Kolkata")
            }.format(Date(bill.createdAt))

            val dateMatches = if (selectedStatus == "draft") true else billDate in startDate..endDate

            // Search filter
            val searchMatches = if (searchQuery.isBlank()) true else {
                val q = searchQuery.trim().lowercase()
                bill.customerName.lowercase().contains(q) ||
                        BillUtils.billNo(bill).lowercase().contains(q)
            }

            statusMatches && dateMatches && searchMatches
        }
    }

    // Last printed bill for quick reprint
    val lastFinalBill = remember(bills) { bills.firstOrNull { it.status == "final" } }

    Scaffold(
        containerColor = Color(0xFF0D1117),
        floatingActionButton = {
            FloatingActionButton(
                onClick = onNewBill,
                containerColor = Color(0xFF00C9A7),
                contentColor = Color.Black,
                shape = CircleShape
            ) {
                Icon(Icons.Default.Add, contentDescription = "New Bill", modifier = Modifier.size(28.dp))
            }
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
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
                    Text(
                        statusText,
                        fontSize = 12.sp,
                        color = Color(0xFF8B949E),
                        modifier = Modifier.weight(1f)
                    )
                    IconButton(
                        onClick = { SyncScheduler.enqueueImmediate(context) },
                        modifier = Modifier.size(24.dp)
                    ) {
                        Icon(
                            Icons.Default.Sync,
                            contentDescription = "Sync",
                            tint = Color(0xFF00C9A7),
                            modifier = Modifier.size(16.dp)
                        )
                    }
                }
            }

            // Quick reprint banner if a final bill exists
            if (lastFinalBill != null) {
                Surface(
                    color = Color(0xFF00C9A7).copy(alpha = 0.08f),
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable {
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

            Spacer(Modifier.height(8.dp))

            // Row 1: Status Tabs (All, Drafts, Printed, Cancelled)
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 4.dp)
                    .horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                StatusPill(
                    label = "All",
                    selected = selectedStatus == "all",
                    onClick = { selectedStatus = "all" }
                )
                StatusPill(
                    label = "💾 Drafts ($draftsCount)",
                    selected = selectedStatus == "draft",
                    onClick = { selectedStatus = "draft" }
                )
                StatusPill(
                    label = "🖨️ Printed",
                    selected = selectedStatus == "final",
                    onClick = { selectedStatus = "final" }
                )
                StatusPill(
                    label = "🚫 Cancelled",
                    selected = selectedStatus == "cancelled",
                    onClick = { selectedStatus = "cancelled" }
                )
            }

            // Row 2: Date Range Chips (Today, Yesterday, 7 days, 30 days, All time)
            if (selectedStatus != "draft") {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 4.dp)
                        .horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    DateRangePill(label = "Today", selected = selectedRange == "today") { selectedRange = "today" }
                    DateRangePill(label = "Yesterday", selected = selectedRange == "yesterday") { selectedRange = "yesterday" }
                    DateRangePill(label = "7 days", selected = selectedRange == "7d") { selectedRange = "7d" }
                    DateRangePill(label = "30 days", selected = selectedRange == "30d") { selectedRange = "30d" }
                    DateRangePill(label = "All time", selected = selectedRange == "all") { selectedRange = "all" }
                }
            }

            // Row 3: Search input + Export Buttons (Export is owner-only)
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = { searchQuery = it },
                    placeholder = { Text("Search customer or bill number…", fontSize = 13.sp, color = Color(0xFF8B949E)) },
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White,
                        focusedBorderColor = Color(0xFF00C9A7),
                        unfocusedBorderColor = Color(0xFF30363D),
                        focusedContainerColor = Color(0xFF161B22),
                        unfocusedContainerColor = Color(0xFF161B22),
                        cursorColor = Color(0xFF00C9A7)
                    ),
                    modifier = Modifier
                        .weight(1f)
                        .height(48.dp),
                    shape = RoundedCornerShape(8.dp)
                )

                // Export Button — ONLY visible to Owner
                if (isOwner) {
                    OutlinedButton(
                        onClick = {
                            val csv = BillUtils.billsToCsv(filteredBills)
                            val intent = Intent(Intent.ACTION_SEND).apply {
                                type = "text/csv"
                                putExtra(Intent.EXTRA_SUBJECT, "Mayur_Masala_Bills.csv")
                                putExtra(Intent.EXTRA_TEXT, csv)
                            }
                            context.startActivity(Intent.createChooser(intent, "Export Bills (Excel / CSV)"))
                        },
                        modifier = Modifier.height(48.dp),
                        shape = RoundedCornerShape(8.dp),
                        colors = ButtonDefaults.outlinedButtonColors(
                            containerColor = Color(0xFF161B22),
                            contentColor = Color.White
                        ),
                        border = ButtonDefaults.outlinedButtonBorder.copy(
                            brush = androidx.compose.ui.graphics.SolidColor(Color(0xFF30363D))
                        ),
                        contentPadding = PaddingValues(horizontal = 12.dp)
                    ) {
                        Text("⬇️ Bills (Excel)", fontSize = 12.sp, fontWeight = FontWeight.Medium)
                    }
                }
            }

            // Bills List
            if (filteredBills.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .weight(1f),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("🧾", fontSize = 48.sp)
                        Spacer(Modifier.height(8.dp))
                        Text(
                            if (searchQuery.isNotBlank()) "No bills match your search"
                            else if (selectedStatus == "draft") "No drafts"
                            else "No bills found",
                            color = Color(0xFF8B949E)
                        )
                        Spacer(Modifier.height(4.dp))
                        Text("Tap + to create one", color = Color(0xFF8B949E), fontSize = 13.sp)
                    }
                }
            } else {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f),
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(filteredBills, key = { it.id }) { bill ->
                        BillCard(
                            bill = bill,
                            showTotal = isOwner,
                            onClick = { onBillClick(bill.id) }
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun BillCard(bill: Bill, showTotal: Boolean = true, onClick: () -> Unit) {
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
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(BillUtils.formatTime(bill.createdAt), fontSize = 12.sp, color = Color(0xFF8B949E))
                    bill.createdBy?.let { staff ->
                        Spacer(Modifier.width(8.dp))
                        Text(
                            "👤 ${staff.substringBefore("@")}",
                            fontSize = 11.sp,
                            color = Color(0xFF00C9A7).copy(alpha = 0.8f)
                        )
                    }
                }
            }
            Column(horizontalAlignment = Alignment.End) {
                // If staff: hide total sales money amount! Only Owner sees ₹ amount
                if (showTotal) {
                    Text("₹${String.format(Locale.US, "%.2f", bill.totalAmount)}", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = Color.White)
                    Spacer(Modifier.height(4.dp))
                }
                Surface(color = statusColor.copy(alpha = 0.15f), shape = MaterialTheme.shapes.small) {
                    Text(statusLabel, modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
                        fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = statusColor)
                }
            }
        }
    }
}

@Composable
private fun StatusPill(label: String, selected: Boolean, onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(8.dp))
            .background(if (selected) Color(0xFF161B22) else Color.Transparent)
            .border(
                1.dp,
                if (selected) Color(0xFF00C9A7) else Color(0xFF30363D),
                RoundedCornerShape(8.dp)
            )
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 7.dp)
    ) {
        Text(
            text = label,
            fontSize = 13.sp,
            fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal,
            color = if (selected) Color.White else Color(0xFF8B949E)
        )
    }
}

@Composable
private fun DateRangePill(label: String, selected: Boolean, onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(8.dp))
            .background(if (selected) Color(0xFF00C9A7) else Color(0xFF161B22))
            .border(
                1.dp,
                if (selected) Color(0xFF00C9A7) else Color(0xFF30363D),
                RoundedCornerShape(8.dp)
            )
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 6.dp)
    ) {
        Text(
            text = label,
            fontSize = 12.sp,
            fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium,
            color = if (selected) Color.Black else Color.White
        )
    }
}
