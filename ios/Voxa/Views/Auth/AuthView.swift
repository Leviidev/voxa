import SwiftUI

struct AuthView: View {
    @EnvironmentObject var auth: AuthViewModel
    @State private var isRegister = false
    @State private var email = ""
    @State private var username = ""
    @State private var password = ""
    @State private var dob = ""
    @State private var showPassword = false
    @State private var demoUsername = ""
    @State private var showDemoSheet = false
    @FocusState private var focused: Field?

    enum Field: Hashable { case email, username, password, dob }

    var body: some View {
        ZStack {
            Color(hex: "0f0f10").ignoresSafeArea()

            // Background glow
            RadialGradient(
                gradient: Gradient(colors: [Color(hex: "E53935").opacity(0.12), .clear]),
                center: .top, startRadius: 0, endRadius: 500
            ).ignoresSafeArea()

            ScrollView {
                VStack(spacing: 0) {
                    // Logo
                    VStack(spacing: 8) {
                        ZStack {
                            RoundedRectangle(cornerRadius: 16)
                                .fill(Color(hex: "E53935"))
                                .frame(width: 56, height: 56)
                            Text("v")
                                .font(.system(size: 32, weight: .black))
                                .foregroundColor(.white)
                        }
                        Text("voxa")
                            .font(.system(size: 22, weight: .bold))
                            .foregroundColor(.white)
                    }
                    .padding(.top, 60)
                    .padding(.bottom, 32)

                    // Card
                    VStack(spacing: 20) {
                        VStack(spacing: 4) {
                            Text(isRegister ? "Create an account" : "Welcome back!")
                                .font(.system(size: 22, weight: .bold))
                                .foregroundColor(.white)
                            Text(isRegister ? "Let's get you set up on Voxa." : "We're so excited to see you again!")
                                .font(.system(size: 14))
                                .foregroundColor(Color(hex: "949BA4"))
                        }

                        // Error
                        if let err = auth.error {
                            HStack(spacing: 8) {
                                Image(systemName: "exclamationmark.circle.fill")
                                    .foregroundColor(Color(hex: "f23f43"))
                                Text(err)
                                    .font(.system(size: 13))
                                    .foregroundColor(Color(hex: "fca5a5"))
                            }
                            .padding(.horizontal, 14)
                            .padding(.vertical, 10)
                            .background(Color(hex: "f23f43").opacity(0.15))
                            .clipShape(RoundedRectangle(cornerRadius: 10))
                        }

                        // Fields
                        VStack(spacing: 14) {
                            if isRegister {
                                AuthField("Username", text: $username, focused: $focused, tag: .username)
                            }
                            AuthField("Email", text: $email, keyboard: .emailAddress, focused: $focused, tag: .email)
                            PasswordField(text: $password, show: $showPassword)
                            if isRegister {
                                AuthField("Date of Birth (YYYY-MM-DD)", text: $dob, focused: $focused, tag: .dob)
                            }
                        }

                        if !isRegister {
                            HStack {
                                Spacer()
                                Button("Forgot your password?") {}
                                    .font(.system(size: 12))
                                    .foregroundColor(Color(hex: "E53935"))
                            }
                        }

                        // Submit
                        Button(action: submit) {
                            ZStack {
                                RoundedRectangle(cornerRadius: 12)
                                    .fill(Color(hex: "E53935"))
                                    .frame(height: 48)
                                if auth.isLoading {
                                    ProgressView().tint(.white)
                                } else {
                                    Text(isRegister ? "Continue" : "Log In")
                                        .font(.system(size: 15, weight: .semibold))
                                        .foregroundColor(.white)
                                }
                            }
                        }
                        .disabled(auth.isLoading)

                        // Toggle
                        HStack(spacing: 4) {
                            Text(isRegister ? "Already have an account?" : "Need an account?")
                                .font(.system(size: 13))
                                .foregroundColor(Color(hex: "949BA4"))
                            Button(isRegister ? "Log in" : "Register") {
                                withAnimation { isRegister.toggle() }
                                auth.error = nil
                            }
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundColor(Color(hex: "E53935"))
                        }

                        Divider().background(Color.white.opacity(0.08))

                        // Demo login
                        Button(action: { showDemoSheet = true }) {
                            Text("Try without an account →")
                                .font(.system(size: 13))
                                .foregroundColor(Color(hex: "949BA4"))
                        }
                    }
                    .padding(24)
                    .background(Color(hex: "1E1F22"))
                    .clipShape(RoundedRectangle(cornerRadius: 20))
                    .padding(.horizontal, 20)

                    Spacer(minLength: 40)
                }
            }
        }
        .sheet(isPresented: $showDemoSheet) {
            DemoLoginSheet(username: $demoUsername) {
                auth.demoLogin(username: demoUsername)
                showDemoSheet = false
            }
        }
    }

