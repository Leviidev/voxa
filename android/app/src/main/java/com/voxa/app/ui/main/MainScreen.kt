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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.*
import androidx.navigation.compose.*
import com.voxa.app.data.model.*
import com.voxa.app.ui.components.UserAvatar
import com.voxa.app.ui.components.avatarColorForName
import com.voxa.app.ui.settings.SettingsScreen
import com.voxa.app.ui.theme.*
import com.voxa.app.viewmodel.*

// ──────────────────────────────────────────────
// Nav items
// ──────────────────────────────────────────────

sealed class BottomTab(val route: String, val icon: ImageVector, val label: String) {
    object Servers  : BottomTab("servers",  Icons.Filled.Forum,       "Servers")
    object Messages : BottomTab("messages", Icons.Filled.Message,     "Messages")
    object Friends  : BottomTab("friends",  Icons.Filled.People,      "Friends")
    object Profile  : BottomTab("profile",  Icons.Filled.Person,      "Profile")
}

val bottomTabs = listOf(BottomTab.Servers, BottomTab.Messages, BottomTab.Friends, BottomTab.Profile)

// ──────────────────────────────────────────────
// Main Screen
// ──────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainScreen(
    authViewModel: AuthViewModel,
    serversViewModel: ServersViewModel,
    chatViewModel: ChatViewModel,
    dmViewModel: DMViewModel,
    friendsViewModel: com.voxa.app.viewmodel.FriendsViewModel = androidx.lifecycle.viewmodel.compose.viewModel(),
) {
    val navController = rememberNavController()
    val currentBackStack by navController.currentBackStackEntryAsState()
    val currentRoute = currentBackStack?.destination?.route
    val showBottomBar = currentRoute in bottomTabs.map { it.route }

    LaunchedEffect(Unit) {
        serversViewModel.load()
        dmViewModel.load()
    }

    Scaffold(
        containerColor = VoxaBg,
        bottomBar = {
            if (showBottomBar) {
                NavigationBar(containerColor = VoxaSurface, tonalElevation = 0.dp) {
                    bottomTabs.forEach { tab ->
                        val selected = currentRoute == tab.route
                        NavigationBarItem(
                            selected = selected,
                            onClick = {
                                navController.navigate(tab.route) {
                                    popUpTo(navController.graph.startDestinationId) { saveState = true }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            },
                            icon = { Icon(tab.icon, tab.label, tint = if (selected) VoxaRed else VoxaTextMuted) },
                            label = { Text(tab.label, color = if (selected) VoxaRed else VoxaTextMuted, fontSize = 11.sp) },
                            colors = NavigationBarItemDefaults.colors(indicatorColor = VoxaRed.copy(alpha = 0.15f)),
                        )
                    }
                }
            }
        },
    ) { padding ->
        NavHost(navController, startDestination = BottomTab.Servers.route, modifier = Modifier.padding(padding)) {

            // ── Servers ──────────────────────────────────────────
            composable(BottomTab.Servers.route) {
                ServersTabScreen(serversViewModel) { server ->
                    serversViewModel.selectServer(server)
                    navController.navigate("server_detail")
                }
            }
            composable("server_detail") {
                val server by serversViewModel.selectedServer.collectAsState()
                server?.let { srv ->
                    ServerDetailScreen(srv, onBack = { navController.popBackStack() }) { ch ->
                        serversViewModel.selectChannel(ch)
                        navController.navigate(if (ch.isText) "chat" else "voice")
                    }
                }
            }
            composable("chat") {
                val server by serversViewModel.selectedServer.collectAsState()
                val channel by serversViewModel.selectedChannel.collectAsState()
                val user by authViewModel.user.collectAsState()
                if (server != null && channel != null && user != null) {
                    ChatScreen(channel!!, server!!, user!!, chatViewModel) { navController.popBackStack() }
                }
            }
            composable("voice") {
                val channel by serversViewModel.selectedChannel.collectAsState()
                VoiceChannelScreen(channel) { navController.popBackStack() }
            }

            // ── Messages ─────────────────────────────────────────
            composable(BottomTab.Messages.route) {
                DMListScreen(
                    dmViewModel = dmViewModel,
                    onDMClick = { ch -> navController.navigate("dm_chat/${ch.id}") },
                    onNewDM = { username ->
                        dmViewModel.openDM(username) { ch ->
                            ch?.let { navController.navigate("dm_chat/${it.id}") }
                        }
                    },
                )
            }
            composable("dm_chat/{dmId}") { back ->
                val dmId = back.arguments?.getString("dmId") ?: return@composable
                val user by authViewModel.user.collectAsState()
                val channels by dmViewModel.channels.collectAsState()
                val channel = channels.find { it.id == dmId }
                if (channel != null && user != null) {
                    DMChatScreen(channel, user!!, dmViewModel) { navController.popBackStack() }
                }
            }

            // ── Friends ──────────────────────────────────────────
            composable(BottomTab.Friends.route) {
                FriendsScreen(vm = friendsViewModel)
            }

            // ── Profile ──────────────────────────────────────────
            composable(BottomTab.Profile.route) {
                val user by authViewModel.user.collectAsState()
                ProfileTabScreen(user, onNavigate = { navController.navigate(it) }, onLogout = { authViewModel.logout() })
            }
            composable("account_settings") {
                val user by authViewModel.user.collectAsState()
                SettingsScreen("account", user, { navController.popBackStack() }) { authViewModel.updateUser(it) }
            }
            composable("profile_settings") {
                val user by authViewModel.user.collectAsState()
                SettingsScreen("profile", user, { navController.popBackStack() }) { authViewModel.updateUser(it) }
            }
            composable("privacy_settings")      { SettingsScreen("privacy",       null, { navController.popBackStack() }) {} }
            composable("notification_settings") { SettingsScreen("notifications", null, { navController.popBackStack() }) {} }
            composable("appearance_settings")   { SettingsScreen("appearance",    null, { navController.popBackStack() }) {} }
            composable("password_settings")     { SettingsScreen("password",      null, { navController.popBackStack() }) {} }
        }
    }
}

// ──────────────────────────────────────────────
// Servers Tab
// ──────────────────────────────────────────────

@Composable
fun ServersTabScreen(serversViewModel: ServersViewModel, onServerClick: (VoxaServer) -> Unit) {
    val servers by serversViewModel.servers.collectAsState()
    val isLoading by serversViewModel.isLoading.collectAsState()
    var showCreate by remember { mutableStateOf(false) }
    var showJoin by remember { mutableStateOf(false) }

    Column(modifier = Modifier.fillMaxSize().background(VoxaBg)) {
        TopBar(title = "Servers") {
            Row {
                IconButton(onClick = { showJoin = true }) {
                    Icon(Icons.Filled.Link, "Join", tint = VoxaTextMuted)
                }
                IconButton(onClick = { showCreate = true }) {
                    Icon(Icons.Filled.Add, "Create", tint = VoxaTextMuted)
                }
            }
        }

        if (isLoading) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = VoxaRed)
            }
        } else if (servers.isEmpty()) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Icon(Icons.Filled.Forum, null, tint = VoxaTextDim, modifier = Modifier.size(48.dp))
                    Text("No servers yet", color = VoxaTextPrimary, fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
                    Text("Create or join a server to get started", color = VoxaTextMuted, fontSize = 14.sp)
                }
            }
        } else {
            LazyColumn(contentPadding = PaddingValues(vertical = 8.dp)) {
                items(servers) { srv -> ServerRow(srv) { onServerClick(srv) } }
            }
        }
    }

    if (showCreate) CreateServerDialog(onDismiss = { showCreate = false }) { name ->
        serversViewModel.createServer(name) { showCreate = false }
    }
    if (showJoin) JoinServerDialog(onDismiss = { showJoin = false }) { code ->
        serversViewModel.joinByInvite(code) { showJoin = false }
    }
}

