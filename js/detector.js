// 设备端姿势识别：MediaPipe Pose Landmarker（lite 模型）。
// 所有文件都放在 /vendor 下自托管：国内访问不了 Google 存储，也方便 Service Worker 离线缓存。
const BASE = new URL('../vendor/mediapipe/', import.meta.url).href;

let landmarkerPromise = null;

export function loadDetector() {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const { PoseLandmarker } = await import(BASE + 'vision_bundle.mjs');
      // 只托管 SIMD 版 wasm（iOS 16.4+ / 近几年的 Chrome、Firefox 都支持）
      const fileset = {
        wasmLoaderPath: BASE + 'wasm/vision_wasm_internal.js',
        wasmBinaryPath: BASE + 'wasm/vision_wasm_internal.wasm',
      };
      const make = (delegate) => PoseLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: BASE + 'pose_landmarker_lite.task', delegate },
        runningMode: 'VIDEO',
        numPoses: 1, // TODO: 情侣/多人姿势需要 numPoses>1 并按位置配对模板
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      try { return await make('GPU'); } catch (e) {
        console.warn('GPU delegate unavailable, falling back to CPU', e);
        return make('CPU');
      }
    })();
    landmarkerPromise.catch(() => { landmarkerPromise = null; });
  }
  return landmarkerPromise;
}
