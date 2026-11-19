import { t, tr, getLang, setLang, onLangChange, applyI18n } from './i18n.js';
import { match, mirrorPose, fromMediaPipe, MATCH_THRESHOLD } from './matcher.js';
import { Camera } from './camera.js';
import { drawOverlay, poseSVG, scoreColor } from './overlay.js';
import { loadDetector } from './detector.js';
import { addPhoto, listPhotos, deletePhoto, prefs } from './store.js';

const VERSION = '0.1.0';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const CATEGORIES = ['all', 'female', 'male', 'couple', 'group', 'sitting', 'travel'];

const state = {
  poses: [],
  pose: null, // 当前目标姿势
  category: 'all',
  isPro: prefs.get('pro', false),
  timer: prefs.get('timer', 0), // 0 / 3 / 10 秒
  autoShot: prefs.get('autoShot', true),
  photos: [],
};

// ---------- 通用 UI ----------
let toastTimer;
function toast(msg, ms = 2200) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}

function openSheet(id) { const d = $(id); if (!d.open) d.showModal(); }
function closeSheet(id) { const d = $(id); if (d.open) d.close(); }
$$('dialog').forEach((d) => {
  d.addEventListener('click', (e) => { if (e.target === d) d.close(); }); // 点遮罩关闭
  $$('[data-close]', d).forEach((b) => b.addEventListener('click', () => d.close()));
});

// ---------- 路由（底部 Tab） ----------
const VIEWS = ['camera', 'library', 'me'];
function route() {
  const name = VIEWS.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'camera';
  VIEWS.forEach((v) => {
    $(`#view-${v}`).hidden = v !== name;
    $(`.tab[data-view="${v}"]`).setAttribute('aria-current', v === name ? 'page' : 'false');
  });
  if (name === 'camera') resumeCamera(); else pauseCamera();
  if (name === 'me') renderMe();
}
window.addEventListener('hashchange', route);

// ---------- 姿势库 ----------
const isLocked = (p) => p.isPro && !state.isPro;

function renderChips() {
  $('#chips').innerHTML = CATEGORIES
    .filter((c) => c === 'all' || state.poses.some((p) => p.category === c))
    .map((c) => `<button class="chip" role="tab" aria-selected="${c === state.category}" data-cat="${c}">${t('category.' + c)}</button>`)
    .join('');
}

function renderLibrary() {
  renderChips();
  const list = state.poses.filter((p) => state.category === 'all' || p.category === state.category);
  $('#pose-grid').innerHTML = list.map((p) => `
    <button class="pose-card${state.pose?.id === p.id ? ' selected' : ''}" data-id="${p.id}">
      <div class="pose-thumb">${poseSVG(p.joints)}${isLocked(p) ? `<span class="badge-pro">🔒 ${t('library.pro')}</span>` : ''}</div>
      <div class="pose-meta">
        <strong>${tr(p.title)}</strong>
        <span>${p.tags.map((x) => '#' + x).join(' ')}</span>
      </div>
    </button>`).join('');
}

$('#chips').addEventListener('click', (e) => {
  const b = e.target.closest('.chip');
  if (!b) return;
  state.category = b.dataset.cat;
  renderLibrary();
});

$('#pose-grid').addEventListener('click', (e) => {
  const card = e.target.closest('.pose-card');
  if (!card) return;
  const pose = state.poses.find((p) => p.id === card.dataset.id);
  if (isLocked(pose)) { openSheet('#paywall'); return; }
  selectPose(pose);
  location.hash = '#camera';
});

function selectPose(pose) {
  state.pose = pose;
  prefs.set('poseId', pose?.id ?? null);
  coach.reset();
  $('#pose-name').textContent = pose ? tr(pose.title) : t('camera.noPose');
  $('#pose-chip-thumb').innerHTML = pose ? poseSVG(pose.joints) : '';
  if (pose && ['couple', 'group'].includes(pose.category)) toast(t('library.multiNote'));
  renderTips();
  renderLibrary();
}

