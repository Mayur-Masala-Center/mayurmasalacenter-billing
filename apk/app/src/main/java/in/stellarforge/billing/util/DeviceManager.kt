package `in`.stellarforge.billing.util

import android.content.Context
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class DeviceManager @Inject constructor(
    private val context: Context
) {
    private val prefs = context.getSharedPreferences("app_device_prefs", Context.MODE_PRIVATE)

    val deviceId: String
        get() {
            var id = prefs.getString("unique_device_id", null)
            if (id.isNullOrBlank()) {
                id = UUID.randomUUID().toString()
                prefs.edit().putString("unique_device_id", id).apply()
            }
            return id
        }

    /**
     * Short 4-character uppercase alphanumeric prefix for offline bill numbering
     * e.g., device UUID "e7a3b4c1-..." -> "E7A3"
     * Guaranteeing zero collisions across devices when offline.
     */
    val devicePrefix: String
        get() = deviceId.replace("-", "").take(4).uppercase()
}
