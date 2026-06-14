package com.voxa.app.data.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

// ---------------------------------------------------------------------------
// User
// ---------------------------------------------------------------------------

@Serializable
data class User(
    val id: String,
    val username: String,
    @SerialName("displayName") val displayName: String? = null,
    val discriminator: String,
    val email: String,
    @SerialName("avatarUrl") val avatarUrl: String? = null,
    @SerialName("avatarColor") val avatarColor: String? = null,
    @SerialName("bannerUrl") val bannerUrl: String? = null,
    @SerialName("bannerColor") val bannerColor: String? = null,
    val status: String? = null,
    @SerialName("customStatus") val customStatus: String? = null,
    val bio: String? = null,
    @SerialName("emailVerified") val emailVerified: Boolean? = null,
) {
    val effectiveName get() = displayName ?: username
    val tag get() = "$username#$discriminator"
    val statusEnum get() = UserStatus.from(status)
    val avatarLetter get() = effectiveName.firstOrNull()?.uppercaseChar()?.toString() ?: "?"
    val parsedAvatarColor get() = parseHexColor(avatarColor)
}

enum class UserStatus(val label: String, val colorHex: Long) {
    ONLINE("Online", 0xFF23a55a),
    IDLE("Idle", 0xFFf0b232),
    DND("Do Not Disturb", 0xFFf23f43),
    OFFLINE("Offline", 0xFF80848e),
    INVISIBLE("Invisible", 0xFF80848e);

    companion object {
        fun from(s: String?) = when (s) {
            "online" -> ONLINE
            "idle" -> IDLE
            "dnd" -> DND
            "invisible" -> INVISIBLE
            else -> OFFLINE
        }
    }
}

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

@Serializable
data class VoxaServer(
    val id: String,
    val name: String,
    @SerialName("iconUrl") val iconUrl: String? = null,
    @SerialName("iconColor") val iconColor: String? = null,
    val description: String? = null,
    @SerialName("ownerId") val ownerId: String,
    @SerialName("isPublic") val isPublic: Boolean? = null,
    val categories: List<ServerCategory> = emptyList(),
    val members: List<ServerMember> = emptyList(),
    val roles: List<ServerRole> = emptyList(),
) {
    val acronym get() = name.split(" ").take(2).mapNotNull { it.firstOrNull()?.uppercaseChar()?.toString() }.joinToString("")
    val allChannels get() = categories.flatMap { it.channels }
    val firstTextChannel get() = allChannels.firstOrNull { it.type == "text" }
}

@Serializable
data class ServerCategory(
    val id: String,
    val name: String,
    val channels: List<VoxaChannel> = emptyList(),
)

@Serializable
data class ServerMember(
    val id: String,
    val username: String,
    @SerialName("displayName") val displayName: String? = null,
    val discriminator: String,
    @SerialName("avatarUrl") val avatarUrl: String? = null,
    @SerialName("avatarColor") val avatarColor: String? = null,
    val status: String? = null,
    @SerialName("isOwner") val isOwner: Boolean? = null,
    val roles: List<MemberRoleRef> = emptyList(),
) {
    val effectiveName get() = displayName ?: username
    val statusEnum get() = UserStatus.from(status)
    val avatarLetter get() = effectiveName.firstOrNull()?.uppercaseChar()?.toString() ?: "?"
}

@Serializable
data class MemberRoleRef(val id: String, val name: String, val color: String? = null)

@Serializable
data class ServerRole(
    val id: String,
    val name: String,
    val color: String? = null,
    val hoist: Boolean? = null,
    val position: Int? = null,
)

// ---------------------------------------------------------------------------
// Channel
// ---------------------------------------------------------------------------

@Serializable
data class VoxaChannel(
    val id: String,
    val name: String,
    val type: String,
    val topic: String? = null,
) {
    val isText get() = type == "text"
    val isVoice get() = type == "voice"
}

// ---------------------------------------------------------------------------
// Message
// ---------------------------------------------------------------------------

