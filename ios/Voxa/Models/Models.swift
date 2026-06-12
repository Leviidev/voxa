import Foundation
import SwiftUI

// MARK: - User

struct User: Codable, Identifiable {
    let id: String
    var username: String
    var discriminator: String
    var email: String
    var avatar: String?
    var status: UserStatus
    var bio: String?
    var createdAt: String

    var displayTag: String { "\(username)#\(discriminator)" }
    var avatarColor: Color {
        let colors: [Color] = [.red, .purple, .blue, .green, .orange, .teal]
        let idx = abs(username.hashValue) % colors.count
        return colors[idx]
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
    var icon: String?
    var ownerId: String
    var categories: [ServerCategory]
    var members: [ServerMember]
    var unread: Bool

    var acronym: String {
        name.split(separator: " ")
            .prefix(2)
            .compactMap { $0.first.map(String.init) }
            .joined()
            .uppercased()
    }

    var accentColor: Color {
        let colors: [Color] = [.red, Color(hex: "1565C0"), Color(hex: "6A1B9A"), Color(hex: "2E7D32"), Color(hex: "E65100")]
        return colors[abs(name.hashValue) % colors.count]
    }

    var allChannels: [VoxaChannel] {
        categories.flatMap(\.channels)
    }

    var firstTextChannel: VoxaChannel? {
        allChannels.first(where: { $0.type == .text })
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
    var discriminator: String
    var status: UserStatus
    var role: MemberRole
    var avatar: String?
}

enum MemberRole: String, Codable {
    case owner = "Owner"
    case admin = "Admin"
    case moderator = "Moderator"
    case member = "Member"
}

// MARK: - Channel

struct VoxaChannel: Codable, Identifiable {
    let id: String
    var name: String
    var type: ChannelType
    var unread: Bool
    var locked: Bool
    var members: [String]?   // voice channel participants

    enum ChannelType: String, Codable {
        case text, voice, announcement, stage
    }
}

// MARK: - Message

struct VoxaMessage: Codable, Identifiable {
    let id: String
    var author: String
    var authorId: String
    var discriminator: String
    var content: String
    var timestamp: Date
    var edited: Bool
    var editedAt: Date?
    var attachments: [Attachment]
    var reactions: [Reaction]

    struct Attachment: Codable, Identifiable {
        let id: String
        let url: String
        let filename: String
        let contentType: String
    }

    struct Reaction: Codable {
        var emoji: String
        var count: Int
        var me: Bool
    }

    var avatarColor: Color {
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
            f.dateFormat = "MM/dd/yyyy h:mm a"
            return f.string(from: timestamp)
        }
    }

    var shortTime: String {
        let f = DateFormatter()
        f.dateFormat = "h:mm a"
        return f.string(from: timestamp)
    }
}

// MARK: - DM

struct DirectMessage: Codable, Identifiable {
    let id: String
    var recipient: User
    var lastMessage: String?
    var lastMessageAt: Date?
    var unread: Bool
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
    let dob: String?
}

// MARK: - Color Extension

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let r, g, b: Double
        switch hex.count {
        case 6:
            r = Double((int >> 16) & 0xFF) / 255
            g = Double((int >> 8) & 0xFF) / 255
            b = Double(int & 0xFF) / 255
        default:
            r = 1; g = 1; b = 1
        }
        self.init(red: r, green: g, blue: b)
    }
}

// MARK: - Mock Data

extension VoxaServer {
    static let mock: [VoxaServer] = [
        VoxaServer(
            id: "srv_general",
            name: "Voxa HQ",
            icon: nil,
            ownerId: "u_alex",
            categories: [
                ServerCategory(id: "cat_info", name: "Information", channels: [
                    VoxaChannel(id: "ch_welcome", name: "welcome", type: .announcement, unread: false, locked: true, members: nil),
                    VoxaChannel(id: "ch_rules", name: "rules", type: .announcement, unread: false, locked: true, members: nil),
                ]),
                ServerCategory(id: "cat_gen", name: "General", channels: [
                    VoxaChannel(id: "ch_chat", name: "general", type: .text, unread: true, locked: false, members: nil),
                    VoxaChannel(id: "ch_off", name: "off-topic", type: .text, unread: false, locked: false, members: nil),
                    VoxaChannel(id: "ch_media", name: "media", type: .text, unread: false, locked: false, members: nil),
                    VoxaChannel(id: "vc_lounge", name: "Lounge", type: .voice, unread: false, locked: false, members: ["Alex", "Sam"]),
                ]),
            ],
            members: [
                ServerMember(id: "u_alex", username: "Alex", discriminator: "0001", status: .online, role: .admin),
                ServerMember(id: "u_sam", username: "Sam", discriminator: "0234", status: .online, role: .member),
                ServerMember(id: "u_jordan", username: "Jordan", discriminator: "1337", status: .idle, role: .member),
                ServerMember(id: "u_casey", username: "Casey", discriminator: "4242", status: .dnd, role: .moderator),
                ServerMember(id: "u_morgan", username: "Morgan", discriminator: "8888", status: .offline, role: .member),
            ],
            unread: true
        ),
        VoxaServer(
            id: "srv_gaming",
            name: "Gaming Zone",
            icon: nil,
            ownerId: "u_sam",
            categories: [
                ServerCategory(id: "cat_g1", name: "General", channels: [
                    VoxaChannel(id: "ch_g1", name: "general", type: .text, unread: false, locked: false, members: nil),
                    VoxaChannel(id: "ch_g2", name: "clips", type: .text, unread: false, locked: false, members: nil),
                    VoxaChannel(id: "vc_squad", name: "Squad Up", type: .voice, unread: false, locked: false, members: ["Morgan"]),
                ]),
            ],
            members: [
                ServerMember(id: "u_sam", username: "Sam", discriminator: "0234", status: .online, role: .admin),
                ServerMember(id: "u_morgan", username: "Morgan", discriminator: "8888", status: .online, role: .member),
            ],
            unread: false
        ),
    ]
}

extension VoxaMessage {
    static func mockMessages(for channelId: String) -> [VoxaMessage] {
        guard channelId == "ch_chat" else { return [] }
        let now = Date()
        return [
            VoxaMessage(id: "m1", author: "Alex", authorId: "u_alex", discriminator: "0001",
                        content: "Welcome to Voxa HQ everyone! 🎉",
                        timestamp: now.addingTimeInterval(-7200), edited: false, editedAt: nil, attachments: [], reactions: []),
            VoxaMessage(id: "m2", author: "Sam", authorId: "u_sam", discriminator: "0234",
                        content: "This is awesome! Love the red theme 🔴",
                        timestamp: now.addingTimeInterval(-5400), edited: false, editedAt: nil, attachments: [], reactions: []),
            VoxaMessage(id: "m3", author: "Jordan", authorId: "u_jordan", discriminator: "1337",
                        content: "Finally a Discord alternative that actually looks good",
                        timestamp: now.addingTimeInterval(-2700), edited: false, editedAt: nil, attachments: [], reactions: []),
            VoxaMessage(id: "m4", author: "Alex", authorId: "u_alex", discriminator: "0001",
                        content: "Voice quality is sub-50ms latency globally 🚀",
                        timestamp: now.addingTimeInterval(-1500), edited: false, editedAt: nil, attachments: [], reactions: []),
        ]
    }
}
