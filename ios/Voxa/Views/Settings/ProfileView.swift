import SwiftUI

// MARK: - Profile / Settings Root

struct ProfileView: View {
    @EnvironmentObject var auth: AuthViewModel
    @State private var showLogoutAlert = false

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
                                    .fill(user.statusEnum.color)
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

                    // User settings
                    Section("User Settings") {
                        SettingsNavRow(icon: "person.fill", iconColor: "E53935", title: "My Account") {
                            AccountSettingsView()
                        }
                        SettingsNavRow(icon: "pencil", iconColor: "6366F1", title: "User Profile") {
                            UserProfileSettingsView()
                        }
                        SettingsNavRow(icon: "lock.shield.fill", iconColor: "10B981", title: "Privacy & Safety") {
                            PrivacySettingsView()
                        }
                        SettingsNavRow(icon: "bell.fill", iconColor: "F59E0B", title: "Notifications") {
                            NotificationSettingsView()
                        }
                        SettingsNavRow(icon: "paintpalette.fill", iconColor: "3B82F6", title: "Appearance") {
                            AppearanceSettingsView()
                        }
                        SettingsNavRow(icon: "key.fill", iconColor: "8B5CF6", title: "Change Password") {
                            ChangePasswordView()
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

// MARK: - Reusable Settings Navigation Row

struct SettingsNavRow<Destination: View>: View {
    let icon: String
    let iconColor: String
    let title: String
    @ViewBuilder let destination: () -> Destination

    var body: some View {
        NavigationLink(destination: destination()) {
            HStack(spacing: 12) {
                ZStack {
                    RoundedRectangle(cornerRadius: 6)
                        .fill(Color(hex: iconColor))
                        .frame(width: 28, height: 28)
                    Image(systemName: icon)
                        .foregroundColor(.white)
                        .font(.system(size: 13, weight: .semibold))
                }
                Text(title)
                    .foregroundColor(.white)
                    .font(.system(size: 15))
            }
        }
    }
}

// MARK: - Account Settings

struct AccountSettingsView: View {
    @EnvironmentObject var auth: AuthViewModel
    @State private var displayName = ""
    @State private var customStatus = ""
    @State private var selectedStatus = "online"
    @State private var isSaving = false
    @State private var saveSuccess = false
    @State private var error: String?

    let statusOptions: [(String, String, String)] = [
        ("online", "Online", "23a55a"),
        ("idle", "Idle", "f0b232"),
        ("dnd", "Do Not Disturb", "f23f43"),
        ("invisible", "Invisible", "80848e"),
    ]

    var body: some View {
        ZStack {
            Color(hex: "111214").ignoresSafeArea()
            List {
                // Avatar preview
                Section {
                    HStack {
                        Spacer()
                        if let user = auth.user {
                            ZStack {
                                Circle()
                                    .fill(user.swiftAvatarColor)
                                    .frame(width: 72, height: 72)
                                Text(String(user.effectiveName.prefix(1)).uppercased())
                                    .font(.system(size: 28, weight: .black))
                                    .foregroundColor(.white)
                            }
                        }
                        Spacer()
                    }
                    .padding(.vertical, 8)
                }
                .listRowBackground(Color(hex: "1E1F22"))

                Section("Profile") {
                    HStack {
                        Text("Display Name")
                            .foregroundColor(Color(hex: "949BA4"))
                            .font(.system(size: 14))
                        Spacer()
                        TextField("Display name", text: $displayName)
                            .foregroundColor(.white)
                            .font(.system(size: 14))
                            .multilineTextAlignment(.trailing)
                            .autocapitalization(.words)
                    }

                    HStack {
                        Text("Custom Status")
                            .foregroundColor(Color(hex: "949BA4"))
                            .font(.system(size: 14))
                        Spacer()
                        TextField("What's on your mind?", text: $customStatus)
                            .foregroundColor(.white)
                            .font(.system(size: 14))
                            .multilineTextAlignment(.trailing)
                    }
                }
                .listRowBackground(Color(hex: "1E1F22"))

                Section("Online Status") {
                    ForEach(statusOptions, id: \.0) { option in
                        Button(action: { selectedStatus = option.0 }) {
                            HStack(spacing: 12) {
                                Circle()
                                    .fill(Color(hex: option.2))
                                    .frame(width: 12, height: 12)
                                Text(option.1)
                                    .foregroundColor(.white)
                                    .font(.system(size: 15))
                                Spacer()
                                if selectedStatus == option.0 {
                                    Image(systemName: "checkmark")
                                        .foregroundColor(Color(hex: "E53935"))
                                        .font(.system(size: 14, weight: .semibold))
                                }
                            }
                        }
                    }
                }
                .listRowBackground(Color(hex: "1E1F22"))

                if let err = error {
                    Section {
                        Text(err)
                            .foregroundColor(Color(hex: "f23f43"))
                            .font(.system(size: 13))
                    }
                    .listRowBackground(Color(hex: "1E1F22"))
                }

                Section {
                    Button(action: save) {
                        HStack {
                            Spacer()
                            if isSaving {
                                ProgressView().tint(.white)
                            } else {
                                Text(saveSuccess ? "Saved!" : "Save Changes")
                                    .font(.system(size: 15, weight: .semibold))
                                    .foregroundColor(.white)
                            }
                            Spacer()
                        }
                    }
                    .frame(height: 44)
                    .background(saveSuccess ? Color(hex: "23a55a") : Color(hex: "E53935"))
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                    .listRowInsets(EdgeInsets())
                    .listRowBackground(Color.clear)
                    .disabled(isSaving)
                }
            }
            .listStyle(.insetGrouped)
            .scrollContentBackground(.hidden)
        }
        .navigationTitle("My Account")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear { prefill() }
    }

    private func prefill() {
        guard let user = auth.user else { return }
        displayName = user.displayName ?? ""
        customStatus = user.customStatus ?? ""
        selectedStatus = user.status ?? "online"
    }

    private func save() {
        error = nil
        isSaving = true
        Task {
            do {
                let updated = try await APIClient.shared.updateProfile(
                    displayName: displayName.isEmpty ? nil : displayName,
                    bio: nil,
                    customStatus: customStatus.isEmpty ? nil : customStatus,
                    avatarColor: nil,
                    status: selectedStatus
                )
                auth.user = updated
                saveSuccess = true
                DispatchQueue.main.asyncAfter(deadline: .now() + 2) { saveSuccess = false }
            } catch {
                self.error = error.localizedDescription
            }
            isSaving = false
        }
    }
}

// MARK: - User Profile Settings

struct UserProfileSettingsView: View {
    @EnvironmentObject var auth: AuthViewModel
    @State private var bio = ""
    @State private var selectedColor = "E53935"
    @State private var isSaving = false
    @State private var saveSuccess = false
    @State private var error: String?

    let colorPalette = [
        "E53935", "E91E63", "9C27B0", "673AB7",
        "3F51B5", "2196F3", "03A9F4", "00BCD4",
        "009688", "4CAF50", "8BC34A", "CDDC39",
        "FFC107", "FF9800", "FF5722", "795548",
        "607D8B", "9E9E9E", "FFFFFF", "000000"
    ]

    var body: some View {
        ZStack {
            Color(hex: "111214").ignoresSafeArea()
            List {
                // Preview card
                Section {
                    HStack(spacing: 16) {
                        ZStack {
                            Circle()
                                .fill(Color(hex: selectedColor))
                                .frame(width: 56, height: 56)
                            Text(String((auth.user?.effectiveName ?? "?").prefix(1)).uppercased())
                                .font(.system(size: 22, weight: .black))
                                .foregroundColor(.white)
                        }
                        VStack(alignment: .leading, spacing: 3) {
                            Text(auth.user?.effectiveName ?? "")
                                .font(.system(size: 16, weight: .bold))
                                .foregroundColor(.white)
                            if !bio.isEmpty {
                                Text(bio)
                                    .font(.system(size: 13))
                                    .foregroundColor(Color(hex: "949BA4"))
                                    .lineLimit(2)
                            }
                        }
                    }
                    .padding(.vertical, 4)
                }
                .listRowBackground(Color(hex: "2B2D31"))

                Section("Bio") {
                    ZStack(alignment: .topLeading) {
                        if bio.isEmpty {
                            Text("Tell people a bit about yourself…")
                                .foregroundColor(Color(hex: "5C5E66"))
                                .font(.system(size: 15))
                                .padding(.top, 8)
                                .padding(.leading, 4)
                        }
                        TextEditor(text: $bio)
                            .foregroundColor(.white)
                            .font(.system(size: 15))
                            .frame(minHeight: 80)
                            .scrollContentBackground(.hidden)
                            .background(Color.clear)
                    }
                }
                .listRowBackground(Color(hex: "1E1F22"))

                Section("Avatar Color") {
                    LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 10), spacing: 10) {
                        ForEach(colorPalette, id: \.self) { hex in
                            Button(action: { selectedColor = hex }) {
                                ZStack {
                                    Circle()
                                        .fill(Color(hex: hex))
                                        .frame(width: 28, height: 28)
                                    if selectedColor == hex {
                                        Circle()
                                            .stroke(Color.white, lineWidth: 2.5)
                                            .frame(width: 34, height: 34)
                                        Image(systemName: "checkmark")
                                            .font(.system(size: 10, weight: .bold))
                                            .foregroundColor(.white)
                                    }
                                }
                            }
                        }
                    }
                    .padding(.vertical, 6)
                }
                .listRowBackground(Color(hex: "1E1F22"))

                if let err = error {
                    Section {
                        Text(err).foregroundColor(Color(hex: "f23f43")).font(.system(size: 13))
                    }
                    .listRowBackground(Color(hex: "1E1F22"))
                }

                Section {
                    Button(action: save) {
                        HStack {
                            Spacer()
                            if isSaving {
                                ProgressView().tint(.white)
                            } else {
                                Text(saveSuccess ? "Saved!" : "Save Profile")
                                    .font(.system(size: 15, weight: .semibold))
                                    .foregroundColor(.white)
                            }
                            Spacer()
                        }
                    }
                    .frame(height: 44)
                    .background(saveSuccess ? Color(hex: "23a55a") : Color(hex: "E53935"))
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                    .listRowInsets(EdgeInsets())
                    .listRowBackground(Color.clear)
                    .disabled(isSaving)
                }
            }
            .listStyle(.insetGrouped)
            .scrollContentBackground(.hidden)
        }
        .navigationTitle("User Profile")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear { prefill() }
    }

    private func prefill() {
        guard let user = auth.user else { return }
        bio = user.bio ?? ""
        selectedColor = user.avatarColor?.replacingOccurrences(of: "#", with: "") ?? "E53935"
    }

    private func save() {
        error = nil
        isSaving = true
        Task {
            do {
                let updated = try await APIClient.shared.updateProfile(
                    displayName: nil,
                    bio: bio.isEmpty ? nil : bio,
                    customStatus: nil,
                    avatarColor: selectedColor,
                    status: nil
                )
                auth.user = updated
                saveSuccess = true
                DispatchQueue.main.asyncAfter(deadline: .now() + 2) { saveSuccess = false }
            } catch {
                self.error = error.localizedDescription
            }
            isSaving = false
        }
    }
}

// MARK: - Privacy Settings

struct PrivacySettingsView: View {
    @AppStorage("voxa_dm_from_anyone") var dmFromAnyone = true
    @AppStorage("voxa_friend_requests") var friendRequests = true
    @AppStorage("voxa_read_receipts") var readReceipts = true
    @AppStorage("voxa_analytics") var analytics = false

