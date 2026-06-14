import SwiftUI

struct ChatView: View {
    let channel: VoxaChannel
    let server: VoxaServer
    @EnvironmentObject var auth: AuthViewModel
    @StateObject private var chat = ChatViewModel()
    @State private var messageText = ""
    @State private var editingMessage: VoxaMessage?
    @State private var editText = ""
    @State private var showMemberList = false
    @FocusState private var inputFocused: Bool

    var body: some View {
        ZStack {
            Color(hex: "313338").ignoresSafeArea()

            VStack(spacing: 0) {
                // Messages list
                ScrollViewReader { proxy in
                    ScrollView {
                        LazyVStack(alignment: .leading, spacing: 0) {
                            ChannelWelcomeHeader(channel: channel)

                            ForEach(Array(chat.messages.enumerated()), id: \.element.id) { idx, msg in
                                let prev = idx > 0 ? chat.messages[idx - 1] : nil
                                let grouped = prev.map {
                                    $0.authorId == msg.authorId &&
                                    msg.timestamp.timeIntervalSince($0.timestamp) < 300
                                } ?? false
                                let isOwn = msg.authorId == auth.user?.id

                                MessageRow(
                                    message: msg,
                                    grouped: grouped,
                                    isOwn: isOwn,
                                    onEdit: {
                                        editingMessage = msg
                                        editText = msg.content
                                        inputFocused = true
                                    },
                                    onDelete: {
                                        Task { await chat.delete(message: msg) }
                                    }
                                )
                                .id(msg.id)
                            }

                            Color.clear.frame(height: 8).id("bottom")
                        }
                        .padding(.bottom, 8)
                    }
                    .onChange(of: chat.messages.count) { _ in
                        withAnimation(.easeOut(duration: 0.2)) {
                            proxy.scrollTo("bottom", anchor: .bottom)
                        }
                    }
                    .onTapGesture { inputFocused = false }
                }

                // Input bar
                inputBar
            }
        }
        .navigationTitle("#\(channel.name)")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                HStack(spacing: 16) {
                    Button(action: { showMemberList.toggle() }) {
                        Image(systemName: "person.2")
                            .foregroundColor(Color(hex: "949BA4"))
                    }
                }
            }
        }
        .sheet(isPresented: $showMemberList) {
            MemberListSheet(members: server.members)
        }
        .task {
            await chat.load(channelId: channel.id, token: auth.token)
        }
        .onDisappear { chat.disconnect() }
    }

    var inputBar: some View {
        VStack(spacing: 0) {
            Divider().background(Color.black.opacity(0.4))

            if editingMessage != nil {
                HStack(spacing: 8) {
                    Image(systemName: "pencil")
                        .foregroundColor(Color(hex: "E53935"))
                        .font(.system(size: 12))
                    Text("Editing message")
                        .font(.system(size: 12))
                        .foregroundColor(Color(hex: "949BA4"))
                    Spacer()
                    Button(action: { editingMessage = nil; editText = "" }) {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 16))
                            .foregroundColor(Color(hex: "5C5E66"))
                    }
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(Color(hex: "2b2d31"))
            }

            HStack(spacing: 12) {
                TextField(
                    editingMessage != nil ? "Edit message…" : "Message #\(channel.name)",
                    text: editingMessage != nil ? $editText : $messageText,
                    axis: .vertical
                )
                .focused($inputFocused)
                .lineLimit(1...5)
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                .background(Color(hex: "383A40"))
                .clipShape(RoundedRectangle(cornerRadius: 22))
                .foregroundColor(.white)
                .font(.system(size: 15))

                // Send / confirm button
                Button(action: editingMessage != nil ? submitEdit : sendMessage) {
                    ZStack {
                        Circle()
                            .fill(canSend ? Color(hex: "E53935") : Color.white.opacity(0.07))
                            .frame(width: 36, height: 36)
                        Image(systemName: editingMessage != nil ? "checkmark" : "paperplane.fill")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(canSend ? .white : Color(hex: "5C5E66"))
                    }
                }
                .disabled(!canSend)
                .animation(.easeInOut(duration: 0.15), value: canSend)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .background(Color(hex: "313338"))
        }
    }

    var canSend: Bool {
        if editingMessage != nil {
            return !editText.trimmingCharacters(in: .whitespaces).isEmpty
        }
        return !messageText.trimmingCharacters(in: .whitespaces).isEmpty && !chat.isSending
    }

    private func sendMessage() {
        guard let user = auth.user else { return }
        let text = messageText.trimmingCharacters(in: .whitespaces)
        guard !text.isEmpty else { return }
        messageText = ""
        Task { await chat.send(content: text, channelId: channel.id, author: user) }
    }

    private func submitEdit() {
        guard let msg = editingMessage else { return }
        let text = editText.trimmingCharacters(in: .whitespaces)
        guard !text.isEmpty else { return }
        Task {
            await chat.edit(message: msg, newContent: text)
            editingMessage = nil
            editText = ""
        }
    }
}

