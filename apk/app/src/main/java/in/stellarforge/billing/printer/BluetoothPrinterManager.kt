package `in`.stellarforge.billing.printer

import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothManager
import android.content.Context
import android.graphics.BitmapFactory
import dagger.hilt.android.qualifiers.ApplicationContext
import `in`.stellarforge.billing.data.dao.ShopSettingDao
import `in`.stellarforge.billing.data.model.Bill
import `in`.stellarforge.billing.data.model.BillItem
import `in`.stellarforge.billing.sync.DebugLog
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.withContext
import java.io.IOException
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

sealed class PrintState {
    object Idle : PrintState()
    object Connecting : PrintState()
    object Printing : PrintState()
    object Done : PrintState()
    data class Error(val message: String) : PrintState()
}

@Singleton
class BluetoothPrinterManager @Inject constructor(
    @ApplicationContext private val context: Context,
    private val shopSettingDao: ShopSettingDao
) {
    private val SPP_UUID: UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FD")
    private val prefs = context.getSharedPreferences("printer_prefs", Context.MODE_PRIVATE)

    private val _printState = MutableStateFlow<PrintState>(PrintState.Idle)
    val printState: StateFlow<PrintState> = _printState

    fun getSavedPrinterMac(): String? = prefs.getString("printer_mac", null)
    fun savePrinterMac(mac: String) = prefs.edit().putString("printer_mac", mac).apply()
    fun getSavedPaperWidth(): Int = prefs.getString("paper_width", "80")?.toIntOrNull() ?: 80

    fun getPairedPrinters(): List<BluetoothDevice> {
        return try {
            val btManager = context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
            btManager?.adapter?.bondedDevices?.toList() ?: emptyList()
        } catch (e: SecurityException) {
            DebugLog.log("BT", "Permission denied reading paired devices")
            emptyList()
        }
    }

    suspend fun print(bill: Bill, items: List<BillItem>, upiConfig: UpiConfig? = null) {
        val width = getSavedPaperWidth()
        val builder = EscPosBuilder(paperWidthMm = width)

        // Resolve UPI config from DB if not provided
        val activeUpi = upiConfig ?: run {
            val setting = shopSettingDao.getSettingByKey("upi_config")
            if (setting != null) UpiConfig.fromJson(setting.valueJson) else null
        }

        val logoBitmap = try {
            context.assets.open("logo_small.jpg").use { BitmapFactory.decodeStream(it) }
        } catch (e: Exception) { null }

        val bytes = builder.buildReceipt(bill, items, activeUpi, logoBitmap)
        logoBitmap?.recycle()

        sendBytesToPrinter(bytes)
    }

    suspend fun testPrint() {
        val width = getSavedPaperWidth()
        val builder = EscPosBuilder(paperWidthMm = width)
        builder.reset()
        builder.align(1)
        builder.bold(true); builder.text("Mayur Masala Billing"); builder.bold(false)
        builder.text("by Stellar Forge")
        builder.separator(dashed = false)

        builder.textAsBitmap("म्यूर मसाला व पूजा भांडार", textSizeSp = 22f, bold = true)
        builder.text("Testing 58mm/80mm ESC/POS OK")
        builder.separator(dashed = true)

        val activeUpi = run {
            val setting = shopSettingDao.getSettingByKey("upi_config")
            if (setting != null) UpiConfig.fromJson(setting.valueJson) else null
        }
        val testUpi = activeUpi?.upiUri(1.0, "TestPrint") 
            ?: "upi://pay?pa=mayurmasala@upi&pn=MayurMasala&am=1.00&cu=INR&tn=TestPrint"
            
        builder.qrCodeFromUri(testUpi, sizePx = if (width == 58) 180 else 240)
        builder.text("UPI Scan Test OK")
        builder.separator(dashed = false)

        builder.feed(3)
        builder.cut()

        sendBytesToPrinter(builder.build())
    }

    private suspend fun sendBytesToPrinter(bytes: ByteArray) {
        withContext(Dispatchers.IO) {
            val mac = getSavedPrinterMac()
            if (mac.isNullOrBlank()) {
                _printState.value = PrintState.Error("No printer selected. Please select a printer in Printer Setup.")
                return@withContext
            }

            _printState.value = PrintState.Connecting
            DebugLog.log("BT", "Connecting to printer $mac")

            val btManager = context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
            val adapter: BluetoothAdapter = btManager?.adapter ?: run {
                _printState.value = PrintState.Error("Bluetooth adapter not available on this device.")
                return@withContext
            }

            if (!adapter.isEnabled) {
                _printState.value = PrintState.Error("Bluetooth is turned off. Please turn on Bluetooth.")
                return@withContext
            }

            val device: BluetoothDevice = try {
                adapter.getRemoteDevice(mac)
            } catch (e: Exception) {
                _printState.value = PrintState.Error("Invalid printer address. Re-select device in Printer Setup.")
                return@withContext
            }

            val socket = try {
                device.createRfcommSocketToServiceRecord(SPP_UUID)
            } catch (e: SecurityException) {
                _printState.value = PrintState.Error("Bluetooth permission denied. Grant permission in Settings.")
                return@withContext
            } catch (e: IOException) {
                _printState.value = PrintState.Error("Could not create Bluetooth RFCOMM socket.")
                return@withContext
            }

            try {
                try { adapter.cancelDiscovery() } catch (_: SecurityException) {}

                socket.connect()
                _printState.value = PrintState.Printing
                DebugLog.log("BT", "Connected. Transmitting ${bytes.size} bytes...")

                val stream = socket.outputStream
                var offset = 0
                while (offset < bytes.size) {
                    val chunkSize = minOf(512, bytes.size - offset)
                    stream.write(bytes, offset, chunkSize)
                    stream.flush()
                    offset += chunkSize
                    Thread.sleep(40)
                }

                _printState.value = PrintState.Done
                DebugLog.log("BT", "Print completed successfully (${bytes.size} bytes sent)")

            } catch (e: SecurityException) {
                val msg = "Bluetooth permission denied."
                DebugLog.log("BT", msg)
                _printState.value = PrintState.Error(msg)
            } catch (e: IOException) {
                val msg = when {
                    e.message?.contains("refused", ignoreCase = true) == true -> "Printer refused connection. Is it powered on and in range?"
                    e.message?.contains("timeout", ignoreCase = true) == true -> "Connection timed out. Check printer power."
                    e.message?.contains("broken pipe", ignoreCase = true) == true -> "Connection lost mid-print."
                    else -> "Printer error: ${e.message ?: "Failed to connect"}"
                }
                DebugLog.log("BT", msg)
                _printState.value = PrintState.Error(msg)
            } finally {
                try { socket.close() } catch (_: IOException) {}
            }
        }
    }
}
