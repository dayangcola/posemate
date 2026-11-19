import PoseKit
import SwiftUI

struct CameraScreen: View {
    @EnvironmentObject private var appState: AppState
    @StateObject private var camera = CameraService()
    @State private var showCoach = false

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            if camera.isAuthorized {
                CameraPreview(session: camera.session).ignoresSafeArea()
                PoseOverlayView(target: displayedTarget, live: camera.livePose, score: camera.match?.score)
                    .ignoresSafeArea()
            } else {
                Text("camera.permission").foregroundStyle(.white).padding()
            }
            VStack {
                header
                Spacer()
                hintBubble
                controls
            }
            .padding()
        }
        .task { await camera.start() }
        .onDisappear { camera.stop() }
        .onChange(of: appState.selectedTemplate, initial: true) { _, t in camera.target = t }
    }

    /// 匹配时如果用了镜像模板，也画镜像轮廓
    private var displayedTarget: BodyPose? {
        guard let t = appState.selectedTemplate?.pose else { return nil }
        return camera.match?.mirrored == true ? t.mirrored : t
    }

    private var header: some View {
        HStack {
            if let t = appState.selectedTemplate {
                Text(t.title.resolve()).font(.headline)
                    .padding(.horizontal, 12).padding(.vertical, 6)
                    .background(.ultraThinMaterial, in: Capsule())
            }
            Spacer()
            if let s = camera.match?.score {
                Text("\(Int(s * 100))%").font(.headline.monospacedDigit())
                    .padding(.horizontal, 12).padding(.vertical, 6)
                    .background(.ultraThinMaterial, in: Capsule())
            }
        }
    }

    @ViewBuilder private var hintBubble: some View {
        if let m = camera.match {
            let text: LocalizedStringKey = m.isMatched ? "hint.perfect" : (m.hints.first.map { LocalizedStringKey($0.key) } ?? "hint.almost")
            Text(text)
                .font(.title3.weight(.semibold))
                .padding(.horizontal, 16).padding(.vertical, 10)
                .background(m.isMatched ? Color.green.opacity(0.85) : Color.black.opacity(0.55), in: Capsule())
                .foregroundStyle(.white)
                .animation(.easeInOut, value: m.isMatched)
        } else if camera.isAuthorized {
            Text("hint.stepIn").padding(10).background(.black.opacity(0.55), in: Capsule()).foregroundStyle(.white)
        }
    }

    private var controls: some View {
        HStack {
            Button { showCoach = true } label: {
                Image(systemName: "sparkles").font(.title2).frame(width: 52, height: 52)
                    .background(.ultraThinMaterial, in: Circle())
            }
            Spacer()
            Button { camera.capturePhoto() } label: {
                Circle().strokeBorder(.white, lineWidth: 5).frame(width: 76, height: 76)
                    .overlay(Circle().fill(camera.match?.isMatched == true ? .green : .white).padding(10))
            }
            Spacer()
            Button { camera.flipCamera() } label: {
                Image(systemName: "arrow.triangle.2.circlepath.camera").font(.title2).frame(width: 52, height: 52)
                    .background(.ultraThinMaterial, in: Circle())
            }
        }
        .foregroundStyle(.white)
        .padding(.top, 8)
        .sheet(isPresented: $showCoach) { CoachSheet(template: appState.selectedTemplate) }
    }
}
