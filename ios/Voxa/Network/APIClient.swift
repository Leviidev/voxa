import Foundation

// MARK: - API Client

actor APIClient {
    static let shared = APIClient()

    private let baseURL: URL
    private var authToken: String?

    private init() {
        let envURL = ProcessInfo.processInfo.environment["VOXA_API_URL"] ?? "https://voxa.lol"
        self.baseURL = URL(string: envURL)!
    }

    func setToken(_ token: String?) {
        self.authToken = token
    }

    // MARK: - Request Builder

    private func buildRequest(_ path: String, method: String = "GET", body: Data? = nil) -> URLRequest {
        let url = baseURL.appendingPathComponent(path)
        var req = URLRequest(url: url)
        req.httpMethod = method
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue("application/json", forHTTPHeaderField: "Accept")
        if let token = authToken {
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        req.httpBody = body
        req.timeoutInterval = 15
        return req
    }

    private func perform<T: Decodable>(_ path: String, method: String = "GET", body: Encodable? = nil) async throws -> T {
        var bodyData: Data?
        if let body { bodyData = try JSONEncoder().encode(body) }
        let req = buildRequest(path, method: method, body: bodyData)
        let (data, response) = try await URLSession.shared.data(for: req)
        guard let http = response as? HTTPURLResponse else { throw APIError.invalidResponse }
        guard (200..<300).contains(http.statusCode) else {
            let msg = try? JSONDecoder().decode(APIErrorBody.self, from: data)
            throw APIError.httpError(http.statusCode, msg?.error ?? HTTPURLResponse.localizedString(forStatusCode: http.statusCode))
        }
        return try Self.decoder.decode(T.self, from: data)
    }

    private func performVoid(_ path: String, method: String, body: Encodable? = nil) async throws {
        var bodyData: Data?
        if let body { bodyData = try JSONEncoder().encode(body) }
        let req = buildRequest(path, method: method, body: bodyData)
        let (_, response) = try await URLSession.shared.data(for: req)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw APIError.invalidResponse
        }
    }

    static let decoder: JSONDecoder = {
        let d = JSONDecoder()
        d.dateDecodingStrategy = .custom { decoder in
            let container = try decoder.singleValueContainer()
            let str = try container.decode(String.self)
            let isoFull = ISO8601DateFormatter()
            isoFull.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            if let d = isoFull.date(from: str) { return d }
            let isoBasic = ISO8601DateFormatter()
            if let d = isoBasic.date(from: str) { return d }
            throw DecodingError.dataCorrupted(.init(codingPath: decoder.codingPath, debugDescription: "Bad date: \(str)"))
        }
        return d
    }()

    // MARK: - Auth

    func login(email: String, password: String) async throws -> AuthResponse {
        try await perform("/api/auth/login", method: "POST",
                          body: LoginRequest(email: email, password: password))
    }

    func register(email: String, username: String, password: String) async throws -> AuthResponse {
        try await perform("/api/auth/register", method: "POST",
                          body: RegisterRequest(email: email, username: username, password: password))
    }

    func me() async throws -> User {
        try await perform("/api/auth/me")
    }

    func changePassword(currentPassword: String, newPassword: String) async throws {
        struct Body: Encodable { let currentPassword: String; let newPassword: String }
        try await performVoid("/api/auth/change-password", method: "PATCH",
                              body: Body(currentPassword: currentPassword, newPassword: newPassword))
    }

    // MARK: - Servers

    func servers() async throws -> [VoxaServer] {
        try await perform("/api/servers")
    }

    func createServer(name: String) async throws -> VoxaServer {
        struct Body: Encodable { let name: String }
        return try await perform("/api/servers", method: "POST", body: Body(name: name))
    }

    func deleteServer(id: String) async throws {
        try await performVoid("/api/servers/\(id)", method: "DELETE")
    }

    // MARK: - Channels

    func createChannel(serverId: String, name: String, type: String) async throws -> VoxaChannel {
        struct Body: Encodable { let name: String; let type: String }
        return try await perform("/api/channels/servers/\(serverId)/channels", method: "POST",
                                 body: Body(name: name, type: type))
    }

    // MARK: - Messages

    func messages(channelId: String, limit: Int = 50) async throws -> [VoxaMessage] {
        try await perform("/api/messages/channels/\(channelId)/messages?limit=\(limit)")
    }

    func sendMessage(channelId: String, content: String) async throws -> VoxaMessage {
        struct Body: Encodable { let content: String }
        return try await perform("/api/messages/channels/\(channelId)/messages", method: "POST",
                                 body: Body(content: content))
    }

    func editMessage(messageId: String, content: String) async throws -> VoxaMessage {
        struct Body: Encodable { let content: String }
        return try await perform("/api/messages/\(messageId)", method: "PATCH",
                                 body: Body(content: content))
    }

    func deleteMessage(messageId: String) async throws {
        try await performVoid("/api/messages/\(messageId)", method: "DELETE")
    }

    // MARK: - Profile

    func updateProfile(displayName: String?, bio: String?, customStatus: String?,
                       avatarColor: String?, status: String?) async throws -> User {
        struct Body: Encodable {
            var displayName: String?
            var bio: String?
            var customStatus: String?
            var avatarColor: String?
            var status: String?
        }
        return try await perform("/api/users/me", method: "PATCH",
                                 body: Body(displayName: displayName, bio: bio,
                                            customStatus: customStatus, avatarColor: avatarColor,
                                            status: status))
    }

    // MARK: - Users

    func getUser(id: String) async throws -> User {
        try await perform("/api/users/\(id)")
    }

    // MARK: - Invites

    func joinByInvite(code: String) async throws -> VoxaServer {
        struct Empty: Encodable {}
        return try await perform("/api/invites/\(code)/join", method: "POST", body: Empty())
    }

    // MARK: - DMs

    func dmChannels() async throws -> [DMChannel] {
        try await perform("/api/dms")
    }

    func openDm(userId: String? = nil, username: String? = nil) async throws -> DMChannel {
        struct Body: Encodable { var userId: String?; var username: String? }
        return try await perform("/api/dms", method: "POST",
                                 body: Body(userId: userId, username: username))
    }

    func dmMessages(dmId: String, limit: Int = 50) async throws -> [DMMessage] {
        try await perform("/api/dms/\(dmId)/messages?limit=\(limit)")
    }

    func sendDmMessage(dmId: String, content: String) async throws -> DMMessage {
        struct Body: Encodable { let content: String }
        return try await perform("/api/dms/\(dmId)/messages", method: "POST",
                                 body: Body(content: content))
    }

    func editDmMessage(dmId: String, msgId: String, content: String) async throws -> DMMessage {
        struct Body: Encodable { let content: String }
        return try await perform("/api/dms/\(dmId)/messages/\(msgId)", method: "PATCH",
                                 body: Body(content: content))
    }

    func deleteDmMessage(dmId: String, msgId: String) async throws {
        try await performVoid("/api/dms/\(dmId)/messages/\(msgId)", method: "DELETE")
    }

    func markDmRead(dmId: String) async throws {
        struct Empty: Encodable {}
        try await performVoid("/api/dms/\(dmId)/read", method: "POST", body: Empty())
    }

    // MARK: - Discovery

    func discoverServers(query: String = "", category: String = "") async throws -> [DiscoverableServer] {
        var parts: [String] = []
        if !query.isEmpty, let enc = query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) {
            parts.append("q=\(enc)")
        }
        if !category.isEmpty && category != "all",
           let enc = category.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) {
            parts.append("category=\(enc)")
        }
        let qs = parts.isEmpty ? "" : "?" + parts.joined(separator: "&")
        let urlStr = baseURL.absoluteString + "/api/servers/discover" + qs
        guard let url = URL(string: urlStr) else { throw APIError.invalidResponse }
        var req = URLRequest(url: url)
        req.httpMethod = "GET"
        req.setValue("application/json", forHTTPHeaderField: "Accept")
        if let token = authToken { req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }
        req.timeoutInterval = 15
        let (data, response) = try await URLSession.shared.data(for: req)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw APIError.invalidResponse
        }
        return try Self.decoder.decode([DiscoverableServer].self, from: data)
    }

    func joinPublicServer(id: String) async throws -> VoxaServer {
        struct Empty: Encodable {}
        return try await perform("/api/servers/\(id)/join-public", method: "POST", body: Empty())
    }

    // MARK: - Servers (update)

    func updateServer(id: String, name: String?, iconUrl: String?) async throws {
        struct Body: Encodable { var name: String?; var iconUrl: String? }
        let _: VoxaServer = try await perform("/api/servers/\(id)", method: "PATCH",
                                              body: Body(name: name, iconUrl: iconUrl))
    }

    // MARK: - Friends

    func sendFriendRequest(username: String) async throws {
        struct Body: Encodable { let username: String }
        try await performVoid("/api/friends/request", method: "POST", body: Body(username: username))
    }

    func getFriendRequests() async throws -> [FriendRequest] {
        try await perform("/api/friends/requests")
    }

    func acceptFriendRequest(id: String) async throws {
        struct Empty: Encodable {}
        try await performVoid("/api/friends/requests/\(id)/accept", method: "POST", body: Empty())
    }

    func declineFriendRequest(id: String) async throws {
        try await performVoid("/api/friends/requests/\(id)", method: "DELETE")
    }

    func getFriends() async throws -> [Friend] {
        try await perform("/api/friends")
    }

    func removeFriend(userId: String) async throws {
        try await performVoid("/api/friends/\(userId)", method: "DELETE")
    }
}