@Composable
fun ServerRow(server: VoxaServer, onClick: () -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth().clickable { onClick() }.padding(horizontal = 16.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Box(
            modifier = Modifier.size(48.dp).clip(RoundedCornerShape(16.dp))
                .background(Color(avatarColorForName(server.name))),
            contentAlignment = Alignment.Center,
        ) {
            Text(server.acronym.take(2), color = Color.White, fontWeight = FontWeight.Bold, fontSize = 16.sp)
        }
        Column(modifier = Modifier.weight(1f)) {
            Text(server.name, color = VoxaTextPrimary, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
            Text("${server.members.size} member${if (server.members.size == 1) "" else "s"}", color = VoxaTextMuted, fontSize = 12.sp)
        }
        Icon(Icons.Filled.ChevronRight, null, tint = VoxaTextDim, modifier = Modifier.size(20.dp))
    }
}

// ──────────────────────────────────────────────
// Server Detail
// ──────────────────────────────────────────────

@Composable
fun ServerDetailScreen(server: VoxaServer, onBack: () -> Unit, onChannelClick: (VoxaChannel) -> Unit) {
    Column(modifier = Modifier.fillMaxSize().background(VoxaBg)) {
        TopBar(title = server.name, onBack = onBack)
        LazyColumn(contentPadding = PaddingValues(bottom = 16.dp)) {
            server.categories.forEach { cat ->
                item {
                    Text(
                        cat.name.uppercase(), color = VoxaTextMuted, fontSize = 11.sp,
                        fontWeight = FontWeight.SemiBold, letterSpacing = 0.8.sp,
                        modifier = Modifier.padding(start = 16.dp, top = 16.dp, bottom = 4.dp),
                    )
                }
                items(cat.channels) { ch -> ChannelRow(ch) { onChannelClick(ch) } }
            }
        }
    }
}

@Composable
fun ChannelRow(channel: VoxaChannel, onClick: () -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth().clickable { onClick() }.padding(horizontal = 16.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Icon(
            if (channel.type == "voice") Icons.Filled.VolumeUp else Icons.Filled.Tag,
            null, tint = VoxaTextMuted, modifier = Modifier.size(20.dp),
        )
        Text(channel.name, color = VoxaTextSec, fontSize = 15.sp)
    }
}

// ──────────────────────────────────────────────
// Profile Tab
// ──────────────────────────────────────────────

@Composable
fun ProfileTabScreen(user: User?, onNavigate: (String) -> Unit, onLogout: () -> Unit) {
    var showLogout by remember { mutableStateOf(false) }
    Column(modifier = Modifier.fillMaxSize().background(VoxaBg)) {
        TopBar(title = "Profile")
        user?.let { u ->
            Row(
                modifier = Modifier.fillMaxWidth().background(VoxaSurface).padding(16.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(14.dp),
            ) {
                UserAvatar(letter = u.avatarLetter, name = u.username, avatarColorHex = u.avatarColor,
                    status = u.statusEnum, size = 56.dp)
                Column {
                    Text(u.effectiveName, color = VoxaTextPrimary, fontSize = 18.sp, fontWeight = FontWeight.Bold)
                    Text("#${u.discriminator}", color = VoxaTextMuted, fontSize = 13.sp)
                    Text(u.email, color = VoxaTextDim, fontSize = 12.sp)
                }
            }
            Spacer(Modifier.height(16.dp))
            listOf(
                Triple("My Account",      Icons.Filled.Person,        "account_settings"),
                Triple("User Profile",    Icons.Filled.Edit,          "profile_settings"),
                Triple("Privacy",         Icons.Filled.Lock,          "privacy_settings"),
                Triple("Notifications",   Icons.Filled.Notifications, "notification_settings"),
                Triple("Appearance",      Icons.Filled.Palette,       "appearance_settings"),
                Triple("Change Password", Icons.Filled.Key,           "password_settings"),
            ).forEach { (label, icon, route) ->
                SettingsNavRow(label, icon) { onNavigate(route) }
            }
            Spacer(Modifier.height(8.dp))
            Row(
                modifier = Modifier.fillMaxWidth().clickable { showLogout = true }.padding(horizontal = 16.dp, vertical = 14.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(14.dp),
            ) {
                Icon(Icons.Filled.Logout, null, tint = VoxaDnd, modifier = Modifier.size(22.dp))
                Text("Log Out", color = VoxaDnd, fontSize = 15.sp)
            }
        }
    }
    if (showLogout) AlertDialog(
        onDismissRequest = { showLogout = false },
        confirmButton = { TextButton(onClick = { onLogout(); showLogout = false }) { Text("Log Out", color = VoxaDnd) } },
        dismissButton = { TextButton(onClick = { showLogout = false }) { Text("Cancel", color = VoxaTextMuted) } },
        title = { Text("Log Out", color = VoxaTextPrimary) },
        text  = { Text("Are you sure you want to log out?", color = VoxaTextMuted) },
        containerColor = VoxaSurface,
    )
}

@Composable
fun SettingsNavRow(label: String, icon: ImageVector, onClick: () -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth().clickable { onClick() }.padding(horizontal = 16.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Icon(icon, null, tint = VoxaTextMuted, modifier = Modifier.size(22.dp))
        Text(label, color = VoxaTextPrimary, fontSize = 15.sp, modifier = Modifier.weight(1f))
        Icon(Icons.Filled.ChevronRight, null, tint = VoxaTextDim, modifier = Modifier.size(18.dp))
    }
}

// ──────────────────────────────────────────────
// Voice Channel placeholder
// ──────────────────────────────────────────────

@Composable
fun VoiceChannelScreen(channel: VoxaChannel?, onBack: () -> Unit) {
    Column(modifier = Modifier.fillMaxSize().background(VoxaBg)) {
        TopBar(title = channel?.name ?: "Voice", onBack = onBack)
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Icon(Icons.Filled.VolumeUp, null, tint = VoxaTextDim, modifier = Modifier.size(56.dp))
                Text("Voice channels", color = VoxaTextPrimary, fontSize = 18.sp, fontWeight = FontWeight.SemiBold)
                Text("Coming soon for Android", color = VoxaTextMuted, fontSize = 14.sp)
            }
        }
    }
}

// ──────────────────────────────────────────────
// Shared TopBar
// ──────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TopBar(
    title: String,
    onBack: (() -> Unit)? = null,
    actions: (@Composable () -> Unit)? = null,
) {
    TopAppBar(
        title = { Text(title, fontWeight = FontWeight.SemiBold, fontSize = 18.sp) },
        navigationIcon = {
            if (onBack != null) IconButton(onClick = onBack) {
                Icon(Icons.Filled.ArrowBack, "Back", tint = VoxaRed)
            }
        },
        actions = { actions?.invoke() },
        colors = TopAppBarDefaults.topAppBarColors(
            containerColor = VoxaSurface,
            titleContentColor = VoxaTextPrimary,
        ),
    )
}

