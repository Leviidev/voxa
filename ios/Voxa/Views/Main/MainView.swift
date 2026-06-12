import SwiftUI

struct MainView: View {
    @EnvironmentObject var auth: AuthViewModel
    @EnvironmentObject var servers: ServersViewModel
    @State private var showServerList = true

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

    // iPad: three-column split
    var iPadLayout: some View {
        NavigationSplitView {
            ServerListView()
                .navigationSplitViewColumnWidth(min: 72, ideal: 72, max: 72)
        } content: {
            if let server = servers.selectedServer {
                ChannelListView(server: server)
                    .navigationSplitViewColumnWidth(min: 220, ideal: 240)
            } else {
                DMView()
                    .navigationSplitViewColumnWidth(min: 220, ideal: 240)
            }
        } detail: {
            if let channel = servers.selectedChannel, let server = servers.selectedServer, channel.type == .text {
                ChatView(channel: channel, server: server)
            } else if let channel = servers.selectedChannel, channel.type == .voice {
                VoiceChannelView(channel: channel)
            } else {
                EmptyChatView()
            }
        }
        .navigationSplitViewStyle(.balanced)
    }

    // iPhone: tab-based
    var iPhoneLayout: some View {
        TabView {
            NavigationStack {
                iPhoneServersTab
            }
            .tabItem {
                Label("Servers", systemImage: "bubble.left.and.bubble.right")
            }

            NavigationStack {
                DMView()
                    .navigationTitle("Messages")
                    .navigationBarTitleDisplayMode(.large)
            }
            .tabItem {
                Label("Messages", systemImage: "message")
            }

            NavigationStack {
                ProfileView()
                    .navigationTitle("Profile")
            }
            .tabItem {
                Label("Profile", systemImage: "person.circle")
            }
        }
        .tint(Color(hex: "E53935"))
    }

    var iPhoneServersTab: some View {
        List {
            ForEach(servers.servers) { srv in
                NavigationLink(destination: iPhoneServerView(server: srv)) {
                    HStack(spacing: 12) {
                        ServerIconView(server: srv, size: 44)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(srv.name)
                                .font(.system(size: 15, weight: .semibold))
                                .foregroundColor(.white)
                            Text("\(srv.members.count) members")
                                .font(.system(size: 12))
                                .foregroundColor(Color(hex: "949BA4"))
                        }
                        Spacer()
                        if srv.unread {
                            Circle().fill(Color(hex: "E53935")).frame(width: 8, height: 8)
                        }
                    }
                    .padding(.vertical, 4)
                }
            }
        }
        .listStyle(.insetGrouped)
        .scrollContentBackground(.hidden)
        .background(Color(hex: "111214"))
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

    @ViewBuilder
    func iPhoneServerView(server: VoxaServer) -> some View {
        List {
            ForEach(server.categories) { cat in
                Section(cat.name.uppercased()) {
                    ForEach(cat.channels) { ch in
                        NavigationLink(destination: {
                            if ch.type == .text {
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

struct EmptyChatView: View {
    var body: some View {
        ZStack {
            Color(hex: "313338").ignoresSafeArea()
            VStack(spacing: 12) {
                Image(systemName: "bubble.left.and.bubble.right")
                    .font(.system(size: 48))
                    .foregroundColor(Color(hex: "5C5E66"))
                Text("Select a channel to start chatting")
                    .foregroundColor(Color(hex: "949BA4"))
                    .font(.system(size: 15))
            }
        }
    }
}
