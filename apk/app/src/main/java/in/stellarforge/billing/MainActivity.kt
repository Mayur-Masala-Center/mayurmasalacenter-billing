package in.stellarforge.billing

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.navigation.compose.rememberNavController
import dagger.hilt.android.AndroidEntryPoint
import in.stellarforge.billing.auth.AuthState
import in.stellarforge.billing.printer.BluetoothPrinterManager
import in.stellarforge.billing.ui.components.BottomNavBar
import in.stellarforge.billing.ui.navigation.BillingNavGraph
import in.stellarforge.billing.ui.theme.StellarForgeBillingTheme
import in.stellarforge.billing.ui.viewmodels.AuthViewModel
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    private val authViewModel: AuthViewModel by viewModels()
    @Inject lateinit var printerManager: BluetoothPrinterManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            StellarForgeBillingTheme {
                val authState by authViewModel.authState.collectAsState()
                val navController = rememberNavController()

                Scaffold(
                    bottomBar = { BottomNavBar(navController) }
                ) { innerPadding ->
                    BillingNavGraph(
                        navController = navController,
                        authState = authState,
                        printerManager = printerManager,
                        modifier = Modifier.padding(innerPadding)
                    )
                }
            }
        }
    }
}
