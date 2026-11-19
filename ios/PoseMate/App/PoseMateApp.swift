import SwiftUI

@main
struct PoseMateApp: App {
    @StateObject private var appState = AppState()
    @StateObject private var subscriptions = SubscriptionStore()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(appState)
                .environmentObject(subscriptions)
                .task { await subscriptions.start() }
        }
    }
}
