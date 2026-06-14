package com.voxa.app.ui.settings

import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.*
import androidx.compose.ui.unit.*
import com.voxa.app.data.api.ApiClient
import com.voxa.app.data.model.User
import com.voxa.app.ui.auth.VoxaButton
import com.voxa.app.ui.auth.VoxaTextField
import com.voxa.app.ui.main.TopBar
import com.voxa.app.ui.theme.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Composable
fun SettingsScreen(
    screen: String,
    user: User?,
    onBack: () -> Unit,
    onUserUpdate: (User) -> Unit,
) {
    when (screen) {
        "account"       -> AccountSettingsScreen(user, onBack, onUserUpdate)
        "profile"       -> UserProfileSettingsScreen(user, onBack, onUserUpdate)
        "privacy"       -> PrivacySettingsScreen(onBack)
        "notifications" -> NotificationSettingsScreen(onBack)
        "appearance"    -> AppearanceSettingsScreen(onBack)
        "password"      -> ChangePasswordScreen(onBack)
    }
}

// ──────────────────────────────────────────────
// Account Settings
// ──────────────────────────────────────────────

@Composable
fun AccountSettingsScreen(user: User?, onBack: () -> Unit, onUserUpdate: (User) -> Unit) {
    val scope = rememberCoroutineScope()
    var displayName by remember(user) { mutableStateOf(user?.displayName ?: "") }
    var customStatus by remember(user) { mutableStateOf(user?.customStatus ?: "") }
    var status by remember(user) { mutableStateOf(user?.status ?: "online") }
    var isSaving by remember { mutableStateOf(false) }
    var saveSuccess by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }

    val statusOptions = listOf(
        Triple("online",    "Online",          Color(0xFF23A55A)),
        Triple("idle",      "Idle",            Color(0xFFF0B232)),
        Triple("dnd",       "Do Not Disturb",  Color(0xFFF23F43)),
        Triple("invisible", "Invisible",       Color(0xFF80848E)),
    )

    Column(modifier = Modifier.fillMaxSize().background(VoxaBg)) {
        TopBar(title = "My Account", onBack = onBack)
        LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {

            item {
                user?.let { u ->
                    Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                        Spacer(Modifier.height(8.dp))
                        Box(
                            modifier = Modifier
                                .size(72.dp)
                                .clip(CircleShape)
                                .background(
                                    try { Color(("FF" + (u.avatarColor?.trimStart('#') ?: "E53935")).toLong(16)) }
                                    catch (_: Exception) { VoxaRed }
                                ),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(u.avatarLetter, color = Color.White, fontSize = 30.sp, fontWeight = FontWeight.Black)
                        }
                    }
                }
            }

            item {
                SettingsCard {
                    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Text("PROFILE", color = VoxaTextMuted, fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 0.8.sp)
                        SettingsField("Display Name", displayName, { displayName = it }, "Your display name")
                        SettingsField("Custom Status", customStatus, { customStatus = it }, "What's on your mind?")
                    }
                }
            }

            item {
                SettingsCard {
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text("ONLINE STATUS", color = VoxaTextMuted, fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 0.8.sp)
                        Spacer(Modifier.height(4.dp))
                        statusOptions.forEach { (value, label, color) ->
                            Row(
                                modifier = Modifier.fillMaxWidth().clickable { status = value }.padding(vertical = 10.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(12.dp),
                            ) {
                                Box(Modifier.size(12.dp).clip(CircleShape).background(color))
                                Text(label, color = VoxaTextPrimary, fontSize = 15.sp, modifier = Modifier.weight(1f))
                                if (status == value) Icon(Icons.Filled.Check, null, tint = VoxaRed, modifier = Modifier.size(16.dp))
                            }
                        }
                    }
                }
            }

            error?.let { err -> item { Text(err, color = VoxaDnd, fontSize = 13.sp) } }

            item {
                VoxaButton(
                    text = if (saveSuccess) "Saved!" else "Save Changes",
                    isLoading = isSaving,
                    enabled = !isSaving,
                ) {
                    isSaving = true; error = null
                    scope.launch(Dispatchers.IO) {
                        ApiClient.updateProfile(
                            displayName = displayName.ifBlank { null },
                            customStatus = customStatus.ifBlank { null },
                            status = status,
                        ).onSuccess { updated ->
                            withContext(Dispatchers.Main) { onUserUpdate(updated); saveSuccess = true; isSaving = false }
                        }.onFailure {
                            withContext(Dispatchers.Main) { error = it.message; isSaving = false }
                        }
                    }
                }
            }
        }
    }
}