// MARK: - Errors

enum APIError: LocalizedError {
    case invalidResponse
    case httpError(Int, String)
    case decodingError(String)

    var errorDescription: String? {
        switch self {
        case .invalidResponse: return "Invalid server response"
        case .httpError(let code, let msg): return "Error \(code): \(msg)"
        case .decodingError(let msg): return "Decoding error: \(msg)"
        }
    }
}

private struct APIErrorBody: Decodable {
    let error: String
}

// MARK: - Socket.IO v4 Client (Singleton)

@MainActor
class SocketClient: ObservableObject {
    static let shared = SocketClient()

    // Callbacks
    var onNewMessage: ((VoxaMessage) -> Void)?
    var onMessageEdit: ((VoxaMessage) -> Void)?
    var onMessageDelete: ((String) -> Void)?
    var onDMMessage: ((DMMessage) -> Void)?
    var onDMMessageEdit: ((DMMessage) -> Void)?
    var onDMMessageDelete: ((_ id: String, _ dmChannelId: String) -> Void)?
    var onTypingUpdate: ((_ channelId: String, _ userId: String, _ username: String, _ typing: Bool) -> Void)?

    private var task: URLSessionWebSocketTask?
    private var baseURL: URL
    private var authToken: String?
    private var namespaceConnected = false
    private var reconnectTask: Task<Void, Never>?