    var body: some View {
        ZStack {
            Color(hex: "111214").ignoresSafeArea()
            List {
                Section("Direct Messages") {
                    Toggle(isOn: $dmFromAnyone) {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Allow DMs from anyone")
                                .foregroundColor(.white)
                                .font(.system(size: 15))
                            Text("People in your servers can message you")
                                .foregroundColor(Color(hex: "949BA4"))
                                .font(.system(size: 12))
                        }
                    }
                    .tint(Color(hex: "E53935"))

                    Toggle(isOn: $readReceipts) {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Show read receipts")
                                .foregroundColor(.white)
                                .font(.system(size: 15))
                            Text("Let people know when you've read their messages")
                                .foregroundColor(Color(hex: "949BA4"))
                                .font(.system(size: 12))
                        }
                    }
                    .tint(Color(hex: "E53935"))
                }
                .listRowBackground(Color(hex: "1E1F22"))

                Section("Social") {
                    Toggle(isOn: $friendRequests) {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Allow friend requests")
                                .foregroundColor(.white)
                                .font(.system(size: 15))
                            Text("Other users can send you friend requests")
                                .foregroundColor(Color(hex: "949BA4"))
                                .font(.system(size: 12))
                        }
                    }
                    .tint(Color(hex: "E53935"))
                }
                .listRowBackground(Color(hex: "1E1F22"))

