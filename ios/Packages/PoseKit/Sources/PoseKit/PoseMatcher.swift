import Foundation

/// 用三个关节定义一个角度：a - vertex - b。
public struct AngleSpec: Hashable, Sendable {
    public let name: String
    public let a: Joint
    public let vertex: Joint
    public let b: Joint
    /// 偏差超过多少度视为完全不对
    public let tolerance: Double
    /// 这个角度属于哪个身体部位（用于生成提示）
    public let part: BodyPart
    /// 实时角度比目标大（张得太开）时给的提示
    public let whenTooOpen: PoseHint.Action
    /// 实时角度比目标小时给的提示
    public let whenTooClosed: PoseHint.Action
}

public enum BodyPart: String, Sendable {
    case leftArm, rightArm, leftLeg, rightLeg, torso
}

/// 一条纠正提示。`key` 对应 App 里的本地化字符串。
public struct PoseHint: Equatable, Sendable {
    public enum Action: String, Sendable { case bendMore, straighten, raise, lower }
    public let part: BodyPart
    public let action: Action
    public let degrees: Int
    public var key: String { "hint.\(part.rawValue).\(action.rawValue)" }
}

public struct MatchResult: Equatable, Sendable {
    /// 0...1，1 为完全一致
    public let score: Double
    /// 每个角度的偏差（实时 - 目标），单位度
    public let deviations: [String: Double]
    /// 最需要纠正的提示，按严重程度排序
    public let hints: [PoseHint]
    /// 是否用了镜像模板
    public let mirrored: Bool

    public var isMatched: Bool { score >= 0.85 }
}

public struct PoseMatcher: Sendable {
    public var specs: [AngleSpec]
    public init(specs: [AngleSpec] = PoseMatcher.defaultSpecs) { self.specs = specs }

    public static let defaultSpecs: [AngleSpec] = [
        .init(name: "leftElbow", a: .leftShoulder, vertex: .leftElbow, b: .leftWrist, tolerance: 45, part: .leftArm, whenTooOpen: .bendMore, whenTooClosed: .straighten),
        .init(name: "rightElbow", a: .rightShoulder, vertex: .rightElbow, b: .rightWrist, tolerance: 45, part: .rightArm, whenTooOpen: .bendMore, whenTooClosed: .straighten),
        .init(name: "leftShoulder", a: .leftElbow, vertex: .leftShoulder, b: .leftHip, tolerance: 40, part: .leftArm, whenTooOpen: .lower, whenTooClosed: .raise),
        .init(name: "rightShoulder", a: .rightElbow, vertex: .rightShoulder, b: .rightHip, tolerance: 40, part: .rightArm, whenTooOpen: .lower, whenTooClosed: .raise),
        .init(name: "leftHip", a: .leftShoulder, vertex: .leftHip, b: .leftKnee, tolerance: 35, part: .leftLeg, whenTooOpen: .raise, whenTooClosed: .lower),
        .init(name: "rightHip", a: .rightShoulder, vertex: .rightHip, b: .rightKnee, tolerance: 35, part: .rightLeg, whenTooOpen: .raise, whenTooClosed: .lower),
        .init(name: "leftKnee", a: .leftHip, vertex: .leftKnee, b: .leftAnkle, tolerance: 35, part: .leftLeg, whenTooOpen: .bendMore, whenTooClosed: .straighten),
        .init(name: "rightKnee", a: .rightHip, vertex: .rightKnee, b: .rightAnkle, tolerance: 35, part: .rightLeg, whenTooOpen: .bendMore, whenTooClosed: .straighten),
    ]

    /// 比较实时骨架与模板。只用两边都检测到的关节；一个都没有时返回 nil。
    public func match(live: BodyPose, template: PoseTemplate) -> MatchResult? {
        let target = template.pose
        let direct = compare(live: live, target: target, mirrored: false)
        guard template.allowMirror else { return direct }
        // 只露出一侧肢体时，直接比较可能完全没有重叠，镜像比较却有——两边都要算
        let flipped = compare(live: live, target: target.mirrored, mirrored: true)
        switch (direct, flipped) {
        case let (d?, f?): return f.score > d.score ? f : d
        default: return direct ?? flipped
        }
    }

    func compare(live: BodyPose, target: BodyPose, mirrored: Bool) -> MatchResult? {
        var scores: [Double] = []
        var deviations: [String: Double] = [:]
        var hints: [(severity: Double, hint: PoseHint)] = []

        for spec in specs {
            guard let l = Self.angle(spec, in: live), let t = Self.angle(spec, in: target) else { continue }
            let diff = l - t
            deviations[spec.name] = diff
            scores.append(max(0, 1 - abs(diff) / spec.tolerance))

            if abs(diff) > spec.tolerance * 0.4 {
                let action = diff > 0 ? spec.whenTooOpen : spec.whenTooClosed
                hints.append((abs(diff) / spec.tolerance,
                              PoseHint(part: spec.part, action: action, degrees: Int(abs(diff).rounded()))))
            }
        }
        guard !scores.isEmpty else { return nil }
        let score = scores.reduce(0, +) / Double(scores.count)
        let sorted = hints.sorted { $0.severity > $1.severity }.map(\.hint)
        return MatchResult(score: score, deviations: deviations, hints: sorted, mirrored: mirrored)
    }

    /// 返回 a-vertex-b 的夹角，0...180 度。
    public static func angle(_ spec: AngleSpec, in pose: BodyPose) -> Double? {
        guard let a = pose[spec.a], let v = pose[spec.vertex], let b = pose[spec.b] else { return nil }
        return angle(a: a, vertex: v, b: b)
    }

    public static func angle(a: Point2D, vertex v: Point2D, b: Point2D) -> Double? {
        let v1 = (a.x - v.x, a.y - v.y), v2 = (b.x - v.x, b.y - v.y)
        let n1 = (v1.0 * v1.0 + v1.1 * v1.1).squareRoot(), n2 = (v2.0 * v2.0 + v2.1 * v2.1).squareRoot()
        guard n1 > 1e-6, n2 > 1e-6 else { return nil }
        let cos = max(-1, min(1, (v1.0 * v2.0 + v1.1 * v2.1) / (n1 * n2)))
        return acos(cos) * 180 / .pi
    }
}