function renderTips() {
  const p = state.pose;
  const list = (items) => items.map((x) => `<li>${tr(x)}</li>`).join('');
  $('#tips-title').textContent = p ? tr(p.title) : t('camera.noPose');
  $('#tips-thumb').innerHTML = p ? poseSVG(p.joints) : '';
  $('#tips-subject').innerHTML = p ? list(p.subjectTips) : '';
  $('#tips-photographer').innerHTML = p ? list(p.photographerTips) : '';
}

// ---------- 付费墙（占位） ----------
$('#paywall-demo').addEventListener('click', () => {
  state.isPro = true;
  prefs.set('pro', true);
  closeSheet('#paywall');
  renderLibrary();
  renderMe();
});

// ---------- 相机 + 实时指导 ----------
const video = $('#video');
const canvas = $('#overlay');
const camera = new Camera(video);
let detector = null;
let rafId = 0;
let lastVideoTime = -1;
let wantCamera = false;

/** 平滑分数和提示，避免闪烁 */
const coach = {
  score: null, hintKey: null, hintPart: null, pending: null, pendingSince: 0,
  matchedSince: 0, lastShot: 0, livePose: null, mirrored: false,
  reset() { Object.assign(this, { score: null, hintKey: null, hintPart: null, pending: null, matchedSince: 0, livePose: null }); },
  smoothPose(next) {
    if (!this.livePose) return (this.livePose = next);
    const out = {};
    for (const [j, p] of Object.entries(next)) {
      const prev = this.livePose[j];
      out[j] = prev ? { x: prev.x + (p.x - prev.x) * 0.55, y: prev.y + (p.y - prev.y) * 0.55 } : p;
    }
    return (this.livePose = out);
  },
  setHint(key, part, now) {
    if (key === this.hintKey) { this.pending = null; return; }
    // 新提示要持续 500ms 才替换，"完美"/"走进画面"立即生效
    const urgent = key === 'hint.perfect' || key === 'hint.stepIn' || !this.hintKey;
    if (this.pending !== key) { this.pending = key; this.pendingSince = now; }
    if (urgent || now - this.pendingSince > 500) {
      this.hintKey = key; this.hintPart = part; this.pending = null;
    }
  },
};

function sizeCanvas() {
  const r = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.round(r.width * dpr), h = Math.round(r.height * dpr);
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
}
new ResizeObserver(sizeCanvas).observe(canvas);

async function startCamera() {
  const err = Camera.check();
  if (err) { showStartError(t(err)); return; }
  $('#start-btn').disabled = true;
  try {
    await camera.start(prefs.get('facing', 'user'));
    $('#stage').classList.toggle('mirrored', camera.mirrored);
    $('#start-card').hidden = true;
    $('#stage').classList.add('live');
    prefs.set('cameraGranted', true);
    wantCamera = true;
    loop();
    ensureDetector();
  } catch (e) {
    console.error(e);
    showStartError(e.name === 'NotAllowedError' || e.name === 'SecurityError' ? t('camera.permission') : `${t('camera.unsupported')} (${e.name})`);
  } finally {
    $('#start-btn').disabled = false;
  }
}

function showStartError(msg) {
  $('#start-card').hidden = false;
  $('#start-error').textContent = msg;
  $('#start-error').hidden = false;
}

async function ensureDetector() {
  if (detector) return;
  $('#model-status').hidden = false;
  $('#model-status').textContent = t('camera.loadingModel');
  try {
    detector = await loadDetector();
    $('#model-status').hidden = true;
  } catch (e) {
    console.error(e);
    $('#model-status').textContent = t('camera.modelFailed');
    setTimeout(() => { $('#model-status').hidden = true; }, 4000);
  }
}

function pauseCamera() {
  wantCamera = false;
  cancelAnimationFrame(rafId);
  camera.stop();
}

function resumeCamera() {
  if (wantCamera || !$('#start-card').hidden) return;
  startCamera();
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) { if (camera.stream) { pauseCamera(); $('#stage').dataset.resume = '1'; } }
  else if ($('#stage').dataset.resume && !$('#view-camera').hidden) { delete $('#stage').dataset.resume; startCamera(); }
});

