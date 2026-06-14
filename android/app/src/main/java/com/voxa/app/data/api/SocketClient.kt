package com.voxa.app.data.api

import com.voxa.app.data.model.DMMessage
import com.voxa.app.data.model.VoxaMessage
import kotlinx.coroutines.*
import kotlinx.serialization.json.*
import okhttp3.*

object SocketClient {

    private const val BASE_URL = "https://voxa.lol"

    private val json = Json { ignoreUnknownKeys = true; coerceInputValues = true; isLenient = true }

    private val client = OkHttpClient.Builder()
        .readTimeout(0, java.util.concurrent.TimeUnit.MILLISECONDS)
        .build()

    private var ws: WebSocket? = null
    private var token: String? = null
    private var namespaceConnected = false
    private var reconnectJob: Job? = null
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    // Callbacks — set by ViewModels
    var onNewMessage: ((VoxaMessage) -> Unit)? = null
    var onMessageEdit: ((VoxaMessage) -> Unit)? = null
    var onMessageDelete: ((String) -> Unit)? = null
    var onDMMessage: ((DMMessage) -> Unit)? = null
    var onDMMessageEdit: ((DMMessage) -> Unit)? = null
    var onDMMessageDelete: ((id: String, dmChannelId: String) -> Unit)? = null
    var onTypingUpdate: ((channelId: String, userId: String, username: String, typing: Boolean) -> Unit)? = null

    fun connect(authToken: String) {
        if (token == authToken && namespaceConnected) return
        token = authToken
        openConnection()
    }

    fun disconnect() {
        reconnectJob?.cancel()
        namespaceConnected = false
        ws?.close(1000, "logout")
        ws = null
    }

    fun joinChannel(channelId: String) = emitString("channel:join", channelId)
    fun leaveChannel(channelId: String) = emitString("channel:leave", channelId)
    fun joinServer(serverId: String) = emitString("server:join", serverId)
    fun joinDM(dmId: String) = emitString("dm:join", dmId)
    fun leaveDM(dmId: String) = emitString("dm:leave", dmId)
    fun sendTypingStart(channelId: String, username: String) =
        emitDict("typing:start", mapOf("channelId" to channelId, "username" to username))
    fun sendTypingStop(channelId: String) =
        emitDict("typing:stop", mapOf("channelId" to channelId))

    // -----------------------------------------------------------------------
    // Private
    // -----------------------------------------------------------------------

    private fun openConnection() {
        ws?.close(1000, "reconnect")
        ws = null
        namespaceConnected = false

        val wsUrl = BASE_URL
            .replace("https://", "wss://")
            .replace("http://", "ws://")

        val request = Request.Builder()
            .url("$wsUrl/socket.io/?EIO=4&transport=websocket")
            .build()

        ws = client.newWebSocket(request, object : WebSocketListener() {
            override fun onMessage(webSocket: WebSocket, text: String) = handle(text)
            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                namespaceConnected = false
                scheduleReconnect()
            }
            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                if (code != 1000) { namespaceConnected = false; scheduleReconnect() }
            }
        })
    }

    private fun handle(text: String) {
        when {
            text.startsWith("0") -> {
                // EIO open → send namespace connect with auth
                val payload = buildJsonObject { put("token", token ?: "") }.toString()
                ws?.send("40$payload")
            }
            text == "2" -> ws?.send("3")   // ping → pong
            text.startsWith("40") -> namespaceConnected = true
            text == "41" -> { namespaceConnected = false; scheduleReconnect() }
            text.startsWith("42") -> parseEvent(text)
        }
    }

    private fun parseEvent(text: String) {
        val inner = text.removePrefix("42")
        val arr = try { json.parseToJsonElement(inner).jsonArray } catch (_: Exception) { return }
        if (arr.size < 2) return
        val event = arr[0].jsonPrimitive.contentOrNull ?: return
        val payload = arr[1].jsonObject

        when (event) {
            "newMessage" -> {
                runCatching { json.decodeFromJsonElement<VoxaMessage>(arr[1]) }
                    .onSuccess { onNewMessage?.invoke(it) }
            }
            "messageEdited" -> {
                runCatching { json.decodeFromJsonElement<VoxaMessage>(arr[1]) }
                    .onSuccess { onMessageEdit?.invoke(it) }
            }
            "messageDeleted" -> {
                payload["id"]?.jsonPrimitive?.contentOrNull?.let { onMessageDelete?.invoke(it) }
            }
            "dm:message:new" -> {
                runCatching { json.decodeFromJsonElement<DMMessage>(arr[1]) }
                    .onSuccess { onDMMessage?.invoke(it) }
            }
            "dm:message:edit" -> {
                runCatching { json.decodeFromJsonElement<DMMessage>(arr[1]) }
                    .onSuccess { onDMMessageEdit?.invoke(it) }
            }
            "dm:message:delete" -> {
                val id = payload["id"]?.jsonPrimitive?.contentOrNull ?: return
                val dmChannelId = payload["dmChannelId"]?.jsonPrimitive?.contentOrNull ?: return
                onDMMessageDelete?.invoke(id, dmChannelId)
            }
            "typing:update" -> {
                val channelId = payload["channelId"]?.jsonPrimitive?.contentOrNull ?: return
                val userId = payload["userId"]?.jsonPrimitive?.contentOrNull ?: return
                val username = payload["username"]?.jsonPrimitive?.contentOrNull ?: ""
                val typing = payload["typing"]?.jsonPrimitive?.booleanOrNull ?: return
                onTypingUpdate?.invoke(channelId, userId, username, typing)
            }
        }
    }

    private fun emitString(event: String, value: String) {
        if (!namespaceConnected) return
        val payload = buildJsonArray { add(event); add(value) }.toString()
        ws?.send("42$payload")
    }

    private fun emitDict(event: String, data: Map<String, String>) {
        if (!namespaceConnected) return
        val obj = buildJsonObject { data.forEach { (k, v) -> put(k, v) } }
        val payload = buildJsonArray { add(event); add(obj) }.toString()
        ws?.send("42$payload")
    }

    private fun scheduleReconnect() {
        if (token == null) return
        reconnectJob?.cancel()
        reconnectJob = scope.launch {
            delay(3000)
            if (isActive) openConnection()
        }
    }
}