    private func submit() {
        focused = nil
        Task {
            if isRegister {
                await auth.register(email: email, username: username, password: password, dob: dob.isEmpty ? nil : dob)
            } else {
                await auth.login(email: email, password: password)
            }
        }
    }
}

// MARK: - Auth Field

struct AuthField: View {
    let placeholder: String
    @Binding var text: String
    var keyboard: UIKeyboardType = .default
    var focused: FocusState<AuthView.Field?>.Binding
    var tag: AuthView.Field

    init(_ placeholder: String, text: Binding<String>, keyboard: UIKeyboardType = .default,
         focused: FocusState<AuthView.Field?>.Binding, tag: AuthView.Field) {
        self.placeholder = placeholder
        self._text = text
        self.keyboard = keyboard
        self.focused = focused
        self.tag = tag
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(placeholder.uppercased())
                .font(.system(size: 11, weight: .bold))
                .foregroundColor(Color(hex: "B5BAC1"))
                .kerning(0.5)
            TextField("", text: $text)
                .keyboardType(keyboard)
                .autocapitalization(.none)
                .disableAutocorrection(true)
                .focused(focused, equals: tag)
                .padding(.horizontal, 12)
                .frame(height: 42)
                .background(Color(hex: "1a1b1e"))
                .clipShape(RoundedRectangle(cornerRadius: 10))
                .overlay(RoundedRectangle(cornerRadius: 10).stroke(
                    focused.wrappedValue == tag ? Color(hex: "E53935").opacity(0.6) : Color.clear, lineWidth: 1.5))
                .foregroundColor(.white)
        }
    }
}

struct PasswordField: View {
    @Binding var text: String
    @Binding var show: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("PASSWORD")
                .font(.system(size: 11, weight: .bold))
                .foregroundColor(Color(hex: "B5BAC1"))
                .kerning(0.5)
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
                Button(action: { show.toggle() }) {
                    Image(systemName: show ? "eye.slash" : "eye")
                        .foregroundColor(Color(hex: "949BA4"))
                        .font(.system(size: 14))
                }
            }
            .padding(.horizontal, 12)
            .frame(height: 42)
            .background(Color(hex: "1a1b1e"))
            .clipShape(RoundedRectangle(cornerRadius: 10))
        }
    }
}

struct DemoLoginSheet: View {
    @Binding var username: String
    var onContinue: () -> Void
    @Environment(\.dismiss) var dismiss

    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                Text("Choose a display name")
                    .font(.headline)
                    .foregroundColor(.white)
                TextField("your name", text: $username)
                    .textFieldStyle(.roundedBorder)
                    .autocapitalization(.none)
                Button("Continue") { onContinue() }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color(hex: "E53935"))
                    .foregroundColor(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .font(.system(size: 15, weight: .semibold))
            }
            .padding()
            .background(Color(hex: "1E1F22").ignoresSafeArea())
            .navigationBarItems(leading: Button("Cancel") { dismiss() }.foregroundColor(Color(hex: "E53935")))
            .navigationBarTitleDisplayMode(.inline)
        }
        .preferredColorScheme(.dark)
    }
}
