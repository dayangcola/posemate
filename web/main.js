// 简单的中英切换：中文写在 HTML 里，英文放这里。加新文案时两边都要加。
const EN = {
  "nav.features": "Features", "nav.pricing": "Pricing", "nav.faq": "FAQ",
  "hero.eyebrow": "Real-time AI pose coach",
  "hero.title": "Never ask<br>“what do I do with my hands?” again",
  "hero.lead": "Open the camera and follow the outline. PoseMate tracks your body on-device, tells you exactly what to adjust, and lets you know when it's time to shoot.",
  "hero.email": "Your email", "hero.cta": "Join the beta",
  "hero.fine": "Coming soon to iOS · The free plan is genuinely useful",
  "hero.bubble": "Open your left elbow a bit",
  "features.title": "Why PoseMate",
  "f1.t": "Live correction", "f1.d": "Tracks body keypoints dozens of times per second and compares every joint with the target pose.",
  "f2.t": "Nothing uploaded", "f2.d": "Pose detection runs entirely on your phone. Your camera feed never leaves the device.",
  "f3.t": "Poses for guys too", "f3.d": "Dedicated libraries for men, couples and friend groups, not just solo poses.",
  "f4.t": "Coaches the photographer", "f4.d": "Camera height, framing and burst timing, so whoever holds the phone gets the shot.",
  "f5.t": "AI coach", "f5.d": "After a shot, get tips on lighting, framing and expression.",
  "f6.t": "A free plan that works", "f6.d": "The core library and live correction are free forever. No paywall before you try.",
  "how.title": "Great photos in three steps",
  "how.1t": "Pick a pose", "how.1d": "Browse by scene, group size and style",
  "how.2t": "Match the outline", "how.2d": "On-screen hints tell you what to adjust",
  "how.3t": "Green means shoot", "how.3d": "We'll tell you the moment it lines up",
  "pricing.title": "Pricing",
  "plan.free": "Free", "plan.free.1": "Core pose library", "plan.free.2": "Unlimited live correction", "plan.free.3": "Photographer tips",
  "plan.pro.per": " / month (TBD)", "plan.pro.1": "Full library, new poses weekly", "plan.pro.2": "Couple & group poses", "plan.pro.3": "AI coach",
  "faq.title": "FAQ",
  "q1": "Which devices are supported?", "a1": "iPhone on iOS 17 or later at launch. Android is on the roadmap.",
  "q2": "Are my photos uploaded?", "a2": "Live detection happens on your phone. Only when you ask the AI coach is that single photo sent, encrypted, for analysis, and it isn't stored.",
  "q3": "Can I cancel anytime?", "a3": "Yes, from Settings › Apple ID › Subscriptions on your iPhone.",
  "footer.privacy": "Privacy", "footer.contact": "Contact",
  "waitlist.ok": "Thanks! We'll email you when the beta opens.",
};

const nodes = [...document.querySelectorAll("[data-i18n]")];
const zh = new Map(nodes.map((n) => [n, n.innerHTML]));
const phNodes = [...document.querySelectorAll("[data-i18n-placeholder]")];
const zhPh = new Map(phNodes.map((n) => [n, n.placeholder]));
const toggle = document.getElementById("langToggle");

function setLang(lang) {
  const en = lang === "en";
  nodes.forEach((n) => { const v = EN[n.dataset.i18n]; n.innerHTML = en && v ? v : zh.get(n); });
  phNodes.forEach((n) => { const v = EN[n.dataset.i18nPlaceholder]; n.placeholder = en && v ? v : zhPh.get(n); });
  document.documentElement.lang = en ? "en" : "zh-CN";
  toggle.textContent = en ? "中文" : "EN";
  try { localStorage.setItem("lang", lang); } catch {}
}

let lang = "zh";
try { lang = localStorage.getItem("lang") || (navigator.language.startsWith("zh") ? "zh" : "en"); } catch {}
setLang(lang);
toggle.addEventListener("click", () => { lang = lang === "en" ? "zh" : "en"; setLang(lang); });

document.getElementById("year").textContent = new Date().getFullYear();

// TODO: 接入真实的候补名单（Supabase 表 / Formspree / 飞书表单等）
document.getElementById("waitlist").addEventListener("submit", (e) => {
  e.preventDefault();
  const msg = document.getElementById("waitlistMsg");
  msg.textContent = lang === "en" ? EN["waitlist.ok"] : "收到！内测开放时会发邮件通知你。";
  e.target.reset();
});
