import SwiftUI

struct ServerListView: View {
    @EnvironmentObject var servers: ServersViewModel
    @State private var showCreate = false

    var body: some View {
        ZStack {
            Color(hex: "1E1F22").ignoresSafeArea()

            VStack(spacing: 8) {
                // Home
                ServerIconButton(
                    isSelected: servers.selectedServer == nil,
                    action: { servers.selectedServer = nil; servers.selectedChannel = nil }
                ) {
                    ZStack {
                        Color(hex: "E53935")
                        Text("v").font(.system(size: 22, weight: .black)).foregroundColor(.white)
                    }
                }

                Divider()
                    .background(Color.white.opacity(0.12))
                    .padding(.horizontal, 12)

                ScrollView(showsIndicators: false) {
                    VStack(spacing: 8) {
                        ForEach(servers.servers) { srv in
                            ServerIconButton(
                                isSelected: servers.selectedServer?.id == srv.id,
                                hasUnread: srv.unread,
                                action: { servers.selectServer(srv) }
                            ) {
                                if let icon = srv.icon {
                                    AsyncImage(url: URL(string: icon)) { img in
                                        img.resizable().scaledToFill()
                                    } placeholder: {
                                        serverAcronymView(srv)
                                    }
                                } else {
                                    serverAcronymView(srv)
                                }
                            }
                        }
                    }
                }

                Divider()
                    .background(Color.white.opacity(0.12))
                    .padding(.horizontal, 12)

                // Add server
                ServerIconButton(isSelected: false, action: { showCreate = true }) {
                    Image(systemName: "plus")
                        .font(.system(size: 18, weight: .medium))
                        .foregroundColor(Color(hex: "23a55a"))
                }

                Spacer()

                // Current user avatar
                if let user = servers.servers.first?.members.first {
                    Circle()
                        .fill(Color(hex: "E53935"))
                        .frame(width: 40, height: 40)
                        .overlay(
                            Text(String(user.username.prefix(1)).uppercased())
                                .font(.system(size: 16, weight: .bold))
                                .foregroundColor(.white)
                        )
                        .padding(.bottom, 8)
                }
            }
            .padding(.vertical, 12)
            .padding(.horizontal, 12)
        }
        .frame(width: 72)
        .sheet(isPresented: $showCreate) {
            CreateServerSheet()
        }
    }

    @ViewBuilder
    func serverAcronymView(_ srv: VoxaServer) -> some View {
        ZStack {
            srv.accentColor
            Text(srv.acronym)
                .font(.system(size: 14, weight: .bold))
                .foregroundColor(.white)
        }
    }
}

struct ServerIconButton<Content: View>: View {
    var isSelected: Bool
    var hasUnread: Bool = false
    var action: () -> Void
    @ViewBuilder var content: () -> Content

    var body: some View {
        HStack(spacing: 0) {
            // Pill indicator
            RoundedRectangle(cornerRadius: 3)
                .fill(Color.white)
                .frame(width: 4, height: isSelected ? 36 : (hasUnread ? 8 : 0))
                .padding(.trailing, 4)
                .animation(.spring(response: 0.2), value: isSelected)

            Button(action: action) {
                ZStack {
                    RoundedRectangle(cornerRadius: isSelected ? 16 : 24)
                        .fill(Color(hex: "2B2D31"))
                        .frame(width: 48, height: 48)
                        .animation(.spring(response: 0.2), value: isSelected)
                    content()
                        .frame(width: 48, height: 48)
                        .clipShape(RoundedRectangle(cornerRadius: isSelected ? 16 : 24))
                        .animation(.spring(response: 0.2), value: isSelected)
                }
                .overlay(
                    RoundedRectangle(cornerRadius: isSelected ? 16 : 24)
                        .stroke(isSelected ? Color(hex: "E53935").opacity(0.7) : Color.clear, lineWidth: 2)
                )
            }
        }
    }
}

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

// MARK: - Create Server

