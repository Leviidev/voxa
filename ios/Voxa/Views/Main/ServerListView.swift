import SwiftUI

struct ServerListView: View {
    @EnvironmentObject var servers: ServersViewModel
    @EnvironmentObject var auth: AuthViewModel
    @State private var showCreate = false
    @State private var showDiscovery = false

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

                // Add / Discover
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

                ServerPill(isSelected: false, action: { showDiscovery = true }) {
                    ZStack {
                        Color.white.opacity(0.06)
                        Image(systemName: "safari")
                            .font(.system(size: 16, weight: .medium))
                            .foregroundColor(Color(hex: "6366F1"))
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
        .sheet(isPresented: $showDiscovery) {
            ServerDiscoverySheet()
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

// MARK: - Server Discovery Sheet

struct ServerDiscoverySheet: View {
    @EnvironmentObject var servers: ServersViewModel
    @Environment(\.dismiss) var dismiss

    @State private var query    = ""
    @State private var category = "all"
    @State private var results: [DiscoverableServer] = []
    @State private var loading  = true
    @State private var joining: String?       = nil
    @State private var joined: Set<String>    = []

    private let cats: [(id: String, emoji: String, label: String)] = [
        ("all",       "🌐", "All"),
        ("gaming",    "🎮", "Gaming"),
        ("music",     "🎵", "Music"),
        ("art",       "🎨", "Art"),
        ("tech",      "💻", "Tech"),
        ("social",    "🤝", "Social"),
        ("education", "📚", "Education"),
    ]

    var body: some View {
        NavigationView {
            ZStack {
                Color(hex: "313338").ignoresSafeArea()

                VStack(spacing: 0) {
                    // ── Search + category strip ──────────────────────
                    VStack(spacing: 10) {
                        HStack(spacing: 8) {
                            Image(systemName: "magnifyingglass")
                                .foregroundColor(Color(hex: "6B6E75"))
                                .font(.system(size: 13))
                            TextField("Search servers…", text: $query)
                                .foregroundColor(Color(hex: "DBDEE1"))
                                .font(.system(size: 14))
                                .autocapitalization(.none)
                                .disableAutocorrection(true)
                        }
                        .padding(.horizontal, 12)
                        .padding(.vertical, 10)
                        .background(Color(hex: "1E1F22"))
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                        .overlay(RoundedRectangle(cornerRadius: 12)
                            .stroke(Color.white.opacity(0.08), lineWidth: 1))

                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 7) {
                                ForEach(cats, id: \.id) { cat in
                                    Button(action: { category = cat.id }) {
                                        HStack(spacing: 4) {
                                            Text(cat.emoji).font(.system(size: 13))
                                            Text(cat.label)
                                                .font(.system(size: 12, weight: .semibold))
                                        }
                                        .padding(.horizontal, 11)
                                        .padding(.vertical, 6)
                                        .background(category == cat.id
                                            ? Color(hex: "E53935")
                                            : Color.white.opacity(0.06))
                                        .foregroundColor(category == cat.id
                                            ? .white
                                            : Color(hex: "949BA4"))
                                        .clipShape(Capsule())
                                    }
                                }
                            }
                        }
                    }
                    .padding(14)
                    .background(Color(hex: "2B2D31"))

                    Rectangle()
                        .fill(Color.white.opacity(0.06))
                        .frame(height: 1)

                    // ── Body ────────────────────────────────────────
                    if loading {
                        Spacer()
                        ProgressView().tint(Color(hex: "6B6E75")).scaleEffect(1.2)
                        Spacer()
                    } else if results.isEmpty {
                        discoveryEmpty
                    } else {
                        ScrollView(showsIndicators: false) {
                            LazyVStack(spacing: 10) {
                                ForEach(results) { srv in
                                    DiscoverServerCard(
                                        server: srv,
                                        joining: joining == srv.id,
                                        joined: joined.contains(srv.id),
                                        onJoin: { joinServer(srv) }
                                    )
                                }
                            }
                            .padding(12)
                        }
                    }
                }
            }
            .navigationTitle("Discover Servers")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Done") { dismiss() }
                        .foregroundColor(Color(hex: "E53935"))
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    if !loading {
                        Text("\(results.count) server\(results.count == 1 ? "" : "s")")
                            .font(.system(size: 12))
                            .foregroundColor(Color(hex: "6B6E75"))
                    }
                }
            }
        }
        .preferredColorScheme(.dark)
        .onChange(of: query)    { _ in fetchResults() }
        .onChange(of: category) { _ in fetchResults() }
        .task { fetchResults() }
    }

    private var discoveryEmpty: some View {
        VStack(spacing: 12) {
            Spacer()
            Image(systemName: "safari")
                .font(.system(size: 40))
                .foregroundColor(Color(hex: "6B6E75"))
            Text(query.isEmpty ? "No public servers yet" : "No servers found")
                .font(.system(size: 15, weight: .semibold))
                .foregroundColor(Color(hex: "DBDEE1"))
            Text(query.isEmpty
                ? "Server owners can make their server\npublic in Server Settings → Overview."
                : "Try different keywords or a different category.")
                .font(.system(size: 13))
                .foregroundColor(Color(hex: "6B6E75"))
                .multilineTextAlignment(.center)
                .padding(.horizontal, 36)
            Spacer()
        }
    }

