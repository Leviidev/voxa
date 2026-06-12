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
                // Messages
                ScrollViewReader { proxy in
                    ScrollView {
                        LazyVStack(alignment: .leading, spacing: 0) {
                            ChannelWelcomeHeader(channel: channel)

                            ForEach(Array(chat.messages.enumerated()), id: \.element.id) { idx, msg in
                                let prev = idx > 0 ? chat.messages[idx - 1] : nil
                                let grouped = prev.map {
                                    $0.author == msg.author &&
                                    msg.timestamp.timeIntervalSince($0.timestamp) < 300
                                } ?? false

                                MessageRow(
                                    message: msg,
                                    grouped: grouped,
                                    isOwn: msg.authorId == auth.user?.id || msg.author == auth.user?.username,
                                    onEdit: {
                                        editingMessage = msg
                                        editText = msg.content
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
                        withAnimation { proxy.scrollTo("bottom") }
                    }
                    .onTapGesture { inputFocused = false }
                }

                // Input bar
                VStack(spacing: 0) {
                    Divider().background(Color.black.opacity(0.3))

                    if let editing = editingMessage {
                        HStack(spacing: 8) {
                            Image(systemName: "pencil").foregroundColor(Color(hex: "E53935")).font(.system(size: 13))
                            Text("Editing message")
                                .font(.system(size: 12))
                                .foregroundColor(Color(hex: "949BA4"))
                            Spacer()
                            Button(action: { editingMessage = nil; editText = "" }) {
                                Image(systemName: "xmark").font(.system(size: 12)).foregroundColor(Color(hex: "949BA4"))
                            }
                        }
                        .padding(.horizontal, 16)
                        .padding(.top, 8)
                    }

                    HStack(spacing: 10) {
                        Button(action: {}) {
                            Image(systemName: "plus.circle.fill")
                                .font(.system(size: 22))
                                .foregroundColor(Color(hex: "949BA4"))
                        }

                        TextField("Message #\(channel.name)", text: editingMessage != nil ? $editText : $messageText, axis: .vertical)
                            .focused($inputFocused)
                            .lineLimit(1...6)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 9)
                            .background(Color(hex: "383A40"))
                            .clipShape(RoundedRectangle(cornerRadius: 22))
                            .foregroundColor(.white)
                            .font(.system(size: 15))

                        if editingMessage != nil {
                            Button(action: submitEdit) {
                                Image(systemName: "checkmark.circle.fill")
                                    .font(.system(size: 22))
                                    .foregroundColor(Color(hex: "23a55a"))
                            }
                        } else {
                            Button(action: sendMessage) {
                                Image(systemName: messageText.isEmpty ? "face.smiling" : "paperplane.fill")
                                    .font(.system(size: 20))
                                    .foregroundColor(messageText.isEmpty ? Color(hex: "949BA4") : Color(hex: "E53935"))
                            }
                        }
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 10)
                    .background(Color(hex: "313338"))
                }
            }
        }
        .navigationTitle("#\(channel.name)")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                HStack(spacing: 16) {
                    Button(action: {}) {
                        Image(systemName: "magnifyingglass").foregroundColor(Color(hex: "949BA4"))
                    }
                    Button(action: { showMemberList.toggle() }) {
                        Image(systemName: "person.2").foregroundColor(Color(hex: "949BA4"))
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

    private func sendMessage() {
        guard let user = auth.user else { return }
        let text = messageText.trimmingCharacters(in: .whitespaces)
        guard !text.isEmpty else { return }
        messageText = ""
        Task { await chat.send(content: text, channelId: channel.id, author: user) }
    }

    private func submitEdit() {
        guard let msg = editingMessage else { return }
        Task {
            await chat.edit(message: msg, newContent: editText)
            editingMessage = nil
            editText = ""
        }
    }
}

// MARK: - Channel Welcome

struct ChannelWelcomeHeader: View {
    let channel: VoxaChannel

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            ZStack {
                Circle()
                    .fill(Color(hex: "2B2D31"))
                    .frame(width: 56, height: 56)
                Image(systemName: "number")
                    .font(.system(size: 24, weight: .medium))
                    .foregroundColor(Color(hex: "949BA4"))
            }
            Text("Welcome to #\(channel.name)!")
                .font(.system(size: 24, weight: .bold))
                .foregroundColor(.white)
            Text("This is the start of the #\(channel.name) channel.")
                .font(.system(size: 14))
                .foregroundColor(Color(hex: "949BA4"))
            Divider().background(Color.white.opacity(0.08)).padding(.top, 8)
        }
        .padding(.horizontal, 16)
        .padding(.top, 20)
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
    @State private var showActions = false

    var body: some View {
        HStack(alignment: .top, spacing: 14) {
            if grouped {
                Text(message.shortTime)
                    .font(.system(size: 10))
                    .foregroundColor(Color(hex: "5C5E66"))
                    .frame(width: 40, alignment: .trailing)
                    .padding(.top, 2)
                    .opacity(showActions ? 1 : 0)
            } else {
                Circle()
                    .fill(message.avatarColor)
                    .frame(width: 40, height: 40)
                    .overlay(
                        Text(String(message.author.prefix(1)).uppercased())
                            .font(.system(size: 16, weight: .bold))
                            .foregroundColor(.white)
                    )
            }

            VStack(alignment: .leading, spacing: 2) {
                if !grouped {
                    HStack(spacing: 8) {
                        Text(message.author)
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundColor(.white)
                        Text(message.formattedTime)
                            .font(.system(size: 11))
                            .foregroundColor(Color(hex: "5C5E66"))
                    }
                }

                Text(message.content)
                    .font(.system(size: 15))
                    .foregroundColor(Color(hex: "DCDDDE"))
                    .fixedSize(horizontal: false, vertical: true)
                + (message.edited ? Text(" (edited)").font(.system(size: 10)).foregroundColor(Color(hex: "5C5E66")) : Text(""))

                if !message.reactions.isEmpty {
                    HStack(spacing: 6) {
                        ForEach(message.reactions, id: \.emoji) { reaction in
                            HStack(spacing: 4) {
                                Text(reaction.emoji)
                                Text("\(reaction.count)").font(.system(size: 12)).foregroundColor(Color(hex: "949BA4"))
                            }
                            .padding(.horizontal, 8)
                            .padding(.vertical, 3)
                            .background(reaction.me ? Color(hex: "E53935").opacity(0.2) : Color(hex: "2B2D31"))
                            .overlay(
                                RoundedRectangle(cornerRadius: 6)
                                    .stroke(reaction.me ? Color(hex: "E53935").opacity(0.5) : Color.clear, lineWidth: 1)
                            )
                            .clipShape(RoundedRectangle(cornerRadius: 6))
                        }
                    }
                    .padding(.top, 2)
                }
            }

            Spacer()
        }
        .padding(.horizontal, 16)
        .padding(.vertical, grouped ? 1 : 4)
        .background(showActions ? Color.white.opacity(0.03) : Color.clear)
        .contextMenu {
            if isOwn {
                Button(action: onEdit) { Label("Edit Message", systemImage: "pencil") }
                Button(role: .destructive, action: onDelete) { Label("Delete Message", systemImage: "trash") }
            }
            Button(action: {}) { Label("Reply", systemImage: "arrowshape.turn.up.left") }
            Button(action: {}) { Label("React", systemImage: "face.smiling") }
            Button(action: {}) { Label("Copy Text", systemImage: "doc.on.doc") }
        }
        .onHover { showActions = $0 }
    }
}

// MARK: - Members sheet

struct MemberListSheet: View {
    let members: [ServerMember]
    @Environment(\.dismiss) var dismiss

    var grouped: [(String, [ServerMember])] {
        let online = members.filter { $0.status != .offline }
        let offline = members.filter { $0.status == .offline }
        var result: [(String, [ServerMember])] = []
        if !online.isEmpty { result.append(("Online — \(online.count)", online)) }
        if !offline.isEmpty { result.append(("Offline — \(offline.count)", offline)) }
        return result
    }

    var body: some View {
        NavigationView {
            List {
                ForEach(grouped, id: \.0) { section, members in
                    Section(section) {
                        ForEach(members) { m in
                            HStack(spacing: 12) {
                                ZStack(alignment: .bottomTrailing) {
                                    Circle()
                                        .fill(m.status == .offline ? Color(hex: "2B2D31") : Color(hex: "E53935"))
                                        .frame(width: 36, height: 36)
                                        .overlay(Text(String(m.username.prefix(1)).uppercased())
                                            .font(.system(size: 14, weight: .bold)).foregroundColor(.white))
                                    Circle()
                                        .fill(m.status.color)
                                        .frame(width: 12, height: 12)
                                        .overlay(Circle().stroke(Color(hex: "1E1F22"), lineWidth: 2))
                                }
                                VStack(alignment: .leading) {
                                    Text(m.username).font(.system(size: 14, weight: .medium)).foregroundColor(.white)
                                    if m.role != .member {
                                        Text(m.role.rawValue).font(.system(size: 11)).foregroundColor(Color(hex: "E53935"))
                                    }
                                }
                            }
                        }
                    }
                }
            }
            .listStyle(.insetGrouped)
            .scrollContentBackground(.hidden)
            .background(Color(hex: "313338"))
            .navigationTitle("Members")
            .navigationBarTitleDisplayMode(.inline)
            .navigationBarItems(trailing: Button("Done") { dismiss() }.foregroundColor(Color(hex: "E53935")))
        }
        .preferredColorScheme(.dark)
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
            VStack(spacing: 24) {
                ZStack {
                    Circle().fill(Color(hex: "2B2D31")).frame(width: 80, height: 80)
                    Image(systemName: "speaker.wave.3.fill")
                        .font(.system(size: 32))
                        .foregroundColor(Color(hex: "949BA4"))
                }
                Text(channel.name).font(.system(size: 22, weight: .bold)).foregroundColor(.white)
                Text(joined ? "Connected" : "Voice Channel")
                    .font(.system(size: 14))
                    .foregroundColor(Color(hex: "949BA4"))

                if joined {
                    HStack(spacing: 20) {
                        Button(action: { isMuted.toggle() }) {
                            VStack(spacing: 6) {
                                Image(systemName: isMuted ? "mic.slash.fill" : "mic.fill")
                                    .font(.system(size: 20))
                                Text(isMuted ? "Unmute" : "Mute").font(.system(size: 11))
                            }
                            .foregroundColor(isMuted ? Color(hex: "E53935") : Color(hex: "949BA4"))
                            .frame(width: 72, height: 72)
                            .background(Color(hex: "2B2D31"))
                            .clipShape(Circle())
                        }
                        Button(action: { joined = false }) {
                            VStack(spacing: 6) {
                                Image(systemName: "phone.down.fill").font(.system(size: 20))
                                Text("Leave").font(.system(size: 11))
                            }
                            .foregroundColor(.white)
                            .frame(width: 72, height: 72)
                            .background(Color(hex: "f23f43"))
                            .clipShape(Circle())
                        }
                    }
                } else {
                    Button(action: { joined = true }) {
                        Text("Join Voice Channel")
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