@Serializable
data class VoxaMessage(
    val id: String,
    val content: String,
    @SerialName("authorId") val authorId: String,
    val author: String,
    @SerialName("displayName") val displayName: String? = null,
    @SerialName("avatarUrl") val avatarUrl: String? = null,
    @SerialName("avatarColor") val avatarColor: String? = null,
    val discriminator: String = "",
    @SerialName("channelId") val channelId: String? = null,
    val timestamp: String,
    val edited: Boolean = false,
    @SerialName("editedAt") val editedAt: String? = null,
) {
    val effectiveName get() = displayName ?: author
    val avatarLetter get() = effectiveName.firstOrNull()?.uppercaseChar()?.toString() ?: "?"
}

// ---------------------------------------------------------------------------
// DM
// ---------------------------------------------------------------------------

@Serializable
data class DMChannel(
    val id: String,
    val other: DMParticipant? = null,
    @SerialName("lastMessage") val lastMessage: DMMessage? = null,
) {
    val displayName get() = other?.effectiveName ?: "Unknown User"
}

@Serializable
data class DMParticipant(
    val id: String,
    val username: String,
    @SerialName("displayName") val displayName: String? = null,
    val discriminator: String,
    @SerialName("avatarUrl") val avatarUrl: String? = null,
    @SerialName("avatarColor") val avatarColor: String? = null,
    val status: String? = null,
    @SerialName("customStatus") val customStatus: String? = null,
    val bio: String? = null,
) {
    val effectiveName get() = displayName ?: username
    val statusEnum get() = UserStatus.from(status)
    val avatarLetter get() = effectiveName.firstOrNull()?.uppercaseChar()?.toString() ?: "?"
}

@Serializable
data class DMMessage(
    val id: String,
    @SerialName("dmChannelId") val dmChannelId: String,
    @SerialName("authorId") val authorId: String,
    val author: String,
    @SerialName("displayName") val displayName: String? = null,
    @SerialName("avatarUrl") val avatarUrl: String? = null,
    @SerialName("avatarColor") val avatarColor: String? = null,
    val content: String,
    val edited: Boolean = false,
    @SerialName("editedAt") val editedAt: String? = null,
    val timestamp: String,
) {
    val effectiveName get() = displayName ?: author
    val avatarLetter get() = effectiveName.firstOrNull()?.uppercaseChar()?.toString() ?: "?"
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

@Serializable
data class AuthResponse(val token: String, val user: User)

@Serializable
data class LoginRequest(val email: String, val password: String)

@Serializable
data class RegisterRequest(val email: String, val username: String, val password: String)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

fun parseHexColor(hex: String?): Long {
    if (hex == null) return 0xFF6366F1
    val clean = hex.trimStart('#')
    return try { "FF$clean".toLong(16) } catch (_: NumberFormatException) { 0xFF6366F1 }
}

fun avatarColorForName(name: String): Long {
    val palette = listOf(
        0xFFE53935L, 0xFF6366F1L, 0xFF10B981L, 0xFFF59E0BL,
        0xFF3B82F6L, 0xFF8B5CF6L, 0xFFEC4899L, 0xFF14B8A6L
    )
    return palette[Math.abs(name.hashCode()) % palette.size]
}

// ---------------------------------------------------------------------------
// Friends
// ---------------------------------------------------------------------------

@Serializable
data class FriendUser(
    val id: String,
    val username: String,
    @SerialName("displayName") val displayName: String? = null,
    @SerialName("avatarUrl") val avatarUrl: String? = null,
    @SerialName("avatarColor") val avatarColor: String? = null,
    val discriminator: String,
    val status: String? = null,
) {
    val effectiveName get() = displayName ?: username
    val avatarLetter get() = effectiveName.firstOrNull()?.uppercaseChar()?.toString() ?: "?"
}

@Serializable
data class FriendRequest(
    val id: String,
    val incoming: Boolean,
    val user: FriendUser,
    val status: String,
    @SerialName("createdAt") val createdAt: String? = null,
)

@Serializable
data class Friend(
    @SerialName("requestId") val requestId: String,
    val user: FriendUser,
    @SerialName("createdAt") val createdAt: String? = null,
)