function loop() {
  cancelAnimationFrame(rafId);
  const tick = () => {
    if (!wantCamera) return;
    rafId = requestAnimationFrame(tick);
    if (!camera.ready) return;
    if (detector && video.currentTime !== lastVideoTime) {
      lastVideoTime = video.currentTime;
      let res;
      try { res = detector.detectForVideo(video, performance.now()); } catch (e) { console.warn(e); return; }
      update(res?.landmarks?.[0], performance.now());
    } else if (!detector) {
      update(null, performance.now());
    }
  };
  tick();
}

function update(landmarks, now) {
  const tpl = state.pose;
  let live = landmarks ? fromMediaPipe(landmarks, camera.toFrameMapper()) : null;
  const visible = live ? Object.keys(live).length : 0;
  if (live && visible >= 4) live = coach.smoothPose(live); else { coach.livePose = null; live = visible ? live : null; }

  let target = tpl?.joints ?? null;
  let result = null;

  if (!tpl) {
    coach.score = null;
    coach.setHint(detector ? 'hint.free' : null, null, now);
  } else if (!live || visible < 9) {
    coach.score = null;
    coach.matchedSince = 0;
    coach.setHint(detector ? 'hint.stepIn' : null, null, now);
  } else {
    result = match(live, tpl);
    if (result) {
      coach.score = coach.score == null ? result.score : coach.score + (result.score - coach.score) * 0.25;
      if (result.mirrored) target = mirrorPose(tpl.joints);
      const top = result.hints[0];
      if (coach.score >= MATCH_THRESHOLD) coach.setHint('hint.perfect', null, now);
      else if (top) coach.setHint(top.key, top.part, now);
      else coach.setHint('hint.almost', null, now);
    }
  }

  drawOverlay(canvas, target, live, { score: coach.score, hintPart: coach.hintKey?.startsWith('hint.perfect') ? null : coach.hintPart });
  renderCoach();
  maybeAutoShoot(now);
}

function renderCoach() {
  const s = coach.score;
  const ring = $('#score');
  ring.hidden = s == null;
  if (s != null) {
    const pct = Math.round(s * 100);
    ring.style.setProperty('--p', pct);
    ring.style.setProperty('--c', scoreColor(s));
    $('#score-num').textContent = pct;
  }
  const hint = $('#hint');
  const text = coach.hintKey ? t(coach.hintKey) : '';
  if (hint.textContent !== text) hint.textContent = text;
  hint.hidden = !text;
  hint.classList.toggle('ok', coach.hintKey === 'hint.perfect');
  $('#stage').classList.toggle('matched', coach.hintKey === 'hint.perfect');
}

function maybeAutoShoot(now) {
  if (!state.autoShot || !state.pose || shooting) return;
  if (coach.score != null && coach.score >= MATCH_THRESHOLD) {
    if (!coach.matchedSince) coach.matchedSince = now;
    if (now - coach.matchedSince > 1000 && now - coach.lastShot > 4000) shoot(0);
  } else coach.matchedSince = 0;
}

// ---------- 拍照 ----------
let shooting = false;
async function shoot(delay = state.timer) {
  if (!camera.ready || shooting) return;
  shooting = true;
  try {
    const cd = $('#countdown');
    for (let i = delay; i > 0; i--) {
      cd.textContent = i; cd.hidden = false;
      cd.classList.remove('pop'); void cd.offsetWidth; cd.classList.add('pop');
      await new Promise((r) => setTimeout(r, 1000));
    }
    cd.hidden = true;
    const blob = await camera.capture();
    const flash = $('#flash');
    flash.classList.remove('go'); void flash.offsetWidth; flash.classList.add('go');
    navigator.vibrate?.(30);
    await addPhoto(blob, state.pose?.id ?? null);
    coach.lastShot = performance.now();
    coach.matchedSince = 0;
    setThumb(blob);
    toast(t('camera.saved'));
  } catch (e) {
    console.error(e);
  } finally {
    shooting = false;
  }
}

let thumbUrl;
function setThumb(blob) {
  if (thumbUrl) URL.revokeObjectURL(thumbUrl);
  thumbUrl = blob ? URL.createObjectURL(blob) : '';
  $('#last-thumb').style.backgroundImage = thumbUrl ? `url(${thumbUrl})` : '';
}