    private init() {
        let envURL = ProcessInfo.processInfo.environment["VOXA_API_URL"] ?? "https://voxa.lol"
        let wsScheme = envURL.hasPrefix("https") ? "wss" : "ws"
        let host = envURL
            .replacingOccurrences(of: "https://", with: "")
            .replacingOccurrences(of: "http://", with: "")
        self.baseURL = URL(string: "\(wsScheme)://\(host)")!
    }

    func connect(token: String) {
        guard authToken != token || task == nil else { return }
        authToken = token
        openConnection()
    }

    func disconnect() {
        reconnectTask?.cancel()
        reconnectTask = nil
        namespaceConnected = false
        task?.cancel(with: .goingAway, reason: nil)
        task = nil
    }

    // MARK: - Connect callback

    var onConnect: (() -> Void)?

    // MARK: - Room management

    func joinChannel(_ channelId: String) {
        emitString("channel:join", value: channelId)
    }

    func leaveChannel(_ channelId: String) {
        emitString("channel:leave", value: channelId)
    }

    func joinServer(_ serverId: String) {
        emitString("server:join", value: serverId)
    }

    func joinDM(_ dmId: String) {
        emitString("dm:join", value: dmId)
    }

    func leaveDM(_ dmId: String) {
        emitString("dm:leave", value: dmId)
    }

    func sendTypingStart(channelId: String, username: String) {
        emitDict("typing:start", data: ["channelId": channelId, "username": username])
    }

    func sendTypingStop(channelId: String) {
        emitDict("typing:stop", data: ["channelId": channelId])
    }

    // MARK: - Private

    private func openConnection() {
        task?.cancel(with: .goingAway, reason: nil)
        task = nil
        namespaceConnected = false

        guard var comps = URLComponents(url: baseURL.appendingPathComponent("/socket.io/"),
                                        resolvingAgainstBaseURL: false) else { return }
        comps.queryItems = [
            URLQueryItem(name: "EIO", value: "4"),
            URLQueryItem(name: "transport", value: "websocket"),
        ]
        guard let url = comps.url else { return }
        task = URLSession.shared.webSocketTask(with: url)
        task?.resume()
        receive()
    }

