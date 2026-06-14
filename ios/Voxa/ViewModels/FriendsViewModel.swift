import Foundation
import SwiftUI

@MainActor
class FriendsViewModel: ObservableObject {
    @Published var friends: [Friend] = []
    @Published var requests: [FriendRequest] = []
    @Published var isLoading = false
    @Published var error: String?

    var incomingRequests: [FriendRequest] { requests.filter { $0.incoming } }
    var outgoingRequests: [FriendRequest] { requests.filter { !$0.incoming } }
    var pendingCount: Int { incomingRequests.count }

    func load() async {
        isLoading = true
        error = nil
        async let friendsTask = APIClient.shared.getFriends()
        async let requestsTask = APIClient.shared.getFriendRequests()
        do {
            let (f, r) = try await (friendsTask, requestsTask)
            friends = f
            requests = r
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    func sendRequest(username: String) async throws {
        try await APIClient.shared.sendFriendRequest(username: username)
        await load()
    }

    func accept(_ request: FriendRequest) async {
        do {
            try await APIClient.shared.acceptFriendRequest(id: request.id)
            await load()
        } catch {
            self.error = error.localizedDescription
        }
    }

    func decline(_ request: FriendRequest) async {
        do {
            try await APIClient.shared.declineFriendRequest(id: request.id)
            await load()
        } catch {
            self.error = error.localizedDescription
        }
    }

    func removeFriend(_ friend: Friend) async {
        do {
            try await APIClient.shared.removeFriend(userId: friend.user.id)
            await load()
        } catch {
            self.error = error.localizedDescription
        }
    }
}
