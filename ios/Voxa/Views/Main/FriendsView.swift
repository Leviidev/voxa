import SwiftUI

// MARK: - Friends Root View

struct FriendsView: View {
    @StateObject private var vm = FriendsViewModel()
    @EnvironmentObject var dms: DMViewModel
    @State private var tab: FriendsTab = .all

    enum FriendsTab { case all, pending, add }

    var body: some View {
        ZStack {
            Color(hex: "2B2D31").ignoresSafeArea()

            VStack(spacing: 0) {
                // Tab bar
                HStack(spacing: 0) {
                    FriendsTabButton(title: "All", isSelected: tab == .all) { tab = .all }
                    FriendsTabButton(title: "Pending", isSelected: tab == .pending, badge: vm.pendingCount) {
                        tab = .pending
                    }
                    FriendsTabButton(title: "Add Friend", isSelected: tab == .add) { tab = .add }
                    Spacer()
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(Color(hex: "2B2D31"))

                Divider().background(Color.black.opacity(0.3))

                if vm.isLoading && vm.friends.isEmpty && vm.requests.isEmpty {
                    Spacer()
                    ProgressView().tint(Color(hex: "E53935"))
                    Spacer()
                } else {
                    ScrollView(showsIndicators: false) {
                        VStack(alignment: .leading, spacing: 0) {
                            switch tab {
                            case .all:    allTab
                            case .pending: pendingTab
                            case .add:    addTab
                            }
                        }
                        .padding(.top, 8)
                    }
                }
            }
        }
        .task { await vm.load() }
    }

    // MARK: All Friends

    @ViewBuilder
    var allTab: some View {
        if vm.friends.isEmpty {
            emptyState(icon: "person.2", text: "No friends yet", sub: "Add some friends to get started!")
        } else {
            sectionHeader("ALL FRIENDS — \(vm.friends.count)")
            ForEach(vm.friends, id: \.requestId) { f in
                FriendRow(
                    user: f.user,
                    onMessage: {
                        Task { _ = await dms.openDM(username: f.user.username) }
                    },
                    onRemove: {
                        Task { await vm.removeFriend(f) }
                    }
                )
            }
        }
    }

    // MARK: Pending

    @ViewBuilder
    var pendingTab: some View {
        if vm.incomingRequests.isEmpty && vm.outgoingRequests.isEmpty {
            emptyState(icon: "clock", text: "No pending requests", sub: "Friend requests will appear here.")
        } else {
            if !vm.incomingRequests.isEmpty {
                sectionHeader("INCOMING — \(vm.incomingRequests.count)")
                ForEach(vm.incomingRequests) { req in
                    RequestRow(request: req,
                        onAccept: { Task { await vm.accept(req) } },
                        onDecline: { Task { await vm.decline(req) } }
                    )
                }
            }
            if !vm.outgoingRequests.isEmpty {
                sectionHeader("OUTGOING — \(vm.outgoingRequests.count)")
                ForEach(vm.outgoingRequests) { req in
                    OutgoingRow(request: req, onCancel: { Task { await vm.decline(req) } })
                }
            }
        }
    }

    // MARK: Add Friend

    var addTab: some View {
        AddFriendPanel(vm: vm)
    }

    // MARK: Helpers

    @ViewBuilder
    func sectionHeader(_ text: String) -> some View {
        Text(text)
            .font(.system(size: 11, weight: .semibold))
            .foregroundColor(Color(hex: "949BA4"))
            .kerning(0.3)
            .padding(.horizontal, 16)
            .padding(.top, 16)
            .padding(.bottom, 4)
    }

    @ViewBuilder
    func emptyState(icon: String, text: String, sub: String) -> some View {
        VStack(spacing: 14) {
            ZStack {
                Circle()
                    .fill(Color(hex: "1E1F22"))
                    .frame(width: 72, height: 72)
                Image(systemName: icon)
                    .font(.system(size: 28))
                    .foregroundColor(Color(hex: "5C5E66"))
            }
            VStack(spacing: 4) {
                Text(text)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundColor(.white)
                Text(sub)
                    .font(.system(size: 13))
                    .foregroundColor(Color(hex: "949BA4"))
                    .multilineTextAlignment(.center)
            }
        }
        .padding(.horizontal, 40)
        .padding(.top, 60)
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Tab Button

struct FriendsTabButton: View {
    let title: String
    let isSelected: Bool
    var badge: Int = 0
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 5) {
                Text(title)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(isSelected ? .white : Color(hex: "949BA4"))
                if badge > 0 {
                    Text("\(badge)")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor(.white)
                        .frame(minWidth: 16, minHeight: 16)
                        .background(Color(hex: "E53935"))
                        .clipShape(Capsule())
                }
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(isSelected ? Color(hex: "404249") : Color.clear)
            .clipShape(RoundedRectangle(cornerRadius: 8))
        }
    }
}

// MARK: - Friend Row

struct FriendRow: View {
    let user: FriendUser
    let onMessage: () -> Void
    let onRemove: () -> Void

