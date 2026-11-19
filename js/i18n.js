// 中文优先，英文备选。提示里的左右指被拍者自己的左右。
const STRINGS = {
  zh: {
    'app.name': '姿势搭子',
    'tab.camera': '拍照', 'tab.library': '姿势库', 'tab.me': '我的',
    'camera.start': '开启相机',
    'camera.startLead': '跟着轮廓摆姿势，对上了就会变绿。',
    'camera.privacy': '画面只在你的手机上处理，不会上传。',
    'camera.permission': '没拿到相机权限。请在浏览器设置里允许使用相机后再试。',
    'camera.insecure': '相机需要 HTTPS 才能使用（本地调试可用 localhost）。',
    'camera.unsupported': '这个浏览器不支持相机，请用 Safari 或 Chrome 打开。',
    'camera.loadingModel': '正在加载姿势识别模型…',
    'camera.modelFailed': '姿势识别加载失败，仍可正常拍照。',
    'camera.flip': '切换镜头', 'camera.timer': '倒计时', 'camera.auto': '对上自动拍',
    'camera.tips': '小贴士', 'camera.pick': '换姿势', 'camera.noPose': '自由拍',
    'camera.saved': '已保存到“我的”',
    'hint.stepIn': '走进画面，全身入镜',
    'hint.almost': '很接近了，保持住',
    'hint.perfect': '完美！按快门',
    'hint.free': '自由模式：没有目标姿势',
    'hint.leftArm.bendMore': '左臂再弯一点', 'hint.leftArm.straighten': '左臂伸直一点',
    'hint.leftArm.raise': '左臂抬高一点', 'hint.leftArm.lower': '左臂放低一点',
    'hint.rightArm.bendMore': '右臂再弯一点', 'hint.rightArm.straighten': '右臂伸直一点',
    'hint.rightArm.raise': '右臂抬高一点', 'hint.rightArm.lower': '右臂放低一点',
    'hint.leftLeg.bendMore': '左腿再弯一点', 'hint.leftLeg.straighten': '左腿伸直一点',
    'hint.leftLeg.raise': '左腿抬高一点', 'hint.leftLeg.lower': '左腿放低一点',
    'hint.rightLeg.bendMore': '右腿再弯一点', 'hint.rightLeg.straighten': '右腿伸直一点',
    'hint.rightLeg.raise': '右腿抬高一点', 'hint.rightLeg.lower': '右腿放低一点',
    'tips.subject': '给被拍的人', 'tips.photographer': '给拍照的人', 'tips.coach': 'AI 教练（即将上线）',
    'tips.coachBody': '上线后会根据当前画面给出光线、构图和表情建议。',
    'category.all': '全部', 'category.female': '女生', 'category.male': '男生',
    'category.couple': '情侣', 'category.group': '多人', 'category.sitting': '坐姿', 'category.travel': '旅行',
    'library.title': '姿势库', 'library.use': '用这个姿势', 'library.pro': 'Pro',
    'library.multiNote': '多人姿势目前只识别画面里的一个人',
    'paywall.title': '解锁姿势搭子 Pro',
    'paywall.benefit.library': '全部姿势，每周上新',
    'paywall.benefit.coach': 'AI 教练：光线、构图、表情建议',
    'paywall.benefit.group': '情侣和多人姿势',
    'paywall.soon': '网页版订阅即将开放',
    'paywall.demo': '先免费体验（演示）',
    'paywall.close': '以后再说',
    'me.title': '我的', 'me.photos': '我的照片', 'me.empty': '还没有照片，去拍第一张吧',
    'me.plan': '当前方案', 'me.pro': 'Pro（演示）', 'me.free': '免费版', 'me.upgrade': '升级 Pro',
    'me.language': '语言 / Language', 'me.install': '添加到主屏幕',
    'me.installIOS': '在 Safari 点“分享” → “添加到主屏幕”，就能像 App 一样全屏使用。',
    'me.installed': '已安装', 'me.privacy': '隐私说明', 'me.version': '版本',
    'me.resetPro': '退出演示 Pro',
    'photo.save': '保存到相册', 'photo.share': '分享', 'photo.delete': '删除', 'photo.close': '关闭',
    'photo.confirmDelete': '确定删除这张照片？',
    'offline': '当前离线，已缓存的功能仍可使用',
    'update': '有新版本，点此刷新',
  },
  en: {
    'app.name': 'PoseMate',
    'tab.camera': 'Camera', 'tab.library': 'Poses', 'tab.me': 'Me',
    'camera.start': 'Turn on camera',
    'camera.startLead': 'Follow the outline. It turns green when you nail it.',
    'camera.privacy': 'Video is processed on your phone and never uploaded.',
    'camera.permission': 'Camera access was denied. Allow it in your browser settings and try again.',
    'camera.insecure': 'The camera needs HTTPS (or localhost for local testing).',
    'camera.unsupported': 'This browser has no camera support. Try Safari or Chrome.',
    'camera.loadingModel': 'Loading pose detection…',
    'camera.modelFailed': 'Pose detection failed to load. You can still take photos.',
    'camera.flip': 'Flip', 'camera.timer': 'Timer', 'camera.auto': 'Auto shot',
    'camera.tips': 'Tips', 'camera.pick': 'Change', 'camera.noPose': 'Free shot',
    'camera.saved': 'Saved to Me',
    'hint.stepIn': 'Step back so your whole body is in frame',
    'hint.almost': 'Almost there, hold it',
    'hint.perfect': 'Perfect! Take the shot',
    'hint.free': 'Free mode: no target pose',
    'hint.leftArm.bendMore': 'Bend your left arm more', 'hint.leftArm.straighten': 'Straighten your left arm',
    'hint.leftArm.raise': 'Raise your left arm', 'hint.leftArm.lower': 'Lower your left arm',
    'hint.rightArm.bendMore': 'Bend your right arm more', 'hint.rightArm.straighten': 'Straighten your right arm',
    'hint.rightArm.raise': 'Raise your right arm', 'hint.rightArm.lower': 'Lower your right arm',
    'hint.leftLeg.bendMore': 'Bend your left leg more', 'hint.leftLeg.straighten': 'Straighten your left leg',
    'hint.leftLeg.raise': 'Lift your left leg', 'hint.leftLeg.lower': 'Lower your left leg',
    'hint.rightLeg.bendMore': 'Bend your right leg more', 'hint.rightLeg.straighten': 'Straighten your right leg',
    'hint.rightLeg.raise': 'Lift your right leg', 'hint.rightLeg.lower': 'Lower your right leg',
    'tips.subject': 'For the subject', 'tips.photographer': 'For the photographer', 'tips.coach': 'AI coach (coming soon)',
    'tips.coachBody': 'It will suggest lighting, framing and expression based on the live view.',
    'category.all': 'All', 'category.female': 'Women', 'category.male': 'Men',
    'category.couple': 'Couples', 'category.group': 'Groups', 'category.sitting': 'Sitting', 'category.travel': 'Travel',
    'library.title': 'Poses', 'library.use': 'Use this pose', 'library.pro': 'Pro',
    'library.multiNote': 'Group poses currently track one person',
    'paywall.title': 'Unlock PoseMate Pro',
    'paywall.benefit.library': 'Every pose, new ones weekly',
    'paywall.benefit.coach': 'AI coach: lighting, framing, expression',
    'paywall.benefit.group': 'Couple and group poses',
    'paywall.soon': 'Web subscriptions are coming soon',
    'paywall.demo': 'Try it free (demo)',
    'paywall.close': 'Not now',
    'me.title': 'Me', 'me.photos': 'My photos', 'me.empty': 'No photos yet. Go take your first one.',
    'me.plan': 'Plan', 'me.pro': 'Pro (demo)', 'me.free': 'Free', 'me.upgrade': 'Upgrade',
    'me.language': 'Language / 语言', 'me.install': 'Add to Home Screen',
    'me.installIOS': 'In Safari, tap Share → Add to Home Screen to use it full screen like an app.',
    'me.installed': 'Installed', 'me.privacy': 'Privacy', 'me.version': 'Version',
    'me.resetPro': 'Leave Pro demo',
    'photo.save': 'Save', 'photo.share': 'Share', 'photo.delete': 'Delete', 'photo.close': 'Close',
    'photo.confirmDelete': 'Delete this photo?',
    'offline': 'You are offline. Cached features still work.',
    'update': 'New version available. Tap to refresh.',
  },
};

