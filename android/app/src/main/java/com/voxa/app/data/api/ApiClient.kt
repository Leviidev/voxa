package com.voxa.app.data.api

import com.voxa.app.data.model.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.serializer
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException

object ApiClient {

    private const val BASE_URL = "https://voxa.lol"
    var token: String? = null

    private val json = Json {
        ignoreUnknownKeys = true
        coerceInputValues = true
        isLenient = true
    }

    private val client = OkHttpClient.Builder()
        .connectTimeout(15, java.util.concurrent.TimeUnit.SECONDS)
        .readTimeout(15, java.util.concurrent.TimeUnit.SECONDS)
        .build()

    private val JSON_MEDIA = "application/json; charset=utf-8".toMediaType()

    // -----------------------------------------------------------------------
    // Core helpers
    // -----------------------------------------------------------------------

    private fun buildRequest(path: String): Request.Builder {
        val builder = Request.Builder().url("$BASE_URL$path")
        token?.let { builder.header("Authorization", "Bearer $it") }
        builder.header("Accept", "application/json")
        return builder
    }

    private suspend fun <T> get(path: String, decode: (String) -> T): Result<T> =
        execute(buildRequest(path).get().build(), decode)

    private suspend fun <T> postMap(path: String, body: Map<String, String>, decode: (String) -> T): Result<T> {
        val rb = json.encodeToString(serializer<Map<String, String>>(), body).toRequestBody(JSON_MEDIA)
        return execute(buildRequest(path).post(rb).build(), decode)
    }

    private suspend fun <T> patchMap(path: String, body: Map<String, String>, decode: (String) -> T): Result<T> {
        val rb = json.encodeToString(serializer<Map<String, String>>(), body).toRequestBody(JSON_MEDIA)
        return execute(buildRequest(path).patch(rb).build(), decode)
    }

    private suspend fun deleteReq(path: String): Result<Unit> =
        execute(buildRequest(path).delete().build()) {}

    private suspend fun <T> execute(request: Request, decode: (String) -> T): Result<T> =
        withContext(Dispatchers.IO) {
            try {
                val response = client.newCall(request).execute()
                val body = response.body?.string() ?: ""
                if (!response.isSuccessful) {
                    val msg = try { json.decodeFromString<ErrorBody>(body).error }
                              catch (_: Exception) { response.message }
                    return@withContext Result.failure(IOException("${response.code}: $msg"))
                }
                Result.success(decode(body))
            } catch (e: Exception) {
                Result.failure(e)
            }
        }

    // -----------------------------------------------------------------------
    // Auth
    // -----------------------------------------------------------------------

    suspend fun login(email: String, password: String): Result<AuthResponse> =
        postMap("/api/auth/login", mapOf("email" to email, "password" to password)) {
            json.decodeFromString(it)
        }

    suspend fun register(email: String, username: String, password: String): Result<AuthResponse> =
        postMap("/api/auth/register", mapOf("email" to email, "username" to username, "password" to password)) {
            json.decodeFromString(it)
        }

    suspend fun me(): Result<User> = get("/api/auth/me") { json.decodeFromString(it) }

    suspend fun changePassword(current: String, newPass: String): Result<Unit> =
        patchMap("/api/auth/change-password",
            mapOf("currentPassword" to current, "newPassword" to newPass)) {}

    // -----------------------------------------------------------------------
    // Servers
    // -----------------------------------------------------------------------

    suspend fun servers(): Result<List<VoxaServer>> =
        get("/api/servers") { json.decodeFromString(it) }

    suspend fun createServer(name: String): Result<VoxaServer> =
        postMap("/api/servers", mapOf("name" to name)) { json.decodeFromString(it) }

    suspend fun deleteServer(id: String): Result<Unit> = deleteReq("/api/servers/$id")

    suspend fun joinByInvite(code: String): Result<VoxaServer> =
        postMap("/api/invites/$code/join", emptyMap()) { json.decodeFromString(it) }

    // -----------------------------------------------------------------------
    // Messages
    // -----------------------------------------------------------------------

    suspend fun messages(channelId: String, limit: Int = 50): Result<List<VoxaMessage>> =
        get("/api/messages/channels/$channelId/messages?limit=$limit") { json.decodeFromString(it) }

    suspend fun sendMessage(channelId: String, content: String): Result<VoxaMessage> =
        postMap("/api/messages/channels/$channelId/messages", mapOf("content" to content)) {
            json.decodeFromString(it)
        }

    suspend fun editMessage(msgId: String, content: String): Result<VoxaMessage> =
        patchMap("/api/messages/$msgId", mapOf("content" to content)) { json.decodeFromString(it) }

    suspend fun deleteMessage(msgId: String): Result<Unit> = deleteReq("/api/messages/$msgId")

    // -----------------------------------------------------------------------
    // Profile
    // -----------------------------------------------------------------------

    suspend fun updateProfile(
        displayName: String? = null,
        bio: String? = null,
        customStatus: String? = null,
        avatarColor: String? = null,
        status: String? = null,
    ): Result<User> {
        val body = buildMap<String, String> {
            displayName?.let  { put("displayName", it) }
            bio?.let          { put("bio", it) }
            customStatus?.let { put("customStatus", it) }
            avatarColor?.let  { put("avatarColor", it) }
            status?.let       { put("status", it) }
        }
        return patchMap("/api/users/me", body) { json.decodeFromString(it) }
    }

    // -----------------------------------------------------------------------
    // DMs
    // -----------------------------------------------------------------------

    suspend fun dmChannels(): Result<List<DMChannel>> =
        get("/api/dms") { json.decodeFromString(it) }

    suspend fun openDm(username: String): Result<DMChannel> =
        postMap("/api/dms", mapOf("username" to username)) { json.decodeFromString(it) }

    suspend fun dmMessages(dmId: String, limit: Int = 50): Result<List<DMMessage>> =
        get("/api/dms/$dmId/messages?limit=$limit") { json.decodeFromString(it) }

    suspend fun sendDmMessage(dmId: String, content: String): Result<DMMessage> =
        postMap("/api/dms/$dmId/messages", mapOf("content" to content)) { json.decodeFromString(it) }

    suspend fun editDmMessage(dmId: String, msgId: String, content: String): Result<DMMessage> =
        patchMap("/api/dms/$dmId/messages/$msgId", mapOf("content" to content)) { json.decodeFromString(it) }

    suspend fun deleteDmMessage(dmId: String, msgId: String): Result<Unit> =
        deleteReq("/api/dms/$dmId/messages/$msgId")

    suspend fun markDmRead(dmId: String): Result<Unit> =
        postMap("/api/dms/$dmId/read", emptyMap()) {}

    // -----------------------------------------------------------------------
    // Internal
    // -----------------------------------------------------------------------

    @kotlinx.serialization.Serializable
    private data class ErrorBody(val error: String)
}
