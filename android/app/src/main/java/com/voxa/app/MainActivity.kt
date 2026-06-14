package com.voxa.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import com.voxa.app.ui.RootScreen
import com.voxa.app.ui.theme.VoxaTheme
import com.voxa.app.viewmodel.*

class MainActivity : ComponentActivity() {

    private val authViewModel: AuthViewModel by viewModels { AuthViewModelFactory(applicationContext) }
    private val serversViewModel: ServersViewModel by viewModels()
    private val chatViewModel: ChatViewModel by viewModels()
    private val dmViewModel: DMViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)

        setContent {
            VoxaTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    RootScreen(
                        authViewModel = authViewModel,
                        serversViewModel = serversViewModel,
                        chatViewModel = chatViewModel,
                        dmViewModel = dmViewModel,
                    )
                }
            }
        }
    }
}
