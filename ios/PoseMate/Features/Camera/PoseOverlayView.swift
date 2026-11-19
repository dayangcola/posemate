import PoseKit
import SwiftUI

/// 在预览上画两层骨架：目标姿势（白色虚线轮廓）+ 实时骨架（按匹配度变色）。
/// 注意：预览是 aspectFill，这里假设画面比例 3:4 并做了同样的裁切映射。
struct PoseOverlayView: View {
    let target: BodyPose?
    let live: BodyPose?
    let score: Double?
    var sourceAspect: CGFloat = 3.0 / 4.0

    var body: some View {
        Canvas { ctx, size in
            if let target { draw(target, in: &ctx, size: size,
                                 style: StrokeStyle(lineWidth: 6, lineCap: .round, dash: [10, 8]),
                                 color: .white.opacity(0.75)) }
            if let live { draw(live, in: &ctx, size: size,
                               style: StrokeStyle(lineWidth: 4, lineCap: .round),
                               color: liveColor) }
        }
        .allowsHitTesting(false)
    }

    private var liveColor: Color {
        guard let score else { return .yellow }
        return score >= 0.85 ? .green : (score >= 0.6 ? .yellow : .orange)
    }

    private func draw(_ pose: BodyPose, in ctx: inout GraphicsContext, size: CGSize, style: StrokeStyle, color: Color) {
        let map = mapper(for: size)
        var path = Path()
        for (a, b) in Skeleton.bones {
            guard let pa = pose[a], let pb = pose[b] else { continue }
            path.move(to: map(pa)); path.addLine(to: map(pb))
        }
        ctx.stroke(path, with: .color(color), style: style)
        if let head = pose[.nose] {
            let c = map(head)
            ctx.stroke(Path(ellipseIn: CGRect(x: c.x - 22, y: c.y - 26, width: 44, height: 52)),
                       with: .color(color), style: style)
        }
    }

    /// 归一化坐标 → 视图坐标（模拟 aspectFill 裁切）
    private func mapper(for size: CGSize) -> (Point2D) -> CGPoint {
        let viewAspect = size.width / size.height
        var w = size.width, h = size.height
        if viewAspect > sourceAspect { h = size.width / sourceAspect } else { w = size.height * sourceAspect }
        let dx = (size.width - w) / 2, dy = (size.height - h) / 2
        return { p in CGPoint(x: dx + p.x * w, y: dy + p.y * h) }
    }
}
