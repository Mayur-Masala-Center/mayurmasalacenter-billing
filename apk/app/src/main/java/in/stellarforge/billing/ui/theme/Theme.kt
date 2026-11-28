package `in`.stellarforge.billing.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val DarkColorScheme = darkColorScheme(
    primary = Color(0xFF00C9A7),
    onPrimary = Color(0xFF00201A),
    primaryContainer = Color(0xFF003729),
    secondary = Color(0xFFFFB300),
    background = Color(0xFF0D1117),
    surface = Color(0xFF161B22),
    onBackground = Color(0xFFE6EDF3),
    onSurface = Color(0xFFE6EDF3),
)

private val LightColorScheme = lightColorScheme(
    primary = Color(0xFF006B56),
    onPrimary = Color(0xFFFFFFFF),
    primaryContainer = Color(0xFF89F7D8),
    secondary = Color(0xFFFF8F00),
    background = Color(0xFFF6F8FA),
    surface = Color(0xFFFFFFFF),
    onBackground = Color(0xFF1F2328),
    onSurface = Color(0xFF1F2328),
)

@Composable
fun StellarForgeBillingTheme(
    darkTheme: Boolean = true, // default dark to match web app
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme
    MaterialTheme(
        colorScheme = colorScheme,
        content = content
    )
}
