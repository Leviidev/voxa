import Foundation

// MARK: - API Client

actor APIClient {
    static let shared = APIClient()

    private let baseURL: URL
    private var authToken: String?

    private init() {
        // Change this to your deployed API URL
        self.baseURL = URL(string: ProcessInfo.processInfo.environment["VOXA_API_URL"] ?? "https://api.voxa.lol")!
    }

    func setToken(_ token: String?) {
        self.authToken = token
    }

    // MARK: - Request Builder

    private func request(_ path: String, method: String = "GET", body: Encodable? = nil) async throws -> URLRequest {
        let url = baseURL.appendingPathComponent(path)
        var req = URLRequest(url: url)
        req.httpMethod = method
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let token = authToken {
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        if let body {
            req.httpBody = try JSONEncoder().encode(body)
        }
        return req
    }

    private func perform<T: Decodable>(_ path: String, method: String = "GET", body: Encodable? = nil) async throws -> T {
        let req = try await request(path, method: method, body: body)
        let (data, response) = try await URLSession.shared.data(for: req)
        guard let http = response as? HTTPURLResponse else { throw APIError.invalidResponse }
        guard (200..<300).contains(http.statusCode) else {
            let msg = try? JSONDecoder().decode(APIErrorBody.self, from: data)
            throw APIError.httpError(http.statusCode, msg?.error ?? "Unknown error")
        }
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return try decoder.decode(T.self, from: data)
    }

    // MARK: - Auth

    func login(email: String, password: String) async throws -> AuthResponse {
        try await perform("/api/auth/login", method: "POST", body: LoginRequest(email: email, password: password))
    }

    func register(email: String, username: String, password: String, dob: String?) async throws -> AuthResponse {
        try await perform("/api/auth/register", method: "POST",
                          body: RegisterRequest(email: email, username: username, password: password, dob: dob))
    }

    func me() async throws -> User {
        try await perform("/api/users/me")
    }

    // MARK: - Servers

    func servers() async throws -> [VoxaServer] {
        try await perform("/api/servers")
    }

    func createServer(name: String) async throws -> VoxaServer {
        try await perform("/api/servers", method: "POST", body: ["name": name])
    }

    func deleteServer(id: String) async throws {
        let req = try await request("/api/servers/\(id)", method: "DELETE")
        _ = try await URLSession.shared.data(for: req)
    }

    // MARK: - Channels

    func channels(serverId: String) async throws -> [VoxaChannel] {
        try await perform("/api/channels/servers/\(serverId)/channels")
    }

    func createChannel(serverId: String, name: String, type: String) async throws -> VoxaChannel {
        try await perform("/api/channels/servers/\(serverId)/channels", method: "POST",
                          body: ["name": name, "type": type])
    }

    // MARK: - Messages

    func messages(channelId: String, limit: Int = 50) async throws -> [VoxaMessage] {
        try await perform("/api/messages/channels/\(channelId)/messages?limit=\(limit)")
    }

    func sendMessage(channelId: String, content: String) async throws -> VoxaMessage {
        try await perform("/api/messages/channels/\(channelId)/messages", method: "POST",
                          body: ["content": content])
    }

    func editMessage(id: String, content: String) async throws -> VoxaMessage {
        try await perform("/api/messages/\(id)", method: "PATCH", body: ["content": content])
    }

    func deleteMessage(id: String) async throws {
        let req = try await request("/api/messages/\(id)", method: "DELETE")
        _ = try await URLSession.shared.data(for: req)
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

// MARK: - WebSocket Client

@MainActor
class WebSocketClient: ObservableObject {
    private var task: URLSessionWebSocketTask?
    private let url: URL
    var onMessage: ((VoxaMessage) -> Void)?

    init(url: URL = URL(string: "wss://api.voxa.lol/ws")!) {
        self.url = url
    }

    func connect(token: String, channelId: String) {
        var components = URLComponents(url: url, resolvingAgainstBaseURL: false)!
        components.queryItems = [
            URLQueryItem(name: "token", value: token),
            URLQueryItem(name: "channel", value: channelId),
        ]
        let session = URLSession(configuration: .default)
        task = session.webSocketTask(with: components.url!)
        task?.resume()
        receive()
    }

    func disconnect() {
        task?.cancel(with: .goingAway, reason: nil)
        task = nil
    }

    private func receive() {
        task?.receive { [weak self] result in
            switch result {
            case .success(let msg):
                if case .string(let text) = msg, let data = text.data(using: .utf8) {
                    let decoder = JSONDecoder()
                    decoder.dateDecodingStrategy = .iso8601
                    if let message = try? decoder.decode(VoxaMessage.self, from: data) {
                        DispatchQueue.main.async {
                            self?.onMessage?(message)
                        }
                    }
                }
                self?.receive()
            case .failure:
                break
            }
        }
    }
}