struct CreateServerSheet: View {
    @EnvironmentObject var servers: ServersViewModel
    @Environment(\.dismiss) var dismiss
    @State private var name = ""
    @State private var step: CreateStep = .choose

    enum CreateStep { case choose, create, join }

    var body: some View {
        NavigationView {
            ZStack {
                Color(hex: "313338").ignoresSafeArea()
                switch step {
                case .choose: chooseView
                case .create: createView
                case .join: joinView
                }
            }
            .navigationBarItems(leading: Button("Cancel") { dismiss() }
                .foregroundColor(Color(hex: "E53935")))
            .navigationBarTitleDisplayMode(.inline)
        }
        .preferredColorScheme(.dark)
    }

    var chooseView: some View {
        VStack(spacing: 20) {
            Text("Create your server").font(.system(size: 22, weight: .bold)).foregroundColor(.white)
            Text("Your server is where you and your friends hang out.")
                .font(.system(size: 14)).foregroundColor(Color(hex: "949BA4")).multilineTextAlignment(.center)

            VStack(spacing: 12) {
                ChoiceRow(icon: "number", color: .red, title: "Create My Own") { step = .create }
                ChoiceRow(icon: "person.3", color: .blue, title: "Join a Server") { step = .join }
            }
            Spacer()
        }
        .padding(24)
    }

    var createView: some View {
        VStack(spacing: 20) {
            Button("← Back") { step = .choose }
                .foregroundColor(Color(hex: "949BA4"))
                .frame(maxWidth: .infinity, alignment: .leading)

            Text("Customize your server").font(.system(size: 22, weight: .bold)).foregroundColor(.white)
            Text("Give it a name. You can change this later.")
                .font(.system(size: 14)).foregroundColor(Color(hex: "949BA4"))

            VStack(alignment: .leading, spacing: 6) {
                Text("SERVER NAME").font(.system(size: 11, weight: .bold)).foregroundColor(Color(hex: "B5BAC1")).kerning(0.5)
                TextField("My Awesome Server", text: $name)
                    .padding(12)
                    .background(Color(hex: "1a1b1e"))
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                    .foregroundColor(.white)
            }

            Button(action: {
                Task {
                    await servers.createServer(name: name)
                    dismiss()
                }
            }) {
                Text("Create Server")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .frame(height: 48)
                    .background(name.isEmpty ? Color(hex: "4a4b50") : Color(hex: "E53935"))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
            }
            .disabled(name.isEmpty)
            Spacer()
        }
        .padding(24)
    }

    var joinView: some View {
        VStack(spacing: 20) {
            Button("← Back") { step = .choose }
                .foregroundColor(Color(hex: "949BA4"))
                .frame(maxWidth: .infinity, alignment: .leading)
            Text("Join a Server").font(.system(size: 22, weight: .bold)).foregroundColor(.white)
            Text("Enter an invite link to join a server.")
                .font(.system(size: 14)).foregroundColor(Color(hex: "949BA4"))
            TextField("https://voxa.lol/invite/...", text: $name)
                .padding(12)
                .background(Color(hex: "1a1b1e"))
                .clipShape(RoundedRectangle(cornerRadius: 10))
                .foregroundColor(.white)
                .autocapitalization(.none)
            Spacer()
        }
        .padding(24)
    }
}

struct ChoiceRow: View {
    let icon: String
    let color: Color
    let title: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 14) {
                ZStack {
                    Circle().fill(color.opacity(0.2)).frame(width: 40, height: 40)
                    Image(systemName: icon).foregroundColor(color)
                }
                Text(title).font(.system(size: 15, weight: .semibold)).foregroundColor(.white)
                Spacer()
                Image(systemName: "chevron.right").foregroundColor(Color(hex: "949BA4")).font(.system(size: 13))
            }
            .padding(16)
            .background(Color(hex: "2B2D31"))
            .clipShape(RoundedRectangle(cornerRadius: 14))
        }
    }
}
