import Foundation
import SwiftUI

@MainActor
class DMViewModel: ObservableObject {
    @Published var channels: [DMChannel] = []
    @Published var selectedChannel: DMChannel?
    @Published var messages: [String: [DMMessage]] = [:]  // dmId → messages
    @Published var isLoadingChannels = false
    @Published var isSending = false
    @Published var error: String?

    private let socket = SocketClient.shared
    private var pollTask: Task<Void, Never>?
    private var joinedRooms: Set<String> = []

    func load() async {
        isLoadingChannels = true
        do {
            channels = try await APIClient.shared.dmChannels()
            for ch in channels {
                socket.joinDM(ch.id)
                joinedRooms.insert(ch.id)
            }
        } catch {
            self.error = error.localizedDescription
        }
        isLoadingChannels = false

        setupSocketCallbacks()
        startPolling()
    }

    func selectChannel(_ channel: DMChannel) {
        selectedChannel = channel
        if messages[channel.id] == nil {
            Task { await loadMessages(dmId: channel.id) }
        }
        socket.joinDM(channel.id)
        joinedRooms.insert(channel.id)
        Task { try? await APIClient.shared.markDmRead(dmId: channel.id) }
    }

    func loadMessages(dmId: String) async {
        do {
            let msgs = try await APIClient.shared.dmMessages(dmId: dmId)
            messages[dmId] = msgs
        } catch {}
    }

    func openDM(username: String) async -> DMChannel? {
        do {
            let ch = try await APIClient.shared.openDm(username: username)
            if !channels.contains(where: { $0.id == ch.id }) {
                channels.insert(ch, at: 0)
                socket.joinDM(ch.id)
                joinedRooms.insert(ch.id)
            }
            return ch
        } catch {
            self.error = error.localizedDescription
            return nil
        }
    }

    func send(content: String, in channel: DMChannel, author: User) async {
        guard !content.trimmingCharacters(in: .whitespaces).isEmpty else { return }
        isSending = true

        // Optimistic
        let optimistic = DMMessage(
            id: "opt_\(UUID().uuidString)",
            dmChannelId: channel.id,
            authorId: author.id,
            author: author.username,
            displayName: author.displayName,
            avatarUrl: author.avatarUrl,
            avatarColor: author.avatarColor,
            content: content,
            edited: false,
            editedAt: nil,
            timestamp: Date()
        )
        var msgs = messages[channel.id] ?? []
        msgs.append(optimistic)
        messages[channel.id] = msgs

        do {
            let real = try await APIClient.shared.sendDmMessage(dmId: channel.id, content: content)
            if var current = messages[channel.id],
               let idx = current.firstIndex(where: { $0.id == optimistic.id }) {
                current[idx] = real
                messages[channel.id] = current
            }
            bumpLastMessage(real, in: channel.id)
        } catch {}
        isSending = false
    }

    func edit(message: DMMessage, newContent: String, in channel: DMChannel) async {
        guard var msgs = messages[channel.id],
              let idx = msgs.firstIndex(where: { $0.id == message.id }) else { return }
        msgs[idx].content = newContent
        msgs[idx].edited = true
        messages[channel.id] = msgs

        do {
            let updated = try await APIClient.shared.editDmMessage(
                dmId: channel.id, msgId: message.id, content: newContent)
            if var current = messages[channel.id],
               let i = current.firstIndex(where: { $0.id == message.id }) {
                current[i] = updated
                messages[channel.id] = current
            }
        } catch {}
    }

    func delete(message: DMMessage, in channel: DMChannel) async {
        messages[channel.id]?.removeAll { $0.id == message.id }
        try? await APIClient.shared.deleteDmMessage(dmId: channel.id, msgId: message.id)
    }

    func disconnect() {
        for id in joinedRooms { socket.leaveDM(id) }
        joinedRooms = []
        pollTask?.cancel()
        pollTask = nil
        socket.onDMMessage = nil
        socket.onDMMessageEdit = nil
        socket.onDMMessageDelete = nil
    }

    // MARK: - Private

    private func setupSocketCallbacks() {
        socket.onDMMessage = { [weak self] msg in
            guard let self else { return }
            var msgs = self.messages[msg.dmChannelId] ?? []
            // Replace optimistic or append
            if let optIdx = msgs.firstIndex(where: {
                $0.id.hasPrefix("opt_") && $0.content == msg.content && $0.authorId == msg.authorId
            }) {
                msgs[optIdx] = msg
            } else if !msgs.contains(where: { $0.id == msg.id }) {
                msgs.append(msg)
            }
            self.messages[msg.dmChannelId] = msgs
            self.bumpLastMessage(msg, in: msg.dmChannelId)
        }

        socket.onDMMessageEdit = { [weak self] msg in
            guard let self else { return }
            if var msgs = self.messages[msg.dmChannelId],
               let idx = msgs.firstIndex(where: { $0.id == msg.id }) {
                msgs[idx] = msg
                self.messages[msg.dmChannelId] = msgs
            }
        }

        socket.onDMMessageDelete = { [weak self] id, dmChannelId in
            guard let self else { return }
            self.messages[dmChannelId]?.removeAll { $0.id == id }
        }
    }

    private func bumpLastMessage(_ msg: DMMessage, in dmId: String) {
        if let idx = channels.firstIndex(where: { $0.id == dmId }) {
            channels[idx].lastMessage = msg
        }
    }

    private func startPolling() {
        pollTask?.cancel()
        pollTask = Task {
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: 15_000_000_000) // 15s fallback
                guard !Task.isCancelled else { break }
                if let sel = selectedChannel {
                    if let fresh = try? await APIClient.shared.dmMessages(dmId: sel.id) {
                        mergeMessages(fresh, dmId: sel.id)
                    }
                }
            }
        }
    }

    private func mergeMessages(_ fresh: [DMMessage], dmId: String) {
        var merged = messages[dmId] ?? []
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
        messages[dmId] = merged.sorted { $0.timestamp < $1.timestamp }
    }
}
