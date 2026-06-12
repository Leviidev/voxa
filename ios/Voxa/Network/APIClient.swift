import Foundation

// MARK: - API Client

actor APIClient {
    static let shared = APIClient()

    // Base URL — set VOXA_API_URL env var in CI or change to your deployed URL
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
        if let body {
            bodyData = try JSONEncoder().encode(body)
        }
        let req = buildRequest(path, method: method, body: bodyData)
        let (data, response) = try await URLSession.shared.data(for: req)
        guard let http = response as? HTTPURLResponse else { throw APIError.invalidResponse }
        guard (200..<300).contains(http.statusCode) else {
            let msg = try? JSONDecoder().decode(APIErrorBody.self, from: data)
            throw APIError.httpError(http.statusCode, msg?.error ?? HTTPURLResponse.localizedString(forStatusCode: http.statusCode))
        }
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .custom { decoder in
            let container = try decoder.singleValueContainer()
            let str = try container.decode(String.self)
            let isoFull = ISO8601DateFormatter()
            isoFull.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            if let d = isoFull.date(from: str) { return d }
            let isoBasic = ISO8601DateFormatter()
            if let d = isoBasic.date(from: str) { return d }
            throw DecodingError.dataCorrupted(.init(codingPath: decoder.codingPath, debugDescription: "Bad date: \(str)"))
        }
        return try decoder.decode(T.self, from: data)
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
        try await perform("/api/channels/\(channelId)/messages?limit=\(limit)")
    }

    func sendMessage(channelId: String, content: String) async throws -> VoxaMessage {
        struct Body: Encodable { let content: String }
        return try await perform("/api/channels/\(channelId)/messages", method: "POST",
                                 body: Body(content: content))
    }

    func editMessage(channelId: String, messageId: String, content: String) async throws -> VoxaMessage {
        struct Body: Encodable { let content: String }
        return try await perform("/api/channels/\(channelId)/messages/\(messageId)", method: "PATCH",
                                 body: Body(content: content))
    }

    func deleteMessage(channelId: String, messageId: String) async throws {
        try await performVoid("/api/channels/\(channelId)/messages/\(messageId)", method: "DELETE")
    }

    // MARK: - Profile

    func updateProfile(fields: [String: String]) async throws -> User {
        try await perform("/api/users/me", method: "PATCH", body: fields)
    }

    // MARK: - Invites

    func joinByInvite(code: String) async throws -> VoxaServer {
        struct Empty: Encodable {}
        return try await perform("/api/invites/\(code)/join", method: "POST", body: Empty())
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

// MARK: - WebSocket (Socket.IO compatible)

@MainActor
class SocketClient: ObservableObject {
    private var task: URLSessionWebSocketTask?
    var onNewMessage: ((VoxaMessage) -> Void)?
    var onMessageEdit: ((VoxaMessage) -> Void)?
    var onMessageDelete: ((String) -> Void)?
    private var baseURL: URL
    private var pingTimer: Timer?

    init() {
        let envURL = ProcessInfo.processInfo.environment["VOXA_API_URL"] ?? "https://voxa.lol"
        let wsScheme = envURL.hasPrefix("https") ? "wss" : "ws"
        let host = envURL.replacingOccurrences(of: "https://", with: "").replacingOccurrences(of: "http://", with: "")
        self.baseURL = URL(string: "\(wsScheme)://\(host)")!
    }

    func connect(token: String, channelId: String, serverId: String) {
        disconnect()
        guard var comps = URLComponents(url: baseURL.appendingPathComponent("/socket.io/"), resolvingAgainstBaseURL: false) else { return }
        comps.queryItems = [
            URLQueryItem(name: "token", value: token),
            URLQueryItem(name: "EIO", value: "4"),
            URLQueryItem(name: "transport", value: "websocket"),
        ]
        guard let url = comps.url else { return }
        let session = URLSession(configuration: .default)
        task = session.webSocketTask(with: url)
        task?.resume()
        receive()

        // Join channel room after connection
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak self] in
            self?.emit("joinChannel", data: ["channelId": channelId])
        }
    }

    func disconnect() {
        pingTimer?.invalidate()
        pingTimer = nil
        task?.cancel(with: .goingAway, reason: nil)
        task = nil
    }

    private func emit(_ event: String, data: [String: String]) {
        let payload = ["event": event, "data": data] as [String: Any]
        if let jsonData = try? JSONSerialization.data(withJSONObject: ["42[\"\(event)\",\(String(data: (try? JSONEncoder().encode(data)) ?? Data(), encoding: .utf8) ?? "{}")]"]),
           let str = String(data: jsonData, encoding: .utf8) {
            task?.send(.string(str)) { _ in }
        }
    }

    private func receive() {
        task?.receive { [weak self] result in
            guard let self else { return }
            switch result {
            case .success(let msg):
                if case .string(let text) = msg {
                    self.handleSocketMessage(text)
                }
                self.receive()
            case .failure:
                break
            }
        }
    }

    private func handleSocketMessage(_ text: String) {
        guard text.hasPrefix("42[") else { return }
        let inner = String(text.dropFirst(2))
        guard let data = inner.data(using: .utf8),
              let arr = try? JSONSerialization.jsonObject(with: data) as? [Any],
              arr.count >= 2,
              let event = arr[0] as? String,
              let payload = arr[1] as? [String: Any],
              let jsonData = try? JSONSerialization.data(withJSONObject: payload) else { return }

        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601

        switch event {
        case "newMessage":
            if let msg = try? decoder.decode(VoxaMessage.self, from: jsonData) {
                DispatchQueue.main.async { self.onNewMessage?(msg) }
            }
        case "messageEdited":
            if let msg = try? decoder.decode(VoxaMessage.self, from: jsonData) {
                DispatchQueue.main.async { self.onMessageEdit?(msg) }
            }
        case "messageDeleted":
            if let id = payload["id"] as? String {
                DispatchQueue.main.async { self.onMessageDelete?(id) }
            }
        default: break
        }
    }
}
