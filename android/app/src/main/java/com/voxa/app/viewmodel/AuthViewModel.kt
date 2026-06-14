package com.voxa.app.viewmodel

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.voxa.app.data.api.ApiClient
import com.voxa.app.data.api.SocketClient
import com.voxa.app.data.model.User
import com.voxa.app.dataStore
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

private val TOKEN_KEY = stringPreferencesKey("voxa_token")
private val USER_KEY = stringPreferencesKey("voxa_user")

class AuthViewModel(private val context: Context) : ViewModel() {

    private val json = Json { ignoreUnknownKeys = true; coerceInputValues = true; isLenient = true }

    private val _user = MutableStateFlow<User?>(null)
    val user: StateFlow<User?> = _user

    private val _token = MutableStateFlow<String?>(null)
    val token: StateFlow<String?> = _token

    private val _isLoggedIn = MutableStateFlow(false)
    val isLoggedIn: StateFlow<Boolean> = _isLoggedIn

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error

    init {
        viewModelScope.launch { loadStored() }
    }

    private suspend fun loadStored() {
        context.dataStore.data.first().let { prefs ->
            val tok = prefs[TOKEN_KEY] ?: return
            val userData = prefs[USER_KEY] ?: return
            val user = try { json.decodeFromString<User>(userData) } catch (_: Exception) { return }
            _token.value = tok
            _user.value = user
            _isLoggedIn.value = true
            ApiClient.token = tok
            SocketClient.connect(tok)
        }
    }

    fun login(email: String, password: String) {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            ApiClient.login(email, password)
                .onSuccess { store(it.token, it.user) }
                .onFailure { _error.value = it.message }
            _isLoading.value = false
        }
    }

    fun register(email: String, username: String, password: String) {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            ApiClient.register(email, username, password)
                .onSuccess { store(it.token, it.user) }
                .onFailure { _error.value = it.message }
            _isLoading.value = false
        }
    }

    fun logout() {
        viewModelScope.launch {
            context.dataStore.edit { it.clear() }
            _token.value = null
            _user.value = null
            _isLoggedIn.value = false
            ApiClient.token = null
            SocketClient.disconnect()
        }
    }

    fun updateUser(user: User) {
        _user.value = user
        viewModelScope.launch {
            context.dataStore.edit { prefs ->
                prefs[USER_KEY] = json.encodeToString(user)
            }
        }
    }

    fun clearError() { _error.value = null }

    private suspend fun store(token: String, user: User) {
        _token.value = token
        _user.value = user
        _isLoggedIn.value = true
        ApiClient.token = token
        SocketClient.connect(token)
        context.dataStore.edit { prefs ->
            prefs[TOKEN_KEY] = token
            prefs[USER_KEY] = json.encodeToString(user)
        }
    }
}

class AuthViewModelFactory(private val context: Context) : ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T = AuthViewModel(context) as T
}
