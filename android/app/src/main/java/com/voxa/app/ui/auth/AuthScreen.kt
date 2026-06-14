package com.voxa.app.ui.auth

import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusDirection
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.*
import androidx.compose.ui.unit.*
import com.voxa.app.ui.theme.*
import com.voxa.app.viewmodel.AuthViewModel

@Composable
fun AuthScreen(viewModel: AuthViewModel) {
    val isLoading by viewModel.isLoading.collectAsState()
    val error by viewModel.error.collectAsState()
    var tab by remember { mutableStateOf(0) } // 0=login, 1=register

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(VoxaBg),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 28.dp, vertical = 32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            // Logo
            Box(
                modifier = Modifier
                    .size(72.dp)
                    .clip(RoundedCornerShape(20.dp))
                    .background(VoxaRed),
                contentAlignment = Alignment.Center,
            ) {
                Text("V", color = Color.White, fontSize = 36.sp, fontWeight = FontWeight.Black)
            }
            Spacer(Modifier.height(16.dp))
            Text(
                if (tab == 0) "Welcome back!" else "Create an account",
                color = VoxaTextPrimary, fontSize = 22.sp, fontWeight = FontWeight.Bold
            )
            Text(
                if (tab == 0) "Sign in to your Voxa account" else "Start chatting with Voxa",
                color = VoxaTextMuted, fontSize = 14.sp
            )
            Spacer(Modifier.height(28.dp))

            // Tab switcher
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(10.dp))
                    .background(VoxaSurface),
            ) {
                listOf("Log In", "Register").forEachIndexed { i, label ->
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(10.dp))
                            .background(if (tab == i) VoxaRed else Color.Transparent)
                            .clickable { tab = i; viewModel.clearError() }
                            .padding(vertical = 10.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(label, color = if (tab == i) Color.White else VoxaTextMuted,
                            fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                    }
                }
            }

            Spacer(Modifier.height(20.dp))

            if (tab == 0) LoginForm(viewModel, isLoading)
            else RegisterForm(viewModel, isLoading)

            error?.let { err ->
                Spacer(Modifier.height(12.dp))
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(8.dp))
                        .background(Color(0xFF3D1A1A))
                        .padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Icon(Icons.Filled.Error, contentDescription = null, tint = VoxaDnd, modifier = Modifier.size(16.dp))
                    Text(err, color = VoxaDnd, fontSize = 13.sp)
                }
            }
        }
    }
}

@Composable
private fun LoginForm(viewModel: AuthViewModel, isLoading: Boolean) {
    val focus = LocalFocusManager.current
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var showPass by remember { mutableStateOf(false) }

    VoxaTextField("Email", email, { email = it }, KeyboardType.Email, ImeAction.Next,
        onNext = { focus.moveFocus(FocusDirection.Down) })
    Spacer(Modifier.height(12.dp))
    VoxaTextField("Password", password, { password = it }, KeyboardType.Password, ImeAction.Done,
        hidden = !showPass, trailingIcon = {
            IconButton(onClick = { showPass = !showPass }) {
                Icon(if (showPass) Icons.Filled.VisibilityOff else Icons.Filled.Visibility,
                    contentDescription = null, tint = VoxaTextMuted)
            }
        }, onDone = { viewModel.login(email, password) })
    Spacer(Modifier.height(20.dp))
    VoxaButton("Log In", enabled = email.isNotBlank() && password.isNotBlank() && !isLoading,
        isLoading = isLoading) { viewModel.login(email, password) }
}

@Composable
private fun RegisterForm(viewModel: AuthViewModel, isLoading: Boolean) {
    val focus = LocalFocusManager.current
    var email by remember { mutableStateOf("") }
    var username by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var showPass by remember { mutableStateOf(false) }

    VoxaTextField("Email", email, { email = it }, KeyboardType.Email, ImeAction.Next,
        onNext = { focus.moveFocus(FocusDirection.Down) })
    Spacer(Modifier.height(12.dp))
    VoxaTextField("Username", username, { username = it }, KeyboardType.Text, ImeAction.Next,
        onNext = { focus.moveFocus(FocusDirection.Down) })
    Spacer(Modifier.height(12.dp))
    VoxaTextField("Password", password, { password = it }, KeyboardType.Password, ImeAction.Done,
        hidden = !showPass, trailingIcon = {
            IconButton(onClick = { showPass = !showPass }) {
                Icon(if (showPass) Icons.Filled.VisibilityOff else Icons.Filled.Visibility,
                    contentDescription = null, tint = VoxaTextMuted)
            }
        }, onDone = { viewModel.register(email, username, password) })
    Spacer(Modifier.height(20.dp))
    VoxaButton("Create Account",
        enabled = email.isNotBlank() && username.isNotBlank() && password.length >= 6 && !isLoading,
        isLoading = isLoading) { viewModel.register(email, username, password) }
}

@Composable
fun VoxaTextField(
    label: String, value: String, onValue: (String) -> Unit,
    keyboardType: KeyboardType = KeyboardType.Text,
    imeAction: ImeAction = ImeAction.Next,
    hidden: Boolean = false,
    trailingIcon: (@Composable () -> Unit)? = null,
    onNext: (() -> Unit)? = null,
    onDone: (() -> Unit)? = null,
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValue,
        label = { Text(label) },
        modifier = Modifier.fillMaxWidth(),
        singleLine = true,
        visualTransformation = if (hidden) PasswordVisualTransformation() else VisualTransformation.None,
        keyboardOptions = KeyboardOptions(keyboardType = keyboardType, imeAction = imeAction),
        keyboardActions = KeyboardActions(
            onNext = { onNext?.invoke() },
            onDone = { onDone?.invoke() },
        ),
        trailingIcon = trailingIcon,
        colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = VoxaRed,
            unfocusedBorderColor = VoxaSurfaceVar,
            focusedLabelColor  = VoxaRed,
            unfocusedLabelColor = VoxaTextMuted,
            focusedContainerColor = VoxaSurface,
            unfocusedContainerColor = VoxaSurface,
            cursorColor = VoxaRed,
            focusedTextColor = VoxaTextPrimary,
            unfocusedTextColor = VoxaTextPrimary,
        ),
        shape = RoundedCornerShape(12.dp),
    )
}

@Composable
fun VoxaButton(
    text: String,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    isLoading: Boolean = false,
    onClick: () -> Unit,
) {
    Button(
        onClick = onClick,
        enabled = enabled && !isLoading,
        modifier = modifier.fillMaxWidth().height(52.dp),
        shape = RoundedCornerShape(14.dp),
        colors = ButtonDefaults.buttonColors(
            containerColor = VoxaRed,
            disabledContainerColor = VoxaSurface,
        ),
    ) {
        if (isLoading) CircularProgressIndicator(color = Color.White, strokeWidth = 2.dp, modifier = Modifier.size(20.dp))
        else Text(text, fontWeight = FontWeight.Bold, fontSize = 15.sp)
    }
}
