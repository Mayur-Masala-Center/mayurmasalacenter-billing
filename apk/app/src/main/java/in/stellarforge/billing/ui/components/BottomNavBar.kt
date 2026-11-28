package in.stellarforge.billing.ui.components

import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.graphics.Color
import androidx.navigation.NavController
import androidx.navigation.compose.currentBackStackEntryAsState
import in.stellarforge.billing.ui.navigation.Routes

data class NavItem(val route: String, val label: String, val icon: String)

private val navItems = listOf(
    NavItem(Routes.HOME, "Home", "🏠"),
    NavItem(Routes.ITEMS, "Items", "📦"),
    NavItem(Routes.NEW_BILL, "New Bill", "🧾"),
    NavItem(Routes.PRINTER_SETUP, "Printer", "🖨️"),
    NavItem(Routes.DASHBOARD, "Dashboard", "📊"),
)

private val hiddenRoutes = setOf(Routes.LOGIN, Routes.NEW_BILL, "bill_detail", Routes.DEBUG_LOG)

@Composable
fun BottomNavBar(navController: NavController) {
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route ?: ""

    if (hiddenRoutes.any { currentRoute.startsWith(it) }) return

    NavigationBar(
        containerColor = Color(0xFF161B22),
        contentColor = Color(0xFF00C9A7)
    ) {
        navItems.forEach { item ->
            val selected = currentRoute == item.route
            NavigationBarItem(
                selected = selected,
                onClick = {
                    if (!selected) {
                        navController.navigate(item.route) {
                            popUpTo(Routes.HOME) { saveState = true }
                            launchSingleTop = true
                            restoreState = true
                        }
                    }
                },
                icon = { Text(item.icon) },
                label = { Text(item.label, color = if (selected) Color(0xFF00C9A7) else Color(0xFF8B949E)) },
                colors = NavigationBarItemDefaults.colors(
                    selectedIndicatorColor = Color(0xFF00C9A7).copy(alpha = 0.15f)
                )
            )
        }
    }
}
