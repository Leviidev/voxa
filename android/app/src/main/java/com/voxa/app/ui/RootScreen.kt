package com.voxa.app.ui

import androidx.compose.animation.*
import androidx.compose.runtime.*
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.voxa.app.ui.auth.AuthScreen
import com.voxa.app.ui.main.MainScreen
import com.voxa.app.viewmodel.*

@Composable
fun RootScreen(
    authViewModel: AuthViewModel,
    serversViewModel: ServersViewModel,
    chatViewModel: ChatViewModel,
    dmViewModel: DMViewModel,
) {
    val isLoggedIn by authViewModel.isLoggedIn.collectAsState()
    val navController = rememberNavController()

    LaunchedEffect(isLoggedIn) {
        if (isLoggedIn) navController.navigate("main") { popUpTo("auth") { inclusive = true } }
        else navController.navigate("auth") { popUpTo("main") { inclusive = true } }
    }

    NavHost(
        navController = navController,
        startDestination = if (isLoggedIn) "main" else "auth",
    ) {
        composable(
            "auth",
            enterTransition = { slideInHorizontally { -it } },
            exitTransition  = { slideOutHorizontally { -it } },
        ) {
            AuthScreen(authViewModel)
        }
        composable(
            "main",
            enterTransition = { slideInHorizontally { it } },
            exitTransition  = { slideOutHorizontally { it } },
        ) {
            MainScreen(
                authViewModel    = authViewModel,
                serversViewModel = serversViewModel,
                chatViewModel    = chatViewModel,
                dmViewModel      = dmViewModel,
            )
        }
    }
}
