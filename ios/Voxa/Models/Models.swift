import Foundation
import SwiftUI

// MARK: - User

struct User: Codable, Identifiable {
    let id: String
    var username: String
    var displayName: String?
    var discriminator: String
    var email: String
    var avatarUrl: String?
    var avatarColor: String?
    var bannerUrl: String?
    var bannerColor: String?
    var status: String?
    var customStatus: String?
    var bio: String?
    var emailVerified: Bool?
    var createdAt: String?

    var effectiveName: String { displayName ?? username }
    var tag: String { "\(username)#\(discriminator)" }

    var statusEnum: UserStatus { UserStatus(rawValue: status ?? "offline") ?? .offline }

    var swiftAvatarColor: Color {
        if let hex = avatarColor { return Color(hex: hex) }
        let colors: [Color] = [.red, .purple, .blue, .green, .orange, .teal]
        return colors[abs(username.hashValue) % colors.count]
    }
}

enum UserStatus: String, Codable {
    case online, idle, dnd, offline, invisible

    var label: String {
        switch self {
        case .online: return "Online"
        case .idle: return "Idle"
        case .dnd: return "Do Not Disturb"
        case .offline: return "Offline"
        case .invisible: return "Invisible"
        }
    }

    var color: Color {
        switch self {
        case .online: return Color(hex: "23a55a")
        case .idle: return Color(hex: "f0b232")
        case .dnd: return Color(hex: "f23f43")
        case .offline, .invisible: return Color(hex: "80848e")
        }
    }
}

// MARK: - Server

struct VoxaServer: Codable, Identifiable {
    let id: String
    var name: String
    var iconUrl: String?
    var iconColor: String?
    var description: String?
    var bannerUrl: String?
    var bannerColor: String?
    var ownerId: String
    var createdAt: String?
    var isPublic: Bool?
    var categories: [ServerCategory]
    var members: [ServerMember]
    var roles: [ServerRole]

    var acronym: String {
        name.split(separator: " ")
            .prefix(2)
            .compactMap { $0.first.map(String.init) }
            .joined()
            .uppercased()
    }

    var accentColor: Color {
        if let hex = iconColor, !hex.isEmpty { return Color(hex: hex.replacingOccurrences(of: "#", with: "")) }
        let colors: [Color] = [
            Color(hex: "E53935"), Color(hex: "6366F1"),
            Color(hex: "10B981"), Color(hex: "F59E0B"),
            Color(hex: "3B82F6"), Color(hex: "8B5CF6"), Color(hex: "EC4899")
        ]
        return colors[abs(name.hashValue) % colors.count]
    }

    var allChannels: [VoxaChannel] {
        categories.flatMap(\.channels)
    }

    var firstTextChannel: VoxaChannel? {
        allChannels.first(where: { $0.type == "text" })
    }
}

struct ServerCategory: Codable, Identifiable {
    let id: String
    var name: String
    var channels: [VoxaChannel]
}

struct ServerMember: Codable, Identifiable {
    let id: String
    var username: String
    var displayName: String?
    var discriminator: String
    var avatarUrl: String?
    var avatarColor: String?
    var status: String?
    var isOwner: Bool?
    var roles: [MemberRoleRef]

    var effectiveName: String { displayName ?? username }
    var statusEnum: UserStatus { UserStatus(rawValue: status ?? "offline") ?? .offline }

    var swiftAvatarColor: Color {
        if let hex = avatarColor { return Color(hex: hex.replacingOccurrences(of: "#", with: "")) }
        let colors: [Color] = [.red, .purple, .blue, .green, .orange, .teal]
        return colors[abs(username.hashValue) % colors.count]
    }
}

struct MemberRoleRef: Codable, Identifiable {
    let id: String
    var name: String
    var color: String?
}

struct ServerRole: Codable, Identifiable {
    let id: String
    var name: String
    var color: String?
    var hoist: Bool?
    var position: Int?
    var isDefault: Bool?
}

// MARK: - Channel

struct VoxaChannel: Codable, Identifiable {
    let id: String
    var name: String
    var type: String    // "text" | "voice"
    var topic: String?

    var isText: Bool { type == "text" }
    var isVoice: Bool { type == "voice" }

    var icon: String {
        switch type {
        case "voice": return "speaker.wave.2"
        case "announcement": return "megaphone"
        default: return "number"
        }
    }
}

// MARK: - Message

struct VoxaMessage: Codable, Identifiable {
    let id: String
    var content: String
    var authorId: String
    var author: String           // username
    var displayName: String?
    var avatarUrl: String?
    var avatarColor: String?
    var discriminator: String
    var channelId: String?
    var timestamp: Date
    var edited: Bool
    var editedAt: Date?
    var parentId: String?
    var replyCount: Int?
    var reactions: [String: ReactionData]?

    var effectiveName: String { displayName ?? author }

