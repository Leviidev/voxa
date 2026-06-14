import SwiftUI

// MARK: - DM Root View (list of conversations)

struct DMView: View {
    @EnvironmentObject var auth: AuthViewModel
    @EnvironmentObject var dms: DMViewModel
    @State private var searchText = ""
    @State private var showNewDM = false
    @State private var selectedChannel: DMChannel?

    var filtered: [DMChannel] {
        if searchText.isEmpty { return dms.channels }
        return dms.channels.filter {
            $0.displayName.localizedCaseInsensitiveContains(searchText)
        }
    }

    var body: some View {
        ZStack {
            Color(hex: "2B2D31").ignoresSafeArea()
            VStack(spacing: 0) {
                // Search + New DM button
                HStack(spacing: 8) {
                    HStack(spacing: 8) {
                        Image(systemName: "magnifyingglass")
                            .foregroundColor(Color(hex: "949BA4"))
                            .font(.system(size: 14))
                        TextField("Find or start a conversation", text: $searchText)
                            .font(.system(size: 14))
                            .foregroundColor(.white)
                    }
                    .padding(.horizontal, 10)
                    .frame(height: 32)
                    .background(Color(hex: "1E1F22"))
                    .clipShape(RoundedRectangle(cornerRadius: 6))

                    Button(action: { showNewDM = true }) {
                        Image(systemName: "square.and.pencil")
                            .foregroundColor(Color(hex: "949BA4"))
                            .font(.system(size: 16))
                    }
                }
                .padding(.horizontal, 8)
                .padding(.vertical, 8)

                if dms.isLoadingChannels {
                    Spacer()
                    ProgressView().tint(Color(hex: "E53935"))
                    Spacer()
                } else if filtered.isEmpty {
                    emptyState
                } else {
                    ScrollView(showsIndicators: false) {
                        VStack(spacing: 2) {
                            ForEach(filtered) { channel in
                                DMChannelRow(
                                    channel: channel,
                                    isSelected: selectedChannel?.id == channel.id
                                )
                                .onTapGesture {
                                    selectedChannel = channel
                                    dms.selectChannel(channel)
                                }
                                .background(
                                    NavigationLink(
                                        destination: DMChatView(channel: channel),
                                        tag: channel.id,
                                        selection: Binding(
                                            get: { selectedChannel?.id },
                                            set: { _ in }
                                        )
                                    ) { EmptyView() }
                                    .opacity(0)
                                )
                            }
                        }
                        .padding(.top, 4)
                    }
                }
            }
        }
        .sheet(isPresented: $showNewDM) {
            NewDMSheet { channel in
                selectedChannel = channel
                dms.selectChannel(channel)
            }
        }
        .task { await dms.load() }
        .onDisappear { dms.disconnect() }
    }

    var emptyState: some View {
        VStack {
            Spacer()
            VStack(spacing: 14) {
                ZStack {
                    Circle()
                        .fill(Color(hex: "1E1F22"))
                        .frame(width: 72, height: 72)
                    Image(systemName: "bubble.left.and.bubble.right")
                        .font(.system(size: 28))
                        .foregroundColor(Color(hex: "5C5E66"))
                }
                Text("No Direct Messages")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(.white)
                Text("Start a conversation by tapping the pencil icon above.")
                    .font(.system(size: 14))
                    .foregroundColor(Color(hex: "949BA4"))
                    .multilineTextAlignment(.center)
            }
            .padding(.horizontal, 40)
            Spacer()
        }
    }
}

// MARK: - DM Channel Row

struct DMChannelRow: View {
    let channel: DMChannel
    var isSelected: Bool = false

    var body: some View {
        HStack(spacing: 12) {
            DMAvatar(participant: channel.other, size: 40)

            VStack(alignment: .leading, spacing: 2) {
                Text(channel.displayName)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundColor(.white)
                    .lineLimit(1)
                if let last = channel.lastMessage {
                    Text(last.content)
                        .font(.system(size: 13))
                        .foregroundColor(Color(hex: "949BA4"))
                        .lineLimit(1)
                } else {
                    Text("No messages yet")
                        .font(.system(size: 13))
                        .foregroundColor(Color(hex: "5C5E66"))
                }
            }

            Spacer()

            if let last = channel.lastMessage {
                Text(last.shortTime)
                    .font(.system(size: 11))
                    .foregroundColor(Color(hex: "5C5E66"))
            }
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 8)
        .background(isSelected ? Color(hex: "404249") : Color.clear)
        .clipShape(RoundedRectangle(cornerRadius: 8))
        .padding(.horizontal, 4)
        .contentShape(Rectangle())
        .animation(.easeInOut(duration: 0.1), value: isSelected)
    }
}