                Section("Data & Privacy") {
                    Toggle(isOn: $analytics) {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Share usage analytics")
                                .foregroundColor(.white)
                                .font(.system(size: 15))
                            Text("Help improve Voxa by sharing anonymous usage data")
                                .foregroundColor(Color(hex: "949BA4"))
                                .font(.system(size: 12))
                        }
                    }
                    .tint(Color(hex: "E53935"))
                }
                .listRowBackground(Color(hex: "1E1F22"))
            }
            .listStyle(.insetGrouped)
            .scrollContentBackground(.hidden)
        }
        .navigationTitle("Privacy & Safety")
        .navigationBarTitleDisplayMode(.inline)
    }
}

// MARK: - Notification Settings

struct NotificationSettingsView: View {
    @AppStorage("voxa_notif_messages") var notifMessages = true
    @AppStorage("voxa_notif_mentions") var notifMentions = true
    @AppStorage("voxa_notif_dms") var notifDMs = true
    @AppStorage("voxa_notif_sounds") var notifSounds = true
    @AppStorage("voxa_notif_badge") var notifBadge = true
    @AppStorage("voxa_notif_mute_all") var muteAll = false

    var body: some View {
        ZStack {
            Color(hex: "111214").ignoresSafeArea()
            List {
                Section {
                    Toggle(isOn: $muteAll) {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Mute All Notifications")
                                .foregroundColor(.white)
                                .font(.system(size: 15))
                            Text("Silence all notifications from Voxa")
                                .foregroundColor(Color(hex: "949BA4"))
                                .font(.system(size: 12))
                        }
                    }
                    .tint(Color(hex: "E53935"))
                }
                .listRowBackground(Color(hex: "1E1F22"))

                Section("Notify Me About") {
                    NotifToggle("Messages", subtitle: "All messages in channels", binding: $notifMessages)
                    NotifToggle("Mentions", subtitle: "When someone @mentions you", binding: $notifMentions)
                    NotifToggle("Direct Messages", subtitle: "Messages from other users", binding: $notifDMs)
                }
                .listRowBackground(Color(hex: "1E1F22"))
                .disabled(muteAll)
                .opacity(muteAll ? 0.4 : 1)

                Section("Sounds & Badges") {
                    NotifToggle("Notification Sounds", subtitle: "Play sounds for notifications", binding: $notifSounds)
                    NotifToggle("App Badge", subtitle: "Show unread count on app icon", binding: $notifBadge)
                }
                .listRowBackground(Color(hex: "1E1F22"))
                .disabled(muteAll)
                .opacity(muteAll ? 0.4 : 1)
            }
            .listStyle(.insetGrouped)
            .scrollContentBackground(.hidden)
        }
        .navigationTitle("Notifications")
        .navigationBarTitleDisplayMode(.inline)
    }
}

