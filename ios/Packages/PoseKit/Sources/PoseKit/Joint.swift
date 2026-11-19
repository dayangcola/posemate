import Foundation

/// 与 Apple Vision `VNHumanBodyPoseObservation.JointName` 对应的关节子集。
public enum Joint: String, Codable, CaseIterable, Sendable {
    case nose, neck
    case leftShoulder, rightShoulder
    case leftElbow, rightElbow
    case leftWrist, rightWrist
    case root
    case leftHip, rightHip
    case leftKnee, rightKnee
    case leftAnkle, rightAnkle
}

/// 归一化坐标，原点在左上角，x/y 范围 0...1。
public struct Point2D: Codable, Equatable, Sendable {
    public var x: Double
    public var y: Double
    public init(x: Double, y: Double) { self.x = x; self.y = y }

    /// 水平镜像（前置摄像头 / 允许左右互换的姿势）。
    public var mirrored: Point2D { Point2D(x: 1 - x, y: y) }
}

/// 一个人的骨架：检测到的关节 → 坐标。缺失的关节直接不存在。
public struct BodyPose: Equatable, Sendable {
    public var joints: [Joint: Point2D]
    public init(joints: [Joint: Point2D]) { self.joints = joints }

    public subscript(_ joint: Joint) -> Point2D? { joints[joint] }

    /// 左右镜像：坐标翻转，同时交换左/右关节名。
    public var mirrored: BodyPose {
        var out: [Joint: Point2D] = [:]
        for (joint, p) in joints { out[joint.swappedSide] = p.mirrored }
        return BodyPose(joints: out)
    }
}

extension Joint {
    var swappedSide: Joint {
        let raw = rawValue
        if raw.hasPrefix("left") { return Joint(rawValue: "right" + raw.dropFirst(4)) ?? self }
        if raw.hasPrefix("right") { return Joint(rawValue: "left" + raw.dropFirst(5)) ?? self }
        return self
    }
}

/// 画骨架用的连线。
public enum Skeleton {
    public static let bones: [(Joint, Joint)] = [
        (.nose, .neck),
        (.neck, .leftShoulder), (.neck, .rightShoulder),
        (.leftShoulder, .leftElbow), (.leftElbow, .leftWrist),
        (.rightShoulder, .rightElbow), (.rightElbow, .rightWrist),
        (.neck, .root),
        (.root, .leftHip), (.root, .rightHip),
        (.leftHip, .leftKnee), (.leftKnee, .leftAnkle),
        (.rightHip, .rightKnee), (.rightKnee, .rightAnkle),
    ]
}