// MARK: - DM Chat View

struct DMChatView: View {
    let channel: DMChannel
    @EnvironmentObject var auth: AuthViewModel
    @EnvironmentObject var dms: DMViewModel
    @State private var messageText = ""
    @State private var editingMessage: DMMessage?
    @State private var editText = ""
    @FocusState private var inputFocused: Bool

    var messages: [DMMessage] {
        dms.messages[channel.id] ?? []
    }

    var body: some View {
        ZStack {
            Color(hex: "313338").ignoresSafeArea()
            VStack(spacing: 0) {
                ScrollViewReader { proxy in
                    ScrollView {
                        LazyVStack(alignment: .leading, spacing: 0) {
                            // Header
                            DMWelcomeHeader(channel: channel)

                            ForEach(Array(messages.enumerated()), id: \.element.id) { idx, msg in
                                let prev = idx > 0 ? messages[idx - 1] : nil
                                let grouped = prev.map {
                                    $0.authorId == msg.authorId &&
                                    msg.timestamp.timeIntervalSince($0.timestamp) < 300
                                } ?? false
                                let isOwn = msg.authorId == auth.user?.id

                                DMMessageRow(
                                    message: msg,
                                    grouped: grouped,
                                    isOwn: isOwn,
                                    onEdit: {
                                        editingMessage = msg
                                        editText = msg.content
                                        inputFocused = true
                                    },
                                    onDelete: {
                                        Task { await dms.delete(message: msg, in: channel) }
                                    }
                                )
                                .id(msg.id)
                            }

                            Color.clear.frame(height: 8).id("bottom")
                        }
                        .padding(.bottom, 8)
                    }
                    .onChange(of: messages.count) { _ in
                        withAnimation(.easeOut(duration: 0.2)) {
                            proxy.scrollTo("bottom", anchor: .bottom)
                        }
                    }
                    .onTapGesture { inputFocused = false }
                }

                dmInputBar
            }
        }
        .navigationTitle(channel.displayName)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                if let other = channel.other {
                    DMAvatar(participant: other, size: 28)
                }
            }
        }
        .task { await dms.loadMessages(dmId: channel.id) }
    }

    var dmInputBar: some View {
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
                    editingMessage != nil ? "Edit message…" : "Message \(channel.displayName)",
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
        if editingMessage != nil { return !editText.trimmingCharacters(in: .whitespaces).isEmpty }
        return !messageText.trimmingCharacters(in: .whitespaces).isEmpty && !dms.isSending
    }

    private func sendMessage() {
        guard let user = auth.user else { return }
        let text = messageText.trimmingCharacters(in: .whitespaces)
        guard !text.isEmpty else { return }
        messageText = ""
        Task { await dms.send(content: text, in: channel, author: user) }
    }

    private func submitEdit() {
        guard let msg = editingMessage else { return }
        let text = editText.trimmingCharacters(in: .whitespaces)
        guard !text.isEmpty else { return }
        Task {
            await dms.edit(message: msg, newContent: text, in: channel)
            editingMessage = nil
            editText = ""
        }
    }
}

// MARK: - DM Welcome Header

struct DMWelcomeHeader: View {
    let channel: DMChannel

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            DMAvatar(participant: channel.other, size: 64)

            VStack(alignment: .leading, spacing: 4) {
                Text(channel.displayName)
                    .font(.system(size: 22, weight: .bold))
                    .foregroundColor(.white)
                if let other = channel.other {
                    Text("@\(other.username)#\(other.discriminator)")
                        .font(.system(size: 14))
                        .foregroundColor(Color(hex: "949BA4"))
                }
                Text("This is the start of your conversation.")
                    .font(.system(size: 13))
                    .foregroundColor(Color(hex: "5C5E66"))
                    .padding(.top, 2)
            }
            Divider().background(Color.white.opacity(0.06)).padding(.top, 4)
        }
        .padding(.horizontal, 16)
        .padding(.top, 24)
        .padding(.bottom, 8)
    }
}

// MARK: - DM Message Row

struct DMMessageRow: View {
    let message: DMMessage
    let grouped: Bool
    let isOwn: Bool
    let onEdit: () -> Void
    let onDelete: () -> Void

