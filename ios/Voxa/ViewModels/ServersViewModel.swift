import Foundation
import SwiftUI

@MainActor
class ServersViewModel: ObservableObject {
    @Published var servers: [VoxaServer] = []
    @Published var selectedServer: VoxaServer?
    @Published var selectedChannel: VoxaChannel?
    @Published var isLoading = false
    @Published var error: String?

    private let storageKey = "voxa_servers_v2"

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
            self.error = error.localizedDescription
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
            let id = "local_\(UUID().uuidString)"
            let channelId = "ch_\(UUID().uuidString)"
            let srv = VoxaServer(
                id: id, name: name, iconUrl: nil, iconColor: "#E53935",
                description: nil, bannerUrl: nil, bannerColor: nil,
                ownerId: "local", createdAt: nil, isPublic: false,
                categories: [
                    ServerCategory(id: "cat_\(UUID().uuidString)", name: "Text Channels", channels: [
                        VoxaChannel(id: channelId, name: "general", type: "text", topic: nil)
                    ])
                ],
                members: [], roles: []
            )
            servers.append(srv)
            saveLocal()
            selectServer(srv)
        }
    }

    func addServer(_ server: VoxaServer) async {
        if !servers.contains(where: { $0.id == server.id }) {
            servers.append(server)
            saveLocal()
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

    func addChannel(to server: VoxaServer, name: String, type: String) async {
        let channelId: String
        do {
            let ch = try await APIClient.shared.createChannel(serverId: server.id, name: name, type: type)
            channelId = ch.id
        } catch {
            channelId = "ch_\(UUID().uuidString)"
        }

        if let idx = servers.firstIndex(where: { $0.id == server.id }),
           let catIdx = servers[idx].categories.indices.first {
            let ch = VoxaChannel(id: channelId, name: name, type: type, topic: nil)
            servers[idx].categories[catIdx].channels.append(ch)
            if type == "text" { selectedChannel = ch }
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
