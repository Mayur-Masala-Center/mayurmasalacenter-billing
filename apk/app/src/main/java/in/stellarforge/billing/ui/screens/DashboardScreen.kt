package in.stellarforge.billing.ui.screens

import android.content.Intent
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Download
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
import in.stellarforge.billing.auth.AppUser
import in.stellarforge.billing.sync.SyncScheduler
import in.stellarforge.billing.ui.viewmodels.BillViewModel
import in.stellarforge.billing.util.BillUtils

@Composable
fun DashboardScreen(
    currentUser: AppUser,
    onNavigateToDebugLog: () -> Unit = {},
    viewModel: BillViewModel = hiltViewModel()
) {
    val context = LocalContext.current

    if (!currentUser.isOwner) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text("🔒", fontSize = 48.sp)
                Spacer(Modifier.height(8.dp))
                Text("Access restricted.", color = Color.White, fontWeight = FontWeight.SemiBold)
                Text("Contact your owner.", color = Color(0xFF8B949E))
            }
        }
        return
    }

    val bills by viewModel.allBills.collectAsState()
    val today = BillUtils.todayIST()
    val todayFinal = bills.filter { it.status == "final" && (it.billingDate == today || it.billingDate == null) }
    val todayTotal = todayFinal.sumOf { it.totalAmount }
    var upiEnabled by remember { mutableStateOf(false) }
    var upiId by remember { mutableStateOf("") }
    var payeeName by remember { mutableStateOf("") }
    var lastSynced by remember { mutableStateOf("Ready") }

    Scaffold(containerColor = Color(0xFF0D1117)) { padding ->
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(padding).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            item { Text("Dashboard", fontSize = 22.sp, fontWeight = FontWeight.Bold, color = Color.White) }

            item {
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    StatCard(label = "Today's Sales", value = "₹${String.format("%.0f", todayTotal)}", modifier = Modifier.weight(1f))
                    StatCard(label = "Bills Today", value = "${todayFinal.size}", modifier = Modifier.weight(1f))
                }
            }

            // Sync Status
            item {
                Card(colors = CardDefaults.cardColors(containerColor = Color(0xFF161B22))) {
                    Row(modifier = Modifier.padding(16.dp).fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text("Sync Status", fontWeight = FontWeight.SemiBold, color = Color.White)
                            Text("Last synced: $lastSynced", fontSize = 12.sp, color = Color(0xFF8B949E))
                        }
                        Button(
                            onClick = { SyncScheduler.enqueueImmediate(context); lastSynced = "Syncing..." },
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF00C9A7))
                        ) { Text("Sync Now", color = Color.Black) }
                    }
                }
            }

            // Export My Data Card
            item {
                Card(colors = CardDefaults.cardColors(containerColor = Color(0xFF161B22))) {
                    Row(modifier = Modifier.padding(16.dp).fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text("Export My Data", fontWeight = FontWeight.SemiBold, color = Color.White)
                            Text("Download Excel / CSV of all bills", fontSize = 12.sp, color = Color(0xFF8B949E))
                        }
                        Button(
                            onClick = {
                                val csv = BillUtils.billsToCsv(bills)
                                val intent = Intent(Intent.ACTION_SEND).apply {
                                    type = "text/csv"
                                    putExtra(Intent.EXTRA_SUBJECT, "Mayur_Masala_Bills.csv")
                                    putExtra(Intent.EXTRA_TEXT, csv)
                                }
                                context.startActivity(Intent.createChooser(intent, "Export Bills (Excel / CSV)"))
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF00C9A7))
                        ) {
                            Icon(Icons.Default.Download, contentDescription = null, tint = Color.Black, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(4.dp))
                            Text("Export", color = Color.Black)
                        }
                    }
                }
            }

            // UPI QR Settings
            item {
                Card(colors = CardDefaults.cardColors(containerColor = Color(0xFF161B22))) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Text("UPI QR Settings", fontWeight = FontWeight.SemiBold, color = Color.White)
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text("Enable UPI QR on receipt", color = Color(0xFF8B949E), modifier = Modifier.weight(1f))
                            Switch(checked = upiEnabled, onCheckedChange = { upiEnabled = it },
                                colors = SwitchDefaults.colors(checkedThumbColor = Color(0xFF00C9A7), checkedTrackColor = Color(0xFF00C9A7).copy(alpha = 0.3f)))
                        }
                        if (upiEnabled) {
                            OutlinedTextField(
                                value = upiId, onValueChange = { upiId = it },
                                label = { Text("UPI ID", color = Color(0xFF8B949E)) }, singleLine = true,
                                colors = OutlinedTextFieldDefaults.colors(focusedTextColor = Color.White, unfocusedTextColor = Color.White, focusedBorderColor = Color(0xFF00C9A7), unfocusedBorderColor = Color(0xFF30363D)),
                                modifier = Modifier.fillMaxWidth()
                            )
                            OutlinedTextField(
                                value = payeeName, onValueChange = { payeeName = it },
                                label = { Text("Payee Name", color = Color(0xFF8B949E)) }, singleLine = true,
                                colors = OutlinedTextFieldDefaults.colors(focusedTextColor = Color.White, unfocusedTextColor = Color.White, focusedBorderColor = Color(0xFF00C9A7), unfocusedBorderColor = Color(0xFF30363D)),
                                modifier = Modifier.fillMaxWidth()
                            )
                            Button(
                                onClick = { viewModel.saveUpiConfig(upiEnabled, upiId, payeeName) },
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF00C9A7)),
                                modifier = Modifier.fillMaxWidth()
                            ) { Text("Save UPI Settings", color = Color.Black) }
                        }
                    }
                }
            }

            item {
                TextButton(onClick = onNavigateToDebugLog) {
                    Text("🐛 View Debug Log", color = Color(0xFF8B949E), fontSize = 13.sp)
                }
            }
        }
    }
}

@Composable
private fun StatCard(label: String, value: String, modifier: Modifier = Modifier) {
    Card(modifier = modifier, colors = CardDefaults.cardColors(containerColor = Color(0xFF161B22))) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(label, fontSize = 12.sp, color = Color(0xFF8B949E))
            Spacer(Modifier.height(4.dp))
            Text(value, fontSize = 22.sp, fontWeight = FontWeight.Bold, color = Color(0xFF00C9A7))
        }
    }
}
