import SwiftUI

struct RootView: View {
    @State private var tab: Tab = .camera
    enum Tab { case camera, library, settings }

    var body: some View {
        TabView(selection: $tab) {
            CameraScreen()
                .tabItem { Label("tab.camera", systemImage: "camera.viewfinder") }
                .tag(Tab.camera)
            PoseLibraryScreen(onPick: { tab = .camera })
                .tabItem { Label("tab.library", systemImage: "figure.stand") }
                .tag(Tab.library)
            SettingsScreen()
                .tabItem { Label("tab.me", systemImage: "person.crop.circle") }
                .tag(Tab.settings)
        }
    }
}
