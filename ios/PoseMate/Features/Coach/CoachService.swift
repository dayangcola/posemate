import PoseKit
import SwiftUI

/// AI 教练：拍一张后给出整体建议（光线、构图、表情、姿势细节）。
/// 规划：App → 自己的后端（Supabase Edge Function 等）→ 多模态大模型。
/// 不要把模型 API Key 放进 App。
protocol PoseCoach {
    func advice(photoJPEG: Data?, template: PoseTemplate?) async throws -> [String]
}

/// 占位实现：直接返回模板里的提示。
struct MockCoach: PoseCoach {
    func advice(photoJPEG: Data?, template: PoseTemplate?) async throws -> [String] {
        try await Task.sleep(for: .milliseconds(400))
        guard let template else { return [String(localized: "coach.pickPose")] }
        return template.subjectTips.map { $0.resolve() } + template.photographerTips.map { "📷 " + $0.resolve() }
    }
}

struct CoachSheet: View {
    let template: PoseTemplate?
    var coach: PoseCoach = MockCoach()
    @State private var tips: [String] = []

    var body: some View {
        NavigationStack {
            List {
                if tips.isEmpty { ProgressView() }
                ForEach(tips, id: \.self) { Text($0) }
            }
            .navigationTitle("coach.title")
            .task { tips = (try? await coach.advice(photoJPEG: nil, template: template)) ?? [] }
        }
        .presentationDetents([.medium])
    }
}
