package `in`.stellarforge.billing.ui.screens

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Print
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
import `in`.stellarforge.billing.data.model.BillItem
import `in`.stellarforge.billing.printer.BluetoothPrinterManager
import `in`.stellarforge.billing.ui.viewmodels.BillViewModel
import `in`.stellarforge.billing.util.BillUtils
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BillDetailScreen(
    billId: String,
    onBack: () -> Unit,
    printerManager: BluetoothPrinterManager? = null,
    viewModel: BillViewModel = hiltViewModel()
) {
    val bills by viewModel.allBills.collectAsState()
    val bill = bills.find { it.id == billId }
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    var showCancelDialog by remember { mutableStateOf(false) }
    var cancelReason by remember { mutableStateOf("") }
    val itemsState by viewModel.getItemsForBill(billId).collectAsState(initial = emptyList())

    if (bill == null) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator(color = Color(0xFF00C9A7))
        }
        return
    }

    Scaffold(
        containerColor = Color(0xFF0D1117),
        topBar = {
            TopAppBar(
                title = { Text(BillUtils.billNo(bill), color = Color.White, fontWeight = FontWeight.Bold) },
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, null, tint = Color.White) } },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color(0xFF161B22))
            )
        }
    ) { padding ->
        LazyColumn(modifier = Modifier.fillMaxSize().padding(padding).padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            item {
                val statusColor = when (bill.status) {
                    "final" -> Color(0xFF00C9A7); "cancelled" -> Color(0xFFFF6B6B); else -> Color(0xFF8B949E)
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(bill.customerName, fontSize = 20.sp, fontWeight = FontWeight.Bold, color = Color.White, modifier = Modifier.weight(1f))
                    Surface(color = statusColor.copy(alpha = 0.15f), shape = MaterialTheme.shapes.small) {
                        Text(bill.status.replaceFirstChar { it.uppercase() }, modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp), color = statusColor, fontWeight = FontWeight.SemiBold, fontSize = 12.sp)
                    }
                }
            }

            item {
                Card(colors = CardDefaults.cardColors(containerColor = Color(0xFF161B22))) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        MetaRow("Date", BillUtils.formatDate(bill.createdAt))
                        MetaRow("Time", BillUtils.formatTime(bill.createdAt))
                        MetaRow("Payment", bill.paymentMode.uppercase())
                        bill.createdBy?.let { MetaRow("By", it.substringBefore("@")) }
                    }
                }
            }

            // Line items breakdown
            if (itemsState.isNotEmpty()) {
                item {
                    Card(colors = CardDefaults.cardColors(containerColor = Color(0xFF161B22))) {
                        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text("Items (${itemsState.size})", fontWeight = FontWeight.SemiBold, color = Color.White, fontSize = 14.sp)
                            HorizontalDivider(color = Color(0xFF30363D))
                            itemsState.forEachIndexed { i, item ->
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text("${i + 1}. ${item.itemName}", color = Color.White, fontSize = 13.sp, modifier = Modifier.weight(1f))
                                    Text("${item.quantity} x ₹${String.format("%.2f", item.itemPrice)}", color = Color(0xFF8B949E), fontSize = 13.sp)
                                    Spacer(Modifier.width(12.dp))
                                    Text("₹${String.format("%.2f", item.itemPrice * item.quantity)}", color = Color.White, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                                }
                            }
                        }
                    }
                }
            }

            item {
                Card(colors = CardDefaults.cardColors(containerColor = Color(0xFF161B22))) {
                    Row(modifier = Modifier.padding(16.dp).fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                        Text("TOTAL", fontWeight = FontWeight.Bold, color = Color.White, modifier = Modifier.weight(1f))
                        Text("₹${String.format("%.2f", bill.totalAmount)}", fontSize = 24.sp, fontWeight = FontWeight.Bold, color = Color(0xFF00C9A7))
                    }
                }
            }

            item {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton(
                        onClick = {
                            val text = BillUtils.whatsAppText(bill, itemsState)
                            val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://wa.me/?text=${Uri.encode(text)}"))
                            context.startActivity(intent)
                        },
                        modifier = Modifier.weight(1f)
                    ) {
                        Text("📲 WhatsApp", color = Color(0xFF8B949E))
                    }
                    if (bill.status != "cancelled") {
                        Button(
                            onClick = {
                                coroutineScope.launch {
                                    printerManager?.print(bill, itemsState, null)
                                }
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF00C9A7)),
                            modifier = Modifier.weight(1f)
                        ) {
                            Icon(Icons.Default.Print, null, tint = Color.Black)
                            Spacer(Modifier.width(4.dp))
                            Text("Print", color = Color.Black, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }

            if (bill.status == "final") {
                item {
                    OutlinedButton(
                        onClick = { showCancelDialog = true },
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFFFF6B6B)),
                        modifier = Modifier.fillMaxWidth()
                    ) { Text("Cancel Bill") }
                }
            }

            if (bill.status == "cancelled" && bill.cancelReason != null) {
                item {
                    Card(colors = CardDefaults.cardColors(containerColor = Color(0xFFFF6B6B).copy(alpha = 0.1f))) {
                        Column(Modifier.padding(12.dp)) {
                            Text("Cancellation Reason", fontSize = 12.sp, color = Color(0xFFFF6B6B))
                            Text(bill.cancelReason, color = Color.White)
                        }
                    }
                }
            }
        }
    }

    if (showCancelDialog) {
        AlertDialog(
            onDismissRequest = { showCancelDialog = false },
            containerColor = Color(0xFF161B22),
            title = { Text("Cancel Bill", color = Color.White) },
            text = {
                OutlinedTextField(
                    value = cancelReason, onValueChange = { cancelReason = it },
                    label = { Text("Reason *", color = Color(0xFF8B949E)) },
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = Color.White, unfocusedTextColor = Color.White,
                        focusedBorderColor = Color(0xFFFF6B6B), unfocusedBorderColor = Color(0xFF30363D)
                    )
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.cancelBill(billId, cancelReason)
                        showCancelDialog = false
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFFF6B6B)),
                    enabled = cancelReason.isNotBlank()
                ) { Text("Cancel Bill") }
            },
            dismissButton = { TextButton(onClick = { showCancelDialog = false }) { Text("Back", color = Color(0xFF8B949E)) } }
        )
    }
}

@Composable
private fun MetaRow(label: String, value: String) {
    Row {
        Text("$label:", color = Color(0xFF8B949E), fontSize = 13.sp, modifier = Modifier.width(60.dp))
        Text(value, color = Color.White, fontSize = 13.sp)
    }
}
