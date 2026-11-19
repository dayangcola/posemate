import PoseKit
import SwiftUI

struct PoseLibraryScreen: View {
    @EnvironmentObject private var appState: AppState
    @EnvironmentObject private var subscriptions: SubscriptionStore
    @State private var category: PoseCategory?
    @State private var showPaywall = false
    var onPick: () -> Void

    private var filtered: [PoseTemplate] {
        appState.templates.filter { category == nil || $0.category == category }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                categoryBar
                LazyVGrid(columns: [GridItem(.adaptive(minimum: 150), spacing: 12)], spacing: 12) {
                    ForEach(filtered) { t in
                        PoseCard(template: t, locked: t.isPro && !subscriptions.isPro)
                            .onTapGesture { pick(t) }
                    }
                }
                .padding()
            }
            .navigationTitle("tab.library")
            .sheet(isPresented: $showPaywall) { PaywallView() }
        }
    }

    private var categoryBar: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack {
                chip(nil, "category.all")
                ForEach(PoseCategory.allCases, id: \.self) { chip($0, LocalizedStringKey("category.\($0.rawValue)")) }
            }
            .padding(.horizontal)
        }
    }

    private func chip(_ c: PoseCategory?, _ label: LocalizedStringKey) -> some View {
        Button { category = c } label: {
            Text(label).padding(.horizontal, 14).padding(.vertical, 8)
                .background(category == c ? Color.accentColor : Color.secondary.opacity(0.15), in: Capsule())
                .foregroundStyle(category == c ? .white : .primary)
        }
    }

    private func pick(_ t: PoseTemplate) {
        if t.isPro && !subscriptions.isPro { showPaywall = true; return }
        appState.selectedTemplate = t
        onPick()
    }
}

private struct PoseCard: View {
    let template: PoseTemplate
    let locked: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            ZStack {
                RoundedRectangle(cornerRadius: 16).fill(Color.secondary.opacity(0.12))
                PoseOverlayView(target: template.pose, live: nil, score: nil, sourceAspect: 3.0 / 4.0)
                    .colorMultiply(.primary)
                    .padding(8)
                if locked {
                    Image(systemName: "lock.fill").padding(8).background(.ultraThinMaterial, in: Circle())
                        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topTrailing).padding(8)
                }
            }
            .aspectRatio(3.0 / 4.0, contentMode: .fit)
            Text(template.title.resolve()).font(.subheadline.weight(.medium)).lineLimit(1)
        }
    }
}
