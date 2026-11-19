import CoreMedia
import PoseKit
import Vision

/// 封装 Apple Vision 的人体姿势识别（完全在设备端运行）。
/// TODO: 多人（情侣/团体）时取所有 observation；目前只取置信度最高的一人。
final class PoseDetector {
    private let request = VNDetectHumanBodyPoseRequest()
    private let minConfidence: Float = 0.3

    private static let mapping: [VNHumanBodyPoseObservation.JointName: Joint] = [
        .nose: .nose, .neck: .neck,
        .leftShoulder: .leftShoulder, .rightShoulder: .rightShoulder,
        .leftElbow: .leftElbow, .rightElbow: .rightElbow,
        .leftWrist: .leftWrist, .rightWrist: .rightWrist,
        .root: .root,
        .leftHip: .leftHip, .rightHip: .rightHip,
        .leftKnee: .leftKnee, .rightKnee: .rightKnee,
        .leftAnkle: .leftAnkle, .rightAnkle: .rightAnkle,
    ]

    func detect(in sampleBuffer: CMSampleBuffer) -> BodyPose? {
        let handler = VNImageRequestHandler(cmSampleBuffer: sampleBuffer, orientation: .up)
        do { try handler.perform([request]) } catch { return nil }
        guard let obs = request.results?.max(by: { $0.confidence < $1.confidence }),
              let points = try? obs.recognizedPoints(.all) else { return nil }

        var joints: [Joint: Point2D] = [:]
        for (name, p) in points where p.confidence >= minConfidence {
            guard let joint = Self.mapping[name] else { continue }
            // Vision 原点在左下角，转换为左上角
            joints[joint] = Point2D(x: Double(p.location.x), y: 1 - Double(p.location.y))
        }
        return joints.isEmpty ? nil : BodyPose(joints: joints)
    }
}