    var body: some View {
        HStack(alignment: .top, spacing: 14) {
            if grouped {
                Color.clear.frame(width: 40)
            } else {
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
                + (message.edited
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
                Button(action: onEdit) { Label("Edit Message", systemImage: "pencil") }
                Divider()
                Button(role: .destructive, action: onDelete) {
                    Label("Delete Message", systemImage: "trash")
                }
            }
            Button(action: { UIPasteboard.general.string = message.content }) {
                Label("Copy Text", systemImage: "doc.on.doc")
            }
        }
    }
}

// MARK: - New DM Sheet

struct NewDMSheet: View {
    @EnvironmentObject var dms: DMViewModel
    @Environment(\.dismiss) var dismiss
    @State private var username = ""
    @State private var isLoading = false
    @State private var error: String?
    var onOpen: (DMChannel) -> Void

    var body: some View {
        NavigationView {
            ZStack {
                Color(hex: "111214").ignoresSafeArea()
                VStack(spacing: 24) {
                    VStack(spacing: 6) {
                        Image(systemName: "bubble.left.and.bubble.right.fill")
                            .font(.system(size: 36))
                            .foregroundColor(Color(hex: "E53935"))
                        Text("New Message")
                            .font(.system(size: 20, weight: .bold))
                            .foregroundColor(.white)
                        Text("Enter a username to start a conversation.")
                            .font(.system(size: 14))
                            .foregroundColor(Color(hex: "949BA4"))
                            .multilineTextAlignment(.center)
                    }
                    .padding(.top, 32)

                    VStack(alignment: .leading, spacing: 8) {
                        Text("USERNAME")
                            .font(.system(size: 10, weight: .bold))
                            .foregroundColor(Color(hex: "6b7280"))
                            .kerning(0.8)
                        TextField("username or username#1234", text: $username)
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
                    .padding(.horizontal, 24)

                    Button(action: openDM) {
                        ZStack {
                            RoundedRectangle(cornerRadius: 14)
                                .fill(username.isEmpty ? Color.white.opacity(0.1) : Color(hex: "E53935"))
                                .frame(height: 52)
                            if isLoading {
                                ProgressView().tint(.white)
                            } else {
                                Text("Open Conversation")
                                    .font(.system(size: 15, weight: .bold))
                                    .foregroundColor(username.isEmpty ? Color(hex: "6b7280") : .white)
                            }
                        }
                    }
                    .disabled(username.isEmpty || isLoading)
                    .padding(.horizontal, 24)

                    Spacer()
                }
            }
            .navigationTitle("New Message")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }.foregroundColor(Color(hex: "E53935"))
                }
            }
        }
        .preferredColorScheme(.dark)
    }

    private func openDM() {
        error = nil
        isLoading = true
        Task {
            if let ch = await dms.openDM(username: username.trimmingCharacters(in: .whitespaces)) {
                onOpen(ch)
                dismiss()
            } else {
                error = dms.error ?? "User not found"
                dms.error = nil
            }
            isLoading = false
        }
    }
}

// MARK: - DM Avatar Helper

struct DMAvatar: View {
    let participant: DMParticipant?
    let size: CGFloat

    var swiftColor: Color {
        guard let p = participant else { return Color(hex: "5C5E66") }
        if let hex = p.avatarColor { return Color(hex: hex) }
        let colors: [Color] = [.red, .purple, .blue, .green, .orange, .teal]
        return colors[abs(p.username.hashValue) % colors.count]
    }

    var body: some View {
        ZStack(alignment: .bottomTrailing) {
            Circle()
                .fill(swiftColor)
                .frame(width: size, height: size)
                .overlay(
                    Group {
                        if let p = participant, let url = p.avatarUrl.flatMap(URL.init) {
                            AsyncImage(url: url) { img in
                                img.resizable().scaledToFill()
                            } placeholder: {
                                initials
                            }
                        } else {
                            initials
                        }
                    }
                    .clipShape(Circle())
                )

            if let p = participant {
                Circle()
                    .fill(p.statusEnum.color)
                    .frame(width: size * 0.28, height: size * 0.28)
                    .overlay(Circle().stroke(Color(hex: "2B2D31"), lineWidth: 2))
            }
        }
        .frame(width: size, height: size)
    }

    var initials: some View {
        Text(String((participant?.effectiveName ?? "?").prefix(1)).uppercased())
            .font(.system(size: size * 0.38, weight: .bold))
            .foregroundColor(.white)
    }
}

// MARK: - Section Header (shared)

struct SectionHeader: View {
    let text: String
    init(_ text: String) { self.text = text }

    var body: some View {
        HStack {
            Text(text)
                .font(.system(size: 11, weight: .semibold))
                .foregroundColor(Color(hex: "949BA4"))
                .kerning(0.3)
            Spacer()
        }
        .padding(.horizontal, 16)
        .padding(.top, 12)
        .padding(.bottom, 4)
    }
}
