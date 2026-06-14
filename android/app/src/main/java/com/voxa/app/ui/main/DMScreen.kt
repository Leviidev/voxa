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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.*
import com.voxa.app.data.model.*
import com.voxa.app.ui.components.*
import com.voxa.app.ui.theme.*
import com.voxa.app.viewmodel.DMViewModel

// ──────────────────────────────────────────────
// DM List
// ──────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DMListScreen(
    dmViewModel: DMViewModel,
    onDMClick: (DMChannel) -> Unit,
    onNewDM: (String) -> Unit,
) {
    val channels by dmViewModel.channels.collectAsState()
    val isLoading by dmViewModel.isLoadingChannels.collectAsState()
    var searchText by remember { mutableStateOf("") }
    var showNewDM by remember { mutableStateOf(false) }

    val filtered = if (searchText.isBlank()) channels
    else channels.filter { it.displayName.contains(searchText, ignoreCase = true) }

    Column(modifier = Modifier.fillMaxSize().background(VoxaBg)) {
        TopBar(
            title = "Messages",
            actions = {
                IconButton(onClick = { showNewDM = true }) {
                    Icon(Icons.Filled.EditNote, contentDescription = "New DM", tint = VoxaTextMuted)
                }
            },
        )

        // Search bar
        TextField(
            value = searchText,
            onValueChange = { searchText = it },
            placeholder = { Text("Find or start a conversation", color = VoxaTextDim, fontSize = 14.sp) },
            leadingIcon = { Icon(Icons.Filled.Search, contentDescription = null, tint = VoxaTextMuted, modifier = Modifier.size(18.dp)) },
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 8.dp),
            singleLine = true,
            colors = TextFieldDefaults.colors(
                focusedContainerColor = VoxaSurface,
                unfocusedContainerColor = VoxaSurface,
                focusedIndicatorColor = Color.Transparent,
                unfocusedIndicatorColor = Color.Transparent,
                focusedTextColor = VoxaTextPrimary,
                unfocusedTextColor = VoxaTextPrimary,
                cursorColor = VoxaRed,
            ),
            shape = RoundedCornerShape(8.dp),
        )

        if (isLoading) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = VoxaRed)
            }
        } else if (filtered.isEmpty()) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Icon(Icons.Filled.ChatBubble, contentDescription = null, tint = VoxaTextDim, modifier = Modifier.size(48.dp))
                    Text("No Direct Messages", color = VoxaTextPrimary, fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
                    Text("Tap the pencil icon to start a conversation", color = VoxaTextMuted, fontSize = 14.sp)
                }
            }
        } else {
            LazyColumn(contentPadding = PaddingValues(vertical = 4.dp)) {
                items(filtered, key = { it.id }) { ch ->
                    DMChannelRow(ch) { onDMClick(ch) }
                }
            }
        }
    }

    if (showNewDM) {
        NewDMDialog(
            onDismiss = { showNewDM = false },
            onOpen = { username -> onNewDM(username); showNewDM = false },
        )
    }
}

@Composable
fun DMChannelRow(channel: DMChannel, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() }
            .padding(horizontal = 12.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        val other = channel.other
        UserAvatar(
            letter = other?.avatarLetter ?: "?",
            name = other?.username ?: "",
            avatarColorHex = other?.avatarColor,
            status = other?.statusEnum,
            size = 44.dp,
        )
        Column(modifier = Modifier.weight(1f)) {
            Text(channel.displayName, color = VoxaTextPrimary, fontSize = 15.sp, fontWeight = FontWeight.SemiBold, maxLines = 1)
            channel.lastMessage?.let { last ->
                Text(last.content, color = VoxaTextMuted, fontSize = 13.sp, maxLines = 1)
            } ?: Text("No messages yet", color = VoxaTextDim, fontSize = 13.sp)
        }
        channel.lastMessage?.let { last ->
            Text(formatShortTime(last.timestamp), color = VoxaTextDim, fontSize = 11.sp)
        }
    }
}

