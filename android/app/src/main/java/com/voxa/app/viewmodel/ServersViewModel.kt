package com.voxa.app.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.voxa.app.data.api.ApiClient
import com.voxa.app.data.api.SocketClient
import com.voxa.app.data.model.VoxaChannel
import com.voxa.app.data.model.VoxaServer
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class ServersViewModel : ViewModel() {

    private val _servers = MutableStateFlow<List<VoxaServer>>(emptyList())
    val servers: StateFlow<List<VoxaServer>> = _servers

    private val _selectedServer = MutableStateFlow<VoxaServer?>(null)
    val selectedServer: StateFlow<VoxaServer?> = _selectedServer

    private val _selectedChannel = MutableStateFlow<VoxaChannel?>(null)
    val selectedChannel: StateFlow<VoxaChannel?> = _selectedChannel

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error

    fun load() {
        viewModelScope.launch {
            _isLoading.value = true
            ApiClient.servers()
                .onSuccess { svrs ->
                    _servers.value = svrs
                    svrs.forEach { SocketClient.joinServer(it.id) }
                }
                .onFailure { _error.value = it.message }
            _isLoading.value = false
        }
    }

    fun selectServer(server: VoxaServer) {
        _selectedServer.value = server
        _selectedChannel.value = null
    }

    fun selectChannel(channel: VoxaChannel) {
        _selectedChannel.value = channel
    }

    fun createServer(name: String, onDone: () -> Unit) {
        viewModelScope.launch {
            ApiClient.createServer(name)
                .onSuccess { srv ->
                    _servers.value = _servers.value + srv
                    _selectedServer.value = srv
                    SocketClient.joinServer(srv.id)
                    onDone()
                }
                .onFailure { _error.value = it.message }
        }
    }

    fun joinByInvite(code: String, onDone: () -> Unit) {
        viewModelScope.launch {
            ApiClient.joinByInvite(code)
                .onSuccess { srv ->
                    if (_servers.value.none { it.id == srv.id }) {
                        _servers.value = _servers.value + srv
                    }
                    _selectedServer.value = srv
                    SocketClient.joinServer(srv.id)
                    onDone()
                }
                .onFailure { _error.value = it.message }
        }
    }

    fun clearError() { _error.value = null }
}