// ──────────────────────────────────────────────
// User Profile Settings
// ──────────────────────────────────────────────

private val colorPalette = listOf(
    "E53935", "E91E63", "9C27B0", "673AB7",
    "3F51B5", "2196F3", "03A9F4", "009688",
    "4CAF50", "8BC34A", "FFC107", "FF9800",
    "FF5722", "795548", "607D8B", "9E9E9E",
)

@Composable
fun UserProfileSettingsScreen(user: User?, onBack: () -> Unit, onUserUpdate: (User) -> Unit) {
    val scope = rememberCoroutineScope()
    var bio by remember(user) { mutableStateOf(user?.bio ?: "") }
    var selectedColor by remember(user) { mutableStateOf(user?.avatarColor?.trimStart('#') ?: "E53935") }
    var isSaving by remember { mutableStateOf(false) }
    var saveSuccess by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }

    Column(modifier = Modifier.fillMaxSize().background(VoxaBg)) {
        TopBar(title = "User Profile", onBack = onBack)
        LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {

            item {
                SettingsCard {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                        Box(
                            modifier = Modifier.size(56.dp).clip(CircleShape)
                                .background(try { Color(("FF$selectedColor").toLong(16)) } catch (_: Exception) { VoxaRed }),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(user?.avatarLetter ?: "?", color = Color.White, fontSize = 22.sp, fontWeight = FontWeight.Black)
                        }
                        Column {
                            Text(user?.effectiveName ?: "", color = VoxaTextPrimary, fontSize = 16.sp, fontWeight = FontWeight.Bold)
                            if (bio.isNotBlank()) Text(bio, color = VoxaTextMuted, fontSize = 13.sp, maxLines = 2)
                        }
                    }
                }
            }

            item {
                SettingsCard {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("BIO", color = VoxaTextMuted, fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 0.8.sp)
                        OutlinedTextField(
                            value = bio, onValueChange = { bio = it },
                            placeholder = { Text("Tell people about yourself…", color = VoxaTextDim) },
                            modifier = Modifier.fillMaxWidth(), minLines = 3, maxLines = 6,
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = VoxaRed, unfocusedBorderColor = VoxaSurfaceVar,
                                focusedTextColor = VoxaTextPrimary, unfocusedTextColor = VoxaTextPrimary,
                                focusedContainerColor = Color.Transparent, unfocusedContainerColor = Color.Transparent,
                                cursorColor = VoxaRed,
                            ),
                        )
                    }
                }
            }

            item {
                SettingsCard {
                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Text("AVATAR COLOR", color = VoxaTextMuted, fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 0.8.sp)
                        colorPalette.chunked(8).forEach { row ->
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                row.forEach { hex ->
                                    val isSelected = selectedColor == hex
                                    Box(
                                        modifier = Modifier
                                            .size(32.dp)
                                            .clip(CircleShape)
                                            .background(try { Color(("FF$hex").toLong(16)) } catch (_: Exception) { VoxaRed })
                                            .clickable { selectedColor = hex }
                                            .then(if (isSelected) Modifier.border(2.5.dp, Color.White, CircleShape) else Modifier),
                                    )
                                }
                            }
                        }
                    }
                }
            }

            error?.let { item { Text(it, color = VoxaDnd, fontSize = 13.sp) } }

            item {
                VoxaButton(text = if (saveSuccess) "Saved!" else "Save Profile", isLoading = isSaving) {
                    isSaving = true; error = null
                    scope.launch(Dispatchers.IO) {
                        ApiClient.updateProfile(bio = bio.ifBlank { null }, avatarColor = selectedColor)
                            .onSuccess { updated ->
                                withContext(Dispatchers.Main) { onUserUpdate(updated); saveSuccess = true; isSaving = false }
                            }
                            .onFailure { withContext(Dispatchers.Main) { error = it.message; isSaving = false } }
                    }
                }
            }
        }
    }
}

// ──────────────────────────────────────────────
// Privacy Settings
// ──────────────────────────────────────────────