    var body: some View {
        HStack(spacing: 12) {
            ZStack(alignment: .bottomTrailing) {
                Circle()
                    .fill(user.swiftAvatarColor)
                    .frame(width: 40, height: 40)
                    .overlay(
                        Text(String(user.effectiveName.prefix(1)).uppercased())
                            .font(.system(size: 16, weight: .bold))
                            .foregroundColor(.white)
                    )
                Circle()
                    .fill(user.statusEnum.color)
                    .frame(width: 12, height: 12)
                    .overlay(Circle().stroke(Color(hex: "2B2D31"), lineWidth: 2))
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(user.effectiveName)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundColor(.white)
                Text("@\(user.username)#\(user.discriminator)")
                    .font(.system(size: 12))
                    .foregroundColor(Color(hex: "949BA4"))
            }

            Spacer()

            HStack(spacing: 8) {
                IconActionButton(icon: "message.fill", color: "404249") { onMessage() }
                IconActionButton(icon: "xmark", color: "404249", destructive: true) { onRemove() }
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 8)
        .contentShape(Rectangle())
    }
}

// MARK: - Request Row

struct RequestRow: View {
    let request: FriendRequest
    let onAccept: () -> Void
    let onDecline: () -> Void

    var body: some View {
        HStack(spacing: 12) {
            Circle()
                .fill(request.user.swiftAvatarColor)
                .frame(width: 40, height: 40)
                .overlay(
                    Text(String(request.user.effectiveName.prefix(1)).uppercased())
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(.white)
                )

            VStack(alignment: .leading, spacing: 2) {
                Text(request.user.effectiveName)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundColor(.white)
                Text("Incoming friend request")
                    .font(.system(size: 12))
                    .foregroundColor(Color(hex: "949BA4"))
            }

            Spacer()

            HStack(spacing: 8) {
                IconActionButton(icon: "checkmark", color: "23a55a") { onAccept() }
                IconActionButton(icon: "xmark", color: "404249", destructive: true) { onDecline() }
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 8)
        .contentShape(Rectangle())
    }
}

// MARK: - Outgoing Row

struct OutgoingRow: View {
    let request: FriendRequest
    let onCancel: () -> Void

    var body: some View {
        HStack(spacing: 12) {
            Circle()
                .fill(request.user.swiftAvatarColor)
                .frame(width: 40, height: 40)
                .overlay(
                    Text(String(request.user.effectiveName.prefix(1)).uppercased())
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(.white)
                )

            VStack(alignment: .leading, spacing: 2) {
                Text(request.user.effectiveName)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundColor(.white)
                Text("Outgoing request • Pending")
                    .font(.system(size: 12))
                    .foregroundColor(Color(hex: "949BA4"))
            }

            Spacer()

            IconActionButton(icon: "xmark.circle", color: "404249") { onCancel() }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 8)
        .contentShape(Rectangle())
    }
}

// MARK: - Add Friend Panel

struct AddFriendPanel: View {
    @ObservedObject var vm: FriendsViewModel
    @State private var username = ""
    @State private var isLoading = false
    @State private var errorMsg: String?
    @State private var successMsg: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            VStack(alignment: .leading, spacing: 8) {
                Text("ADD A FRIEND")
                    .font(.system(size: 16, weight: .black))
                    .foregroundColor(.white)
                    .padding(.top, 24)

                Text("Add friends using their Voxa username.")
                    .font(.system(size: 13))
                    .foregroundColor(Color(hex: "949BA4"))
                    .padding(.bottom, 8)

                HStack(spacing: 8) {
                    TextField("Enter a username", text: $username)
                        .autocapitalization(.none)
                        .disableAutocorrection(true)
                        .padding(.horizontal, 14)
                        .frame(height: 46)
                        .background(Color(hex: "383A40"))
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                        .foregroundColor(.white)
                        .font(.system(size: 14))
                        .onChange(of: username) { _ in errorMsg = nil; successMsg = nil }

                    Button(action: sendRequest) {
                        ZStack {
                            RoundedRectangle(cornerRadius: 12)
                                .fill(username.isEmpty ? Color.white.opacity(0.1) : Color(hex: "E53935"))
                                .frame(width: 88, height: 46)
                            if isLoading {
                                ProgressView().tint(.white).scaleEffect(0.8)
                            } else {
                                Text("Send")
                                    .font(.system(size: 14, weight: .bold))
                                    .foregroundColor(username.isEmpty ? Color(hex: "5C5E66") : .white)
                            }
                        }
                    }
                    .disabled(username.isEmpty || isLoading)
                }

                if let err = errorMsg {
                    Label(err, systemImage: "exclamationmark.circle.fill")
                        .font(.system(size: 12))
                        .foregroundColor(Color(hex: "f23f43"))
                }
                if let ok = successMsg {
                    Label(ok, systemImage: "checkmark.circle.fill")
                        .font(.system(size: 12))
                        .foregroundColor(Color(hex: "23a55a"))
                }
            }
            .padding(.horizontal, 16)

            Spacer()
        }
    }

    private func sendRequest() {
        let name = username.trimmingCharacters(in: .whitespaces)
        guard !name.isEmpty else { return }
        isLoading = true
        errorMsg = nil
        successMsg = nil
        Task {
            do {
                try await vm.sendRequest(username: name)
                successMsg = "Friend request sent to \(name)!"
                username = ""
            } catch {
                errorMsg = error.localizedDescription
            }
            isLoading = false
        }
    }
}

// MARK: - Icon Action Button

struct IconActionButton: View {
    let icon: String
    let color: String
    var destructive = false
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Image(systemName: icon)
                .font(.system(size: 13, weight: .medium))
                .foregroundColor(destructive ? Color(hex: "f23f43") : Color(hex: "949BA4"))
                .frame(width: 32, height: 32)
                .background(Color(hex: color))
                .clipShape(Circle())
        }
    }
}
