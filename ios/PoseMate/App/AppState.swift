import Foundation
import PoseKit

/// 全局状态：姿势库 + 当前选中的目标姿势。
@MainActor
final class AppState: ObservableObject {
    @Published private(set) var templates: [PoseTemplate] = []
    @Published var selectedTemplate: PoseTemplate?

    init() { loadBundledLibrary() }

    /// MVP 先读打包在 App 里的 poses.json；之后改成从后端（Supabase 等）拉取并缓存。
    func loadBundledLibrary() {
        guard let url = Bundle.main.url(forResource: "poses", withExtension: "json"),
              let data = try? Data(contentsOf: url),
              let list = try? PoseLibrary.decode(data) else {
            assertionFailure("poses.json 缺失或格式错误")
            return
        }
        templates = list
        selectedTemplate = list.first
    }
}
