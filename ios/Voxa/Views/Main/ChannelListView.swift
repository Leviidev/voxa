import SwiftUI

struct ChannelListView: View {
    let server: VoxaServer
    @EnvironmentObject var servers: ServersViewModel
    @EnvironmentObject var auth: AuthViewModel
    @State private var showAddChannel = false
    @State private var collapsedCategories: Set<String> = []

    var body: some View {
        ZStack {
            Color(hex: "2B2D31").ignoresSafeArea()

            VStack(spacing: 0) {
                // Header
                HStack {
                    Text(server.name)
                        .font(.system(size: 15, weight: .bold))
                        .foregroundColor(.white)
                    Spacer()
                    Image(systemName: "chevron.down")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(Color(hex: "949BA4"))
                }
                .padding(.horizontal, 16)
                .frame(height: 48)
                .background(Color(hex: "2B2D31"))
                .shadow(color: .black.opacity(0.2), radius: 4, y: 2)

                ScrollView {
                    VStack(alignment: .leading, spacing: 0) {
                        ForEach(server.categories) { cat in
                            CategorySection(
                                category: cat,
                                server: server,
                                isCollapsed: collapsedCategories.contains(cat.id),
                                onToggle: {
                                    if collapsedCategories.contains(cat.id) {
                                        collapsedCategories.remove(cat.id)
                                    } else {
                                        collapsedCategories.insert(cat.id)
                                    }
                                },
                                onAddChannel: { showAddChannel = true }
                            )
                        }
                        Spacer(minLength: 100)
                    }
                    .padding(.top, 8)
                }

                // User panel
                if let user = auth.user {
                    UserPanel(user: user)
                }
            }
        }
        .sheet(isPresented: $showAddChannel) {
            AddChannelSheet(server: server)
        }
    }
}

struct CategorySection: View {
    let category: ServerCategory
    let server: VoxaServer
    let isCollapsed: Bool
    let onToggle: () -> Void
    let onAddChannel: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            // Category header
            HStack(spacing: 4) {
                Button(action: onToggle) {
                    HStack(spacing: 4) {
                        Image(systemName: isCollapsed ? "chevron.right" : "chevron.down")
                            .font(.system(size: 10, weight: .semibold))
                            .foregroundColor(Color(hex: "5C5E66"))
                        Text(category.name.uppercased())
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundColor(Color(hex: "949BA4"))
                            .kerning(0.3)
                    }
                }
                Spacer()
                Button(action: onAddChannel) {
                    Image(systemName: "plus")
                        .font(.system(size: 14))
                        .foregroundColor(Color(hex: "949BA4"))
                }
            }
            .padding(.horizontal, 16)
            .padding(.top, 16)
            .padding(.bottom, 4)

            if !isCollapsed {
                ForEach(category.channels) { ch in
                    ChannelRow(channel: ch)
                        .background(
                            ch.id == (servers.selectedChannel?.id) ? Color(hex: "404249") : Color.clear
                        )
                        .clipShape(RoundedRectangle(cornerRadius: 6))
                        .padding(.horizontal, 8)
                        .onTapGesture { servers.selectChannel(ch) }
                }
            }
        }
    }

    @EnvironmentObject var servers: ServersViewModel
}

struct ChannelRow: View {
    let channel: VoxaChannel

    var icon: String {
        switch channel.type {
        case .text: return "number"
        case .voice: return "speaker.wave.2"
        case .announcement: return "megaphone"
        case .stage: return "music.mic"
        }
    }

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: icon)
                .font(.system(size: 15))
                .foregroundColor(Color(hex: "949BA4"))
                .frame(width: 18)

            Text(channel.name)
                .font(.system(size: 15))
                .foregroundColor(channel.unread ? .white : Color(hex: "949BA4"))

            if channel.locked == true {
                Image(systemName: "lock.fill")
                    .font(.system(size: 10))
                    .foregroundColor(Color(hex: "5C5E66"))
            }

            Spacer()

            if channel.unread {
                Circle().fill(Color.white).frame(width: 7, height: 7)
            }

            if channel.type == .voice, let members = channel.members, !members.isEmpty {
                Text("\(members.count)")
                    .font(.system(size: 11))
                    .foregroundColor(Color(hex: "5C5E66"))
            }
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 7)
        .contentShape(Rectangle())
    }
}

struct UserPanel: View {
    let user: User
    @EnvironmentObject var auth: AuthViewModel
    @State private var isMuted = false
    @State private var isDeafened = false

    var body: some View {
        HStack(spacing: 8) {
            ZStack(alignment: .bottomTrailing) {
                Circle()
                    .fill(user.avatarColor)
                    .frame(width: 32, height: 32)
                    .overlay(
                        Text(String(user.username.prefix(1)).uppercased())
                            .font(.system(size: 13, weight: .bold))
                            .foregroundColor(.white)
                    )
                Circle()
                    .fill(user.status.color)
                    .frame(width: 10, height: 10)
                    .overlay(Circle().stroke(Color(hex: "1E1F22"), lineWidth: 2))
            }

            VStack(alignment: .leading, spacing: 1) {
                Text(user.username)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(.white)
                Text("#\(user.discriminator)")
                    .font(.system(size: 11))
                    .foregroundColor(Color(hex: "5C5E66"))
            }

            Spacer()

            HStack(spacing: 4) {
                PanelButton(icon: isMuted ? "mic.slash.fill" : "mic.fill", active: isMuted) { isMuted.toggle() }
                PanelButton(icon: isDeafened ? "headphones" : "headphones", active: isDeafened) { isDeafened.toggle() }
                PanelButton(icon: "gearshape.fill", active: false) {}
            }
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 8)
        .background(Color(hex: "232428"))
    }
}

struct PanelButton: View {
    let icon: String
    let active: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Image(systemName: icon)
                .font(.system(size: 14))
                .foregroundColor(active ? Color(hex: "E53935") : Color(hex: "949BA4"))
                .frame(width: 32, height: 32)
                .background(active ? Color(hex: "E53935").opacity(0.15) : Color.clear)
                .clipShape(RoundedRectangle(cornerRadius: 6))
        }
    }
}

struct AddChannelSheet: View {
    let server: VoxaServer
    @EnvironmentObject var servers: ServersViewModel
    @Environment(\.dismiss) var dismiss
    @State private var name = ""
    @State private var type: VoxaChannel.ChannelType = .text

    var body: some View {
        NavigationView {
            Form {
                Section("Channel Type") {
                    Picker("Type", selection: $type) {
                        Label("Text", systemImage: "number").tag(VoxaChannel.ChannelType.text)
                        Label("Voice", systemImage: "speaker.wave.2").tag(VoxaChannel.ChannelType.voice)
                    }
                    .pickerStyle(.segmented)
                }
                Section("Channel Name") {
                    TextField("new-channel", text: $name)
                        .autocapitalization(.none)
                }
            }
            .scrollContentBackground(.hidden)
            .background(Color(hex: "313338"))
            .navigationTitle("New Channel")
            .navigationBarTitleDisplayMode(.inline)
            .navigationBarItems(
                leading: Button("Cancel") { dismiss() }.foregroundColor(Color(hex: "E53935")),
                trailing: Button("Create") {
                    Task {
                        await servers.addChannel(to: server, name: name, type: type)
                        dismiss()
                    }
                }
                .foregroundColor(name.isEmpty ? .gray : Color(hex: "E53935"))
                .disabled(name.isEmpty)
            )
        }
        .preferredColorScheme(.dark)
    }
}
