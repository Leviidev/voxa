package com.voxa.app.ui.main

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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
import com.voxa.app.data.model.Friend
import com.voxa.app.data.model.FriendRequest
import com.voxa.app.ui.components.UserAvatar
import com.voxa.app.ui.components.avatarColorForName
import com.voxa.app.ui.theme.*
import com.voxa.app.viewmodel.FriendsViewModel

@Composable
fun FriendsScreen(vm: FriendsViewModel) {
    val friends by vm.friends.collectAsState()
    val requests by vm.requests.collectAsState()
    val isLoading by vm.isLoading.collectAsState()
    val error by vm.error.collectAsState()
    var selectedTab by remember { mutableStateOf(0) }

    val incoming = requests.filter { it.incoming }
    val outgoing = requests.filter { !it.incoming }
    val pendingCount = incoming.size

    LaunchedEffect(Unit) { vm.load() }

    Column(modifier = Modifier.fillMaxSize().background(VoxaBg)) {
        TopBar(title = "Friends")

        // Tab row
        TabRow(
            selectedTabIndex = selectedTab,
            containerColor = VoxaSurface,
            contentColor = VoxaRed,
            indicator = { tabPositions ->
                TabRowDefaults.Indicator(
                    modifier = Modifier.tabIndicatorOffset(tabPositions[selectedTab]),
                    color = VoxaRed,
                )
            },
        ) {
            Tab(selected = selectedTab == 0, onClick = { selectedTab = 0 },
                text = { Text("All", fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = if (selectedTab == 0) VoxaRed else VoxaTextMuted) })
            Tab(selected = selectedTab == 1, onClick = { selectedTab = 1 },
                text = {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text("Pending", fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = if (selectedTab == 1) VoxaRed else VoxaTextMuted)
                        if (pendingCount > 0) {
                            Box(
                                modifier = Modifier.size(18.dp).clip(CircleShape).background(VoxaRed),
                                contentAlignment = Alignment.Center
                            ) {
                                Text("$pendingCount", color = Color.White, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            )
            Tab(selected = selectedTab == 2, onClick = { selectedTab = 2 },
                text = { Text("Add Friend", fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = if (selectedTab == 2) VoxaRed else VoxaTextMuted) })
        }

        if (isLoading && friends.isEmpty() && requests.isEmpty()) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = VoxaRed)
            }
        } else {
            when (selectedTab) {
                0 -> AllFriendsTab(friends, onRemove = { vm.removeFriend(it) })
                1 -> PendingTab(incoming, outgoing, onAccept = { vm.accept(it) }, onDecline = { vm.decline(it) })
                2 -> AddFriendTab(onSend = { username, cb -> vm.sendRequest(username, cb) })
            }
        }

        error?.let { err ->
            LaunchedEffect(err) { vm.clearError() }
        }
    }
}

@Composable
private fun AllFriendsTab(friends: List<Friend>, onRemove: (Friend) -> Unit) {
    if (friends.isEmpty()) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Icon(Icons.Filled.People, null, tint = VoxaTextDim, modifier = Modifier.size(48.dp))
                Text("No friends yet", color = VoxaTextPrimary, fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
                Text("Add someone to get started!", color = VoxaTextMuted, fontSize = 14.sp)
            }
        }
        return
    }
    LazyColumn(contentPadding = PaddingValues(vertical = 8.dp)) {
        item {
            Text(
                "ALL FRIENDS — ${friends.size}",
                color = VoxaTextMuted, fontSize = 11.sp, fontWeight = FontWeight.SemiBold, letterSpacing = 0.8.sp,
                modifier = Modifier.padding(start = 16.dp, top = 8.dp, bottom = 4.dp)
            )
        }
        items(friends) { f ->
            FriendRow(f, onRemove = { onRemove(f) })
        }
    }
}

@Composable
private fun FriendRow(friend: Friend, onRemove: () -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Box(
            modifier = Modifier.size(40.dp).clip(CircleShape)
                .background(Color(avatarColorForName(friend.user.effectiveName))),
            contentAlignment = Alignment.Center
        ) {
            Text(friend.user.avatarLetter, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 16.sp)
        }
        Column(modifier = Modifier.weight(1f)) {
            Text(friend.user.effectiveName, color = VoxaTextPrimary, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
            Text("@${friend.user.username}#${friend.user.discriminator}", color = VoxaTextMuted, fontSize = 12.sp)
        }
        IconButton(onClick = onRemove) {
            Icon(Icons.Filled.PersonRemove, null, tint = VoxaTextMuted)
        }
    }
}

