package com.voxa.app.ui.main

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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.*
import com.voxa.app.data.model.*
import com.voxa.app.ui.components.*
import com.voxa.app.ui.theme.*
import com.voxa.app.viewmodel.ChatViewModel

@OptIn(ExperimentalMaterial3Api::class, ExperimentalFoundationApi::class)
@Composable
fun ChatScreen(
    channel: VoxaChannel,
    server: VoxaServer,
    currentUser: User,
    chatViewModel: ChatViewModel,
    onBack: () -> Unit,
) {
    val messages by chatViewModel.messages.collectAsState()
    val typingUsers by chatViewModel.typingUsers.collectAsState()
    val isSending by chatViewModel.isSending.collectAsState()
    var messageText by remember { mutableStateOf("") }
    var editingMessage by remember { mutableStateOf<VoxaMessage?>(null) }
    var editText by remember { mutableStateOf("") }
    val listState = rememberLazyListState()

    LaunchedEffect(channel.id) {
        chatViewModel.load(channel.id)
    }
    DisposableEffect(channel.id) {
        onDispose { chatViewModel.disconnect() }
    }
    LaunchedEffect(messages.size) {
        if (messages.isNotEmpty()) listState.animateScrollToItem(messages.size - 1)
    }

    Column(modifier = Modifier.fillMaxSize().background(VoxaChatBg)) {
        // Top bar
        TopBar(
            title = "#${channel.name}",
            onBack = onBack,
            actions = {
                IconButton(onClick = {}) {
                    Icon(Icons.Filled.People, contentDescription = "Members", tint = VoxaTextMuted)
                }
            },
        )

        // Messages
        LazyColumn(
            state = listState,
            modifier = Modifier.weight(1f),
            contentPadding = PaddingValues(bottom = 8.dp),
        ) {
            // Welcome header
            item {
                WelcomeHeader(name = "#${channel.name}", subtitle = channel.topic ?: "This is the start of #${channel.name}")
            }

            itemsIndexed(messages, key = { _, m -> m.id }) { idx, msg ->
                val prev = if (idx > 0) messages[idx - 1] else null
                val grouped = prev != null &&
                    prev.authorId == msg.authorId &&
                    (msg.timestamp > prev.timestamp).let {
                        try {
                            val diff = java.time.Duration.between(
                                java.time.Instant.parse(prev.timestamp),
                                java.time.Instant.parse(msg.timestamp)
                            ).seconds
                            diff < 300
                        } catch (_: Exception) { false }
                    }
                val isOwn = msg.authorId == currentUser.id

                MessageRow(
                    message = msg,
                    grouped = grouped,
                    isOwn = isOwn,
                    onEdit = { editingMessage = msg; editText = msg.content },
                    onDelete = { chatViewModel.delete(msg) },
                    onCopy = {},
                )
            }
        }

        // Typing indicator
        if (typingUsers.isNotEmpty()) {
            Text(
                text = "${typingUsers.joinToString()} ${if (typingUsers.size == 1) "is" else "are"} typing…",
                color = VoxaTextMuted,
                fontSize = 12.sp,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp),
            )
        }

        // Input bar
        ChatInputBar(
            editing = editingMessage,
            hint = "Message #${channel.name}",
            messageText = if (editingMessage != null) editText else messageText,
            onTextChange = { if (editingMessage != null) editText = it else messageText = it },
            isSending = isSending,
            onSend = {
                if (editingMessage != null) {
                    chatViewModel.edit(editingMessage!!, editText.trim())
                    editingMessage = null; editText = ""
                } else {
                    chatViewModel.send(messageText.trim(), channel.id, currentUser)
                    messageText = ""
                }
            },
            onCancelEdit = { editingMessage = null; editText = "" },
        )
    }
}

// ──────────────────────────────────────────────
// Message Row
// ──────────────────────────────────────────────

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun MessageRow(
    message: VoxaMessage,
    grouped: Boolean,
    isOwn: Boolean,
    onEdit: () -> Unit,
    onDelete: () -> Unit,
    onCopy: () -> Unit,
) {
    var showMenu by remember { mutableStateOf(false) }

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .combinedClickable(onClick = {}, onLongClick = { showMenu = true })
            .padding(
                horizontal = 16.dp,
                vertical = if (grouped) 1.dp else 6.dp,
            ),
        horizontalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        if (grouped) {
            Spacer(Modifier.width(40.dp))
        } else {
            UserAvatar(
                letter = message.avatarLetter,
                name = message.author,
                avatarColorHex = message.avatarColor,
                size = 40.dp,
            )
        }

        Column(modifier = Modifier.weight(1f)) {
            if (!grouped) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Text(
                        message.effectiveName,
                        color = if (isOwn) VoxaRed else VoxaTextPrimary,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 15.sp,
                    )
                    Text(
                        formatTimestamp(message.timestamp),
                        color = VoxaTextDim,
                        fontSize = 11.sp,
                    )
                }
            }
            Text(
                text = message.content + if (message.edited) " (edited)" else "",
                color = VoxaTextSec,
                fontSize = 15.sp,
                lineHeight = 20.sp,
            )
        }
    }

    if (showMenu) {
        DropdownMenu(
            expanded = true,
            onDismissRequest = { showMenu = false },
            modifier = Modifier.background(VoxaSurface),
        ) {
            if (isOwn) {
                DropdownMenuItem(
                    text = { Text("Edit", color = VoxaTextPrimary) },
                    onClick = { onEdit(); showMenu = false },
                    leadingIcon = { Icon(Icons.Filled.Edit, contentDescription = null, tint = VoxaTextMuted) },
                )
                DropdownMenuItem(
                    text = { Text("Delete", color = VoxaDnd) },
                    onClick = { onDelete(); showMenu = false },
                    leadingIcon = { Icon(Icons.Filled.Delete, contentDescription = null, tint = VoxaDnd) },
                )
            }
            DropdownMenuItem(
                text = { Text("Copy", color = VoxaTextPrimary) },
                onClick = { onCopy(); showMenu = false },
                leadingIcon = { Icon(Icons.Filled.ContentCopy, contentDescription = null, tint = VoxaTextMuted) },
            )
        }
    }
}

