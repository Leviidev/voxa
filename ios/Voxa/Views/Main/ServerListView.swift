import SwiftUI

struct ServerListView: View {
    @EnvironmentObject var servers: ServersViewModel
    @EnvironmentObject var auth: AuthViewModel
    @State private var showCreate = false

    var body: some View {
        ZStack {
            Color(hex: "0a0a0b").ignoresSafeArea()

            VStack(spacing: 0) {
                // Home button
                ServerPill(
                    isSelected: servers.selectedServer == nil,
                    action: { servers.selectedServer = nil; servers.selectedChannel = nil }
                ) {
                    ZStack {
                        Color(hex: "E53935")
                        Text("v")
                            .font(.system(size: 20, weight: .black, design: .rounded))
                            .foregroundColor(.white)
                    }
                }
                .padding(.top, 14)

                // Divider
                Capsule()
                    .fill(Color.white.opacity(0.1))
                    .frame(width: 28, height: 2)
                    .padding(.vertical, 8)

                // Server list
                ScrollView(showsIndicators: false) {
                    VStack(spacing: 6) {
                        ForEach(servers.servers) { srv in
                            ServerPill(
                                isSelected: servers.selectedServer?.id == srv.id,
                                hasUnread: false,
                                action: { servers.selectServer(srv) }
                            ) {
                                if let iconUrl = srv.iconUrl, let url = URL(string: iconUrl) {
                                    AsyncImage(url: url) { img in
                                        img.resizable().scaledToFill()
                                    } placeholder: {
                                        ServerAcronymView(server: srv)
                                    }
                                } else {
                                    ServerAcronymView(server: srv)
                                }
                            }
                        }
                    }
                }

                // Add server
                Capsule()
                    .fill(Color.white.opacity(0.1))
                    .frame(width: 28, height: 2)
                    .padding(.vertical, 8)

                ServerPill(isSelected: false, action: { showCreate = true }) {
                    ZStack {
                        Color.white.opacity(0.06)
                        Image(systemName: "plus")
                            .font(.system(size: 16, weight: .medium))
                            .foregroundColor(Color(hex: "23a55a"))
                    }
                }

                Spacer()

                // User avatar at bottom
                if let user = auth.user {
                    Button(action: {}) {
                        UserAvatarBubble(user: user, size: 40)
                    }
                    .padding(.bottom, 14)
                }
            }
            .padding(.horizontal, 8)
        }
        .frame(width: 68)
        .sheet(isPresented: $showCreate) {
            CreateServerSheet()
        }
    }
}

// MARK: - Server Pill (Discord-style with pill indicator)

struct ServerPill<Content: View>: View {
    var isSelected: Bool
    var hasUnread: Bool = false
    var action: () -> Void
    @ViewBuilder var content: () -> Content
    @State private var pressed = false

    var body: some View {
        HStack(spacing: 0) {
            // Left pill indicator
            RoundedRectangle(cornerRadius: 2)
                .fill(Color.white)
                .frame(width: 3, height: isSelected ? 36 : (hasUnread ? 8 : 0))
                .animation(.spring(response: 0.25, dampingFraction: 0.7), value: isSelected)

            Spacer(minLength: 4)

            Button(action: action) {
                RoundedRectangle(cornerRadius: isSelected ? 16 : 26)
                    .fill(Color(hex: "1e1f22"))
                    .frame(width: 48, height: 48)
                    .overlay(
                        content()
                            .frame(width: 48, height: 48)
                            .clipShape(RoundedRectangle(cornerRadius: isSelected ? 16 : 26))
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: isSelected ? 16 : 26)
                            .stroke(isSelected ? Color(hex: "E53935").opacity(0.6) : Color.clear, lineWidth: 1.5)
                    )
                    .animation(.spring(response: 0.25, dampingFraction: 0.7), value: isSelected)
                    .scaleEffect(pressed ? 0.94 : 1.0)
            }
            .buttonStyle(.plain)
            .simultaneousGesture(DragGesture(minimumDistance: 0)
                .onChanged { _ in pressed = true }
                .onEnded { _ in pressed = false }
            )

            Spacer(minLength: 4)
        }
        .frame(width: 60)
    }
}

struct ServerAcronymView: View {
    let server: VoxaServer

    var body: some View {
        ZStack {
            server.accentColor
            Text(server.acronym)
                .font(.system(size: 14, weight: .bold))
                .foregroundColor(.white)
        }
    }
}