$('#start-btn').addEventListener('click', startCamera);
$('#shutter').addEventListener('click', () => shoot());
$('#flip').addEventListener('click', async () => {
  if (!camera.stream) return;
  await camera.flip();
  prefs.set('facing', camera.facing);
  coach.reset();
  $('#stage').classList.toggle('mirrored', camera.mirrored);
});
$('#pose-chip').addEventListener('click', () => { location.hash = '#library'; });
$('#tips-btn').addEventListener('click', () => openSheet('#tips'));
$('#last-thumb').addEventListener('click', () => { location.hash = '#me'; });

function renderOptions() {
  $('#timer-btn').querySelector('b').textContent = state.timer ? `${state.timer}s` : 'off';
  $('#timer-btn').classList.toggle('on', !!state.timer);
  $('#auto-btn').classList.toggle('on', state.autoShot);
  $('#auto-btn').setAttribute('aria-pressed', state.autoShot);
}
$('#timer-btn').addEventListener('click', () => {
  state.timer = { 0: 3, 3: 10, 10: 0 }[state.timer] ?? 0;
  prefs.set('timer', state.timer);
  renderOptions();
});
$('#auto-btn').addEventListener('click', () => {
  state.autoShot = !state.autoShot;
  prefs.set('autoShot', state.autoShot);
  renderOptions();
});

// ---------- 我的 ----------
const photoUrls = new Map();
async function renderMe() {
  state.photos = await listPhotos().catch(() => []);
  for (const [id, url] of photoUrls) if (!state.photos.some((p) => p.id === id)) { URL.revokeObjectURL(url); photoUrls.delete(id); }
  const url = (p) => photoUrls.get(p.id) || (photoUrls.set(p.id, URL.createObjectURL(p.blob)), photoUrls.get(p.id));
  $('#photo-grid').innerHTML = state.photos.map((p) => `<button class="photo" data-id="${p.id}" style="background-image:url(${url(p)})" aria-label="photo"></button>`).join('');
  $('#photo-empty').hidden = state.photos.length > 0;
  $('#plan-value').textContent = state.isPro ? t('me.pro') : t('me.free');
  $('#upgrade-btn').hidden = state.isPro;
  $('#reset-pro').hidden = !state.isPro;
  $$('#lang-switch button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.lang === getLang()));
  $('#version').textContent = VERSION;
  renderInstall();
}

let viewing = null;
$('#photo-grid').addEventListener('click', (e) => {
  const b = e.target.closest('.photo');
  if (!b) return;
  viewing = state.photos.find((p) => p.id === b.dataset.id);
  $('#viewer-img').src = photoUrls.get(viewing.id);
  $('#viewer-share').hidden = !canShareFiles(viewing.blob);
  openSheet('#viewer');
});

const fileOf = (blob) => new File([blob], `posemate-${Date.now()}.jpg`, { type: blob.type || 'image/jpeg' });
const canShareFiles = (blob) => !!navigator.canShare?.({ files: [fileOf(blob)] });

$('#viewer-save').addEventListener('click', async () => {
  // iOS 上“存储图像”在分享面板里；其他平台直接下载
  if (/iP(hone|ad|od)/.test(navigator.userAgent) && canShareFiles(viewing.blob)) {
    try { await navigator.share({ files: [fileOf(viewing.blob)] }); } catch {}
    return;
  }
  const a = document.createElement('a');
  a.href = photoUrls.get(viewing.id);
  a.download = fileOf(viewing.blob).name;
  a.click();
});
$('#viewer-share').addEventListener('click', async () => {
  try { await navigator.share({ files: [fileOf(viewing.blob)], title: t('app.name') }); } catch {}
});
$('#viewer-delete').addEventListener('click', async () => {
  if (!confirm(t('photo.confirmDelete'))) return;
  await deletePhoto(viewing.id);
  closeSheet('#viewer');
  renderMe();
  const latest = (await listPhotos())[0];
  setThumb(latest?.blob);
});

$('#upgrade-btn').addEventListener('click', () => openSheet('#paywall'));
$('#reset-pro').addEventListener('click', () => { state.isPro = false; prefs.set('pro', false); renderMe(); renderLibrary(); });
$('#lang-switch').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) setLang(b.dataset.lang); });

