import Foundation

/// 中英双语文本。后续加语言就在这里加字段。
public struct LocalizedText: Codable, Equatable, Sendable {
    public var zh: String
    public var en: String
    public init(zh: String, en: String) { self.zh = zh; self.en = en }

    public func resolve(_ locale: Locale = .current) -> String {
        locale.language.languageCode?.identifier == "zh" ? zh : en
    }
}

public enum PoseCategory: String, Codable, CaseIterable, Sendable {
    case female, male, couple, group, sitting, travel
}

/// 姿势库里的一条模板。
public struct PoseTemplate: Codable, Identifiable, Equatable, Sendable {
    public var id: String
    public var title: LocalizedText
    public var category: PoseCategory
    public var tags: [String]
    /// 是否需要订阅
    public var isPro: Bool
    /// 左右镜像也算对（大多数姿势都可以）
    public var allowMirror: Bool
    /// 给被拍者的提示
    public var subjectTips: [LocalizedText]
    /// 给拍摄者（男朋友/朋友）的提示：机位、高度、构图
    public var photographerTips: [LocalizedText]
    /// 目标骨架，key 是 Joint.rawValue
    public var joints: [String: Point2D]

    public var pose: BodyPose {
        BodyPose(joints: Dictionary(uniqueKeysWithValues: joints.compactMap { key, p in
            Joint(rawValue: key).map { ($0, p) }
        }))
    }
}

public enum PoseLibrary {
    public static func decode(_ data: Data) throws -> [PoseTemplate] {
        try JSONDecoder().decode([PoseTemplate].self, from: data)
    }
}
