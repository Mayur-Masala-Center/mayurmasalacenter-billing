package `in`.stellarforge.billing.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import `in`.stellarforge.billing.printer.BluetoothPrinterManager
import `in`.stellarforge.billing.ui.viewmodels.BillViewModel
import `in`.stellarforge.billing.ui.viewmodels.LineItem
import kotlinx.coroutines.flow.firstOrNull
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NewBillScreen(
    onBillSaved: (String) -> Unit,
    onBack: () -> Unit,
    printerManager: BluetoothPrinterManager? = null,
    viewModel: BillViewModel = hiltViewModel()
) {
    val coroutineScope = rememberCoroutineScope()
    val state by viewModel.newBillState.collectAsState()
    val items by viewModel.allItems.collectAsState()
    var isPrintingTriggered by remember { mutableStateOf(false) }

    LaunchedEffect(state.savedBillId) {
        val savedId = state.savedBillId
        if (savedId != null) {
            if (isPrintingTriggered && printerManager != null) {
                coroutineScope.launch {
                    val bill = viewModel.allBills.value.firstOrNull { it.id == savedId }
                    val billItems = viewModel.getItemsForBill(savedId).firstOrNull() ?: emptyList()
                    if (bill != null) {
                        try {
                            printerManager.print(bill, billItems, null)
                        } catch (_: Exception) {
                            // Printing failure must NEVER block or rollback the saved bill
                        }
                    }
                }
            }
            onBillSaved(savedId)
            viewModel.resetSaved()
        }
    }

    val validLines = state.lines.filter { it.itemName.isNotBlank() && it.itemPrice.toDoubleOrNull() != null }
    val subtotal = validLines.sumOf { (it.itemPrice.toDoubleOrNull() ?: 0.0) * it.quantity }
    val pct = state.discountPct.toDoubleOrNull() ?: 0.0
    val amt = state.discountAmt.toDoubleOrNull() ?: 0.0
    val discountVal = if (state.usePercentDiscount) subtotal * pct / 100.0 else amt
    val rawTotal = subtotal - discountVal
    val total = Math.round(rawTotal).toDouble()

    Scaffold(
        containerColor = Color(0xFF0D1117),
        topBar = {
            TopAppBar(
                title = { Text("New Bill", color = Color.White, fontWeight = FontWeight.Bold) },
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
            modifier = Modifier.fillMaxSize().padding(padding),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            item {
                OutlinedTextField(
                    value = state.customerName, onValueChange = viewModel::updateCustomer,
                    label = { Text("Customer Name *", color = Color(0xFF8B949E)) },
                    singleLine = true,
                    colors = fieldColors(),
                    modifier = Modifier.fillMaxWidth()
                )
            }

            item {
                Text("Payment Mode", fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = Color.White)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 4.dp)) {
                    listOf("cash" to "Cash", "upi" to "UPI", "credit" to "Credit / Udhari").forEach { (mode, label) ->
                        FilterChip(
                            selected = state.paymentMode == mode,
                            onClick = { viewModel.updatePaymentMode(mode) },
                            label = { Text(label) },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = Color(0xFF00C9A7),
                                selectedLabelColor = Color.Black
                            )
                        )
                    }
                }
            }

            item {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("Items", fontSize = 16.sp, fontWeight = FontWeight.SemiBold, color = Color.White, modifier = Modifier.weight(1f))
                    TextButton(onClick = { viewModel.addLine() }) {
                        Icon(Icons.Default.Add, contentDescription = null, tint = Color(0xFF00C9A7))
                        Text("Add", color = Color(0xFF00C9A7))
                    }
                }
            }

            itemsIndexed(state.lines) { index, line ->
                LineItemRow(
                    line = line,
                    suggestions = items.map { it.name },
                    onUpdate = { viewModel.updateLine(index, it) },
                    onRemove = { viewModel.removeLine(index) }
                )
            }

            item {
                Card(colors = CardDefaults.cardColors(containerColor = Color(0xFF161B22))) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Text("Discount", fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = Color.White)
                        Spacer(Modifier.height(8.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedTextField(
                                value = state.discountPct, onValueChange = viewModel::updateDiscountPct,
                                label = { Text("% Discount", color = Color(0xFF8B949E)) },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                                singleLine = true, colors = fieldColors(),
                                modifier = Modifier.weight(1f)
                            )
                            OutlinedTextField(
                                value = state.discountAmt, onValueChange = viewModel::updateDiscountAmt,
                                label = { Text("₹ Flat", color = Color(0xFF8B949E)) },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                                singleLine = true, colors = fieldColors(),
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }
                }
            }

            item {
                Card(colors = CardDefaults.cardColors(containerColor = Color(0xFF161B22))) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Row { Text("Subtotal", color = Color(0xFF8B949E), modifier = Modifier.weight(1f)); Text("₹${String.format("%.2f", subtotal)}", color = Color.White) }
                        if (discountVal > 0) Row { Text("Discount", color = Color(0xFF8B949E), modifier = Modifier.weight(1f)); Text("-₹${String.format("%.2f", discountVal)}", color = Color(0xFFFF6B6B)) }
                        if (Math.abs(total - rawTotal) > 0.001) Row { Text("Round-off", color = Color(0xFF8B949E), modifier = Modifier.weight(1f)); Text("${if(total>rawTotal)"+" else ""}₹${String.format("%.2f", total - rawTotal)}", color = Color(0xFF8B949E)) }
                        HorizontalDivider(color = Color(0xFF30363D))
                        Row { Text("TOTAL", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = Color.White, modifier = Modifier.weight(1f)); Text("₹${String.format("%.2f", total)}", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = Color(0xFF00C9A7)) }
                    }
                }
            }

            if (state.error != null) {
                item { Text(state.error!!, color = Color(0xFFFF6B6B), fontSize = 13.sp) }
            }

            item {
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    OutlinedButton(
                        onClick = {
                            isPrintingTriggered = false
                            viewModel.saveBill(asFinal = false)
                        },
                        enabled = !state.isSaving,
                        modifier = Modifier.weight(1f)
                    ) { Text("Save Draft", color = Color(0xFF8B949E)) }

                    Button(
                        onClick = {
                            isPrintingTriggered = true
                            viewModel.saveBill(asFinal = true)
                        },
                        enabled = !state.isSaving,
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF00C9A7)),
                        modifier = Modifier.weight(1f)
                    ) {
                        if (state.isSaving) CircularProgressIndicator(color = Color.Black, modifier = Modifier.size(18.dp), strokeWidth = 2.dp)
                        else Text("Save & Print", color = Color.Black, fontWeight = FontWeight.Bold)
                    }
                }
                Spacer(Modifier.height(16.dp))
            }
        }
    }
}

