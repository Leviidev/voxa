import Foundation
import SwiftUI

@MainActor
class ServersViewModel: ObservableObject {
    @Published var servers: [VoxaServer] = []
    @Published var selectedServer: VoxaServer?
    @Published var selectedChannel: VoxaChannel?
    @Published var isLoading = false
    @Published var error: String?

    private let storageKey = "voxa_servers"

    init() {
        loadLocal()
    }

    func load() async {
        isLoading = true
        do {
            let remote = try await APIClient.shared.servers()
            servers = remote
            saveLocal()
        } catch {
            // Fall back to local / mock data
            if servers.isEmpty {
                servers = VoxaServer.mock
            }
        }
        isLoading = false
    }

    func selectServer(_ server: VoxaServer) {
        selectedServer = server
        selectedChannel = server.firstTextChannel
    }

    func selectChannel(_ channel: VoxaChannel) {
        selectedChannel = channel
    }

    func createServer(name: String) async {
        do {
            let srv = try await APIClient.shared.createServer(name: name)
            servers.append(srv)
            saveLocal()
            selectServer(srv)
        } catch {
            // Offline: create locally
            let id = UUID().uuidString
            let channelId = UUID().uuidString
            let srv = VoxaServer(
                id: id,
                name: name,
                icon: nil,
                ownerId: "local",
                categories: [
                    ServerCategory(id: UUID().uuidString, name: "Text Channels", channels: [
                        VoxaChannel(id: channelId, name: "general", type: .text, unread: false, locked: false, members: nil)
                    ])
                ],
                members: [],
                unread: false
            )
            servers.append(srv)
            saveLocal()
            selectServer(srv)
        }
    }

    func deleteServer(_ server: VoxaServer) async {
        servers.removeAll { $0.id == server.id }
        if selectedServer?.id == server.id {
            selectedServer = servers.first
            selectedChannel = selectedServer?.firstTextChannel
        }
        saveLocal()
        try? await APIClient.shared.deleteServer(id: server.id)
    }

    func addChannel(to server: VoxaServer, name: String, type: VoxaChannel.ChannelType) async {
        let channelId: String
        do {
            let ch = try await APIClient.shared.createChannel(serverId: server.id, name: name, type: type.rawValue)
            channelId = ch.id
        } catch {
            channelId = UUID().uuidString
        }

        if let idx = servers.firstIndex(where: { $0.id == server.id }),
           let catIdx = servers[idx].categories.indices.first {
            let ch = VoxaChannel(id: channelId, name: name, type: type, unread: false, locked: false, members: nil)
            servers[idx].categories[catIdx].channels.append(ch)
            if type == .text { selectedChannel = ch }
        }
        saveLocal()
    }

    private func saveLocal() {
        if let data = try? JSONEncoder().encode(servers) {
            UserDefaults.standard.set(data, forKey: storageKey)
        }
    }

    private func loadLocal() {
        if let data = UserDefaults.standard.data(forKey: storageKey),
           let saved = try? JSONDecoder().decode([VoxaServer].self, from: data) {
            servers = saved
        }
    }
}
