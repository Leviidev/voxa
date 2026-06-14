package com.voxa.app.ui.theme

import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

// ──────────────────────────────────────────────
// Voxa Palette
// ──────────────────────────────────────────────
val VoxaRed          = Color(0xFFE53935)
val VoxaBg           = Color(0xFF111214)
val VoxaSurface      = Color(0xFF1E1F22)
val VoxaSurfaceVar   = Color(0xFF2B2D31)
val VoxaChatBg       = Color(0xFF313338)
val VoxaInput        = Color(0xFF383A40)
val VoxaTextPrimary  = Color(0xFFFFFFFF)
val VoxaTextSec      = Color(0xFFDCDDDE)
val VoxaTextMuted    = Color(0xFF949BA4)
val VoxaTextDim      = Color(0xFF5C5E66)
val VoxaOnline       = Color(0xFF23A55A)
val VoxaIdle         = Color(0xFFF0B232)
val VoxaDnd          = Color(0xFFF23F43)
val VoxaOffline      = Color(0xFF80848E)

private val DarkColors = darkColorScheme(
    primary          = VoxaRed,
    onPrimary        = Color.White,
    primaryContainer = Color(0xFF8B1A1A),
    secondary        = VoxaRed,
    onSecondary      = Color.White,
    background       = VoxaBg,
    onBackground     = VoxaTextPrimary,
    surface          = VoxaSurface,
    onSurface        = VoxaTextPrimary,
    surfaceVariant   = VoxaSurfaceVar,
    onSurfaceVariant = VoxaTextMuted,
    outline          = VoxaTextDim,
    error            = Color(0xFFF23F43),
)

val Typography = Typography(
    bodyLarge  = TextStyle(color = VoxaTextSec,   fontSize = 15.sp),
    bodyMedium = TextStyle(color = VoxaTextMuted, fontSize = 13.sp),
    bodySmall  = TextStyle(color = VoxaTextDim,   fontSize = 11.sp),
    titleLarge = TextStyle(color = VoxaTextPrimary, fontSize = 20.sp, fontWeight = FontWeight.Bold),
    titleMedium= TextStyle(color = VoxaTextPrimary, fontSize = 16.sp, fontWeight = FontWeight.SemiBold),
)

@Composable
fun VoxaTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = DarkColors,
        typography  = Typography,
        content     = content,
    )
}
