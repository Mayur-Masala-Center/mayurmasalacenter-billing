package `in`.stellarforge.billing.ui.viewmodels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import `in`.stellarforge.billing.auth.AuthManager
import `in`.stellarforge.billing.auth.AuthState
import `in`.stellarforge.billing.network.SupabaseClientWrapper
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class LoginUiState(
    val isLoading: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val authManager: AuthManager,
    private val supabase: SupabaseClientWrapper
) : ViewModel() {

    val authState: StateFlow<AuthState> = authManager.authState

    private val _loginState = MutableStateFlow(LoginUiState())
    val loginState: StateFlow<LoginUiState> = _loginState

    fun signIn(email: String, password: String, onSuccess: () -> Unit) {
        viewModelScope.launch {
            _loginState.value = LoginUiState(isLoading = true)
            val result = supabase.signIn(email.trim(), password)
            if (result.isSuccess) {
                _loginState.value = LoginUiState()
                onSuccess()
            } else {
                _loginState.value = LoginUiState(
                    error = result.exceptionOrNull()?.message ?: "Sign-in failed. Check credentials."
                )
            }
        }
    }

    fun signOut() {
        viewModelScope.launch { supabase.signOut() }
    }
}
