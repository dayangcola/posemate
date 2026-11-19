import StoreKit
import SwiftUI

struct PaywallView: View {
    @EnvironmentObject private var store: SubscriptionStore
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "sparkles").font(.system(size: 48)).foregroundStyle(.tint)
            Text("paywall.title").font(.title.bold())
            VStack(alignment: .leading, spacing: 10) {
                Label("paywall.benefit.library", systemImage: "square.grid.2x2")
                Label("paywall.benefit.coach", systemImage: "wand.and.stars")
                Label("paywall.benefit.group", systemImage: "person.3")
            }
            Spacer()
            if store.products.isEmpty {
                Text("paywall.unavailable").font(.footnote).foregroundStyle(.secondary)
            }
            ForEach(store.products, id: \.id) { p in
                Button {
                    Task { try? await store.purchase(p); if store.isPro { dismiss() } }
                } label: {
                    HStack { Text(p.displayName); Spacer(); Text(p.displayPrice) }
                        .padding().frame(maxWidth: .infinity)
                        .background(Color.accentColor, in: RoundedRectangle(cornerRadius: 14))
                        .foregroundStyle(.white)
                }
            }
            Button("paywall.restore") { Task { await store.restore() } }.font(.footnote)
        }
        .padding(24)
    }
}
