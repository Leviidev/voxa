import Foundation
import SwiftUI

@MainActor
class ChatViewModel: ObservableObject {
    @Published var messages: [VoxaMessage] = []
    @Published var isLoading = false
    @Published var isSending = false
    @Published var error: String?
    @Published var typingUsers: [String] = []  // usernames currently typing

    private var currentChannelId: String?
    private var pollTask: Task<Void, Never>?
    private let storageKey = "voxa_msgs_v2_"
    private let socket = SocketClient.shared

    func load(channelId: String, token: String?) async {
        currentChannelId = channelId
        isLoading = true
        messages = loadLocal(channelId: channelId)

        do {
            let remote = try await APIClient.shared.messages(channelId: channelId)
            messages = remote
            saveLocal(channelId: channelId)
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false

        // Wire up real-time socket callbacks
        socket.onNewMessage = { [weak self] msg in
            guard let self, msg.channelId == channelId else { return }
            self.handleNewMessage(msg)
        }
        socket.onMessageEdit = { [weak self] msg in
            guard let self, msg.channelId == channelId else { return }
            if let idx = self.messages.firstIndex(where: { $0.id == msg.id }) {
                self.messages[idx] = msg
                self.saveLocal(channelId: channelId)
            }
        }
        socket.onMessageDelete = { [weak self] id in
            guard let self else { return }
            self.messages.removeAll { $0.id == id }
            self.saveLocal(channelId: channelId)
        }
        socket.onTypingUpdate = { [weak self] cid, _, username, typing in
            guard let self, cid == channelId else { return }
            if typing {
                if !self.typingUsers.contains(username) {
                    self.typingUsers.append(username)
                }
            } else {
                self.typingUsers.removeAll { $0 == username }
            }
        }

        // Re-join the channel after reconnect
        socket.onConnect = { [weak self] in
            guard let self else { return }
            Task { @MainActor in self.socket.joinChannel(channelId) }
        }
        socket.joinChannel(channelId)

        // Fallback poll every 10s in case socket misses anything
        startPolling(channelId: channelId)
    }

    func send(content: String, channelId: String, author: User) async {
        guard !content.trimmingCharacters(in: .whitespaces).isEmpty else { return }
        isSending = true

        let optimistic = VoxaMessage(
            id: "opt_\(UUID().uuidString)",
            content: content,
            authorId: author.id,
            author: author.username,
            displayName: author.displayName,
            avatarUrl: author.avatarUrl,
            avatarColor: author.avatarColor,
            discriminator: author.discriminator,
            channelId: channelId,
            timestamp: Date(),
            edited: false, editedAt: nil,
            parentId: nil, replyCount: 0, reactions: nil
        )
        messages.append(optimistic)

        do {
            let real = try await APIClient.shared.sendMessage(channelId: channelId, content: content)
            if let idx = messages.firstIndex(where: { $0.id == optimistic.id }) {
                messages[idx] = real
            }
            saveLocal(channelId: channelId)
        } catch {
            // Keep optimistic message visible
        }
        isSending = false
    }

    func edit(message: VoxaMessage, newContent: String) async {
        guard let idx = messages.firstIndex(where: { $0.id == message.id }) else { return }
        messages[idx].content = newContent
        messages[idx].edited = true
        if let cid = currentChannelId { saveLocal(channelId: cid) }

        do {
            let updated = try await APIClient.shared.editMessage(messageId: message.id, content: newContent)
            if let i = messages.firstIndex(where: { $0.id == message.id }) {
                messages[i] = updated
            }
        } catch {}
    }

    func delete(message: VoxaMessage) async {
        messages.removeAll { $0.id == message.id }
        if let cid = currentChannelId { saveLocal(channelId: cid) }
        try? await APIClient.shared.deleteMessage(messageId: message.id)
    }

    func disconnect() {
        if let cid = currentChannelId {
            socket.leaveChannel(cid)
        }
        pollTask?.cancel()
        pollTask = nil
        socket.onNewMessage = nil
        socket.onMessageEdit = nil
        socket.onConnect = nil
        socket.onMessageDelete = nil
        socket.onTypingUpdate = nil
        currentChannelId = nil
        typingUsers = []
    }

    // MARK: - Private helpers

    private func handleNewMessage(_ msg: VoxaMessage) {
        // Replace matching optimistic message or append
        if let optIdx = messages.firstIndex(where: {
            $0.id.hasPrefix("opt_") && $0.content == msg.content && $0.authorId == msg.authorId
        }) {
            messages[optIdx] = msg
        } else if !messages.contains(where: { $0.id == msg.id }) {
            messages.append(msg)
        }
        if let cid = currentChannelId { saveLocal(channelId: cid) }
    }

    private func startPolling(channelId: String) {
        pollTask?.cancel()
        pollTask = Task {
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: 10_000_000_000) // 10s fallback
                guard !Task.isCancelled else { break }
                do {
                    let fresh = try await APIClient.shared.messages(channelId: channelId, limit: 50)
                    if !Task.isCancelled {
                        mergeMessages(fresh, channelId: channelId)
                    }
                } catch {}
            }
        }
    }

    private func mergeMessages(_ fresh: [VoxaMessage], channelId: String) {
        var merged = messages
        for msg in fresh {
            if let idx = merged.firstIndex(where: { $0.id == msg.id }) {
                merged[idx] = msg
            } else if !merged.contains(where: { $0.id == msg.id }) {
                merged.append(msg)
            }
        }
        merged.removeAll { msg in
            msg.id.hasPrefix("opt_") &&
            fresh.contains(where: { $0.content == msg.content && $0.authorId == msg.authorId })
        }
        messages = merged.sorted { $0.timestamp < $1.timestamp }
        saveLocal(channelId: channelId)
    }

    // MARK: - Local Persistence

    private func saveLocal(channelId: String) {
        let toSave = Array(messages.suffix(200))
        if let data = try? JSONEncoder().encode(toSave) {
            UserDefaults.standard.set(data, forKey: storageKey + channelId)
        }
    }

    private func loadLocal(channelId: String) -> [VoxaMessage] {
        guard let data = UserDefaults.standard.data(forKey: storageKey + channelId),
              let msgs = try? JSONDecoder().decode([VoxaMessage].self, from: data) else { return [] }
        return msgs
    }
}