private struct NotifToggle: View {
    let title: String
    let subtitle: String
    @Binding var binding: Bool

    init(_ title: String, subtitle: String, binding: Binding<Bool>) {
        self.title = title
        self.subtitle = subtitle
        self._binding = binding
    }

    var body: some View {
        Toggle(isOn: $binding) {
            VStack(alignment: .leading, spacing: 2) {
                Text(title).foregroundColor(.white).font(.system(size: 15))
                Text(subtitle).foregroundColor(Color(hex: "949BA4")).font(.system(size: 12))
            }
        }
        .tint(Color(hex: "E53935"))
    }
}

// MARK: - Appearance Settings

struct AppearanceSettingsView: View {
    @AppStorage("voxa_compact_mode") var compactMode = false
    @AppStorage("voxa_large_text") var largeText = false
    @AppStorage("voxa_show_avatars") var showAvatars = true
    @AppStorage("voxa_message_grouping") var messageGrouping = true
    @AppStorage("voxa_timestamp_style") var timestampStyle = "relative"

    var body: some View {
        ZStack {
            Color(hex: "111214").ignoresSafeArea()
            List {
                Section("Theme") {
                    HStack {
                        Text("Color Theme")
                            .foregroundColor(.white)
                            .font(.system(size: 15))
                        Spacer()
                        Text("Dark (Voxa Red)")
                            .foregroundColor(Color(hex: "949BA4"))
                            .font(.system(size: 14))
                    }
                }
                .listRowBackground(Color(hex: "1E1F22"))

                Section("Messages") {
                    Toggle(isOn: $compactMode) {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Compact Mode")
                                .foregroundColor(.white).font(.system(size: 15))
                            Text("Fit more messages on screen")
                                .foregroundColor(Color(hex: "949BA4")).font(.system(size: 12))
                        }
                    }
                    .tint(Color(hex: "E53935"))

                    Toggle(isOn: $messageGrouping) {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Group Messages")
                                .foregroundColor(.white).font(.system(size: 15))
                            Text("Combine consecutive messages from the same user")
                                .foregroundColor(Color(hex: "949BA4")).font(.system(size: 12))
                        }
                    }
                    .tint(Color(hex: "E53935"))

                    Toggle(isOn: $showAvatars) {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Show Avatars")
                                .foregroundColor(.white).font(.system(size: 15))
                            Text("Display user avatars next to messages")
                                .foregroundColor(Color(hex: "949BA4")).font(.system(size: 12))
                        }
                    }
                    .tint(Color(hex: "E53935"))
                }
                .listRowBackground(Color(hex: "1E1F22"))

