package `in`.stellarforge.billing.auth

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import javax.inject.Inject
import javax.inject.Singleton

val OWNER_EMAILS = setOf(
    "wanisanjay619@gmail.com",
    "prasadbhavsar7777@gmail.com"
)

data class AppUser(
    val email: String,
    val displayName: String,
    val isOwner: Boolean
)

sealed class AuthState {
    object Loading : AuthState()
    data class Authenticated(val user: AppUser) : AuthState()
    object Unauthenticated : AuthState()
}

@Singleton
class AuthManager @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private val masterKey = MasterKey.Builder(context)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build()

    private val prefs = EncryptedSharedPreferences.create(
        context,
        "billing_secure_prefs",
        masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )

    private val _authState = MutableStateFlow<AuthState>(AuthState.Loading)
    val authState: StateFlow<AuthState> = _authState

    init {
        val savedEmail = prefs.getString("user_email", null)
        val savedToken = prefs.getString("access_token", null)
        if (savedEmail != null && savedToken != null) {
            _authState.value = AuthState.Authenticated(buildUser(savedEmail))
        } else {
            _authState.value = AuthState.Unauthenticated
        }
    }

    fun getAccessToken(): String? = prefs.getString("access_token", null)
    fun getRefreshToken(): String? = prefs.getString("refresh_token", null)
    fun getCurrentEmail(): String? = prefs.getString("user_email", null)

    fun saveSession(email: String, accessToken: String, refreshToken: String = "") {
        prefs.edit()
            .putString("user_email", email)
            .putString("access_token", accessToken)
            .putString("refresh_token", refreshToken)
            .apply()
        _authState.value = AuthState.Authenticated(buildUser(email))
    }

    fun signOut() {
        prefs.edit().clear().apply()
        _authState.value = AuthState.Unauthenticated
    }

    fun isOwner(email: String) = OWNER_EMAILS.contains(email.lowercase())

    private fun buildUser(email: String) = AppUser(
        email = email,
        displayName = email.substringBefore("@"),
        isOwner = isOwner(email)
    )
}