@Composable
fun LineItemRow(line: LineItem, suggestions: List<String>, onUpdate: (LineItem) -> Unit, onRemove: () -> Unit) {
    var showSuggestions by remember { mutableStateOf(false) }
    val filtered = suggestions.filter { it.contains(line.itemName, ignoreCase = true) && line.itemName.isNotBlank() }

    Card(colors = CardDefaults.cardColors(containerColor = Color(0xFF161B22))) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(verticalAlignment = Alignment.Top) {
                Column(modifier = Modifier.weight(1f)) {
                    OutlinedTextField(
                        value = line.itemName,
                        onValueChange = { onUpdate(line.copy(itemName = it)); showSuggestions = it.isNotBlank() },
                        label = { Text("Item name", color = Color(0xFF8B949E)) },
                        singleLine = true, colors = fieldColors(), modifier = Modifier.fillMaxWidth()
                    )
                    if (showSuggestions && filtered.isNotEmpty()) {
                        filtered.take(4).forEach { s ->
                            TextButton(onClick = { onUpdate(line.copy(itemName = s)); showSuggestions = false }) {
                                Text(s, color = Color(0xFF00C9A7), fontSize = 13.sp)
                            }
                        }
                    }
                }
                IconButton(onClick = onRemove) {
                    Icon(Icons.Default.Delete, contentDescription = "Remove", tint = Color(0xFFFF6B6B))
                }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                OutlinedTextField(
                    value = line.itemPrice, onValueChange = { onUpdate(line.copy(itemPrice = it)) },
                    label = { Text("Price ₹", color = Color(0xFF8B949E)) },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    singleLine = true, colors = fieldColors(), modifier = Modifier.weight(1f)
                )
                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconButton(onClick = { if (line.quantity > 1) onUpdate(line.copy(quantity = line.quantity - 1)) }) {
                        Icon(Icons.Default.Remove, contentDescription = "-", tint = Color.White)
                    }
                    Text("${line.quantity}", color = Color.White, fontWeight = FontWeight.Bold)
                    IconButton(onClick = { onUpdate(line.copy(quantity = line.quantity + 1)) }) {
                        Icon(Icons.Default.Add, contentDescription = "+", tint = Color.White)
                    }
                }
            }
        }
    }
}

@Composable
private fun fieldColors() = OutlinedTextFieldDefaults.colors(
    focusedTextColor = Color.White, unfocusedTextColor = Color.White,
    focusedBorderColor = Color(0xFF00C9A7), unfocusedBorderColor = Color(0xFF30363D),
    cursorColor = Color(0xFF00C9A7)
)