// ──────────────────────────────────────────────
// DM Chat
// ──────────────────────────────────────────────

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun DMChatScreen(
    channel: DMChannel,
    currentUser: User,
    dmViewModel: DMViewModel,
    onBack: () -> Unit,
) {
    val messagesMap by dmViewModel.messages.collectAsState()
    val messages = messagesMap[channel.id] ?: emptyList()
    val isSending by dmViewModel.isSending.collectAsState()
    var messageText by remember { mutableStateOf("") }
    var editingMessage by remember { mutableStateOf<DMMessage?>(null) }
    var editText by remember { mutableStateOf("") }
    val listState = rememberLazyListState()

    LaunchedEffect(channel.id) {
        dmViewModel.loadMessages(channel.id)
        dmViewModel.markRead(channel.id)
    }
    LaunchedEffect(messages.size) {
        if (messages.isNotEmpty()) listState.animateScrollToItem(messages.size - 1)
    }

    Column(modifier = Modifier.fillMaxSize().background(VoxaChatBg)) {
        TopBar(
            title = channel.displayName,
            onBack = onBack,
            actions = {
                channel.other?.let { other ->
                    UserAvatar(
                        letter = other.avatarLetter,
                        name = other.username,
                        avatarColorHex = other.avatarColor,
                        status = other.statusEnum,
                        size = 28.dp,
                    )
                    Spacer(Modifier.width(8.dp))
                }
            },
        )

        LazyColumn(
            state = listState,
            modifier = Modifier.weight(1f),
            contentPadding = PaddingValues(bottom = 8.dp),
        ) {
            // Welcome header
            item {
                DMWelcomeHeader(channel)
            }

            itemsIndexed(messages, key = { _, m -> m.id }) { idx, msg ->
                val prev = if (idx > 0) messages[idx - 1] else null
                val grouped = prev != null && prev.authorId == msg.authorId &&
                    try {
                        val diff = java.time.Duration.between(
                            java.time.Instant.parse(prev.timestamp),
                            java.time.Instant.parse(msg.timestamp)
                        ).seconds
                        diff < 300
                    } catch (_: Exception) { false }
                val isOwn = msg.authorId == currentUser.id

                DMMessageRow(
                    message = msg,
                    grouped = grouped,
                    isOwn = isOwn,
                    onEdit = { editingMessage = msg; editText = msg.content },
                    onDelete = { dmViewModel.delete(msg, channel.id) },
                )
            }
        }

        ChatInputBar(
            editing = editingMessage,
            hint = "Message ${channel.displayName}",
            messageText = if (editingMessage != null) editText else messageText,
            onTextChange = { if (editingMessage != null) editText = it else messageText = it },
            isSending = isSending,
            onSend = {
                if (editingMessage != null) {
                    dmViewModel.edit(editingMessage!!, editText.trim(), channel.id)
                    editingMessage = null; editText = ""
                } else {
                    dmViewModel.send(messageText.trim(), channel, currentUser)
                    messageText = ""
                }
            },
            onCancelEdit = { editingMessage = null; editText = "" },
        )
    }
}

@Composable
fun DMWelcomeHeader(channel: DMChannel) {
    Column(modifier = Modifier.padding(horizontal = 16.dp, vertical = 24.dp)) {
        channel.other?.let { other ->
            UserAvatar(
                letter = other.avatarLetter,
                name = other.username,
                avatarColorHex = other.avatarColor,
                size = 64.dp,
            )
        }
        Spacer(Modifier.height(12.dp))
        Text(channel.displayName, color = VoxaTextPrimary, fontSize = 22.sp, fontWeight = FontWeight.Bold)
        channel.other?.let {
            Text("@${it.username}#${it.discriminator}", color = VoxaTextMuted, fontSize = 14.sp)
        }
        Text("This is the start of your conversation.", color = VoxaTextDim, fontSize = 13.sp)
        Spacer(Modifier.height(8.dp))
        Divider(color = Color.White.copy(alpha = 0.06f))
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun DMMessageRow(
    message: DMMessage,
    grouped: Boolean,
    isOwn: Boolean,
    onEdit: () -> Unit,
    onDelete: () -> Unit,
) {
    var showMenu by remember { mutableStateOf(false) }

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .combinedClickable(onClick = {}, onLongClick = { showMenu = true })
            .padding(horizontal = 16.dp, vertical = if (grouped) 1.dp else 6.dp),
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
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        message.effectiveName,
                        color = if (isOwn) VoxaRed else VoxaTextPrimary,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 15.sp,
                    )
                    Text(formatShortTime(message.timestamp), color = VoxaTextDim, fontSize = 11.sp)
                }
            }
            Text(
                message.content + if (message.edited) " (edited)" else "",
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
                    leadingIcon = { Icon(Icons.Filled.Edit, null, tint = VoxaTextMuted) },
                )
                DropdownMenuItem(
                    text = { Text("Delete", color = VoxaDnd) },
                    onClick = { onDelete(); showMenu = false },
                    leadingIcon = { Icon(Icons.Filled.Delete, null, tint = VoxaDnd) },
                )
            }
        }
    }
}

// ──────────────────────────────────────────────
// New DM Dialog
// ──────────────────────────────────────────────

@Composable
fun NewDMDialog(onDismiss: () -> Unit, onOpen: (String) -> Unit) {
    var username by remember { mutableStateOf("") }
    AlertDialog(
        onDismissRequest = onDismiss,
        confirmButton = {
            TextButton(onClick = { if (username.isNotBlank()) onOpen(username.trim()) }, enabled = username.isNotBlank()) {
                Text("Open", color = VoxaRed)
            }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel", color = VoxaTextMuted) } },
        title = { Text("New Message", color = VoxaTextPrimary) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Enter a username to start a conversation.", color = VoxaTextMuted, fontSize = 13.sp)
                OutlinedTextField(
                    value = username,
                    onValueChange = { username = it },
                    label = { Text("username or username#1234") },
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = VoxaRed, unfocusedBorderColor = VoxaSurfaceVar,
                        focusedLabelColor = VoxaRed, unfocusedLabelColor = VoxaTextMuted,
                        focusedTextColor = VoxaTextPrimary, unfocusedTextColor = VoxaTextPrimary,
                        focusedContainerColor = VoxaSurface, unfocusedContainerColor = VoxaSurface,
                        cursorColor = VoxaRed,
                    ),
                )
            }
        },
        containerColor = VoxaSurface,
    )
}
