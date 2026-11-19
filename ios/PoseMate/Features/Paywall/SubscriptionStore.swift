import StoreKit

/// StoreKit 2 订阅。商品 ID 需要在 App Store Connect 里创建。
/// 之后可以换成 RevenueCat，接口保持 `isPro` / `purchase` 不变即可。
@MainActor
final class SubscriptionStore: ObservableObject {
    static let productIDs = ["com.example.posemate.pro.monthly", "com.example.posemate.pro.yearly"]

    @Published private(set) var products: [Product] = []
    @Published private(set) var isPro = false
    private var updates: Task<Void, Never>?

    func start() async {
        updates = Task { [weak self] in
            for await result in Transaction.updates {
                if case .verified(let t) = result { await t.finish() }
                await self?.refreshEntitlements()
            }
        }
        products = (try? await Product.products(for: Self.productIDs)) ?? []
        await refreshEntitlements()
    }

    func purchase(_ product: Product) async throws {
        let result = try await product.purchase()
        if case .success(.verified(let t)) = result {
            await t.finish()
            await refreshEntitlements()
        }
    }

    func restore() async {
        try? await AppStore.sync()
        await refreshEntitlements()
    }

    private func refreshEntitlements() async {
        var pro = false
        for await result in Transaction.currentEntitlements {
            if case .verified(let t) = result, Self.productIDs.contains(t.productID), t.revocationDate == nil {
                pro = true
            }
        }
        isPro = pro
    }
}
