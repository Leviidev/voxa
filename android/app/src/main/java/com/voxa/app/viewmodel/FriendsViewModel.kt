package com.voxa.app.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.voxa.app.data.api.ApiClient
import com.voxa.app.data.model.Friend
import com.voxa.app.data.model.FriendRequest
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class FriendsViewModel : ViewModel() {

    private val _friends = MutableStateFlow<List<Friend>>(emptyList())
    val friends: StateFlow<List<Friend>> = _friends

    private val _requests = MutableStateFlow<List<FriendRequest>>(emptyList())
    val requests: StateFlow<List<FriendRequest>> = _requests

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error

    val incomingCount get() = _requests.value.count { it.incoming }

    fun load() {
        viewModelScope.launch {
            _isLoading.value = true
            val f = async { ApiClient.getFriends() }
            val r = async { ApiClient.getFriendRequests() }
            f.await().onSuccess { _friends.value = it }.onFailure { _error.value = it.message }
            r.await().onSuccess { _requests.value = it }.onFailure { _error.value = it.message }
            _isLoading.value = false
        }
    }

    fun sendRequest(username: String, onDone: (Boolean, String?) -> Unit) {
        viewModelScope.launch {
            ApiClient.sendFriendRequest(username)
                .onSuccess { load(); onDone(true, null) }
                .onFailure { onDone(false, it.message) }
        }
    }

    fun accept(request: FriendRequest) {
        viewModelScope.launch {
            ApiClient.acceptFriendRequest(request.id).onSuccess { load() }
                .onFailure { _error.value = it.message }
        }
    }

    fun decline(request: FriendRequest) {
        viewModelScope.launch {
            ApiClient.declineFriendRequest(request.id).onSuccess { load() }
                .onFailure { _error.value = it.message }
        }
    }

    fun removeFriend(friend: Friend) {
        viewModelScope.launch {
            ApiClient.removeFriend(friend.user.id).onSuccess { load() }
                .onFailure { _error.value = it.message }
        }
    }

    fun clearError() { _error.value = null }
}
