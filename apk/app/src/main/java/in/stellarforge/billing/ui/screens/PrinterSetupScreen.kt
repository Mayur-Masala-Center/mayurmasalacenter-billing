package in.stellarforge.billing.ui.screens

import android.Manifest
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothManager
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import in.stellarforge.billing.printer.BluetoothPrinterManager
import in.stellarforge.billing.printer.PrintState
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PrinterSetupScreen(
    onBack: () -> Unit,
    printerManager: BluetoothPrinterManager? = null
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    var hasPermission by remember { mutableStateOf(checkBluetoothPermission(context)) }
    var selectedMac by remember { mutableStateOf(printerManager?.getSavedPrinterMac()) }
    var paperWidth by remember { mutableStateOf(printerManager?.getSavedPaperWidth()?.toString() ?: "80") }
    val printState by (printerManager?.printState ?: remember { mutableStateOf(PrintState.Idle) }).collectAsState()

    val permLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { perms ->
        hasPermission = perms.values.all { it }
    }

    Scaffold(
        containerColor = Color(0xFF0D1117),
        topBar = {
            TopAppBar(
                title = { Text("Printer Setup", color = Color.White, fontWeight = FontWeight.Bold) },
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.Default.ArrowBack, null, tint = Color.White) } },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color(0xFF161B22))
            )
        }
    ) { padding ->
        LazyColumn(modifier = Modifier.fillMaxSize().padding(padding).padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {

            // Print status message
            item {
                when (val state = printState) {
                    is PrintState.Connecting -> Text("⏳ Connecting to printer...", color = Color(0xFF00C9A7), fontSize = 13.sp)
                    is PrintState.Printing -> Text("🖨️ Printing...", color = Color(0xFF00C9A7), fontSize = 13.sp)
                    is PrintState.Done -> Text("✅ Print completed successfully!", color = Color(0xFF00C9A7), fontSize = 13.sp)
                    is PrintState.Error -> {
                        Card(colors = CardDefaults.cardColors(containerColor = Color(0xFFFF6B6B).copy(alpha = 0.15f))) {
                            Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                                Text("⚠️ ${state.message}", color = Color(0xFFFF6B6B), fontSize = 13.sp, modifier = Modifier.weight(1f))
                                Button(
                                    onClick = { coroutineScope.launch { printerManager?.testPrint() } },
                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFFF6B6B))
                                ) { Text("Retry", color = Color.White, fontSize = 12.sp) }
                            }
                        }
                    }
                    else -> {}
                }
            }

            if (!hasPermission) {
                item {
                    Card(colors = CardDefaults.cardColors(containerColor = Color(0xFF161B22))) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text("Bluetooth Permission Required", fontWeight = FontWeight.SemiBold, color = Color.White)
                            Spacer(Modifier.height(8.dp))
                            Text("This app needs Bluetooth permission to discover and connect to your thermal printer directly without third-party bridges.", color = Color(0xFF8B949E), fontSize = 13.sp)
                            Spacer(Modifier.height(12.dp))
                            Button(
                                onClick = {
                                    val perms = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                                        arrayOf(Manifest.permission.BLUETOOTH_CONNECT, Manifest.permission.BLUETOOTH_SCAN)
                                    } else {
                                        arrayOf(Manifest.permission.BLUETOOTH, Manifest.permission.BLUETOOTH_ADMIN)
                                    }
                                    permLauncher.launch(perms)
                                },
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF00C9A7))
                            ) { Text("Grant Permission", color = Color.Black) }
                        }
                    }
                }
            } else {
                val pairedDevices = printerManager?.getPairedPrinters() ?: emptyList()

                item { Text("Paired Bluetooth Thermal Printers", fontWeight = FontWeight.SemiBold, color = Color.White) }

                if (pairedDevices.isEmpty()) {
                    item { Text("No paired devices found. Pair your printer in phone's Android Bluetooth Settings first.", color = Color(0xFF8B949E), fontSize = 13.sp) }
                } else {
                    items(pairedDevices) { device ->
                        val name = try { device.name ?: "Unknown Printer" } catch (e: SecurityException) { "Unknown Printer" }
                        val mac = try { device.address } catch (e: SecurityException) { "" }
                        val isSelected = mac == selectedMac
                        Card(colors = CardDefaults.cardColors(containerColor = if (isSelected) Color(0xFF00C9A7).copy(alpha = 0.1f) else Color(0xFF161B22))) {
                            Row(modifier = Modifier.padding(16.dp).fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(name, color = Color.White, fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal)
                                    Text(mac, color = Color(0xFF8B949E), fontSize = 12.sp)
                                }
                                if (isSelected) {
                                    Icon(Icons.Default.CheckCircle, null, tint = Color(0xFF00C9A7))
                                } else {
                                    OutlinedButton(onClick = {
                                        selectedMac = mac
                                        printerManager?.savePrinterMac(mac)
                                    }) { Text("Select", color = Color(0xFF00C9A7)) }
                                }
                            }
                        }
                    }
                }

                item {
                    Card(colors = CardDefaults.cardColors(containerColor = Color(0xFF161B22))) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text("Thermal Paper Width", fontWeight = FontWeight.SemiBold, color = Color.White)
                            Spacer(Modifier.height(8.dp))
                            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                listOf("58", "80").forEach { w ->
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        RadioButton(
                                            selected = paperWidth == w,
                                            onClick = {
                                                paperWidth = w
                                                context.getSharedPreferences("printer_prefs", Context.MODE_PRIVATE)
                                                    .edit().putString("paper_width", w).apply()
                                            },
                                            colors = RadioButtonDefaults.colors(selectedColor = Color(0xFF00C9A7))
                                        )
                                        Text("${w}mm (3-inch)" .takeIf { w == "80" } ?: "58mm (2-inch)", color = Color.White)
                                    }
                                }
                            }
                        }
                    }
                }

                item {
                    Button(
                        onClick = {
                            coroutineScope.launch {
                                printerManager?.testPrint()
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF00C9A7)),
                        modifier = Modifier.fillMaxWidth().height(48.dp)
                    ) { Text("🖨️ Send Real Test Print", color = Color.Black, fontWeight = FontWeight.Bold) }
                }
            }
        }
    }
}

private fun checkBluetoothPermission(context: Context): Boolean {
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        ContextCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED
    } else {
        ContextCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH) == PackageManager.PERMISSION_GRANTED
    }
}
