import SwiftUI

struct ChannelListView: View {
    let server: VoxaServer
    @EnvironmentObject var servers: ServersViewModel
    @EnvironmentObject var auth: AuthViewModel
    @State private var showAddChannel = false
    @State private var showSettings = false
    @State private var collapsedCategories: Set<String> = []

    private var isOwner: Bool {
        guard let userId = auth.user?.id else { return false }
        return server.members.first(where: { $0.id == userId })?.isOwner == true
            || server.ownerId == userId
    }

    var body: some View {
        ZStack {
            Color(hex: "2B2D31").ignoresSafeArea()

            VStack(spacing: 0) {
                // Server header
                HStack {
                    Text(server.name)
                        .font(.system(size: 15, weight: .bold))
                        .foregroundColor(.white)
                        .lineLimit(1)
                    Spacer()
                    if isOwner {
                        Button { showSettings = true } label: {
                            Image(systemName: "gearshape.fill")
                                .font(.system(size: 14))
                                .foregroundColor(Color(hex: "949BA4"))
                        }
                    } else {
                        Image(systemName: "chevron.down")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundColor(Color(hex: "949BA4"))
                    }
                }
                .padding(.horizontal, 16)
                .frame(height: 48)
                .background(Color(hex: "2B2D31"))
                .shadow(color: .black.opacity(0.15), radius: 4, y: 2)
                .sheet(isPresented: $showSettings) {
                    ServerSettingsView(server: server)
                        .environmentObject(servers)
                        .environmentObject(auth)
                }

                Divider().background(Color.black.opacity(0.3))

                // Channel list
                ScrollView(showsIndicators: false) {
                    VStack(alignment: .leading, spacing: 0) {
                        ForEach(server.categories) { cat in
                            CategorySection(
                                category: cat,
                                isCollapsed: collapsedCategories.contains(cat.id),
                                onToggle: {
                                    withAnimation(.easeInOut(duration: 0.15)) {
                                        if collapsedCategories.contains(cat.id) {
                                            collapsedCategories.remove(cat.id)
                                        } else {
                                            collapsedCategories.insert(cat.id)
                                        }
                                    }
                                },
                                onAdd: { showAddChannel = true },
                                selectedChannelId: servers.selectedChannel?.id,
                                onSelect: { ch in servers.selectChannel(ch) }
                            )
                        }
                        Spacer(minLength: 80)
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

// MARK: - Category Section

struct CategorySection: View {
    let category: ServerCategory
    let isCollapsed: Bool
    let onToggle: () -> Void
    let onAdd: () -> Void
    let selectedChannelId: String?
    let onSelect: (VoxaChannel) -> Void

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 4) {
                Button(action: onToggle) {
                    HStack(spacing: 4) {
                        Image(systemName: isCollapsed ? "chevron.right" : "chevron.down")
                            .font(.system(size: 9, weight: .bold))
                            .foregroundColor(Color(hex: "5C5E66"))
                        Text(category.name.uppercased())
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundColor(Color(hex: "949BA4"))
                            .kerning(0.3)
                    }
                }
                Spacer()
                Button(action: onAdd) {
                    Image(systemName: "plus")
                        .font(.system(size: 13))
                        .foregroundColor(Color(hex: "949BA4"))
                }
            }
            .padding(.horizontal, 16)
            .padding(.top, 18)
            .padding(.bottom, 4)

            if !isCollapsed {
                ForEach(category.channels) { ch in
                    ChannelRow(channel: ch, isSelected: ch.id == selectedChannelId)
                        .padding(.horizontal, 8)
                        .onTapGesture { onSelect(ch) }
                }
            }
        }
    }
}

// MARK: - Channel Row

struct ChannelRow: View {
    let channel: VoxaChannel
    var isSelected: Bool = false

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: channel.icon)
                .font(.system(size: 15))
                .foregroundColor(isSelected ? .white : Color(hex: "949BA4"))
                .frame(width: 18)

            Text(channel.name)
                .font(.system(size: 15))
                .foregroundColor(isSelected ? .white : Color(hex: "949BA4"))
                .lineLimit(1)

            Spacer()
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 7)
        .background(isSelected ? Color(hex: "404249") : Color.clear)
        .clipShape(RoundedRectangle(cornerRadius: 6))
        .contentShape(Rectangle())
        .animation(.easeInOut(duration: 0.1), value: isSelected)
    }
}

// MARK: - User Panel

struct UserPanel: View {
    let user: User
    @EnvironmentObject var auth: AuthViewModel
    @State private var isMuted = false
    @State private var isDeafened = false

    var body: some View {
        HStack(spacing: 8) {
            UserAvatarBubble(user: user, size: 32)

            VStack(alignment: .leading, spacing: 1) {
                Text(user.effectiveName)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(.white)
                    .lineLimit(1)
                Text("#\(user.discriminator)")
                    .font(.system(size: 11))
                    .foregroundColor(Color(hex: "5C5E66"))
            }

            Spacer()

            HStack(spacing: 4) {
                MicButton(icon: isMuted ? "mic.slash.fill" : "mic.fill", active: isMuted) {
                    isMuted.toggle()
                }
                MicButton(icon: isDeafened ? "speaker.slash.fill" : "headphones", active: isDeafened) {
                    isDeafened.toggle()
                }
                MicButton(icon: "arrow.right.square", active: false) {
                    auth.logout()
                }
            }
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 8)
        .background(Color(hex: "232428"))
    }
}

struct MicButton: View {
    let icon: String
    let active: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Image(systemName: icon)
                .font(.system(size: 14))
                .foregroundColor(active ? Color(hex: "E53935") : Color(hex: "949BA4"))
                .frame(width: 30, height: 30)
                .background(active ? Color(hex: "E53935").opacity(0.12) : Color.clear)
                .clipShape(RoundedRectangle(cornerRadius: 6))
        }
    }
}

// MARK: - Add Channel Sheet

struct AddChannelSheet: View {
    let server: VoxaServer
    @EnvironmentObject var servers: ServersViewModel
    @Environment(\.dismiss) var dismiss
    @State private var name = ""
    @State private var type = "text"

    var body: some View {
        NavigationView {
            Form {
                Section("Channel Type") {
                    Picker("Type", selection: $type) {
                        Label("Text", systemImage: "number").tag("text")
                        Label("Voice", systemImage: "speaker.wave.2").tag("voice")
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
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }.foregroundColor(Color(hex: "E53935"))
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Create") {
                        Task {
                            await servers.addChannel(to: server, name: name, type: type)
                            dismiss()
                        }
                    }
                    .foregroundColor(name.isEmpty ? .gray : Color(hex: "E53935"))
                    .disabled(name.isEmpty)
                }
            }
        }
        .preferredColorScheme(.dark)
    }
}
