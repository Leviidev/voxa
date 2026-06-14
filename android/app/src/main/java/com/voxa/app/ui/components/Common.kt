package com.voxa.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.voxa.app.data.model.UserStatus

fun avatarColorForName(name: String): Long {
    val palette = listOf(
        0xFFE53935L, 0xFF6366F1L, 0xFF10B981L, 0xFFF59E0BL,
        0xFF3B82F6L, 0xFF8B5CF6L, 0xFFEC4899L, 0xFF14B8A6L
    )
    return palette[Math.abs(name.hashCode()) % palette.size]
}

fun parseColorHex(hex: String?): Long {
    if (hex == null) return 0xFF6366F1L
    val clean = hex.trimStart('#')
    return try { ("FF$clean").toLong(16) } catch (_: NumberFormatException) { 0xFF6366F1L }
}

@Composable
fun UserAvatar(
    letter: String,
    name: String,
    avatarColorHex: String? = null,
    avatarUrl: String? = null,
    status: UserStatus? = null,
    size: Dp = 40.dp,
) {
    val color = if (avatarColorHex != null) {
        Color(parseColorHex(avatarColorHex))
    } else {
        Color(avatarColorForName(name))
    }

    Box(modifier = Modifier.size(size + 4.dp)) {
        Box(
            modifier = Modifier
                .size(size)
                .clip(CircleShape)
                .background(color),
            contentAlignment = Alignment.Center,
        ) {
            if (!avatarUrl.isNullOrBlank()) {
                AsyncImage(
                    model = avatarUrl,
                    contentDescription = null,
                    modifier = Modifier.fillMaxSize().clip(CircleShape),
                )
            } else {
                Text(
                    text = letter,
                    color = Color.White,
                    fontSize = (size.value * 0.38f).sp,
                    fontWeight = FontWeight.Bold,
                )
            }
        }
        status?.let { st ->
            Box(
                modifier = Modifier
                    .size(size * 0.3f)
                    .align(Alignment.BottomEnd)
                    .clip(CircleShape)
                    .background(Color(st.colorHex))
                    .border(2.dp, Color(0xFF2B2D31), CircleShape)
            )
        }
    }
}

fun formatShortTime(iso: String): String = try {
    val instant = java.time.Instant.parse(iso)
    val local = java.time.LocalDateTime.ofInstant(instant, java.time.ZoneId.systemDefault())
    local.format(java.time.format.DateTimeFormatter.ofPattern("h:mm a"))
} catch (_: Exception) { "" }

fun formatTimestamp(iso: String): String = try {
    val instant = java.time.Instant.parse(iso)
    val local = java.time.LocalDateTime.ofInstant(instant, java.time.ZoneId.systemDefault())
    val now = java.time.LocalDate.now(java.time.ZoneId.systemDefault())
    val date = local.toLocalDate()
    val timeStr = local.format(java.time.format.DateTimeFormatter.ofPattern("h:mm a"))
    when {
        date == now              -> "Today at $timeStr"
        date == now.minusDays(1) -> "Yesterday at $timeStr"
        else -> local.format(java.time.format.DateTimeFormatter.ofPattern("MM/dd/yyyy"))
    }
} catch (_: Exception) { iso }
