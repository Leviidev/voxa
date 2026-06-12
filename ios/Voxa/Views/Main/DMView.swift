import SwiftUI

struct DMView: View {
    @EnvironmentObject var auth: AuthViewModel
    @State private var searchText = ""

    let dms: [MockDM] = [
        MockDM(id: "1", username: "Alex", discriminator: "0001", status: .online, preview: "Hey, are you free to call?"),
        MockDM(id: "2", username: "Sam", discriminator: "0234", status: .idle, preview: "Check out this clip lol"),
        MockDM(id: "3", username: "Jordan", discriminator: "1337", status: .dnd, preview: "Working on something cool"),
    ]

    var body: some View {
        ZStack {
            Color(hex: "2B2D31").ignoresSafeArea()
            VStack(spacing: 0) {
                // Search
                HStack {
                    Image(systemName: "magnifyingglass")
                        .foregroundColor(Color(hex: "949BA4"))
                        .font(.system(size: 14))
                    TextField("Find or start a conversation", text: $searchText)
                        .font(.system(size: 14))
                        .foregroundColor(.white)
                }
                .padding(.horizontal, 12)
                .frame(height: 32)
                .background(Color(hex: "1E1F22"))
                .clipShape(RoundedRectangle(cornerRadius: 6))
                .padding(.horizontal, 8)
                .padding(.vertical, 8)

                // DM list
                ScrollView {
                    VStack(spacing: 0) {
                        SectionHeader("DIRECT MESSAGES")
                        ForEach(dms) { dm in
                            DMRow(dm: dm)
                        }
                    }
                }
            }
        }
    }
}

struct SectionHeader: View {
    let text: String
    init(_ text: String) { self.text = text }

    var body: some View {
        HStack {
            Text(text)
                .font(.system(size: 11, weight: .semibold))
                .foregroundColor(Color(hex: "949BA4"))
                .kerning(0.3)
            Spacer()
        }
        .padding(.horizontal, 16)
        .padding(.top, 12)
        .padding(.bottom, 4)
    }
}

struct DMRow: View {
    let dm: MockDM
    @State private var isHovered = false

    var body: some View {
        HStack(spacing: 12) {
            ZStack(alignment: .bottomTrailing) {
                Circle()
                    .fill(Color(hex: "E53935"))
                    .frame(width: 32, height: 32)
                    .overlay(
                        Text(String(dm.username.prefix(1)).uppercased())
                            .font(.system(size: 13, weight: .bold))
                            .foregroundColor(.white)
                    )
                Circle()
                    .fill(dm.status.color)
                    .frame(width: 12, height: 12)
                    .overlay(Circle().stroke(Color(hex: "2B2D31"), lineWidth: 2))
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(dm.username)
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(.white)
                Text(dm.preview)
                    .font(.system(size: 12))
                    .foregroundColor(Color(hex: "949BA4"))
                    .lineLimit(1)
            }
            Spacer()
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 7)
        .background(isHovered ? Color(hex: "35373C") : Color.clear)
        .clipShape(RoundedRectangle(cornerRadius: 6))
        .padding(.horizontal, 8)
        .onHover { isHovered = $0 }
        .contentShape(Rectangle())
    }
}

struct MockDM: Identifiable {
    let id: String
    let username: String
    let discriminator: String
    let status: UserStatus
    let preview: String
}
