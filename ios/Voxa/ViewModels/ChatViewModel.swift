import Foundation
import SwiftUI

@MainActor
class ChatViewModel: ObservableObject {
    @Published var messages: [VoxaMessage] = []
    @Published var isLoading = false
    @Published var isSending = false
    @Published var error: String?

    private var currentChannelId: String?
    private var pollTask: Task<Void, Never>?
    private let storageKey = "voxa_msgs_v2_"

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
            // Keep optimistic message
        }
        isSending = false
    }

    func edit(message: VoxaMessage, newContent: String) async {
        guard let idx = messages.firstIndex(where: { $0.id == message.id }) else { return }
        messages[idx].content = newContent
        messages[idx].edited = true
        if let cid = currentChannelId { saveLocal(channelId: cid) }

        do {
            let updated = try await APIClient.shared.editMessage(messageId: message.id,
                                                                  content: newContent)
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

    // MARK: - Polling (every 3s when app is active)

    private func startPolling(channelId: String) {
        pollTask?.cancel()
        pollTask = Task {
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: 3_000_000_000)
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
            msg.id.hasPrefix("opt_") && fresh.contains(where: { $0.content == msg.content && $0.authorId == msg.authorId })
        }
        messages = merged.sorted { $0.timestamp < $1.timestamp }
        saveLocal(channelId: channelId)
    }

    func disconnect() {
        pollTask?.cancel()
        pollTask = nil
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
