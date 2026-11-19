# PoseMate · 姿势搭子（临时名）

实时 AI 拍照姿势教练：打开相机 → 选姿势 → 跟着轮廓摆 → 变绿按快门。
本仓库是**基础框架**：结构完整、核心链路能跑，业务细节都留了 TODO。

```
posemate/
├── ios/                         iOS App（Swift / SwiftUI，iOS 17+）
│   ├── project.yml              XcodeGen 配置（生成 .xcodeproj）
│   ├── Packages/PoseKit/        纯逻辑包：关节模型、姿势模板、角度匹配 + 单元测试
│   └── PoseMate/
│       ├── App/                 入口、TabView、全局状态
│       ├── Features/
│       │   ├── Camera/          AVFoundation 相机、预览、骨架叠加层、拍照页
│       │   ├── Pose/            Apple Vision 人体姿势识别（设备端）
│       │   ├── Library/         姿势库（分类筛选、Pro 锁）
│       │   ├── Coach/           AI 教练（目前是 Mock，接口已定义）
│       │   ├── Paywall/         StoreKit 2 订阅 + 付费墙
│       │   └── Settings/        我的
│       └── Resources/           poses.json（8 个示例姿势）、中英文案、资源
├── pwa/                         网页 App（PWA，核心功能可用，可部署 Vercel，见 pwa/README.md）
└── web/                         官网（纯静态 HTML/CSS/JS，中英切换）
    ├── index.html  styles.css  main.js  privacy.html
```

## 跑起来

**iOS**（需要 Mac + Xcode 15+，相机功能要真机）
```bash
brew install xcodegen
cd ios && xcodegen && open PoseMate.xcodeproj
# 在 Signing 里选你的 Team，连 iPhone 运行
cd Packages/PoseKit && swift test   # 跑匹配算法的单元测试
```

**官网**
```bash
cd web && python3 -m http.server 8000   # 打开 http://localhost:8000
```
部署：直接把 `web/` 拖到 Vercel / Netlify / Cloudflare Pages 即可。

## 核心原理
1. `CameraService` 每帧交给 `PoseDetector`（`VNDetectHumanBodyPoseRequest`）得到 15 个关节点。
2. `PoseMatcher` 计算肘、肩、髋、膝 8 个关节角，与模板逐个比较，按容差打分（0–1），
   并给出最需要纠正的一条提示（如“右臂伸直一点”）。支持左右镜像匹配。
3. `PoseOverlayView` 画白色虚线目标轮廓 + 实时骨架（黄→绿）。分数 ≥ 85% 视为对上。

## 差异化方向（已在框架里预留）
- 免费版就能用：基础姿势 + 不限次实时纠正免费，Pro 解锁全部库/多人/AI 教练
- 男生、情侣、多人姿势分类（`PoseCategory`）
- 给拍摄者的提示（`photographerTips`）
- 中英双语，偏小红书审美的姿势内容

## 下一步路线图
- [ ] 定正式产品名、Logo、App 图标（`Assets.xcassets/AppIcon` 目前为空）
- [ ] 补充姿势内容（建议做个内部小工具：上传参考图 → Vision 提取骨架 → 导出 JSON）
- [ ] 多人检测（情侣/团体）：`PoseDetector` 返回全部人，按位置与模板配对
- [ ] 预览坐标精确映射（目前按 3:4 aspectFill 近似）
- [ ] 后端（Supabase）：姿势库下发、候补名单、AI 教练代理（多模态大模型，Key 只放服务端）
- [ ] App Store Connect 建订阅商品，替换 `SubscriptionStore.productIDs`；或换 RevenueCat
- [ ] 官网候补表单接真实存储；隐私政策由法务定稿
- [ ] 替换所有 `com.example` / `example.com` 占位
