// 姿势搭子 Service Worker
// - 外壳（HTML/CSS/JS/姿势数据/图标）安装时预缓存，离线可打开
// - MediaPipe 模型和 wasm（约 15MB）首次使用时缓存，之后离线也能识别
// 发版时改 VERSION，用户会看到“有新版本”提示
const VERSION = 'v0.1.0';
const SHELL = `pm-shell-${VERSION}`;
const VENDOR = 'pm-vendor-mediapipe-0.10.21';

const SHELL_FILES = [
  './', './index.html', './app.css', './poses.json', './manifest.webmanifest', './privacy.html',
  './js/app.js', './js/i18n.js', './js/matcher.js', './js/camera.js', './js/overlay.js', './js/detector.js', './js/store.js',
  './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png',
];
const VENDOR_FILES = [
  './vendor/mediapipe/vision_bundle.mjs',
  './vendor/mediapipe/wasm/vision_wasm_internal.js',
  './vendor/mediapipe/wasm/vision_wasm_internal.wasm',
  './vendor/mediapipe/pose_landmarker_lite.task',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL).then((c) => c.addAll(SHELL_FILES)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keep = new Set([SHELL, VENDOR]);
    for (const key of await caches.keys()) if (!keep.has(key)) await caches.delete(key);
    await self.clients.claim();
    // 顺手把模型也缓存好（失败无所谓，首次使用时还会再缓存）
    const vc = await caches.open(VENDOR);
    for (const f of VENDOR_FILES) {
      if (!(await vc.match(f))) vc.add(f).catch(() => {});
    }
  })());
});

self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // 页面导航：网络优先，离线时用缓存的 index.html
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(async () =>
      (await caches.match(req, { ignoreSearch: true })) || caches.match('./index.html')));
    return;
  }

  // 模型/wasm：缓存优先（文件名带版本，内容不变）
  if (url.pathname.includes('/vendor/')) {
    event.respondWith((async () => {
      const cache = await caches.open(VENDOR);
      const hit = await cache.match(req, { ignoreSearch: true });
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) cache.put(req, res.clone());
      return res;
    })());
    return;
  }

  // 其他外壳文件：先用缓存，后台更新
  event.respondWith((async () => {
    const cache = await caches.open(SHELL);
    const hit = await cache.match(req, { ignoreSearch: true });
    const net = fetch(req).then((res) => { if (res.ok) cache.put(req, res.clone()); return res; }).catch(() => hit);
    return hit || net;
  })());
});