@Composable
fun PrivacySettingsScreen(onBack: () -> Unit) {
    var dmFromAnyone by remember { mutableStateOf(true) }
    var readReceipts by remember { mutableStateOf(true) }
    var friendRequests by remember { mutableStateOf(true) }
    var analytics by remember { mutableStateOf(false) }

    Column(modifier = Modifier.fillMaxSize().background(VoxaBg)) {
        TopBar(title = "Privacy & Safety", onBack = onBack)
        LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            item {
                SettingsCard {
                    Column {
                        SettingsToggle("Allow DMs from anyone", "People in your servers can message you", dmFromAnyone) { dmFromAnyone = it }
                        SettingsToggle("Show read receipts", "Let others know when you've read messages", readReceipts) { readReceipts = it }
                    }
                }
            }
            item { SettingsCard { SettingsToggle("Allow friend requests", "Other users can send you friend requests", friendRequests) { friendRequests = it } } }
            item { SettingsCard { SettingsToggle("Share usage analytics", "Help improve Voxa with anonymous usage data", analytics) { analytics = it } } }
        }
    }
}

// ──────────────────────────────────────────────
// Notification Settings
// ──────────────────────────────────────────────

@Composable
fun NotificationSettingsScreen(onBack: () -> Unit) {
    var muteAll by remember { mutableStateOf(false) }
    var notifMessages by remember { mutableStateOf(true) }
    var notifMentions by remember { mutableStateOf(true) }
    var notifDMs by remember { mutableStateOf(true) }
    var notifSounds by remember { mutableStateOf(true) }

    Column(modifier = Modifier.fillMaxSize().background(VoxaBg)) {
        TopBar(title = "Notifications", onBack = onBack)
        LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            item { SettingsCard { SettingsToggle("Mute All Notifications", "Silence all notifications from Voxa", muteAll) { muteAll = it } } }
            item {
                SettingsCard {
                    Column(modifier = Modifier.alpha(if (muteAll) 0.4f else 1f)) {
                        Text("NOTIFY ME ABOUT", color = VoxaTextMuted, fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 0.8.sp)
                        Spacer(Modifier.height(8.dp))
                        SettingsToggle("Messages", "All messages in channels", notifMessages) { if (!muteAll) notifMessages = it }
                        SettingsToggle("Mentions", "When someone @mentions you", notifMentions) { if (!muteAll) notifMentions = it }
                        SettingsToggle("Direct Messages", "Messages from other users", notifDMs) { if (!muteAll) notifDMs = it }
                        SettingsToggle("Notification Sounds", "Play sounds for notifications", notifSounds) { if (!muteAll) notifSounds = it }
                    }
                }
            }
        }
    }
}

// ──────────────────────────────────────────────
// Appearance Settings
// ──────────────────────────────────────────────

@Composable
fun AppearanceSettingsScreen(onBack: () -> Unit) {
    var compactMode by remember { mutableStateOf(false) }
    var messageGrouping by remember { mutableStateOf(true) }
    var showAvatars by remember { mutableStateOf(true) }
    var largeText by remember { mutableStateOf(false) }

    Column(modifier = Modifier.fillMaxSize().background(VoxaBg)) {
        TopBar(title = "Appearance", onBack = onBack)
        LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            item {
                SettingsCard {
                    Row(Modifier.fillMaxWidth().padding(vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
                        Text("Color Theme", color = VoxaTextPrimary, fontSize = 15.sp, modifier = Modifier.weight(1f))
                        Text("Dark (Voxa Red)", color = VoxaTextMuted, fontSize = 13.sp)
                    }
                }
            }
            item {
                SettingsCard {
                    Column {
                        Text("MESSAGES", color = VoxaTextMuted, fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 0.8.sp)
                        Spacer(Modifier.height(8.dp))
                        SettingsToggle("Compact Mode", "Fit more messages on screen", compactMode) { compactMode = it }
                        SettingsToggle("Group Messages", "Combine consecutive messages", messageGrouping) { messageGrouping = it }
                        SettingsToggle("Show Avatars", "Display user avatars next to messages", showAvatars) { showAvatars = it }
                    }
                }
            }
            item { SettingsCard { SettingsToggle("Larger Text", "Increase text size throughout the app", largeText) { largeText = it } } }
        }
    }
}

// ──────────────────────────────────────────────
// Change Password
// ──────────────────────────────────────────────