                Section("Accessibility") {
                    Toggle(isOn: $largeText) {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Larger Text")
                                .foregroundColor(.white).font(.system(size: 15))
                            Text("Increase text size throughout the app")
                                .foregroundColor(Color(hex: "949BA4")).font(.system(size: 12))
                        }
                    }
                    .tint(Color(hex: "E53935"))
                }
                .listRowBackground(Color(hex: "1E1F22"))
            }
            .listStyle(.insetGrouped)
            .scrollContentBackground(.hidden)
        }
        .navigationTitle("Appearance")
        .navigationBarTitleDisplayMode(.inline)
    }
}

// MARK: - Change Password

struct ChangePasswordView: View {
    @Environment(\.dismiss) var dismiss
    @State private var currentPassword = ""
    @State private var newPassword = ""
    @State private var confirmPassword = ""
    @State private var showCurrent = false
    @State private var showNew = false
    @State private var isSaving = false
    @State private var success = false
    @State private var error: String?

    var canSave: Bool {
        !currentPassword.isEmpty && newPassword.count >= 6 && newPassword == confirmPassword
    }

    var validationMessage: String? {
        if newPassword.count > 0 && newPassword.count < 6 { return "New password must be at least 6 characters" }
        if !confirmPassword.isEmpty && newPassword != confirmPassword { return "Passwords don't match" }
        return nil
    }