    var swiftAvatarColor: Color {
        if let hex = avatarColor { return Color(hex: hex.replacingOccurrences(of: "#", with: "")) }
        let colors: [Color] = [.red, .purple, .blue, .green, .orange, .teal]
        return colors[abs(author.hashValue) % colors.count]
    }

    var formattedTime: String {
        let f = DateFormatter()
        let cal = Calendar.current
        if cal.isDateInToday(timestamp) {
            f.dateFormat = "h:mm a"
            return "Today at \(f.string(from: timestamp))"
        } else if cal.isDateInYesterday(timestamp) {
            f.dateFormat = "h:mm a"
            return "Yesterday at \(f.string(from: timestamp))"
        } else {
            f.dateFormat = "MM/dd/yyyy"
            return f.string(from: timestamp)
        }
    }

    var shortTime: String {
        let f = DateFormatter()
        f.dateFormat = "h:mm a"
        return f.string(from: timestamp)
    }
}

struct ReactionData: Codable {
    var count: Int
    var userIds: [String]
}

// MARK: - Auth

struct AuthResponse: Codable {
    let token: String
    let user: User
}

struct LoginRequest: Codable {
    let email: String
    let password: String
}

struct RegisterRequest: Codable {
    let email: String
    let username: String
    let password: String
}

// MARK: - Color Extension

extension Color {
    init(hex: String) {
        var hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        if hex.hasPrefix("#") { hex = String(hex.dropFirst()) }
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let r, g, b: Double
        switch hex.count {
        case 6:
            r = Double((int >> 16) & 0xFF) / 255
            g = Double((int >> 8) & 0xFF) / 255
            b = Double(int & 0xFF) / 255
        default:
            r = 0.9; g = 0.2; b = 0.2
        }
        self.init(red: r, green: g, blue: b)
    }
}

// MARK: - Mock Data

extension VoxaServer {
    static let mock: [VoxaServer] = [
        VoxaServer(
            id: "srv_1",
            name: "Voxa HQ",
            iconUrl: nil,
            iconColor: "#E53935",
            description: "The official Voxa community",
            bannerUrl: nil,
            bannerColor: nil,
            ownerId: "u_1",
            createdAt: nil,
            isPublic: true,
            categories: [
                ServerCategory(id: "cat_1", name: "General", channels: [
                    VoxaChannel(id: "ch_1", name: "general", type: "text", topic: "Welcome to Voxa!"),
                    VoxaChannel(id: "ch_2", name: "off-topic", type: "text", topic: nil),
                    VoxaChannel(id: "vc_1", name: "Lounge", type: "voice", topic: nil),
                ]),
            ],
            members: [
                ServerMember(id: "u_1", username: "Alex", displayName: "Alex",
                             discriminator: "0001", avatarUrl: nil, avatarColor: "#E53935",
                             status: "online", isOwner: true, roles: []),
                ServerMember(id: "u_2", username: "Sam", displayName: "Sam",
                             discriminator: "0234", avatarUrl: nil, avatarColor: "#6366F1",
                             status: "online", isOwner: false, roles: []),
                ServerMember(id: "u_3", username: "Jordan", displayName: "Jordan",
                             discriminator: "1337", avatarUrl: nil, avatarColor: "#10B981",
                             status: "idle", isOwner: false, roles: []),
            ],
            roles: []
        ),
    ]
}

extension VoxaMessage {
    static func mockMessages(for channelId: String) -> [VoxaMessage] {
        guard channelId == "ch_1" else { return [] }
        let now = Date()
        return [
            VoxaMessage(id: "m1", content: "Welcome to Voxa HQ! 🎉",
                        authorId: "u_1", author: "Alex", displayName: "Alex",
                        avatarUrl: nil, avatarColor: "#E53935", discriminator: "0001",
                        channelId: channelId, timestamp: now.addingTimeInterval(-7200),
                        edited: false, editedAt: nil, parentId: nil, replyCount: 0, reactions: nil),
            VoxaMessage(id: "m2", content: "This looks amazing! Love the red theme 🔴",
                        authorId: "u_2", author: "Sam", displayName: "Sam",
                        avatarUrl: nil, avatarColor: "#6366F1", discriminator: "0234",
                        channelId: channelId, timestamp: now.addingTimeInterval(-5400),
                        edited: false, editedAt: nil, parentId: nil, replyCount: 0, reactions: nil),
            VoxaMessage(id: "m3", content: "Finally a real Discord alternative that actually ships",
                        authorId: "u_3", author: "Jordan", displayName: "Jordan",
                        avatarUrl: nil, avatarColor: "#10B981", discriminator: "1337",
                        channelId: channelId, timestamp: now.addingTimeInterval(-1800),
                        edited: false, editedAt: nil, parentId: nil, replyCount: 0, reactions: nil),
        ]
    }
}
