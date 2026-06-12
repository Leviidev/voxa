import SwiftUI

struct MainView: View {
    @EnvironmentObject var auth: AuthViewModel
    @EnvironmentObject var servers: ServersViewModel

    var body: some View {
        Group {
            if UIDevice.current.userInterfaceIdiom == .pad {
                iPadLayout
            } else {
                iPhoneLayout
            }
        }
        .task {
            await servers.load()
        }
    }

    // MARK: - iPad: Three-column

    var iPadLayout: some View {
        NavigationSplitView {
            ServerListView()
                .navigationSplitViewColumnWidth(min: 68, ideal: 68, max: 68)
        } content: {
            if let server = servers.selectedServer {
                ChannelListView(server: server)
                    .navigationSplitViewColumnWidth(min: 220, ideal: 240, max: 260)
            } else {
                DMView()
                    .navigationSplitViewColumnWidth(min: 220, ideal: 240, max: 260)
            }
        } detail: {
            if let channel = servers.selectedChannel, let server = servers.selectedServer {
                if channel.isText {
                    ChatView(channel: channel, server: server)
                } else {
                    VoiceChannelView(channel: channel)
                }
            } else {
                EmptyChatView()
            }
        }
        .navigationSplitViewStyle(.balanced)
    }

    // MARK: - iPhone: Tab-based

    var iPhoneLayout: some View {
        TabView {
            // Servers tab
            NavigationStack {
                iPhoneServerList
                    .navigationTitle("Servers")
                    .navigationBarTitleDisplayMode(.large)
                    .toolbar {
                        ToolbarItem(placement: .navigationBarTrailing) {
                            Button(action: {}) {
                                Image(systemName: "plus")
                                    .foregroundColor(Color(hex: "E53935"))
                            }
                        }
                    }
            }
            .tabItem { Label("Servers", systemImage: "bubble.left.and.bubble.right.fill") }

            // DMs tab
            NavigationStack {
                DMView()
                    .navigationTitle("Messages")
                    .navigationBarTitleDisplayMode(.large)
            }
            .tabItem { Label("Messages", systemImage: "message.fill") }

            // Profile tab
            NavigationStack {
                ProfileView()
                    .navigationTitle("Profile")
                    .navigationBarTitleDisplayMode(.large)
            }
            .tabItem { Label("Profile", systemImage: "person.circle.fill") }
        }
        .tint(Color(hex: "E53935"))
        .preferredColorScheme(.dark)
    }

    var iPhoneServerList: some View {
        List {
            ForEach(servers.servers) { srv in
                NavigationLink(destination: iPhoneServerChannels(server: srv)) {
                    HStack(spacing: 14) {
                        ServerIconView(server: srv, size: 44)
                        VStack(alignment: .leading, spacing: 3) {
                            Text(srv.name)
                                .font(.system(size: 15, weight: .semibold))
                                .foregroundColor(.white)
                            Text("\(srv.members.count) member\(srv.members.count == 1 ? "" : "s")")
                                .font(.system(size: 12))
                                .foregroundColor(Color(hex: "949BA4"))
                        }
                    }
                    .padding(.vertical, 4)
                }
            }
        }
        .listStyle(.insetGrouped)
        .scrollContentBackground(.hidden)
        .background(Color(hex: "111214"))
    }

    @ViewBuilder
    func iPhoneServerChannels(server: VoxaServer) -> some View {
        List {
            ForEach(server.categories) { cat in
                Section(cat.name) {
                    ForEach(cat.channels) { ch in
                        NavigationLink(destination: {
                            if ch.isText {
                                ChatView(channel: ch, server: server)
                            } else {
                                VoiceChannelView(channel: ch)
                            }
                        }) {
                            ChannelRow(channel: ch)
                        }
                    }
                }
            }
        }
        .listStyle(.insetGrouped)
        .scrollContentBackground(.hidden)
        .background(Color(hex: "111214"))
        .navigationTitle(server.name)
        .navigationBarTitleDisplayMode(.inline)
    }
}

// MARK: - Empty Chat

struct EmptyChatView: View {
    var body: some View {
        ZStack {
            Color(hex: "313338").ignoresSafeArea()
            VStack(spacing: 14) {
                ZStack {
                    Circle()
                        .fill(Color(hex: "2B2D31"))
                        .frame(width: 72, height: 72)
                    Image(systemName: "bubble.left.and.bubble.right")
                        .font(.system(size: 30))
                        .foregroundColor(Color(hex: "5C5E66"))
                }
                Text("Select a channel")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(.white)
                Text("Pick a channel from the sidebar to start chatting")
                    .font(.system(size: 13))
                    .foregroundColor(Color(hex: "949BA4"))
                    .multilineTextAlignment(.center)
            }
            .padding(.horizontal, 40)
        }
    }
}
