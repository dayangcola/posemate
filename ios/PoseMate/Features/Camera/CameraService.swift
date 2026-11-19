import AVFoundation
import Photos
import PoseKit
import UIKit

/// 相机会话 + 每帧姿势检测 + 拍照保存。
final class CameraService: NSObject, ObservableObject {
    @Published private(set) var livePose: BodyPose?
    @Published private(set) var match: MatchResult?
    @Published private(set) var isAuthorized = false
    @Published private(set) var position: AVCaptureDevice.Position = .back

    let session = AVCaptureSession()
    private let sessionQueue = DispatchQueue(label: "camera.session")
    private let videoQueue = DispatchQueue(label: "camera.video")
    private let videoOutput = AVCaptureVideoDataOutput()
    private let photoOutput = AVCapturePhotoOutput()
    private let detector = PoseDetector()
    private let matcher = PoseMatcher()

    /// 由 UI 设置，在视频线程读取
    var target: PoseTemplate? {
        get { lock.withLock { _target } }
        set { lock.withLock { _target = newValue } }
    }
    private var _target: PoseTemplate?
    private let lock = NSLock()

    func start() async {
        let granted = await AVCaptureDevice.requestAccess(for: .video)
        await MainActor.run { isAuthorized = granted }
        guard granted else { return }
        sessionQueue.async { [self] in
            configure(position: .back)
            session.startRunning()
        }
    }

    func stop() { sessionQueue.async { [self] in session.stopRunning() } }

    func flipCamera() {
        sessionQueue.async { [self] in
            let next: AVCaptureDevice.Position = position == .back ? .front : .back
            configure(position: next)
        }
    }

    private func configure(position: AVCaptureDevice.Position) {
        session.beginConfiguration()
        defer { session.commitConfiguration() }
        session.sessionPreset = .photo
        session.inputs.forEach { session.removeInput($0) }

        guard let device = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: position),
              let input = try? AVCaptureDeviceInput(device: device),
              session.canAddInput(input) else { return }
        session.addInput(input)

        if !session.outputs.contains(videoOutput), session.canAddOutput(videoOutput) {
            videoOutput.alwaysDiscardsLateVideoFrames = true
            videoOutput.setSampleBufferDelegate(self, queue: videoQueue)
            session.addOutput(videoOutput)
        }
        if !session.outputs.contains(photoOutput), session.canAddOutput(photoOutput) {
            session.addOutput(photoOutput)
        }
        // 输出竖屏帧，这样 Vision 坐标与屏幕方向一致
        if let conn = videoOutput.connection(with: .video) {
            if conn.isVideoRotationAngleSupported(90) { conn.videoRotationAngle = 90 }
            conn.isVideoMirrored = position == .front
        }
        DispatchQueue.main.async { self.position = position }
    }

    func capturePhoto() {
        sessionQueue.async { [self] in
            photoOutput.capturePhoto(with: AVCapturePhotoSettings(), delegate: self)
        }
    }
}

extension CameraService: AVCaptureVideoDataOutputSampleBufferDelegate {
    func captureOutput(_ output: AVCaptureOutput, didOutput sampleBuffer: CMSampleBuffer, from connection: AVCaptureConnection) {
        let pose = detector.detect(in: sampleBuffer)
        let result = pose.flatMap { p in target.flatMap { matcher.match(live: p, template: $0) } }
        DispatchQueue.main.async {
            self.livePose = pose
            self.match = result
        }
    }
}

extension CameraService: AVCapturePhotoCaptureDelegate {
    func photoOutput(_ output: AVCapturePhotoOutput, didFinishProcessingPhoto photo: AVCapturePhoto, error: Error?) {
        guard error == nil, let data = photo.fileDataRepresentation() else { return }
        PHPhotoLibrary.requestAuthorization(for: .addOnly) { status in
            guard status == .authorized || status == .limited else { return }
            PHPhotoLibrary.shared().performChanges {
                PHAssetCreationRequest.forAsset().addResource(with: .photo, data: data, options: nil)
            }
        }
    }
}
