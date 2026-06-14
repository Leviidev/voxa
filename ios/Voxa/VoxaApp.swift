import SwiftUI

@main
struct VoxaApp: App {
    @StateObject private var auth = AuthViewModel()
    @StateObject private var servers = ServersViewModel()
    @StateObject private var dms = DMViewModel()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(auth)
                .environmentObject(servers)
                .environmentObject(dms)
                .preferredColorScheme(.dark)
        }
    }
}