// MARK: - Channel Welcome

struct ChannelWelcomeHeader: View {
    let channel: VoxaChannel

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            ZStack {
                Circle()
                    .fill(Color(hex: "2B2D31"))
                    .frame(width: 60, height: 60)
                Image(systemName: channel.icon)
                    .font(.system(size: 26, weight: .medium))
                    .foregroundColor(Color(hex: "949BA4"))
            }
            VStack(alignment: .leading, spacing: 4) {
                Text("Welcome to #\(channel.name)!")
                    .font(.system(size: 22, weight: .bold))
                    .foregroundColor(.white)
                if let topic = channel.topic, !topic.isEmpty {
                    Text(topic)
                        .font(.system(size: 14))
                        .foregroundColor(Color(hex: "949BA4"))
                } else {
                    Text("This is the start of the #\(channel.name) channel.")
                        .font(.system(size: 14))
                        .foregroundColor(Color(hex: "949BA4"))
                }
            }
            Divider().background(Color.white.opacity(0.06)).padding(.top, 4)
        }
        .padding(.horizontal, 16)
        .padding(.top, 24)
        .padding(.bottom, 8)
    }
}

// MARK: - Message Row

struct MessageRow: View {
    let message: VoxaMessage
    let grouped: Bool
    let isOwn: Bool
    let onEdit: () -> Void
    let onDelete: () -> Void

    var body: some View {
        HStack(alignment: .top, spacing: 14) {
            if grouped {
                // Time on hover placeholder
                Color.clear.frame(width: 40)
            } else {
                // Avatar
                ZStack {
                    Circle()
                        .fill(message.swiftAvatarColor)
                        .frame(width: 40, height: 40)
                    if let url = message.avatarUrl.flatMap(URL.init) {
                        AsyncImage(url: url) { img in
                            img.resizable().scaledToFill()
                        } placeholder: { EmptyView() }
                        .clipShape(Circle())
                        .frame(width: 40, height: 40)
                    } else {
                        Text(String(message.effectiveName.prefix(1)).uppercased())
                            .font(.system(size: 16, weight: .bold))
                            .foregroundColor(.white)
                    }
                }
            }

            VStack(alignment: .leading, spacing: 2) {
                if !grouped {
                    HStack(spacing: 8) {
                        Text(message.effectiveName)
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundColor(isOwn ? Color(hex: "E53935") : .white)
                        Text(message.shortTime)
                            .font(.system(size: 11))
                            .foregroundColor(Color(hex: "5C5E66"))
                    }
                }

                (Text(message.content)
                    .font(.system(size: 15))
                    .foregroundColor(Color(hex: "DCDDDE"))
                +
                (message.edited
                 ? Text(" (edited)")
                    .font(.system(size: 10))
                    .foregroundColor(Color(hex: "5C5E66"))
                 : Text("")))
                .fixedSize(horizontal: false, vertical: true)
            }

            Spacer(minLength: 0)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, grouped ? 1 : 4)
        .contextMenu {
            if isOwn {
                Button(action: onEdit) {
                    Label("Edit Message", systemImage: "pencil")
                }
                Divider()
                Button(role: .destructive, action: onDelete) {
                    Label("Delete Message", systemImage: "trash")
                }
            }
            Button(action: {
                UIPasteboard.general.string = message.content
            }) {
                Label("Copy Text", systemImage: "doc.on.doc")
            }
        }
    }
}

// MARK: - Member List Sheet

