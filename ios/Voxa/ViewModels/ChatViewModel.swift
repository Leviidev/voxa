import Foundation
import SwiftUI
import Combine

@MainActor
class ChatViewModel: ObservableObject {
    @Published var messages: [VoxaMessage] = []
    @Published var isLoading = false
    @Published var isSending = false
    @Published var error: String?
    @Published var typingUsers: [String] = []

    private var currentChannelId: String?
    private var wsClient: WebSocketClient?
    private let storageKey = "voxa_msgs_"

    func load(channelId: String, token: String?) async {
        currentChannelId = channelId
        isLoading = true

        // Load from cache first
        messages = loadLocal(channelId: channelId)

        do {
            let remote = try await APIClient.shared.messages(channelId: channelId)
            messages = remote
            saveLocal(channelId: channelId)
        } catch {
            // Use mock data if API fails
            if messages.isEmpty {
                messages = VoxaMessage.mockMessages(for: channelId)
                saveLocal(channelId: channelId)
            }
        }

        isLoading = false

        // Connect WebSocket if token available
        if let token {
            connectWebSocket(channelId: channelId, token: token)
        }
    }

    func send(content: String, channelId: String, author: User) async {
        guard !content.trimmingCharacters(in: .whitespaces).isEmpty else { return }
        isSending = true

        let optimistic = VoxaMessage(
            id: "opt_\(UUID().uuidString)",
            author: author.username,
            authorId: author.id,
            discriminator: author.discriminator,
            content: content,
            timestamp: Date(),
            edited: false, editedAt: nil,
            attachments: [], reactions: []
        )
        messages.append(optimistic)
        saveLocal(channelId: channelId)

        do {
            let real = try await APIClient.shared.sendMessage(channelId: channelId, content: content)
            if let idx = messages.firstIndex(where: { $0.id == optimistic.id }) {
                messages[idx] = real
            }
            saveLocal(channelId: channelId)
        } catch {
            // Keep the optimistic message, mark no action needed offline
        }

        isSending = false
    }

    func edit(message: VoxaMessage, newContent: String) async {
        guard let idx = messages.firstIndex(where: { $0.id == message.id }) else { return }
        messages[idx].content = newContent
        messages[idx].edited = true
        if let channelId = currentChannelId { saveLocal(channelId: channelId) }

        do {
            let updated = try await APIClient.shared.editMessage(id: message.id, content: newContent)
            messages[idx] = updated
        } catch {}
    }

    func delete(message: VoxaMessage) async {
        messages.removeAll { $0.id == message.id }
        if let channelId = currentChannelId { saveLocal(channelId: channelId) }
        try? await APIClient.shared.deleteMessage(id: message.id)
    }

    // MARK: - WebSocket

    private func connectWebSocket(channelId: String, token: String) {
        wsClient?.disconnect()
        wsClient = WebSocketClient()
        wsClient?.onMessage = { [weak self] msg in
            guard let self else { return }
            Task { @MainActor in
                if !self.messages.contains(where: { $0.id == msg.id }) {
                    self.messages.append(msg)
                    if let cid = self.currentChannelId { self.saveLocal(channelId: cid) }
                }
            }
        }
        wsClient?.connect(token: token, channelId: channelId)
    }

    func disconnect() {
        wsClient?.disconnect()
        wsClient = nil
    }

    // MARK: - Local Persistence

    private func saveLocal(channelId: String) {
        let key = storageKey + channelId
        let toSave = Array(messages.suffix(200)) // keep last 200
        if let data = try? JSONEncoder().encode(toSave) {
            UserDefaults.standard.set(data, forKey: key)
        }
    }

    private func loadLocal(channelId: String) -> [VoxaMessage] {
        let key = storageKey + channelId
        guard let data = UserDefaults.standard.data(forKey: key),
              let msgs = try? JSONDecoder().decode([VoxaMessage].self, from: data) else { return [] }
        return msgs
    }
}
