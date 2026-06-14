package com.voxa.app.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.voxa.app.data.api.ApiClient
import com.voxa.app.data.api.SocketClient
import com.voxa.app.data.model.User
import com.voxa.app.data.model.VoxaMessage
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

class ChatViewModel : ViewModel() {

    private val _messages = MutableStateFlow<List<VoxaMessage>>(emptyList())
    val messages: StateFlow<List<VoxaMessage>> = _messages

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading

    private val _isSending = MutableStateFlow(false)
    val isSending: StateFlow<Boolean> = _isSending

    private val _typingUsers = MutableStateFlow<List<String>>(emptyList())
    val typingUsers: StateFlow<List<String>> = _typingUsers

    private var currentChannelId: String? = null
    private var pollJob: Job? = null

    fun load(channelId: String) {
        currentChannelId = channelId
        setupSocket(channelId)
        viewModelScope.launch {
            _isLoading.value = true
            ApiClient.messages(channelId)
                .onSuccess { _messages.value = it }
            _isLoading.value = false
        }
        startPolling(channelId)
    }

    fun send(content: String, channelId: String, author: User) {
        if (content.isBlank()) return
        viewModelScope.launch {
            _isSending.value = true
            val optimistic = VoxaMessage(
                id = "opt_${System.currentTimeMillis()}",
                content = content,
                authorId = author.id,
                author = author.username,
                displayName = author.displayName,
                avatarColor = author.avatarColor,
                channelId = channelId,
                timestamp = java.time.Instant.now().toString(),
                edited = false,
            )
            _messages.value = _messages.value + optimistic

            ApiClient.sendMessage(channelId, content)
                .onSuccess { real ->
                    _messages.value = _messages.value.map {
                        if (it.id == optimistic.id) real else it
                    }
                }
            _isSending.value = false
        }
    }

    fun edit(message: VoxaMessage, newContent: String) {
        viewModelScope.launch {
            _messages.value = _messages.value.map {
                if (it.id == message.id) it.copy(content = newContent, edited = true) else it
            }
            ApiClient.editMessage(message.id, newContent)
                .onSuccess { updated ->
                    _messages.value = _messages.value.map {
                        if (it.id == message.id) updated else it
                    }
                }
        }
    }

    fun delete(message: VoxaMessage) {
        _messages.value = _messages.value.filter { it.id != message.id }
        viewModelScope.launch { ApiClient.deleteMessage(message.id) }
    }

    fun disconnect() {
        currentChannelId?.let { SocketClient.leaveChannel(it) }
        pollJob?.cancel()
        pollJob = null
        currentChannelId = null
        SocketClient.onNewMessage = null
        SocketClient.onMessageEdit = null
        SocketClient.onMessageDelete = null
        SocketClient.onTypingUpdate = null
        _messages.value = emptyList()
        _typingUsers.value = emptyList()
    }

    private fun setupSocket(channelId: String) {
        SocketClient.joinChannel(channelId)

        SocketClient.onNewMessage = { msg ->
            if (msg.channelId == channelId) {
                val existing = _messages.value
                val optIdx = existing.indexOfFirst {
                    it.id.startsWith("opt_") && it.content == msg.content && it.authorId == msg.authorId
                }
                _messages.value = if (optIdx >= 0) {
                    existing.toMutableList().apply { set(optIdx, msg) }
                } else if (existing.none { it.id == msg.id }) {
                    existing + msg
                } else existing
            }
        }
        SocketClient.onMessageEdit = { msg ->
            if (msg.channelId == channelId) {
                _messages.value = _messages.value.map { if (it.id == msg.id) msg else it }
            }
        }
        SocketClient.onMessageDelete = { id ->
            _messages.value = _messages.value.filter { it.id != id }
        }
        SocketClient.onTypingUpdate = { cid, _, username, typing ->
            if (cid == channelId) {
                _typingUsers.value = if (typing)
                    (_typingUsers.value + username).distinct()
                else
                    _typingUsers.value - username
            }
        }
    }

    private fun startPolling(channelId: String) {
        pollJob?.cancel()
        pollJob = viewModelScope.launch {
            while (isActive) {
                delay(10_000)
                ApiClient.messages(channelId)
                    .onSuccess { fresh ->
                        val current = _messages.value
                        val merged = (current + fresh).distinctBy { it.id }
                            .sortedBy { it.timestamp }
                            .filter { msg ->
                                if (!msg.id.startsWith("opt_")) return@filter true
                                fresh.none { it.content == msg.content && it.authorId == msg.authorId }
                            }
                        _messages.value = merged
                    }
            }
        }
    }
}
