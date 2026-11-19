import XCTest
@testable import PoseKit

final class PoseMatcherTests: XCTestCase {
    private func template(_ joints: [Joint: Point2D], mirror: Bool = false) -> PoseTemplate {
        PoseTemplate(
            id: "t", title: .init(zh: "测试", en: "Test"), category: .female, tags: [],
            isPro: false, allowMirror: mirror, subjectTips: [], photographerTips: [],
            joints: Dictionary(uniqueKeysWithValues: joints.map { ($0.key.rawValue, $0.value) })
        )
    }

    /// 右臂伸直的人
    private let straightArm: [Joint: Point2D] = [
        .rightShoulder: .init(x: 0.4, y: 0.3),
        .rightElbow: .init(x: 0.4, y: 0.45),
        .rightWrist: .init(x: 0.4, y: 0.6),
        .rightHip: .init(x: 0.42, y: 0.6),
    ]

    func testRightAngle() {
        let a = PoseMatcher.angle(a: .init(x: 1, y: 0), vertex: .init(x: 0, y: 0), b: .init(x: 0, y: 1))
        XCTAssertEqual(a!, 90, accuracy: 0.001)
    }

    func testIdenticalPoseScoresOne() {
        let r = PoseMatcher().match(live: BodyPose(joints: straightArm), template: template(straightArm))
        XCTAssertEqual(r!.score, 1, accuracy: 0.0001)
        XCTAssertTrue(r!.hints.isEmpty)
        XCTAssertTrue(r!.isMatched)
    }

    func testBentArmProducesStraightenHint() {
        var bent = straightArm
        bent[.rightWrist] = .init(x: 0.55, y: 0.45) // 小臂抬平，肘部 90°
        let r = PoseMatcher().match(live: BodyPose(joints: bent), template: template(straightArm))!
        XCTAssertLessThan(r.score, 0.85)
        XCTAssertEqual(r.hints.first?.part, .rightArm)
        XCTAssertEqual(r.hints.first?.action, .straighten)
    }

    func testMirroredPoseMatchesWhenAllowed() {
        let live = BodyPose(joints: straightArm).mirrored // 现在是左臂
        let r = PoseMatcher().match(live: live, template: template(straightArm, mirror: true))!
        XCTAssertTrue(r.mirrored)
        XCTAssertEqual(r.score, 1, accuracy: 0.0001)
    }

    func testNoOverlapReturnsNil() {
        let live = BodyPose(joints: [.nose: .init(x: 0.5, y: 0.1)])
        XCTAssertNil(PoseMatcher().match(live: live, template: template(straightArm)))
    }
}