// ──────────────────────────────────────────────
// Chat Input Bar
// ──────────────────────────────────────────────

@Composable
fun ChatInputBar(
    editing: Any?,
    hint: String,
    messageText: String,
    onTextChange: (String) -> Unit,
    isSending: Boolean,
    onSend: () -> Unit,
    onCancelEdit: () -> Unit,
) {
    val canSend = messageText.isNotBlank() && !isSending

    Column {
        if (editing != null) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(VoxaSurfaceVar)
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(Icons.Filled.Edit, contentDescription = null, tint = VoxaRed, modifier = Modifier.size(14.dp))
                Spacer(Modifier.width(8.dp))
                Text("Editing message", color = VoxaTextMuted, fontSize = 12.sp, modifier = Modifier.weight(1f))
                IconButton(onClick = onCancelEdit, modifier = Modifier.size(20.dp)) {
                    Icon(Icons.Filled.Close, contentDescription = "Cancel", tint = VoxaTextDim)
                }
            }
        }

        Divider(color = Color.Black.copy(alpha = 0.4f), thickness = 1.dp)

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(VoxaChatBg)
                .padding(horizontal = 12.dp, vertical = 10.dp),
            verticalAlignment = Alignment.Bottom,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            TextField(
                value = messageText,
                onValueChange = onTextChange,
                placeholder = { Text(hint, color = VoxaTextDim, fontSize = 15.sp) },
                modifier = Modifier.weight(1f),
                maxLines = 5,
                colors = TextFieldDefaults.colors(
                    focusedContainerColor = VoxaInput,
                    unfocusedContainerColor = VoxaInput,
                    focusedIndicatorColor = Color.Transparent,
                    unfocusedIndicatorColor = Color.Transparent,
                    focusedTextColor = VoxaTextPrimary,
                    unfocusedTextColor = VoxaTextPrimary,
                    cursorColor = VoxaRed,
                ),
                shape = RoundedCornerShape(22.dp),
                textStyle = LocalTextStyle.current.copy(fontSize = 15.sp),
            )

            Box(
                modifier = Modifier
                    .size(40.dp)
                    .clip(CircleShape)
                    .background(if (canSend) VoxaRed else VoxaSurfaceVar)
                    .clickable(enabled = canSend) { onSend() },
                contentAlignment = Alignment.Center,
            ) {
                if (isSending) {
                    CircularProgressIndicator(
                        color = Color.White,
                        strokeWidth = 2.dp,
                        modifier = Modifier.size(18.dp),
                    )
                } else {
                    Icon(
                        if (editing != null) Icons.Filled.Check else Icons.Filled.Send,
                        contentDescription = "Send",
                        tint = if (canSend) Color.White else VoxaTextDim,
                        modifier = Modifier.size(18.dp),
                    )
                }
            }
        }
    }
}

// ──────────────────────────────────────────────
// Welcome Header
// ──────────────────────────────────────────────

@Composable
fun WelcomeHeader(name: String, subtitle: String) {
    Column(modifier = Modifier.padding(horizontal = 16.dp, vertical = 24.dp)) {
        Box(
            modifier = Modifier
                .size(56.dp)
                .clip(CircleShape)
                .background(VoxaSurface),
            contentAlignment = Alignment.Center,
        ) {
            Icon(Icons.Filled.Tag, contentDescription = null, tint = VoxaTextMuted, modifier = Modifier.size(28.dp))
        }
        Spacer(Modifier.height(12.dp))
        Text(name, color = VoxaTextPrimary, fontSize = 22.sp, fontWeight = FontWeight.Bold)
        Text(subtitle, color = VoxaTextMuted, fontSize = 14.sp)
        Spacer(Modifier.height(8.dp))
        Divider(color = Color.White.copy(alpha = 0.06f))
    }
}