@Composable
private fun PendingTab(
    incoming: List<FriendRequest>,
    outgoing: List<FriendRequest>,
    onAccept: (FriendRequest) -> Unit,
    onDecline: (FriendRequest) -> Unit,
) {
    if (incoming.isEmpty() && outgoing.isEmpty()) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Icon(Icons.Filled.HourglassEmpty, null, tint = VoxaTextDim, modifier = Modifier.size(48.dp))
                Text("No pending requests", color = VoxaTextPrimary, fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
            }
        }
        return
    }
    LazyColumn(contentPadding = PaddingValues(vertical = 8.dp)) {
        if (incoming.isNotEmpty()) {
            item {
                Text("INCOMING — ${incoming.size}", color = VoxaTextMuted, fontSize = 11.sp, fontWeight = FontWeight.SemiBold, letterSpacing = 0.8.sp,
                    modifier = Modifier.padding(start = 16.dp, top = 8.dp, bottom = 4.dp))
            }
            items(incoming) { req ->
                RequestRow(req, showAccept = true, onAccept = { onAccept(req) }, onDecline = { onDecline(req) })
            }
        }
        if (outgoing.isNotEmpty()) {
            item {
                Text("OUTGOING — ${outgoing.size}", color = VoxaTextMuted, fontSize = 11.sp, fontWeight = FontWeight.SemiBold, letterSpacing = 0.8.sp,
                    modifier = Modifier.padding(start = 16.dp, top = 16.dp, bottom = 4.dp))
            }
            items(outgoing) { req ->
                RequestRow(req, showAccept = false, onAccept = {}, onDecline = { onDecline(req) })
            }
        }
    }
}

@Composable
private fun RequestRow(
    request: FriendRequest,
    showAccept: Boolean,
    onAccept: () -> Unit,
    onDecline: () -> Unit,
) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Box(
            modifier = Modifier.size(40.dp).clip(CircleShape)
                .background(Color(avatarColorForName(request.user.effectiveName))),
            contentAlignment = Alignment.Center,
        ) {
            Text(request.user.avatarLetter, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 16.sp)
        }
        Column(modifier = Modifier.weight(1f)) {
            Text(request.user.effectiveName, color = VoxaTextPrimary, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
            Text(if (showAccept) "Incoming friend request" else "Pending", color = VoxaTextMuted, fontSize = 12.sp)
        }
        if (showAccept) {
            IconButton(onClick = onAccept) {
                Icon(Icons.Filled.Check, null, tint = Color(0xFF23a55a))
            }
        }
        IconButton(onClick = onDecline) {
            Icon(Icons.Filled.Close, null, tint = VoxaDnd)
        }
    }
}

@Composable
private fun AddFriendTab(onSend: (String, (Boolean, String?) -> Unit) -> Unit) {
    var username by remember { mutableStateOf("") }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var success by remember { mutableStateOf<String?>(null) }

    Column(modifier = Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Text("Add a Friend", color = VoxaTextPrimary, fontSize = 20.sp, fontWeight = FontWeight.Bold)
        Text("Add friends using their Voxa username.", color = VoxaTextMuted, fontSize = 14.sp)

        OutlinedTextField(
            value = username,
            onValueChange = { username = it; error = null; success = null },
            label = { Text("Username") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = VoxaRed, unfocusedBorderColor = VoxaSurfaceVar,
                focusedLabelColor = VoxaRed, unfocusedLabelColor = VoxaTextMuted,
                focusedTextColor = VoxaTextPrimary, unfocusedTextColor = VoxaTextPrimary,
                focusedContainerColor = VoxaSurface, unfocusedContainerColor = VoxaSurface,
                cursorColor = VoxaRed,
            ),
        )

        Button(
            onClick = {
                val name = username.trim()
                if (name.isEmpty()) return@Button
                loading = true
                onSend(name) { ok, msg ->
                    loading = false
                    if (ok) { success = "Request sent to $name!"; username = "" }
                    else { error = msg ?: "Failed to send request" }
                }
            },
            enabled = username.isNotBlank() && !loading,
            colors = ButtonDefaults.buttonColors(containerColor = VoxaRed),
            modifier = Modifier.fillMaxWidth().height(52.dp),
            shape = RoundedCornerShape(14.dp),
        ) {
            if (loading) CircularProgressIndicator(color = Color.White, modifier = Modifier.size(20.dp))
            else Text("Send Friend Request", fontWeight = FontWeight.Bold)
        }

        error?.let { Text(it, color = VoxaDnd, fontSize = 13.sp) }
        success?.let { Text(it, color = Color(0xFF23a55a), fontSize = 13.sp) }
    }
}

@Composable
private fun Modifier.tabIndicatorOffset(tabPosition: TabPosition): Modifier {
    return this.fillMaxWidth()
        .wrapContentSize(Alignment.BottomStart)
        .offset(x = tabPosition.left)
        .width(tabPosition.width)
}
