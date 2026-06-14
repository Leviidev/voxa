import SwiftUI

struct AuthView: View {
    @EnvironmentObject var auth: AuthViewModel
    @State private var isRegister = false
    @State private var email = ""
    @State private var username = ""
    @State private var password = ""
    @State private var showPassword = false
    @FocusState private var focused: Field?

    enum Field: Hashable { case email, username, password }

    var body: some View {
        ZStack {
            // Background
            LinearGradient(
                colors: [Color(hex: "0a0a0b"), Color(hex: "0f0f12"), Color(hex: "0a0a0b")],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            ).ignoresSafeArea()

            // Subtle red glow top
            RadialGradient(
                gradient: Gradient(colors: [Color(hex: "E53935").opacity(0.08), .clear]),
                center: UnitPoint(x: 0.5, y: 0),
                startRadius: 0,
                endRadius: 400
            ).ignoresSafeArea()

            ScrollView(showsIndicators: false) {
                VStack(spacing: 0) {
                    Spacer(minLength: 60)

                    // Logo
                    VStack(spacing: 10) {
                        ZStack {
                            RoundedRectangle(cornerRadius: 18)
                                .fill(Color(hex: "E53935"))
                                .frame(width: 64, height: 64)
                                .shadow(color: Color(hex: "E53935").opacity(0.4), radius: 20, y: 8)
                            Text("v")
                                .font(.system(size: 36, weight: .black, design: .rounded))
                                .foregroundColor(.white)
                        }
                        Text("voxa")
                            .font(.system(size: 24, weight: .black, design: .rounded))
                            .foregroundColor(.white)
                        Text(isRegister ? "Create your account" : "Welcome back!")
                            .font(.system(size: 14))
                            .foregroundColor(Color(hex: "6b7280"))
                    }
                    .padding(.bottom, 36)

                    // Card
                    VStack(spacing: 20) {
                        // Error
                        if let err = auth.error {
                            HStack(spacing: 10) {
                                Image(systemName: "exclamationmark.triangle.fill")
                                    .foregroundColor(Color(hex: "f23f43"))
                                    .font(.system(size: 13))
                                Text(err)
                                    .font(.system(size: 13))
                                    .foregroundColor(Color(hex: "fca5a5"))
                                    .multilineTextAlignment(.leading)
                                Spacer()
                            }
                            .padding(.horizontal, 14)
                            .padding(.vertical, 12)
                            .background(Color(hex: "f23f43").opacity(0.1))
                            .overlay(
                                RoundedRectangle(cornerRadius: 12)
                                    .stroke(Color(hex: "f23f43").opacity(0.3), lineWidth: 1)
                            )
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                        }

                        // Fields
                        VStack(spacing: 16) {
                            if isRegister {
                                GlassInputField("Username", text: $username,
                                                focused: $focused, tag: .username)
                            }
                            GlassInputField("Email", text: $email,
                                            keyboard: .emailAddress, focused: $focused, tag: .email)
                            GlassPasswordField(label: "Password", text: $password, show: $showPassword)
                        }

                        // Submit
                        Button(action: submit) {
                            ZStack {
                                RoundedRectangle(cornerRadius: 14)
                                    .fill(auth.isLoading ? Color(hex: "E53935").opacity(0.7) : Color(hex: "E53935"))
                                    .frame(height: 52)
                                    .shadow(color: Color(hex: "E53935").opacity(0.3), radius: 12, y: 4)
                                if auth.isLoading {
                                    ProgressView().tint(.white)
                                } else {
                                    Text(isRegister ? "Create Account" : "Log In")
                                        .font(.system(size: 15, weight: .bold))
                                        .foregroundColor(.white)
                                }
                            }
                        }
                        .disabled(auth.isLoading)

                        // Toggle
                        HStack(spacing: 4) {
                            Text(isRegister ? "Already have an account?" : "Need an account?")
                                .font(.system(size: 13))
                                .foregroundColor(Color(hex: "6b7280"))
                            Button(isRegister ? "Log in" : "Register") {
                                withAnimation(.easeInOut(duration: 0.2)) { isRegister.toggle() }
                                auth.error = nil
                                focused = nil
                            }
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundColor(Color(hex: "E53935"))
                        }
                    }
                    .padding(24)
                    .background(
                        RoundedRectangle(cornerRadius: 24)
                            .fill(.ultraThinMaterial)
                            .overlay(
                                RoundedRectangle(cornerRadius: 24)
                                    .stroke(Color.white.opacity(0.07), lineWidth: 1)
                            )
                    )
                    .padding(.horizontal, 20)

                    Spacer(minLength: 40)
                }
            }
        }
        .preferredColorScheme(.dark)
    }

    private func submit() {
        focused = nil
        auth.error = nil
        Task {
            if isRegister {
                await auth.register(email: email, username: username, password: password)
            } else {
                await auth.login(email: email, password: password)
            }
        }
    }
}

// MARK: - Glass Input Components

struct GlassInputField: View {
    let label: String
    @Binding var text: String
    var keyboard: UIKeyboardType = .default
    var focused: FocusState<AuthView.Field?>.Binding
    var tag: AuthView.Field

    init(_ label: String, text: Binding<String>, keyboard: UIKeyboardType = .default,
         focused: FocusState<AuthView.Field?>.Binding, tag: AuthView.Field) {
        self.label = label
        self._text = text
        self.keyboard = keyboard
        self.focused = focused
        self.tag = tag
    }

    var isFocused: Bool { focused.wrappedValue == tag }

    var body: some View {
        VStack(alignment: .leading, spacing: 7) {
            Text(label.uppercased())
                .font(.system(size: 10, weight: .bold))
                .foregroundColor(Color(hex: "6b7280"))
                .kerning(0.8)
            TextField("", text: $text)
                .keyboardType(keyboard)
                .autocapitalization(.none)
                .disableAutocorrection(true)
                .focused(focused, equals: tag)
                .padding(.horizontal, 14)
                .frame(height: 46)
                .background(Color.white.opacity(0.05))
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(isFocused ? Color(hex: "E53935").opacity(0.5) : Color.white.opacity(0.08), lineWidth: 1.5)
                )
                .foregroundColor(.white)
                .font(.system(size: 15))
                .animation(.easeInOut(duration: 0.15), value: isFocused)
        }
    }
}

struct GlassPasswordField: View {
    let label: String
    @Binding var text: String
    @Binding var show: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 7) {
            Text(label.uppercased())
                .font(.system(size: 10, weight: .bold))
                .foregroundColor(Color(hex: "6b7280"))
                .kerning(0.8)
            HStack {
                Group {
                    if show {
                        TextField("", text: $text)
                    } else {
                        SecureField("", text: $text)
                    }
                }
                .autocapitalization(.none)
                .disableAutocorrection(true)
                .foregroundColor(.white)
                .font(.system(size: 15))
                Button(action: { show.toggle() }) {
                    Image(systemName: show ? "eye.slash" : "eye")
                        .foregroundColor(Color(hex: "6b7280"))
                        .font(.system(size: 14))
                }
            }
            .padding(.horizontal, 14)
            .frame(height: 46)
            .background(Color.white.opacity(0.05))
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(Color.white.opacity(0.08), lineWidth: 1.5)
            )
        }
    }
}