    var body: some View {
        ZStack {
            Color(hex: "111214").ignoresSafeArea()
            List {
                Section("Current Password") {
                    PasswordRow(label: "Current password", text: $currentPassword, show: $showCurrent)
                }
                .listRowBackground(Color(hex: "1E1F22"))

                Section("New Password") {
                    PasswordRow(label: "New password", text: $newPassword, show: $showNew)
                    HStack {
                        SecureField("Confirm new password", text: $confirmPassword)
                            .foregroundColor(.white)
                            .font(.system(size: 15))
                    }
                }
                .listRowBackground(Color(hex: "1E1F22"))

                if let msg = validationMessage {
                    Section {
                        Text(msg)
                            .foregroundColor(Color(hex: "f0b232"))
                            .font(.system(size: 13))
                    }
                    .listRowBackground(Color(hex: "1E1F22"))
                }

                if let err = error {
                    Section {
                        Text(err).foregroundColor(Color(hex: "f23f43")).font(.system(size: 13))
                    }
                    .listRowBackground(Color(hex: "1E1F22"))
                }

                if success {
                    Section {
                        HStack(spacing: 8) {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundColor(Color(hex: "23a55a"))
                            Text("Password changed successfully!")
                                .foregroundColor(Color(hex: "23a55a"))
                                .font(.system(size: 14))
                        }
                    }
                    .listRowBackground(Color(hex: "1E1F22"))
                }

                Section {
                    Button(action: save) {
                        HStack {
                            Spacer()
                            if isSaving {
                                ProgressView().tint(.white)
                            } else {
                                Text("Change Password")
                                    .font(.system(size: 15, weight: .semibold))
                                    .foregroundColor(canSave ? .white : Color(hex: "6b7280"))
                            }
                            Spacer()
                        }
                    }
                    .frame(height: 44)
                    .background(canSave ? Color(hex: "E53935") : Color.white.opacity(0.08))
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                    .listRowInsets(EdgeInsets())
                    .listRowBackground(Color.clear)
                    .disabled(!canSave || isSaving)
                }
            }
            .listStyle(.insetGrouped)
            .scrollContentBackground(.hidden)
        }
        .navigationTitle("Change Password")
        .navigationBarTitleDisplayMode(.inline)
    }

    private func save() {
        error = nil
        success = false
        isSaving = true
        Task {
            do {
                try await APIClient.shared.changePassword(
                    currentPassword: currentPassword,
                    newPassword: newPassword
                )
                success = true
                currentPassword = ""
                newPassword = ""
                confirmPassword = ""
                DispatchQueue.main.asyncAfter(deadline: .now() + 2) { dismiss() }
            } catch {
                self.error = error.localizedDescription
            }
            isSaving = false
        }
    }
}

private struct PasswordRow: View {
    let label: String
    @Binding var text: String
    @Binding var show: Bool

    var body: some View {
        HStack {
            Group {
                if show {
                    TextField(label, text: $text)
                } else {
                    SecureField(label, text: $text)
                }
            }
            .foregroundColor(.white)
            .font(.system(size: 15))
            .autocapitalization(.none)
            .disableAutocorrection(true)

            Button(action: { show.toggle() }) {
                Image(systemName: show ? "eye.slash" : "eye")
                    .foregroundColor(Color(hex: "949BA4"))
                    .font(.system(size: 14))
            }
        }
    }
}