    private func emitString(_ event: String, value: String) {
        guard namespaceConnected else { return }
        let parts: [Any] = [event, value]
        guard let data = try? JSONSerialization.data(withJSONObject: parts),
              let str = String(data: data, encoding: .utf8) else { return }
        task?.send(.string("42\(str)")) { _ in }
    }

    private func emitDict(_ event: String, data: [String: Any]) {
        guard namespaceConnected else { return }
        let parts: [Any] = [event, data]
        guard let jsonData = try? JSONSerialization.data(withJSONObject: parts),
              let str = String(data: jsonData, encoding: .utf8) else { return }
        task?.send(.string("42\(str)")) { _ in }
    }

    private func receive() {
        task?.receive { [weak self] result in
            guard let self else { return }
            switch result {
            case .success(let msg):
                if case .string(let text) = msg {
                    Task { @MainActor in self.handle(text) }
                }
                self.receive()
            case .failure:
                Task { @MainActor in self.scheduleReconnect() }
            }
        }
    }

    private func handle(_ text: String) {
        if text.hasPrefix("0") {
            // EIO open — send Socket.IO namespace connect with auth token
            let auth: [String: Any] = ["token": authToken ?? ""]
            if let data = try? JSONSerialization.data(withJSONObject: auth),
               let str = String(data: data, encoding: .utf8) {
                task?.send(.string("40\(str)")) { _ in }
            }
        } else if text == "2" {
            // Ping — respond pong
            task?.send(.string("3")) { _ in }
        } else if text.hasPrefix("40") {
            // Namespace connected
            namespaceConnected = true
            onConnect?()
        } else if text == "41" {
            // Namespace disconnected
            namespaceConnected = false
            scheduleReconnect()
        } else if text.hasPrefix("42") {
            parseEvent(text)
        }
    }

    private func parseEvent(_ text: String) {
        let inner = String(text.dropFirst(2))
        guard let data = inner.data(using: .utf8),
              let arr = try? JSONSerialization.jsonObject(with: data) as? [Any],
              arr.count >= 2,
              let event = arr[0] as? String else { return }

        switch event {
        case "newMessage":
            guard let payload = arr[1] as? [String: Any],
                  let json = try? JSONSerialization.data(withJSONObject: payload),
                  let msg = try? APIClient.decoder.decode(VoxaMessage.self, from: json) else { return }
            onNewMessage?(msg)

        case "messageEdited":
            guard let payload = arr[1] as? [String: Any],
                  let json = try? JSONSerialization.data(withJSONObject: payload),
                  let msg = try? APIClient.decoder.decode(VoxaMessage.self, from: json) else { return }
            onMessageEdit?(msg)

        case "messageDeleted":
            guard let payload = arr[1] as? [String: Any],
                  let id = payload["id"] as? String else { return }
            onMessageDelete?(id)

        case "dm:message:new":
            guard let payload = arr[1] as? [String: Any],
                  let json = try? JSONSerialization.data(withJSONObject: payload),
                  let msg = try? APIClient.decoder.decode(DMMessage.self, from: json) else { return }
            onDMMessage?(msg)

        case "dm:message:edit":
            guard let payload = arr[1] as? [String: Any],
                  let json = try? JSONSerialization.data(withJSONObject: payload),
                  let msg = try? APIClient.decoder.decode(DMMessage.self, from: json) else { return }
            onDMMessageEdit?(msg)

        case "dm:message:delete":
            guard let payload = arr[1] as? [String: Any],
                  let id = payload["id"] as? String,
                  let dmChannelId = payload["dmChannelId"] as? String else { return }
            onDMMessageDelete?(id, dmChannelId)

        case "typing:update":
            guard let payload = arr[1] as? [String: Any],
                  let channelId = payload["channelId"] as? String,
                  let userId = payload["userId"] as? String,
                  let typing = payload["typing"] as? Bool else { return }
            let username = payload["username"] as? String ?? ""
            onTypingUpdate?(channelId, userId, username, typing)

        default: break
        }
    }

    private func scheduleReconnect() {
        guard authToken != nil else { return }
        reconnectTask?.cancel()
        reconnectTask = Task {
            try? await Task.sleep(nanoseconds: 3_000_000_000)
            guard !Task.isCancelled else { return }
            openConnection()
        }
    }
}
