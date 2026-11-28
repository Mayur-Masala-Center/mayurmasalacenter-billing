package `in`.stellarforge.billing.sync

import java.text.SimpleDateFormat
import java.util.*

object DebugLog {
    private val buffer = ArrayDeque<String>(500)
    private val sdf = SimpleDateFormat("HH:mm:ss", Locale.US)
    // Regex to strip anything that looks like an email (privacy guard)
    private val emailRegex = Regex("[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}")

    @Synchronized
    fun log(tag: String, message: String) {
        val clean = emailRegex.replace(message, "[user]")
        val entry = "[${sdf.format(Date())}] [$tag] $clean"
        if (buffer.size >= 500) buffer.removeFirst()
        buffer.addLast(entry)
    }

    @Synchronized fun export(): String = buffer.joinToString("\n")
    @Synchronized fun getAll(): List<String> = buffer.toList()
    @Synchronized fun clear() = buffer.clear()
}