// ──────────────────────────────────────────────
// Dialogs
// ──────────────────────────────────────────────

@Composable
fun CreateServerDialog(onDismiss: () -> Unit, onConfirm: (String) -> Unit) {
    var name by remember { mutableStateOf("") }
    AlertDialog(
        onDismissRequest = onDismiss,
        confirmButton = { TextButton(onClick = { if (name.isNotBlank()) onConfirm(name) }, enabled = name.isNotBlank()) { Text("Create", color = VoxaRed) } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel", color = VoxaTextMuted) } },
        title = { Text("Create Server", color = VoxaTextPrimary) },
        text = {
            OutlinedTextField(
                value = name, onValueChange = { name = it }, label = { Text("Server name") }, singleLine = true,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = VoxaRed, unfocusedBorderColor = VoxaSurfaceVar,
                    focusedLabelColor = VoxaRed, unfocusedLabelColor = VoxaTextMuted,
                    focusedTextColor = VoxaTextPrimary, unfocusedTextColor = VoxaTextPrimary,
                    focusedContainerColor = VoxaSurface, unfocusedContainerColor = VoxaSurface,
                    cursorColor = VoxaRed,
                ),
            )
        },
        containerColor = VoxaSurface,
    )
}

@Composable
fun JoinServerDialog(onDismiss: () -> Unit, onConfirm: (String) -> Unit) {
    var code by remember { mutableStateOf("") }
    AlertDialog(
        onDismissRequest = onDismiss,
        confirmButton = { TextButton(onClick = { if (code.isNotBlank()) onConfirm(code) }, enabled = code.isNotBlank()) { Text("Join", color = VoxaRed) } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel", color = VoxaTextMuted) } },
        title = { Text("Join Server", color = VoxaTextPrimary) },
        text = {
            OutlinedTextField(
                value = code, onValueChange = { code = it }, label = { Text("Invite code") }, singleLine = true,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = VoxaRed, unfocusedBorderColor = VoxaSurfaceVar,
                    focusedLabelColor = VoxaRed, unfocusedLabelColor = VoxaTextMuted,
                    focusedTextColor = VoxaTextPrimary, unfocusedTextColor = VoxaTextPrimary,
                    focusedContainerColor = VoxaSurface, unfocusedContainerColor = VoxaSurface,
                    cursorColor = VoxaRed,
                ),
            )
        },
        containerColor = VoxaSurface,
    )
}
