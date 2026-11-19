import SwiftUI

struct SettingsScreen: View {
    @EnvironmentObject private var store: SubscriptionStore
    @State private var showPaywall = false

    var body: some View {
        NavigationStack {
            List {
                Section {
                    HStack {
                        Text("settings.plan")
                        Spacer()
                        Text(store.isPro ? "settings.pro" : "settings.free").foregroundStyle(.secondary)
                    }
                    if !store.isPro { Button("settings.upgrade") { showPaywall = true } }
                }
                Section {
                    Link("settings.privacy", destination: URL(string: "https://example.com/privacy.html")!) // TODO
                    Link("settings.feedback", destination: URL(string: "mailto:hello@example.com")!) // TODO
                }
            }
            .navigationTitle("tab.me")
            .sheet(isPresented: $showPaywall) { PaywallView() }
        }
    }
}
