package `in`.stellarforge.billing.ui.screens

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Print
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
import `in`.stellarforge.billing.data.model.BillItem
import `in`.stellarforge.billing.printer.BluetoothPrinterManager
import `in`.stellarforge.billing.ui.viewmodels.BillViewModel
import `in`.stellarforge.billing.util.BillUtils
import kotlinx.coroutines.launch
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BillDetailScreen(
    billId: String,
    currentUser: AppUser? = null,
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

    val isOwner = currentUser?.isOwner ?: false

    if (bill == null) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator(color = Color(0xFF00C9A7))
        }
        return
    }

    val subtotal = itemsState.sumOf { it.itemPrice * it.quantity }
    val discount = if (bill.discountPercent > 0) subtotal * bill.discountPercent / 100.0 else bill.discountAmount
    val roundOff = bill.totalAmount - (subtotal - discount)

    Scaffold(
        containerColor = Color(0xFF0D1117),
        topBar = {
            TopAppBar(
                title = { Text(BillUtils.billNo(bill), color = Color.White, fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = Color.White)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color(0xFF161B22))
            )
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            // Customer Header Banner Card matching web app modal
            item {
                Card(
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF161B22)),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(18.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(
                            "CUSTOMER",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF8B949E),
                            letterSpacing = 1.sp
                        )
                        Spacer(Modifier.height(4.dp))
                        Text(
                            bill.customerName,
                            fontSize = 22.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )

                        // Show Total Amount (Only for Owner, staff cannot see total)
                        if (isOwner) {
                            Spacer(Modifier.height(6.dp))
                            Text(
                                "₹${String.format(Locale.US, "%.2f", bill.totalAmount)}",
                                fontSize = 28.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color = if (bill.status == "cancelled") Color(0xFFFF6B6B) else Color(0xFF00C9A7)
                            )
                        }

                        if (discount > 0 && isOwner) {
                            Spacer(Modifier.height(2.dp))
                            Text(
                                "After ₹${String.format(Locale.US, "%.2f", discount)} discount",
                                fontSize = 12.sp,
                                color = Color(0xFF8B949E)
                            )
                        }

                        Spacer(Modifier.height(10.dp))
                        val statusColor = when (bill.status) {
                            "final" -> Color(0xFF00C9A7)
                            "cancelled" -> Color(0xFFFF6B6B)
                            else -> Color(0xFF8B949E)
                        }
                        Surface(
                            color = statusColor.copy(alpha = 0.15f),
                            shape = RoundedCornerShape(6.dp)
                        ) {
                            Text(
                                text = when (bill.status) {
                                    "final" -> "🖨️ Printed"
                                    "cancelled" -> "🚫 Cancelled"
                                    else -> "💾 Draft"
                                },
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp),
                                color = statusColor,
                                fontWeight = FontWeight.SemiBold,
                                fontSize = 12.sp
                            )
                        }
                    }
                }
            }

            // Cancellation Notice Banner
            if (bill.status == "cancelled" && bill.cancelReason != null) {
                item {
                    Card(
                        colors = CardDefaults.cardColors(containerColor = Color(0xFFFF6B6B).copy(alpha = 0.12f)),
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(Modifier.padding(14.dp)) {
                            Text("🚫 Cancelled Bill", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color(0xFFFF6B6B))
                            Spacer(Modifier.height(2.dp))
                            Text("Reason: ${bill.cancelReason}", fontSize = 13.sp, color = Color.White)
                        }
                    }
                }
            }

            // Meta Information Card (Date, Time, Staff, Backdated note)
            item {
                Card(
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF161B22)),
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(
                        modifier = Modifier.padding(14.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        MetaRow("Bill No", BillUtils.billNo(bill))
                        MetaRow("Billing Date", bill.billingDate ?: BillUtils.formatDate(bill.createdAt))
                        MetaRow("Created At", "${BillUtils.formatDate(bill.createdAt)} at ${BillUtils.formatTime(bill.createdAt)}")
                        bill.createdBy?.let { staff ->
                            MetaRow("Created By", staff.substringBefore("@"))
                        }
                    }
                }
            }

            // Line items breakdown
            if (itemsState.isNotEmpty()) {
                item {
                    Card(
                        colors = CardDefaults.cardColors(containerColor = Color(0xFF161B22)),
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(14.dp)) {
                            Text(
                                "Items (${itemsState.size})",
                                fontWeight = FontWeight.Bold,
                                color = Color.White,
                                fontSize = 14.sp
                            )
                            HorizontalDivider(color = Color(0xFF30363D), modifier = Modifier.padding(vertical = 10.dp))

                            itemsState.forEachIndexed { i, item ->
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(vertical = 4.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text("${i + 1}. ${item.itemName}", color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.Medium)
                                        Text(
                                            "₹${String.format(Locale.US, "%.2f", item.itemPrice)} × ${item.quantity}",
                                            color = Color(0xFF8B949E),
                                            fontSize = 12.sp
                                        )
                                    }
                                    if (isOwner) {
                                        Text(
                                            "₹${String.format(Locale.US, "%.2f", item.itemPrice * item.quantity)}",
                                            color = Color.White,
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 14.sp
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // Subtotal / Discount / Round-off breakdown (Owner Only)
            if (isOwner) {
                item {
                    Card(
                        colors = CardDefaults.cardColors(containerColor = Color(0xFF161B22)),
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(
                            modifier = Modifier.padding(14.dp),
                            verticalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("Subtotal", color = Color(0xFF8B949E), fontSize = 13.sp)
                                Text("₹${String.format(Locale.US, "%.2f", subtotal)}", color = Color.White, fontSize = 13.sp)
                            }
                            if (discount > 0) {
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text("Discount", color = Color(0xFFFF6B6B), fontSize = 13.sp)
                                    Text("- ₹${String.format(Locale.US, "%.2f", discount)}", color = Color(0xFFFF6B6B), fontSize = 13.sp)
                                }
                            }
                            if (Math.abs(roundOff) > 0.005) {
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text("Round off", color = Color(0xFF8B949E), fontSize = 13.sp)
                                    Text(
                                        "${if (roundOff > 0) "+" else "-"} ₹${String.format(Locale.US, "%.2f", Math.abs(roundOff))}",
                                        color = Color(0xFF8B949E),
                                        fontSize = 13.sp
                                    )
                                }
                            }
                            HorizontalDivider(color = Color(0xFF30363D), modifier = Modifier.padding(vertical = 4.dp))
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("TOTAL", fontWeight = FontWeight.Bold, color = Color.White, fontSize = 16.sp)
                                Text("₹${String.format(Locale.US, "%.2f", bill.totalAmount)}", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = Color(0xFF00C9A7))
                            }
                        }
                    }
                }
            }

            // Action Buttons: WhatsApp & Print
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    OutlinedButton(
                        onClick = {
                            val text = BillUtils.whatsAppText(bill, itemsState)
                            val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://wa.me/?text=${Uri.encode(text)}"))
                            context.startActivity(intent)
                        },
                        modifier = Modifier.weight(1f).height(48.dp),
                        shape = RoundedCornerShape(8.dp),
                        colors = ButtonDefaults.outlinedButtonColors(containerColor = Color(0xFF161B22)),
                        border = ButtonDefaults.outlinedButtonBorder.copy(
                            brush = androidx.compose.ui.graphics.SolidColor(Color(0xFF30363D))
                        )
                    ) {
                        Text("📲 WhatsApp", color = Color.White, fontWeight = FontWeight.SemiBold)
                    }

                    if (bill.status != "cancelled") {
                        Button(
                            onClick = {
                                coroutineScope.launch {
                                    printerManager?.print(bill, itemsState, null)
                                }
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF00C9A7)),
                            modifier = Modifier.weight(1f).height(48.dp),
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Icon(Icons.Default.Print, contentDescription = null, tint = Color.Black)
                            Spacer(Modifier.width(6.dp))
                            Text("Print Bill", color = Color.Black, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }

            // Cancel Bill Option (Only for final printed bills)
            if (bill.status == "final") {
                item {
                    OutlinedButton(
                        onClick = { showCancelDialog = true },
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFFFF6B6B)),
                        border = ButtonDefaults.outlinedButtonBorder.copy(
                            brush = androidx.compose.ui.graphics.SolidColor(Color(0xFFFF6B6B).copy(alpha = 0.5f))
                        ),
                        modifier = Modifier.fillMaxWidth().height(46.dp),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Text("Cancel Bill", fontWeight = FontWeight.SemiBold)
                    }
                }
            }
        }
    }

    if (showCancelDialog) {
        AlertDialog(
            onDismissRequest = { showCancelDialog = false },
            containerColor = Color(0xFF161B22),
            title = { Text("Cancel Bill", color = Color.White, fontWeight = FontWeight.Bold) },
            text = {
                Column {
                    Text("The bill will be marked cancelled and excluded from sales totals.", color = Color(0xFF8B949E), fontSize = 13.sp)
                    Spacer(Modifier.height(12.dp))
                    OutlinedTextField(
                        value = cancelReason,
                        onValueChange = { cancelReason = it },
                        label = { Text("Reason for cancellation *", color = Color(0xFF8B949E)) },
                        placeholder = { Text("e.g. wrong items, customer returned", color = Color(0xFF484F58)) },
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White,
                            focusedBorderColor = Color(0xFFFF6B6B),
                            unfocusedBorderColor = Color(0xFF30363D),
                            cursorColor = Color(0xFFFF6B6B)
                        ),
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.cancelBill(billId, cancelReason)
                        showCancelDialog = false
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFFF6B6B)),
                    enabled = cancelReason.isNotBlank()
                ) {
                    Text("Confirm Cancel", color = Color.White, fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showCancelDialog = false }) {
                    Text("Back", color = Color(0xFF8B949E))
                }
            }
        )
    }
}

@Composable
private fun MetaRow(label: String, value: String) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(label, color = Color(0xFF8B949E), fontSize = 13.sp)
        Text(value, color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.Medium)
    }
}