struct UserAvatarBubble: View {
    let user: User
    let size: CGFloat

    var body: some View {
        ZStack(alignment: .bottomTrailing) {
            Circle()
                .fill(user.swiftAvatarColor)
                .frame(width: size, height: size)
                .overlay(
                    Group {
                        if let url = user.avatarUrl.flatMap(URL.init) {
                            AsyncImage(url: url) { img in
                                img.resizable().scaledToFill()
                            } placeholder: {
                                Text(String(user.effectiveName.prefix(1)).uppercased())
                                    .font(.system(size: size * 0.35, weight: .bold))
                                    .foregroundColor(.white)
                            }
                        } else {
                            Text(String(user.effectiveName.prefix(1)).uppercased())
                                .font(.system(size: size * 0.35, weight: .bold))
                                .foregroundColor(.white)
                        }
                    }
                )
                .clipShape(Circle())
            // Status dot
            Circle()
                .fill(user.statusEnum.color)
                .frame(width: size * 0.28, height: size * 0.28)
                .overlay(Circle().stroke(Color(hex: "0a0a0b"), lineWidth: 2))
        }
    }
}

// MARK: - Server Icon View (reusable)

struct ServerIconView: View {
    let server: VoxaServer
    let size: CGFloat

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: size * 0.3)
                .fill(server.accentColor)
                .frame(width: size, height: size)
            Text(server.acronym)
                .font(.system(size: size * 0.3, weight: .bold))
                .foregroundColor(.white)
        }
    }
}

// MARK: - Create Server Sheet

struct CreateServerSheet: View {
    @EnvironmentObject var servers: ServersViewModel
    @Environment(\.dismiss) var dismiss
    @State private var name = ""
    @State private var inviteCode = ""
    @State private var step: Step = .choose
    @State private var isLoading = false
    @State private var error: String?

    enum Step { case choose, create, join }