    private func fetchResults() {
        loading = true
        Task {
            do {
                let data = try await APIClient.shared.discoverServers(query: query, category: category)
                results = data
            } catch {}
            loading = false
        }
    }

    private func joinServer(_ server: DiscoverableServer) {
        guard joining == nil, !joined.contains(server.id) else { return }
        joining = server.id
        Task {
            do {
                let srv = try await APIClient.shared.joinPublicServer(id: server.id)
                await servers.addServer(srv)
                joined.insert(server.id)
            } catch {}
            joining = nil
        }
    }
}

// MARK: - Discover Server Card

struct DiscoverServerCard: View {
    let server: DiscoverableServer
    let joining: Bool
    let joined: Bool
    let onJoin: () -> Void

    private var displayRoles: [DiscoveryRole] { Array(server.roles.prefix(3)) }
    private var extraRoles: Int { max(0, server.roles.count - 3) }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // ── Banner + icon ────────────────────────────────────
            ZStack(alignment: .bottomLeading) {
                // Banner strip
                if let url = server.bannerUrl.flatMap(URL.init) {
                    AsyncImage(url: url) { img in
                        img.resizable().scaledToFill()
                    } placeholder: {
                        server.accentColor.opacity(0.55)
                    }
                    .frame(height: 56).clipped()
                } else {
                    server.accentColor.opacity(0.45).frame(height: 56)
                }

                // Server icon overlapping banner bottom
                ZStack {
                    if let url = server.iconUrl.flatMap(URL.init) {
                        AsyncImage(url: url) { img in
                            img.resizable().scaledToFill()
                        } placeholder: {
                            server.accentColor
                        }
                        .clipShape(RoundedRectangle(cornerRadius: 11))
                    } else {
                        server.accentColor
                        Text(server.acronym)
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(.white)
                    }
                }
                .frame(width: 40, height: 40)
                .clipShape(RoundedRectangle(cornerRadius: 11))
                .overlay(RoundedRectangle(cornerRadius: 11)
                    .stroke(Color(hex: "2B2D31"), lineWidth: 2.5))
                .offset(x: 12, y: 20)
            }

            // ── Content ─────────────────────────────────────────
            VStack(alignment: .leading, spacing: 5) {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 1) {
                        Text(server.name)
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(Color(hex: "DBDEE1"))
                        if let cat = server.category, !cat.isEmpty {
                            Text(cat.prefix(1).uppercased() + cat.dropFirst())
                                .font(.system(size: 10, weight: .semibold))
                                .foregroundColor(Color(hex: "6B6E75"))
                        }
                    }
                    Spacer()
                    // Join button
                    Button(action: onJoin) {
                        ZStack {
                            RoundedRectangle(cornerRadius: 8)
                                .fill(joined
                                    ? Color(hex: "23a55a").opacity(0.2)
                                    : (joining ? Color(hex: "E53935").opacity(0.5) : Color(hex: "E53935")))
                                .frame(width: 68, height: 30)
                            if joining {
                                ProgressView().scaleEffect(0.65).tint(.white)
                            } else {
                                Text(joined ? "✓ Joined" : "Join")
                                    .font(.system(size: 12, weight: .bold))
                                    .foregroundColor(joined ? Color(hex: "23a55a") : .white)
                            }
                        }
                    }
                    .disabled(joining || joined)
                }
                .padding(.top, 24)

                if let desc = server.description {
                    Text(desc)
                        .font(.system(size: 12))
                        .foregroundColor(Color(hex: "949BA4"))
                        .lineLimit(2)
                }

                // Role badges
                if !displayRoles.isEmpty {
                    HStack(spacing: 4) {
                        ForEach(Array(displayRoles.enumerated()), id: \.0) { _, role in
                            HStack(spacing: 3) {
                                Circle()
                                    .fill(Color(hex: role.color?.replacingOccurrences(of: "#", with: "") ?? "6B6E75"))
                                    .frame(width: 6, height: 6)
                                Text(role.name)
                                    .font(.system(size: 10, weight: .medium))
                                    .foregroundColor(Color(hex: "949BA4"))
                            }
                            .padding(.horizontal, 6)
                            .padding(.vertical, 3)
                            .background(Color.white.opacity(0.05))
                            .clipShape(Capsule())
                            .overlay(Capsule().stroke(Color.white.opacity(0.08), lineWidth: 0.5))
                        }
                        if extraRoles > 0 {
                            Text("+\(extraRoles)")
                                .font(.system(size: 10))
                                .foregroundColor(Color(hex: "6B6E75"))
                        }
                    }
                }

                // Member count
                HStack(spacing: 4) {
                    Image(systemName: "person.2")
                        .font(.system(size: 10))
                        .foregroundColor(Color(hex: "6B6E75"))
                    Text("\(server.memberCount) member\(server.memberCount == 1 ? "" : "s")")
                        .font(.system(size: 11))
                        .foregroundColor(Color(hex: "6B6E75"))
                }
            }
            .padding(.horizontal, 12)
            .padding(.bottom, 12)
        }
        .background(Color(hex: "2B2D31"))
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .overlay(RoundedRectangle(cornerRadius: 14)
            .stroke(Color.white.opacity(0.07), lineWidth: 1))
    }
}
