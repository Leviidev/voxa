import SwiftUI

@main
struct VoxaApp: App {
    @StateObject private var auth = AuthViewModel()
    @StateObject private var servers = ServersViewModel()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(auth)
                .environmentObject(servers)
                .preferredColorScheme(.dark)
        }
    }
}
