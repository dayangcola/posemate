// swift-tools-version:5.9
import PackageDescription

// PoseKit：与 UI / Vision 无关的纯逻辑层（关节模型、姿势模板、角度匹配）。
// 可以在 macOS 上直接 `swift test`，App 通过本地 Swift Package 依赖引用。
let package = Package(
    name: "PoseKit",
    defaultLocalization: "en",
    platforms: [.iOS(.v17), .macOS(.v14)],
    products: [.library(name: "PoseKit", targets: ["PoseKit"])],
    targets: [
        .target(name: "PoseKit"),
        .testTarget(name: "PoseKitTests", dependencies: ["PoseKit"]),
    ]
)