struct MemberListSheet: View {
    let members: [ServerMember]
    @Environment(\.dismiss) var dismiss

    var online: [ServerMember] { members.filter { $0.statusEnum != .offline } }
    var offline: [ServerMember] { members.filter { $0.statusEnum == .offline } }

    var body: some View {
        NavigationView {
            List {
                if !online.isEmpty {
                    Section("Online — \(online.count)") {
                        ForEach(online) { MemberRow(member: $0) }
                    }
                }
                if !offline.isEmpty {
                    Section("Offline — \(offline.count)") {
                        ForEach(offline) { MemberRow(member: $0) }
                    }
                }
            }
            .listStyle(.insetGrouped)
            .scrollContentBackground(.hidden)
            .background(Color(hex: "313338"))
            .navigationTitle("Members")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { dismiss() }
                        .foregroundColor(Color(hex: "E53935"))
                }
            }
        }
        .preferredColorScheme(.dark)
    }
}

struct MemberRow: View {
    let member: ServerMember

    var body: some View {
        HStack(spacing: 12) {
            ZStack(alignment: .bottomTrailing) {
                Circle()
                    .fill(member.swiftAvatarColor)
                    .frame(width: 36, height: 36)
                    .overlay(
                        Text(String(member.effectiveName.prefix(1)).uppercased())
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(.white)
                    )
                Circle()
                    .fill(member.statusEnum.color)
                    .frame(width: 11, height: 11)
                    .overlay(Circle().stroke(Color(hex: "313338"), lineWidth: 2))
            }
            VStack(alignment: .leading, spacing: 1) {
                Text(member.effectiveName)
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(.white)
                if member.isOwner == true {
                    Text("Owner")
                        .font(.system(size: 11))
                        .foregroundColor(Color(hex: "E53935"))
                } else if let role = member.roles.first {
                    Text(role.name)
                        .font(.system(size: 11))
                        .foregroundColor(Color(hex: "949BA4"))
                }
            }
        }
    }
}

// MARK: - Voice Channel

struct VoiceChannelView: View {
    let channel: VoxaChannel
    @State private var joined = false
    @State private var isMuted = false

    var body: some View {
        ZStack {
            Color(hex: "313338").ignoresSafeArea()
            VStack(spacing: 28) {
                ZStack {
                    Circle()
                        .fill(Color(hex: "2B2D31"))
                        .frame(width: 88, height: 88)
                    Image(systemName: "speaker.wave.3.fill")
                        .font(.system(size: 34))
                        .foregroundColor(Color(hex: "949BA4"))
                }
                VStack(spacing: 6) {
                    Text(channel.name)
                        .font(.system(size: 24, weight: .bold))
                        .foregroundColor(.white)
                    Text(joined ? "You're connected" : "Voice Channel")
                        .font(.system(size: 14))
                        .foregroundColor(Color(hex: "949BA4"))
                }
                if joined {
                    HStack(spacing: 20) {
                        VoiceButton(icon: isMuted ? "mic.slash.fill" : "mic.fill",
                                    label: isMuted ? "Unmute" : "Mute",
                                    isActive: isMuted,
                                    color: isMuted ? "f23f43" : "4a4b50") {
                            isMuted.toggle()
                        }
                        VoiceButton(icon: "phone.down.fill", label: "Leave",
                                    isActive: true, color: "f23f43") {
                            joined = false
                        }
                    }
                } else {
                    Button(action: { joined = true }) {
                        Label("Join Voice", systemImage: "phone.fill")
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundColor(.white)
                            .padding(.horizontal, 28)
                            .padding(.vertical, 14)
                            .background(Color(hex: "23a55a"))
                            .clipShape(Capsule())
                    }
                }
            }
        }
        .navigationTitle(channel.name)
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct VoiceButton: View {
    let icon: String
    let label: String
    let isActive: Bool
    let color: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 6) {
                Circle()
                    .fill(Color(hex: color))
                    .frame(width: 60, height: 60)
                    .overlay(
                        Image(systemName: icon)
                            .font(.system(size: 22))
                            .foregroundColor(.white)
                    )
                Text(label)
                    .font(.system(size: 12))
                    .foregroundColor(Color(hex: "949BA4"))
            }
        }
    }
}