@Composable
fun ChangePasswordScreen(onBack: () -> Unit) {
    val scope = rememberCoroutineScope()
    var current by remember { mutableStateOf("") }
    var newPass by remember { mutableStateOf("") }
    var confirm by remember { mutableStateOf("") }
    var showCurrent by remember { mutableStateOf(false) }
    var showNew by remember { mutableStateOf(false) }
    var isSaving by remember { mutableStateOf(false) }
    var success by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }

    val validationMsg = when {
        newPass.isNotEmpty() && newPass.length < 6 -> "Password must be at least 6 characters"
        confirm.isNotEmpty() && newPass != confirm   -> "Passwords don't match"
        else                                         -> null
    }
    val canSave = current.isNotBlank() && newPass.length >= 6 && newPass == confirm

    Column(modifier = Modifier.fillMaxSize().background(VoxaBg)) {
        TopBar(title = "Change Password", onBack = onBack)
        LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            item {
                SettingsCard {
                    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Text("CURRENT PASSWORD", color = VoxaTextMuted, fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 0.8.sp)
                        VoxaTextField(
                            label = "Current password", value = current, onValue = { current = it },
                            keyboardType = KeyboardType.Password, hidden = !showCurrent,
                            trailingIcon = {
                                IconButton(onClick = { showCurrent = !showCurrent }) {
                                    Icon(if (showCurrent) Icons.Filled.VisibilityOff else Icons.Filled.Visibility, null, tint = VoxaTextMuted)
                                }
                            },
                        )
                    }
                }
            }
            item {
                SettingsCard {
                    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Text("NEW PASSWORD", color = VoxaTextMuted, fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 0.8.sp)
                        VoxaTextField(
                            label = "New password", value = newPass, onValue = { newPass = it },
                            keyboardType = KeyboardType.Password, hidden = !showNew,
                            trailingIcon = {
                                IconButton(onClick = { showNew = !showNew }) {
                                    Icon(if (showNew) Icons.Filled.VisibilityOff else Icons.Filled.Visibility, null, tint = VoxaTextMuted)
                                }
                            },
                        )
                        VoxaTextField("Confirm new password", confirm, { confirm = it }, KeyboardType.Password, hidden = true)
                    }
                }
            }
            validationMsg?.let { item { Text(it, color = VoxaIdle, fontSize = 13.sp) } }
            error?.let { item { Text(it, color = VoxaDnd, fontSize = 13.sp) } }
            if (success) item {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Icon(Icons.Filled.CheckCircle, null, tint = VoxaOnline, modifier = Modifier.size(16.dp))
                    Text("Password changed successfully!", color = VoxaOnline, fontSize = 14.sp)
                }
            }
            item {
                VoxaButton(text = "Change Password", enabled = canSave, isLoading = isSaving) {
                    isSaving = true; error = null
                    scope.launch(Dispatchers.IO) {
                        ApiClient.changePassword(current, newPass)
                            .onSuccess {
                                withContext(Dispatchers.Main) {
                                    success = true; isSaving = false
                                    current = ""; newPass = ""; confirm = ""
                                }
                            }
                            .onFailure { withContext(Dispatchers.Main) { error = it.message; isSaving = false } }
                    }
                }
            }
        }
    }
}

// ──────────────────────────────────────────────
// Shared components
// ──────────────────────────────────────────────

@Composable
fun SettingsCard(content: @Composable ColumnScope.() -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(VoxaSurface)
            .padding(16.dp),
        content = content,
    )
}

@Composable
fun SettingsToggle(title: String, subtitle: String, checked: Boolean, onCheck: (Boolean) -> Unit) {
    Row(modifier = Modifier.fillMaxWidth().padding(vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
        Column(modifier = Modifier.weight(1f)) {
            Text(title, color = VoxaTextPrimary, fontSize = 15.sp)
            Text(subtitle, color = VoxaTextMuted, fontSize = 12.sp, lineHeight = 16.sp)
        }
        Switch(
            checked = checked, onCheckedChange = onCheck,
            colors = SwitchDefaults.colors(
                checkedThumbColor = Color.White, checkedTrackColor = VoxaRed,
                uncheckedThumbColor = VoxaTextMuted, uncheckedTrackColor = VoxaSurfaceVar,
            ),
        )
    }
}

@Composable
fun SettingsField(label: String, value: String, onValue: (String) -> Unit, placeholder: String) {
    OutlinedTextField(
        value = value, onValueChange = onValue,
        label = { Text(label) },
        placeholder = { Text(placeholder, color = VoxaTextDim) },
        modifier = Modifier.fillMaxWidth(),
        singleLine = true,
        colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = VoxaRed, unfocusedBorderColor = VoxaSurfaceVar,
            focusedLabelColor = VoxaRed, unfocusedLabelColor = VoxaTextMuted,
            focusedTextColor = VoxaTextPrimary, unfocusedTextColor = VoxaTextPrimary,
            focusedContainerColor = Color.Transparent, unfocusedContainerColor = Color.Transparent,
            cursorColor = VoxaRed,
        ),
        shape = RoundedCornerShape(10.dp),
    )
}