// ---------- 安装 / 离线 / 更新 ----------
let installPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installPrompt = e; renderInstall(); });
window.addEventListener('appinstalled', () => { installPrompt = null; renderInstall(); });
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

function renderInstall() {
  const row = $('#install-row');
  const btn = $('#install-btn');
  const note = $('#install-note');
  if (isStandalone()) { row.hidden = false; btn.hidden = true; note.textContent = t('me.installed'); return; }
  if (installPrompt) { row.hidden = false; btn.hidden = false; note.textContent = ''; return; }
  if (isIOS) { row.hidden = false; btn.hidden = true; note.textContent = t('me.installIOS'); return; }
  row.hidden = true;
}
$('#install-btn').addEventListener('click', async () => {
  if (!installPrompt) return;
  installPrompt.prompt();
  await installPrompt.userChoice.catch(() => {});
  installPrompt = null;
  renderInstall();
});

let offlineTimer;
function renderOnline() {
  $('#offline').hidden = navigator.onLine;
  clearTimeout(offlineTimer);
  if (!navigator.onLine) offlineTimer = setTimeout(() => { $('#offline').hidden = true; }, 4000);
}
window.addEventListener('online', renderOnline);
window.addEventListener('offline', renderOnline);

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('./sw.js').then((reg) => {
    reg.addEventListener('updatefound', () => {
      const sw = reg.installing;
      sw?.addEventListener('statechange', () => {
        if (sw.state === 'installed' && navigator.serviceWorker.controller) $('#update').hidden = false;
      });
    });
  }).catch((e) => console.warn('SW registration failed', e));
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (!reloaded && updateRequested) { reloaded = true; location.reload(); } });
}
let updateRequested = false;
$('#update').addEventListener('click', async () => {
  updateRequested = true;
  const reg = await navigator.serviceWorker.getRegistration();
  if (reg?.waiting) reg.waiting.postMessage('skipWaiting'); else location.reload();
});

// ---------- 语言切换后刷新 ----------
function rerender() {
  applyI18n();
  renderLibrary();
  renderTips();
  renderOptions();
  $('#pose-name').textContent = state.pose ? tr(state.pose.title) : t('camera.noPose');
  if (!$('#view-me').hidden) renderMe();
  renderCoach();
}
onLangChange(rerender);

// ---------- 启动 ----------
(async function init() {
  document.documentElement.lang = getLang() === 'zh' ? 'zh-CN' : 'en';
  applyI18n();
  renderOptions();
  renderOnline();
  try {
    state.poses = await (await fetch('./poses.json')).json();
  } catch (e) {
    console.error('poses.json failed', e);
  }
  const saved = state.poses.find((p) => p.id === prefs.get('poseId', null));
  const first = (saved && !isLocked(saved) ? saved : null) ?? state.poses.find((p) => !isLocked(p)) ?? null;
  // ?pose=<id> 可直接指定姿势（方便从官网/分享链接跳进来）
  const qp = state.poses.find((p) => p.id === new URLSearchParams(location.search).get('pose'));
  selectPose(qp && !isLocked(qp) ? qp : first);
  listPhotos().then((ps) => setThumb(ps[0]?.blob)).catch(() => {});
  route();
  // 已授权过相机就自动开（iOS 每次仍可能弹窗；首次使用需要点按钮）
  if (prefs.get('cameraGranted', false) && navigator.permissions) {
    navigator.permissions.query({ name: 'camera' }).then((p) => {
      if (p.state === 'granted' && !$('#view-camera').hidden) startCamera();
    }).catch(() => {});
  }
  // 空闲时预加载模型，开相机时就不用等
  if (window.requestIdleCallback) requestIdleCallback(ensureDetectorQuiet, { timeout: 3000 });
  else setTimeout(ensureDetectorQuiet, 1500);
})();

function ensureDetectorQuiet() { if (!detector) loadDetector().then((d) => { detector = d; }).catch(() => {}); }

// 调试用：在控制台可访问
window.__pm = { state, coach, camera };
