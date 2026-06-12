import Foundation
import SwiftUI

@MainActor
class AuthViewModel: ObservableObject {
    @Published var user: User?
    @Published var token: String?
    @Published var isLoading = false
    @Published var error: String?
    @Published var isLoggedIn = false

    private let tokenKey = "voxa_token"
    private let userKey = "voxa_user_v2"

    init() {
        loadStored()
    }

    private func loadStored() {
        guard let token = UserDefaults.standard.string(forKey: tokenKey),
              let data = UserDefaults.standard.data(forKey: userKey),
              let user = try? JSONDecoder().decode(User.self, from: data) else { return }
        self.token = token
        self.user = user
        self.isLoggedIn = true
        Task { await APIClient.shared.setToken(token) }
    }

    func login(email: String, password: String) async {
        isLoading = true
        error = nil
        do {
            let resp = try await APIClient.shared.login(email: email, password: password)
            store(resp)
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    func register(email: String, username: String, password: String) async {
        isLoading = true
        error = nil
        do {
            let resp = try await APIClient.shared.register(email: email, username: username, password: password)
            store(resp)
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    func logout() {
        user = nil
        token = nil
        isLoggedIn = false
        UserDefaults.standard.removeObject(forKey: tokenKey)
        UserDefaults.standard.removeObject(forKey: userKey)
        Task { await APIClient.shared.setToken(nil) }
    }

    private func store(_ resp: AuthResponse) {
        token = resp.token
        user = resp.user
        isLoggedIn = true
        Task { await APIClient.shared.setToken(resp.token) }
        if let data = try? JSONEncoder().encode(resp.user) {
            UserDefaults.standard.set(data, forKey: userKey)
            UserDefaults.standard.set(resp.token, forKey: tokenKey)
        }
    }
}
