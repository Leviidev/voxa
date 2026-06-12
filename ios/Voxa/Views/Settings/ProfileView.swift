import SwiftUI

struct ProfileView: View {
    @EnvironmentObject var auth: AuthViewModel
    @State private var showLogoutAlert = false
    @State private var selectedSection: SettingsSection? = .account

    enum SettingsSection: String, CaseIterable {
        case account = "My Account"
        case profile = "User Profile"
        case privacy = "Privacy & Safety"
        case notifications = "Notifications"
        case appearance = "Appearance"
        case voiceVideo = "Voice & Video"

        var icon: String {
            switch self {
            case .account: return "person.fill"
            case .profile: return "pencil"
            case .privacy: return "lock.shield.fill"
            case .notifications: return "bell.fill"
            case .appearance: return "paintpalette.fill"
            case .voiceVideo: return "waveform"
            }
        }
    }

    var body: some View {
        ZStack {
            Color(hex: "111214").ignoresSafeArea()

            if let user = auth.user {
                List {
                    // Profile card
                    Section {
                        HStack(spacing: 16) {
                            ZStack(alignment: .bottomTrailing) {
                                Circle()
                                    .fill(user.swiftAvatarColor)
                                    .frame(width: 60, height: 60)
                                    .overlay(
                                        Text(String(user.effectiveName.prefix(1)).uppercased())
                                            .font(.system(size: 24, weight: .black))
                                            .foregroundColor(.white)
                                    )
                                Circle()
                                    .fill(Color(hex: "23a55a"))
                                    .frame(width: 16, height: 16)
                                    .overlay(Circle().stroke(Color(hex: "111214"), lineWidth: 2.5))
                            }
                            VStack(alignment: .leading, spacing: 4) {
                                Text(user.effectiveName)
                                    .font(.system(size: 18, weight: .bold))
                                    .foregroundColor(.white)
                                Text("#\(user.discriminator)")
                                    .font(.system(size: 13))
                                    .foregroundColor(Color(hex: "949BA4"))
                                Text(user.email)
                                    .font(.system(size: 12))
                                    .foregroundColor(Color(hex: "5C5E66"))
                            }
                        }
                        .padding(.vertical, 6)
                    }
                    .listRowBackground(Color(hex: "1E1F22"))

                    // Settings sections
                    Section("User Settings") {
                        ForEach(SettingsSection.allCases, id: \.self) { section in
                            NavigationLink(destination: SettingDetailView(section: section)) {
                                HStack(spacing: 12) {
                                    Image(systemName: section.icon)
                                        .foregroundColor(Color(hex: "E53935"))
                                        .frame(width: 20)
                                    Text(section.rawValue)
                                        .foregroundColor(.white)
                                        .font(.system(size: 15))
                                }
                            }
                        }
                    }
                    .listRowBackground(Color(hex: "1E1F22"))

                    // Logout
                    Section {
                        Button(action: { showLogoutAlert = true }) {
                            HStack(spacing: 12) {
                                Image(systemName: "rectangle.portrait.and.arrow.right")
                                    .foregroundColor(Color(hex: "f23f43"))
                                    .frame(width: 20)
                                Text("Log Out")
                                    .foregroundColor(Color(hex: "f23f43"))
                                    .font(.system(size: 15))
                            }
                        }
                    }
                    .listRowBackground(Color(hex: "1E1F22"))
                }
                .listStyle(.insetGrouped)
                .scrollContentBackground(.hidden)
            }
        }
        .alert("Log Out", isPresented: $showLogoutAlert) {
            Button("Log Out", role: .destructive) { auth.logout() }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("Are you sure you want to log out?")
        }
    }
}

struct SettingDetailView: View {
    let section: ProfileView.SettingsSection

    var body: some View {
        ZStack {
            Color(hex: "111214").ignoresSafeArea()
            VStack {
                Text(section.rawValue)
                    .font(.title2.bold())
                    .foregroundColor(.white)
                Text("Settings for this section coming soon.")
                    .foregroundColor(Color(hex: "949BA4"))
                    .font(.system(size: 14))
                    .padding(.top, 4)
            }
        }
        .navigationTitle(section.rawValue)
        .navigationBarTitleDisplayMode(.inline)
    }
}
