package `in`.stellarforge.billing.network

import `in`.stellarforge.billing.BuildConfig
import `in`.stellarforge.billing.auth.AuthManager
import `in`.stellarforge.billing.sync.DebugLog
import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.auth.Auth
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.auth.providers.builtin.Email
import io.github.jan.supabase.auth.user.UserSession
import io.github.jan.supabase.postgrest.Postgrest
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.query.Order
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.json.JsonObject
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SupabaseClientWrapper @Inject constructor(
    private val authManager: AuthManager
) {
    val client = createSupabaseClient(
        supabaseUrl = BuildConfig.SUPABASE_URL,
        supabaseKey = BuildConfig.SUPABASE_ANON_KEY
    ) {
        install(Auth)
        install(Postgrest)
    }

    init {
        // Restore saved JWT session so RLS-protected API calls succeed after app restart
        val accessToken = authManager.getAccessToken()
        val refreshToken = authManager.getRefreshToken()
        if (!accessToken.isNullOrBlank() && !refreshToken.isNullOrBlank()) {
            try {
                runBlocking {
                    client.auth.importSession(
                        UserSession(
                            accessToken = accessToken,
                            refreshToken = refreshToken,
                            expiresIn = 3600,
                            tokenType = "bearer",
                            user = null
                        )
                    )
                    DebugLog.log("Auth", "Session restored from encrypted prefs")
                }
            } catch (e: Exception) {
                DebugLog.log("Auth", "Session restore failed: ${e.message}")
            }
        }
    }

    suspend fun signIn(email: String, password: String): Result<Unit> {
        return try {
            client.auth.signInWith(Email) {
                this.email = email
                this.password = password
            }
            val session = client.auth.currentSessionOrNull()
            val userEmail = session?.user?.email ?: email
            val accessToken = session?.accessToken ?: ""
            val refreshToken = session?.refreshToken ?: ""
            authManager.saveSession(userEmail, accessToken, refreshToken)
            DebugLog.log("Auth", "Sign-in successful")
            Result.success(Unit)
        } catch (e: Exception) {
            DebugLog.log("Auth", "Sign-in failed: ${e.message}")
            Result.failure(e)
        }
    }

    suspend fun signOut() {
        try {
            client.auth.signOut()
        } catch (e: Exception) {
            DebugLog.log("Auth", "Sign-out error: ${e.message}")
        }
        authManager.signOut()
    }

    suspend fun upsertRow(tableName: String, payloadJson: String): Result<Unit> {
        return try {
            client.postgrest[tableName].upsert(kotlinx.serialization.json.Json.parseToJsonElement(payloadJson))
            Result.success(Unit)
        } catch (e: Exception) {
            DebugLog.log("Sync", "Upsert failed on $tableName: ${e.message}")
            Result.failure(e)
        }
    }

    /**
     * Paged fetch with order by updated_at ASC, and primary key ASC to handle pagination ties safely.
     * For store_settings, the primary key column is "key", for all other tables it is "id".
     */
    suspend fun fetchRowsSince(tableName: String, since: Long, pageSize: Long = 100): Result<List<JsonObject>> {
        return try {
            val isoSince = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.US).apply {
                timeZone = java.util.TimeZone.getTimeZone("UTC")
            }.format(java.util.Date(since))

            val pkColumn = if (tableName == "store_settings") "key" else "id"

            val result = client.postgrest[tableName].select {
                filter { gte("updated_at", isoSince) }
                order(column = "updated_at", order = Order.ASCENDING)
                order(column = pkColumn, order = Order.ASCENDING)
                limit(count = pageSize)
            }.decodeList<JsonObject>()
            Result.success(result)
        } catch (e: Exception) {
            DebugLog.log("Sync", "Fetch failed on $tableName: ${e.message}")
            Result.failure(e)
        }
    }
}