const KEY = 'pm.lang';
let lang = (() => {
  try { const v = localStorage.getItem(KEY); if (v === 'zh' || v === 'en') return v; } catch {}
  const nav = (navigator.languages?.[0] || navigator.language || 'zh').toLowerCase();
  // 中文优先：只有明确是非中文浏览器才默认英文
  return nav.startsWith('zh') || !nav ? 'zh' : (nav.startsWith('en') ? 'en' : 'zh');
})();

const listeners = new Set();

export const getLang = () => lang;
export function setLang(next) {
  lang = next;
  try { localStorage.setItem(KEY, next); } catch {}
  document.documentElement.lang = next === 'zh' ? 'zh-CN' : 'en';
  listeners.forEach((fn) => fn(next));
}
export const onLangChange = (fn) => listeners.add(fn);

export function t(key) {
  return STRINGS[lang][key] ?? STRINGS.zh[key] ?? key;
}

/** poses.json 里的 {zh,en} */
export const tr = (text) => (text ? text[lang] || text.zh || text.en : '');

/** 刷新所有 [data-i18n] 元素 */
export function applyI18n(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  root.querySelectorAll('[data-i18n-label]').forEach((el) => {
    el.setAttribute('aria-label', t(el.dataset.i18nLabel));
    el.title = t(el.dataset.i18nLabel);
  });
}
