package com.voxa.app.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.voxa.app.data.api.ApiClient
import com.voxa.app.data.api.SocketClient
import com.voxa.app.data.model.DMChannel
import com.voxa.app.data.model.DMMessage
import com.voxa.app.data.model.User
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

class DMViewModel : ViewModel() {

    private val _channels = MutableStateFlow<List<DMChannel>>(emptyList())
    val channels: StateFlow<List<DMChannel>> = _channels

    private val _messages = MutableStateFlow<Map<String, List<DMMessage>>>(emptyMap())
    val messages: StateFlow<Map<String, List<DMMessage>>> = _messages

    private val _isLoadingChannels = MutableStateFlow(false)
    val isLoadingChannels: StateFlow<Boolean> = _isLoadingChannels

    private val _isSending = MutableStateFlow(false)
    val isSending: StateFlow<Boolean> = _isSending

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error

    private var pollJob: Job? = null
    private val joinedRooms = mutableSetOf<String>()

    fun load() {
        viewModelScope.launch {
            _isLoadingChannels.value = true
            ApiClient.dmChannels()
                .onSuccess { chans ->
                    _channels.value = chans
                    chans.forEach { ch ->
                        SocketClient.joinDM(ch.id)
                        joinedRooms.add(ch.id)
                    }
                }
                .onFailure { _error.value = it.message }
            _isLoadingChannels.value = false
            setupSocketCallbacks()
            startPolling()
        }
    }

    fun loadMessages(dmId: String) {
        if (_messages.value[dmId] != null) return
        viewModelScope.launch {
            ApiClient.dmMessages(dmId)
                .onSuccess { msgs ->
                    _messages.value = _messages.value + (dmId to msgs)
                }
        }
    }

    fun refreshMessages(dmId: String) {
        viewModelScope.launch {
            ApiClient.dmMessages(dmId)
                .onSuccess { msgs ->
                    _messages.value = _messages.value + (dmId to msgs)
                }
        }
    }

    fun openDM(username: String, onResult: (DMChannel?) -> Unit) {
        viewModelScope.launch {
            ApiClient.openDm(username)
                .onSuccess { ch ->
                    if (_channels.value.none { it.id == ch.id }) {
                        _channels.value = listOf(ch) + _channels.value
                        SocketClient.joinDM(ch.id)
                        joinedRooms.add(ch.id)
                    }
                    onResult(ch)
                }
                .onFailure {
                    _error.value = it.message
                    onResult(null)
                }
        }
    }

    fun send(content: String, channel: DMChannel, author: User) {
        if (content.isBlank()) return
        viewModelScope.launch {
            _isSending.value = true
            val optimistic = DMMessage(
                id = "opt_${System.currentTimeMillis()}",
                dmChannelId = channel.id,
                authorId = author.id,
                author = author.username,
                displayName = author.displayName,
                avatarColor = author.avatarColor,
                content = content,
                edited = false,
                timestamp = java.time.Instant.now().toString(),
            )
            appendMessage(channel.id, optimistic)

            ApiClient.sendDmMessage(channel.id, content)
                .onSuccess { real ->
                    val current = _messages.value[channel.id]?.toMutableList() ?: mutableListOf()
                    val idx = current.indexOfFirst { it.id == optimistic.id }
                    if (idx >= 0) current[idx] = real else current.add(real)
                    _messages.value = _messages.value + (channel.id to current)
                    bumpLastMessage(channel.id, real)
                }
            _isSending.value = false
        }
    }

    fun edit(message: DMMessage, newContent: String, dmId: String) {
        viewModelScope.launch {
            _messages.value = _messages.value + (dmId to
                (_messages.value[dmId] ?: emptyList()).map {
                    if (it.id == message.id) it.copy(content = newContent, edited = true) else it
                })
            ApiClient.editDmMessage(dmId, message.id, newContent)
                .onSuccess { updated ->
                    _messages.value = _messages.value + (dmId to
                        (_messages.value[dmId] ?: emptyList()).map {
                            if (it.id == message.id) updated else it
                        })
                }
        }
    }

    fun delete(message: DMMessage, dmId: String) {
        _messages.value = _messages.value + (dmId to
            (_messages.value[dmId] ?: emptyList()).filter { it.id != message.id })
        viewModelScope.launch { ApiClient.deleteDmMessage(dmId, message.id) }
    }

    fun markRead(dmId: String) {
        viewModelScope.launch { ApiClient.markDmRead(dmId) }
    }

    fun clearError() { _error.value = null }

    fun disconnect() {
        joinedRooms.forEach { SocketClient.leaveDM(it) }
        joinedRooms.clear()
        pollJob?.cancel()
        pollJob = null
        SocketClient.onDMMessage = null
        SocketClient.onDMMessageEdit = null
        SocketClient.onDMMessageDelete = null
    }

    private fun setupSocketCallbacks() {
        SocketClient.onDMMessage = { msg ->
            val current = _messages.value[msg.dmChannelId]?.toMutableList() ?: mutableListOf()
            val optIdx = current.indexOfFirst {
                it.id.startsWith("opt_") && it.content == msg.content && it.authorId == msg.authorId
            }
            if (optIdx >= 0) current[optIdx] = msg
            else if (current.none { it.id == msg.id }) current.add(msg)
            _messages.value = _messages.value + (msg.dmChannelId to current)
            bumpLastMessage(msg.dmChannelId, msg)
        }
        SocketClient.onDMMessageEdit = { msg ->
            _messages.value = _messages.value + (msg.dmChannelId to
                (_messages.value[msg.dmChannelId] ?: emptyList()).map {
                    if (it.id == msg.id) msg else it
                })
        }
        SocketClient.onDMMessageDelete = { id, dmChannelId ->
            _messages.value = _messages.value + (dmChannelId to
                (_messages.value[dmChannelId] ?: emptyList()).filter { it.id != id })
        }
    }

    private fun appendMessage(dmId: String, msg: DMMessage) {
        val current = _messages.value[dmId]?.toMutableList() ?: mutableListOf()
        current.add(msg)
        _messages.value = _messages.value + (dmId to current)
    }

    private fun bumpLastMessage(dmId: String, msg: DMMessage) {
        _channels.value = _channels.value.map {
            if (it.id == dmId) it.copy(lastMessage = msg) else it
        }
    }

    private fun startPolling() {
        pollJob?.cancel()
        pollJob = viewModelScope.launch {
            while (isActive) {
                delay(15_000)
                // Refresh messages for channels that are loaded
                _messages.value.keys.forEach { dmId ->
                    ApiClient.dmMessages(dmId).onSuccess { fresh ->
                        _messages.value = _messages.value + (dmId to fresh)
                    }
                }
            }
        }
    }
}
