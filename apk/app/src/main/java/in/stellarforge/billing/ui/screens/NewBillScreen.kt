package `in`.stellarforge.billing.ui.screens

import android.app.DatePickerDialog
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.CalendarToday
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import `in`.stellarforge.billing.printer.BluetoothPrinterManager
import `in`.stellarforge.billing.ui.viewmodels.BillViewModel
import `in`.stellarforge.billing.ui.viewmodels.LineItem
import `in`.stellarforge.billing.util.BillUtils
import kotlinx.coroutines.flow.firstOrNull
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NewBillScreen(
    onBillSaved: (String) -> Unit,
    onBack: () -> Unit,
    printerManager: BluetoothPrinterManager? = null,
    viewModel: BillViewModel = hiltViewModel()
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    val state by viewModel.newBillState.collectAsState()
    val items by viewModel.allItems.collectAsState()

    var isPrintingTriggered by remember { mutableStateOf(false) }

    // Start with customer input if customerName is empty
    var hasStarted by remember { mutableStateOf(state.customerName.isNotBlank()) }

    // Top item chips from catalog
    val frequentItems = remember(items) {
        items.map { it.name }.distinct().take(8)
    }

    // Input form state for "Add to Bill"
    var formItemName by remember { mutableStateOf("") }
    var formPrice by remember { mutableStateOf("") }
    var formQty by remember { mutableStateOf("1") }

    // Round off checkbox state
    var roundOff by remember { mutableStateOf(false) }

    // Date picker dialog setup
    val calendar = remember { Calendar.getInstance(TimeZone.getTimeZone("Asia/Kolkata")) }
    val datePickerDialog = remember {
        val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.US)
        DatePickerDialog(
            context,
            { _, year, month, dayOfMonth ->
                val selectedCal = Calendar.getInstance()
                selectedCal.set(year, month, dayOfMonth)
                viewModel.updateDate(sdf.format(selectedCal.time))
            },
            calendar.get(Calendar.YEAR),
            calendar.get(Calendar.MONTH),
            calendar.get(Calendar.DAY_OF_MONTH)
        )
    }

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
                            // Printing failure must NEVER block the saved bill
                        }
                    }
                }
            }
            onBillSaved(savedId)
            viewModel.resetSaved()
        }
    }

    // Calculations
    val validLines = state.lines.filter { it.itemName.isNotBlank() && it.itemPrice.toDoubleOrNull() != null }
    val subtotal = validLines.sumOf { (it.itemPrice.toDoubleOrNull() ?: 0.0) * it.quantity }
    val discountAmt = state.discountAmt.toDoubleOrNull() ?: 0.0
    val rawNet = (subtotal - discountAmt).coerceAtLeast(0.0)
    val total = if (roundOff) Math.round(rawNet).toDouble() else rawNet
    val totalItemCount = validLines.sumOf { it.quantity }

    Scaffold(
        containerColor = Color(0xFF0D1117),
        topBar = {
            TopAppBar(
                title = { Text("New Bill", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 20.sp) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = Color.White)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color(0xFF161B22))
            )
        }
    ) { padding ->
        if (!hasStarted) {
            // STEP 1: Enter Customer Name to begin
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(24.dp),
                verticalArrangement = Arrangement.Center,
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text("🧾", fontSize = 56.sp)
                Spacer(Modifier.height(16.dp))
                Text("Start New Bill", color = Color.White, fontSize = 22.sp, fontWeight = FontWeight.Bold)
                Text("Enter customer name to proceed", color = Color(0xFF8B949E), fontSize = 14.sp)
                Spacer(Modifier.height(24.dp))

                OutlinedTextField(
                    value = state.customerName,
                    onValueChange = viewModel::updateCustomer,
                    label = { Text("Customer Name *", color = Color(0xFF8B949E)) },
                    placeholder = { Text("e.g. Ramesh", color = Color(0xFF484F58)) },
                    singleLine = true,
                    colors = fieldColors(),
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(8.dp)
                )

                Spacer(Modifier.height(20.dp))

                Button(
                    onClick = { if (state.customerName.isNotBlank()) hasStarted = true },
                    enabled = state.customerName.isNotBlank(),
                    modifier = Modifier.fillMaxWidth().height(50.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF00C9A7)),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text("Continue to Bill →", color = Color.Black, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                }
            }
        } else {
            // STEP 2: The Bill Editor — Exact UI from Web App & Screenshot
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                // Customer & Total Header Banner
                item {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 8.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(
                            "CUSTOMER",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF8B949E),
                            letterSpacing = 1.sp
                        )
                        Spacer(Modifier.height(2.dp))
                        Text(
                            state.customerName.ifBlank { "Customer" },
                            fontSize = 20.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                        Spacer(Modifier.height(4.dp))
                        Text(
                            "₹${String.format(Locale.US, "%.2f", total)}",
                            fontSize = 32.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = Color(0xFF00C9A7)
                        )
                        Text(
                            "$totalItemCount item${if (totalItemCount == 1) "" else "s"}",
                            fontSize = 13.sp,
                            color = Color(0xFF8B949E)
                        )
                    }
                }

                // Billing Date Row Card
                item {
                    Card(
                        colors = CardDefaults.cardColors(containerColor = Color(0xFF161B22)),
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 14.dp, vertical = 10.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text("🗓️", fontSize = 16.sp)
                                Spacer(Modifier.width(8.dp))
                                Text(
                                    "BILLING DATE",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = Color(0xFF8B949E),
                                    letterSpacing = 0.5.sp
                                )
                            }
                            OutlinedButton(
                                onClick = { datePickerDialog.show() },
                                colors = ButtonDefaults.outlinedButtonColors(containerColor = Color(0xFF0D1117)),
                                border = ButtonDefaults.outlinedButtonBorder.copy(
                                    brush = androidx.compose.ui.graphics.SolidColor(Color(0xFF30363D))
                                ),
                                shape = RoundedCornerShape(8.dp),
                                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp)
                            ) {
                                Text(state.billingDate, color = Color.White, fontSize = 13.sp)
                                Spacer(Modifier.width(6.dp))
                                Icon(Icons.Default.CalendarToday, contentDescription = null, tint = Color(0xFF8B949E), modifier = Modifier.size(14.dp))
                            }
                        }
                    }
                }

                // ITEM INPUT CARD (Type or pick an item, frequent chips, price, qty, + Add to Bill)
                item {
                    Card(
                        colors = CardDefaults.cardColors(containerColor = Color(0xFF161B22)),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text(
                                "ITEM NAME",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF8B949E),
                                letterSpacing = 0.5.sp
                            )
                            Spacer(Modifier.height(6.dp))

                            OutlinedTextField(
                                value = formItemName,
                                onValueChange = { formItemName = it },
                                placeholder = { Text("Type or pick an item", color = Color(0xFF484F58), fontSize = 14.sp) },
                                singleLine = true,
                                colors = fieldColors(),
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(8.dp)
                            )

                            // Frequent items chips
                            if (frequentItems.isNotEmpty()) {
                                Spacer(Modifier.height(8.dp))
                                Text("Frequent items", fontSize = 11.sp, color = Color(0xFF8B949E))
                                Spacer(Modifier.height(6.dp))
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .horizontalScroll(rememberScrollState()),
                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    frequentItems.forEach { name ->
                                        Box(
                                            modifier = Modifier
                                                .clip(RoundedCornerShape(8.dp))
                                                .background(Color(0xFF0D1117))
                                                .border(1.dp, Color(0xFF30363D), RoundedCornerShape(8.dp))
                                                .clickable { formItemName = name }
                                                .padding(horizontal = 10.dp, vertical = 6.dp)
                                        ) {
                                            Text(name, color = Color.White, fontSize = 12.sp)
                                        }
                                    }
                                }
                            }

                            Spacer(Modifier.height(14.dp))

                            // Price & Qty row
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(10.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text("PRICE (₹)", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color(0xFF8B949E))
                                    Spacer(Modifier.height(4.dp))
                                    OutlinedTextField(
                                        value = formPrice,
                                        onValueChange = { formPrice = it },
                                        placeholder = { Text("0.00", color = Color(0xFF484F58)) },
                                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                                        singleLine = true,
                                        colors = fieldColors(),
                                        modifier = Modifier.fillMaxWidth(),
                                        shape = RoundedCornerShape(8.dp)
                                    )
                                }

                                Column(modifier = Modifier.width(110.dp)) {
                                    Text("QTY", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color(0xFF8B949E))
                                    Spacer(Modifier.height(4.dp))
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .height(52.dp)
                                            .border(1.dp, Color(0xFF30363D), RoundedCornerShape(8.dp))
                                            .background(Color(0xFF0D1117)),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        IconButton(
                                            onClick = {
                                                val q = (formQty.toIntOrNull() ?: 1) - 1
                                                if (q >= 1) formQty = q.toString()
                                            },
                                            modifier = Modifier.size(32.dp)
                                        ) {
                                            Icon(Icons.Default.Remove, contentDescription = "-", tint = Color(0xFF8B949E), modifier = Modifier.size(16.dp))
                                        }
                                        Text(formQty, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                        IconButton(
                                            onClick = {
                                                val q = (formQty.toIntOrNull() ?: 1) + 1
                                                formQty = q.toString()
                                            },
                                            modifier = Modifier.size(32.dp)
                                        ) {
                                            Icon(Icons.Default.Add, contentDescription = "+", tint = Color(0xFF8B949E), modifier = Modifier.size(16.dp))
                                        }
                                    }
                                }
                            }

                            Spacer(Modifier.height(14.dp))

                            // + Add to Bill Button
                            Button(
                                onClick = {
                                    val name = formItemName.trim()
                                    val price = formPrice.toDoubleOrNull()
                                    val qty = formQty.toIntOrNull() ?: 1
                                    if (name.isNotBlank() && price != null && price > 0) {
                                        val existingIndex = state.lines.indexOfFirst { it.itemName.equals(name, ignoreCase = true) && it.itemPrice == formPrice }
                                        if (existingIndex >= 0) {
                                            val existing = state.lines[existingIndex]
                                            viewModel.updateLine(existingIndex, existing.copy(quantity = existing.quantity + qty))
                                        } else {
                                            // Replace blank line or append
                                            val firstEmpty = state.lines.indexOfFirst { it.itemName.isBlank() }
                                            val newLine = LineItem(itemName = name, itemPrice = formPrice, quantity = qty)
                                            if (firstEmpty >= 0) {
                                                viewModel.updateLine(firstEmpty, newLine)
                                            } else {
                                                viewModel.addLine()
                                                viewModel.updateLine(state.lines.size, newLine)
                                            }
                                        }
                                        formItemName = ""
                                        formPrice = ""
                                        formQty = "1"
                                    }
                                },
                                enabled = formItemName.isNotBlank() && formPrice.toDoubleOrNull() != null && formPrice.toDouble() > 0,
                                modifier = Modifier.fillMaxWidth().height(48.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF00C9A7)),
                                shape = RoundedCornerShape(8.dp)
                            ) {
                                Text("+ Add to Bill", color = Color.Black, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                            }
                        }
                    }
                }

                // CART ITEMS LIST
                itemsIndexed(state.lines.filter { it.itemName.isNotBlank() }) { index, line ->
                    Card(
                        colors = CardDefaults.cardColors(containerColor = Color(0xFF161B22)),
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(line.itemName, fontWeight = FontWeight.Bold, color = Color.White, fontSize = 15.sp)
                                Spacer(Modifier.height(2.dp))
                                Text("₹${line.itemPrice} each", fontSize = 12.sp, color = Color(0xFF8B949E))
                            }

                            // Qty controls
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier
                                    .border(1.dp, Color(0xFF30363D), RoundedCornerShape(6.dp))
                                    .padding(horizontal = 4.dp, vertical = 2.dp)
                            ) {
                                IconButton(
                                    onClick = {
                                        if (line.quantity > 1) {
                                            viewModel.updateLine(index, line.copy(quantity = line.quantity - 1))
                                        } else {
                                            viewModel.removeLine(index)
                                        }
                                    },
                                    modifier = Modifier.size(28.dp)
                                ) {
                                    Icon(Icons.Default.Remove, contentDescription = "-", tint = Color.White, modifier = Modifier.size(14.dp))
                                }
                                Text("${line.quantity}", color = Color.White, fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 6.dp))
                                IconButton(
                                    onClick = { viewModel.updateLine(index, line.copy(quantity = line.quantity + 1)) },
                                    modifier = Modifier.size(28.dp)
                                ) {
                                    Icon(Icons.Default.Add, contentDescription = "+", tint = Color.White, modifier = Modifier.size(14.dp))
                                }
                            }

                            Spacer(Modifier.width(12.dp))

                            val lineTotal = (line.itemPrice.toDoubleOrNull() ?: 0.0) * line.quantity
                            Text("₹${String.format(Locale.US, "%.2f", lineTotal)}", fontWeight = FontWeight.Bold, color = Color.White, fontSize = 15.sp)

                            Spacer(Modifier.width(8.dp))

                            IconButton(
                                onClick = { viewModel.removeLine(index) },
                                modifier = Modifier.size(28.dp)
                            ) {
                                Icon(Icons.Default.Close, contentDescription = "Delete", tint = Color(0xFFFF6B6B), modifier = Modifier.size(18.dp))
                            }
                        }
                    }
                }

                // Subtotal & Discount Card
                if (validLines.isNotEmpty()) {
                    item {
                        Card(
                            colors = CardDefaults.cardColors(containerColor = Color(0xFF161B22)),
                            shape = RoundedCornerShape(10.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text("Subtotal", color = Color(0xFF8B949E), fontSize = 14.sp)
                                    Text("₹${String.format(Locale.US, "%.2f", subtotal)}", color = Color.White, fontSize = 14.sp)
                                }

                                Spacer(Modifier.height(10.dp))

                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text("DISCOUNT (₹)", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFF8B949E))
                                    OutlinedTextField(
                                        value = state.discountAmt,
                                        onValueChange = viewModel::updateDiscountAmt,
                                        placeholder = { Text("0", color = Color(0xFF484F58)) },
                                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                                        singleLine = true,
                                        colors = fieldColors(),
                                        modifier = Modifier.width(90.dp).height(46.dp),
                                        shape = RoundedCornerShape(6.dp)
                                    )
                                }

                                Spacer(Modifier.height(8.dp))

                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    modifier = Modifier.clickable { roundOff = !roundOff }
                                ) {
                                    Checkbox(
                                        checked = roundOff,
                                        onCheckedChange = { roundOff = it },
                                        colors = CheckboxDefaults.colors(
                                            checkedColor = Color(0xFF00C9A7),
                                            checkmarkColor = Color.Black
                                        )
                                    )
                                    Text("Round off to nearest ₹", color = Color(0xFF8B949E), fontSize = 13.sp)
                                }

                                HorizontalDivider(color = Color(0xFF30363D), modifier = Modifier.padding(vertical = 10.dp))

                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text("Total", fontWeight = FontWeight.Bold, color = Color.White, fontSize = 18.sp)
                                    Text("₹${String.format(Locale.US, "%.2f", total)}", fontWeight = FontWeight.Bold, color = Color(0xFF00C9A7), fontSize = 20.sp)
                                }
                            }
                        }
                    }
                }

                if (state.error != null) {
                    item { Text(state.error!!, color = Color(0xFFFF6B6B), fontSize = 13.sp) }
                }

                // 3 ACTION BUTTONS: Save Draft | Save Bill | Save & Print Bill
                item {
                    Column(verticalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            // 1. Save Draft
                            OutlinedButton(
                                onClick = {
                                    isPrintingTriggered = false
                                    viewModel.saveBill(asFinal = false)
                                },
                                enabled = !state.isSaving && validLines.isNotEmpty(),
                                modifier = Modifier.weight(1f).height(48.dp),
                                shape = RoundedCornerShape(8.dp),
                                colors = ButtonDefaults.outlinedButtonColors(containerColor = Color(0xFF161B22)),
                                border = ButtonDefaults.outlinedButtonBorder.copy(
                                    brush = androidx.compose.ui.graphics.SolidColor(Color(0xFF30363D))
                                )
                            ) {
                                Text("💾 Save Draft", color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.Medium)
                            }

                            // 2. Save Bill (Final, No Print)
                            Button(
                                onClick = {
                                    isPrintingTriggered = false
                                    viewModel.saveBill(asFinal = true)
                                },
                                enabled = !state.isSaving && validLines.isNotEmpty(),
                                modifier = Modifier.weight(1f).height(48.dp),
                                shape = RoundedCornerShape(8.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF21262D))
                            ) {
                                Text("✅ Save Bill", color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                            }
                        }

                        // 3. Save & Print Bill (Final + Auto Print)
                        Button(
                            onClick = {
                                isPrintingTriggered = true
                                viewModel.saveBill(asFinal = true)
                            },
                            enabled = !state.isSaving && validLines.isNotEmpty(),
                            modifier = Modifier.fillMaxWidth().height(50.dp),
                            shape = RoundedCornerShape(8.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF00C9A7))
                        ) {
                            if (state.isSaving && isPrintingTriggered) {
                                CircularProgressIndicator(color = Color.Black, modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                            } else {
                                Text("🖨️ Save & Print Bill", color = Color.Black, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                            }
                        }
                    }
                    Spacer(Modifier.height(24.dp))
                }
            }
        }
    }
}

@Composable
private fun fieldColors() = OutlinedTextFieldDefaults.colors(
    focusedTextColor = Color.White,
    unfocusedTextColor = Color.White,
    focusedBorderColor = Color(0xFF00C9A7),
    unfocusedBorderColor = Color(0xFF30363D),
    focusedContainerColor = Color(0xFF0D1117),
    unfocusedContainerColor = Color(0xFF0D1117),
    cursorColor = Color(0xFF00C9A7)
)