    var body: some View {
        NavigationView {
            ZStack {
                Color(hex: "111214").ignoresSafeArea()
                VStack(spacing: 0) {
                    switch step {
                    case .choose: chooseView
                    case .create: createView
                    case .join: joinView
                    }
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }
                        .foregroundColor(Color(hex: "E53935"))
                }
            }
        }
        .preferredColorScheme(.dark)
    }

    var chooseView: some View {
        ScrollView {
            VStack(spacing: 20) {
                VStack(spacing: 6) {
                    Text("Add a Server")
                        .font(.system(size: 22, weight: .bold))
                        .foregroundColor(.white)
                    Text("Create your own or join an existing one.")
                        .font(.system(size: 14))
                        .foregroundColor(Color(hex: "6b7280"))
                        .multilineTextAlignment(.center)
                }
                .padding(.top, 32)

                VStack(spacing: 10) {
                    CreateChoiceRow(icon: "plus.circle.fill", iconColor: "E53935",
                                    title: "Create My Own",
                                    subtitle: "Start a new community") { step = .create }
                    CreateChoiceRow(icon: "link.circle.fill", iconColor: "6366F1",
                                    title: "Join with Invite",
                                    subtitle: "Enter an invite link or code") { step = .join }
                }
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 40)
        }
    }

    var createView: some View {
        ScrollView {
            VStack(spacing: 24) {
                VStack(spacing: 6) {
                    Text("Name Your Server")
                        .font(.system(size: 22, weight: .bold))
                        .foregroundColor(.white)
                    Text("You can always change this later.")
                        .font(.system(size: 14))
                        .foregroundColor(Color(hex: "6b7280"))
                }
                .padding(.top, 32)

                VStack(alignment: .leading, spacing: 8) {
                    Text("SERVER NAME")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor(Color(hex: "6b7280"))
                        .kerning(0.8)
                    TextField("My Awesome Server", text: $name)
                        .autocapitalization(.words)
                        .padding(.horizontal, 14)
                        .frame(height: 48)
                        .background(Color.white.opacity(0.05))
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                        .overlay(RoundedRectangle(cornerRadius: 12)
                            .stroke(Color.white.opacity(0.1), lineWidth: 1))
                        .foregroundColor(.white)
                }

                Button(action: {
                    isLoading = true
                    Task {
                        await servers.createServer(name: name)
                        isLoading = false
                        dismiss()
                    }
                }) {
                    ZStack {
                        RoundedRectangle(cornerRadius: 14)
                            .fill(name.isEmpty ? Color.white.opacity(0.1) : Color(hex: "E53935"))
                            .frame(height: 52)
                        if isLoading {
                            ProgressView().tint(.white)
                        } else {
                            Text("Create Server")
                                .font(.system(size: 15, weight: .bold))
                                .foregroundColor(name.isEmpty ? Color(hex: "6b7280") : .white)
                        }
                    }
                }
                .disabled(name.isEmpty || isLoading)

                Button("← Back") { step = .choose }
                    .foregroundColor(Color(hex: "6b7280"))
                    .font(.system(size: 14))
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 40)
        }
    }

    var joinView: some View {
        ScrollView {
            VStack(spacing: 24) {
                VStack(spacing: 6) {
                    Text("Join a Server")
                        .font(.system(size: 22, weight: .bold))
                        .foregroundColor(.white)
                    Text("Enter an invite link or 6-character code.")
                        .font(.system(size: 14))
                        .foregroundColor(Color(hex: "6b7280"))
                        .multilineTextAlignment(.center)
                }
                .padding(.top, 32)

                VStack(alignment: .leading, spacing: 8) {
                    Text("INVITE LINK OR CODE")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor(Color(hex: "6b7280"))
                        .kerning(0.8)
                    TextField("voxa.lol/invite/ABC123", text: $inviteCode)
                        .autocapitalization(.none)
                        .disableAutocorrection(true)
                        .padding(.horizontal, 14)
                        .frame(height: 48)
                        .background(Color.white.opacity(0.05))
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                        .overlay(RoundedRectangle(cornerRadius: 12)
                            .stroke(Color.white.opacity(0.1), lineWidth: 1))
                        .foregroundColor(.white)

                    if let err = error {
                        HStack(spacing: 6) {
                            Image(systemName: "exclamationmark.circle.fill")
                                .foregroundColor(Color(hex: "f23f43"))
                                .font(.system(size: 12))
                            Text(err)
                                .font(.system(size: 12))
                                .foregroundColor(Color(hex: "f23f43"))
                        }
                    }
                }

                Button(action: joinServer) {
                    ZStack {
                        RoundedRectangle(cornerRadius: 14)
                            .fill(inviteCode.isEmpty ? Color.white.opacity(0.1) : Color(hex: "E53935"))
                            .frame(height: 52)
                        if isLoading {
                            ProgressView().tint(.white)
                        } else {
                            Text("Join Server")
                                .font(.system(size: 15, weight: .bold))
                                .foregroundColor(inviteCode.isEmpty ? Color(hex: "6b7280") : .white)
                        }
                    }
                }
                .disabled(inviteCode.isEmpty || isLoading)

                Button("← Back") { step = .choose; error = nil }
                    .foregroundColor(Color(hex: "6b7280"))
                    .font(.system(size: 14))
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 40)
        }
    }

    private func joinServer() {
        error = nil
        isLoading = true
        Task {
            do {
                let raw = inviteCode.trimmingCharacters(in: .whitespaces)
                let code: String
                if let range = raw.range(of: #"[A-Z0-9]{6,12}$"#, options: .regularExpression) {
                    code = String(raw[range]).uppercased()
                } else {
                    code = raw.uppercased()
                }
                let server = try await APIClient.shared.joinByInvite(code: code)
                await servers.addServer(server)
                servers.selectServer(server)
                dismiss()
            } catch {
                self.error = error.localizedDescription
            }
            isLoading = false
        }
    }
}

struct CreateChoiceRow: View {
    let icon: String
    let iconColor: String
    let title: String
    let subtitle: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 14) {
                ZStack {
                    Circle()
                        .fill(Color(hex: iconColor).opacity(0.15))
                        .frame(width: 44, height: 44)
                    Image(systemName: icon)
                        .foregroundColor(Color(hex: iconColor))
                        .font(.system(size: 18))
                }
                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundColor(.white)
                    Text(subtitle)
                        .font(.system(size: 12))
                        .foregroundColor(Color(hex: "6b7280"))
                }
                Spacer()
                Image(systemName: "chevron.right")
                    .foregroundColor(Color(hex: "6b7280"))
                    .font(.system(size: 12, weight: .medium))
            }
            .padding(16)
            .background(Color.white.opacity(0.05))
            .clipShape(RoundedRectangle(cornerRadius: 16))
            .overlay(RoundedRectangle(cornerRadius: 16)
                .stroke(Color.white.opacity(0.07), lineWidth: 1))
        }
    }
}
