package `in`.stellarforge.billing.ui.navigation

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.navArgument
import `in`.stellarforge.billing.auth.AuthState
import `in`.stellarforge.billing.printer.BluetoothPrinterManager
import `in`.stellarforge.billing.ui.screens.*

object Routes {
    const val LOGIN = "login"
    const val HOME = "home"
    const val ITEMS = "items"
    const val NEW_BILL = "new_bill"
    const val BILL_DETAIL = "bill_detail/{billId}"
    const val DASHBOARD = "dashboard"
    const val PRINTER_SETUP = "printer_setup"
    const val DEBUG_LOG = "debug_log"

    fun billDetail(billId: String) = "bill_detail/$billId"
}

@Composable
fun BillingNavGraph(
    navController: NavHostController,
    authState: AuthState,
    printerManager: BluetoothPrinterManager? = null,
    modifier: Modifier = Modifier
) {
    val startDestination = when (authState) {
        is AuthState.Authenticated -> Routes.HOME
        else -> Routes.LOGIN
    }

    NavHost(
        navController = navController,
        startDestination = startDestination,
        modifier = modifier
    ) {
        composable(Routes.LOGIN) {
            LoginScreen(
                onLoginSuccess = {
                    navController.navigate(Routes.HOME) {
                        popUpTo(Routes.LOGIN) { inclusive = true }
                    }
                }
            )
        }
        composable(Routes.HOME) {
            if (authState !is AuthState.Authenticated) {
                navController.navigate(Routes.LOGIN) { popUpTo(0) { inclusive = true } }
                return@composable
            }
            HomeScreen(
                onBillClick = { billId -> navController.navigate(Routes.billDetail(billId)) },
                onNewBill = { navController.navigate(Routes.NEW_BILL) },
                printerManager = printerManager
            )
        }
        composable(Routes.ITEMS) {
            if (authState !is AuthState.Authenticated) {
                navController.navigate(Routes.LOGIN) { popUpTo(0) { inclusive = true } }
                return@composable
            }
            ItemsScreen()
        }
        composable(Routes.NEW_BILL) {
            if (authState !is AuthState.Authenticated) {
                navController.navigate(Routes.LOGIN) { popUpTo(0) { inclusive = true } }
                return@composable
            }
            NewBillScreen(
                onBillSaved = { billId ->
                    navController.navigate(Routes.billDetail(billId)) {
                        popUpTo(Routes.HOME)
                    }
                },
                onBack = { navController.popBackStack() },
                printerManager = printerManager
            )
        }
        composable(
            route = Routes.BILL_DETAIL,
            arguments = listOf(navArgument("billId") { type = NavType.StringType })
        ) { backStackEntry ->
            if (authState !is AuthState.Authenticated) {
                navController.navigate(Routes.LOGIN) { popUpTo(0) { inclusive = true } }
                return@composable
            }
            val billId = backStackEntry.arguments?.getString("billId") ?: return@composable
            BillDetailScreen(
                billId = billId,
                onBack = { navController.popBackStack() },
                printerManager = printerManager
            )
        }
        composable(Routes.DASHBOARD) {
            if (authState !is AuthState.Authenticated) {
                navController.navigate(Routes.LOGIN) { popUpTo(0) { inclusive = true } }
                return@composable
            }
            DashboardScreen(
                currentUser = (authState as AuthState.Authenticated).user,
                onNavigateToDebugLog = { navController.navigate(Routes.DEBUG_LOG) }
            )
        }
        composable(Routes.PRINTER_SETUP) {
            PrinterSetupScreen(
                onBack = { navController.popBackStack() },
                printerManager = printerManager
            )
        }
        composable(Routes.DEBUG_LOG) {
            DebugLogScreen(onBack = { navController.popBackStack() })
        }
    }
}
