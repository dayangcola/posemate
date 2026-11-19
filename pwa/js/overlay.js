import { BONES, BONE_PART, mirrorPose } from './matcher.js';

const GREEN = '#22c55e', YELLOW = '#facc15', ORANGE = '#fb923c', CORAL = '#ff5f6d';

export function scoreColor(score) {
  if (score == null) return YELLOW;
  return score >= 0.85 ? GREEN : score >= 0.6 ? YELLOW : ORANGE;
}

function headSize(pose, w, h) {
  // 头的大小按肩宽估算，没有肩膀就用固定比例
  const ls = pose.leftShoulder, rs = pose.rightShoulder;
  const shoulder = ls && rs ? Math.hypot((ls.x - rs.x) * w, (ls.y - rs.y) * h) : w * 0.16;
  return Math.max(10, shoulder * 0.42);
}

function strokeBones(ctx, pose, w, h, filter) {
  ctx.beginPath();
  for (const [a, b] of BONES) {
    const pa = pose[a], pb = pose[b];
    if (!pa || !pb || (filter && !filter(a, b))) continue;
    if (a === 'nose') { // 脖子只画到头的下沿，不穿过头部
      const r = headSize(pose, w, h);
      const hx = pa.x * w, hy = pa.y * h + r * 1.05, nx = pb.x * w, ny = pb.y * h;
      if (ny > hy) { ctx.moveTo(hx, hy); ctx.lineTo(nx, ny); }
      continue;
    }
    ctx.moveTo(pa.x * w, pa.y * h);
    ctx.lineTo(pb.x * w, pb.y * h);
  }
  ctx.stroke();
}

function strokeHead(ctx, pose, w, h, fill) {
  if (!pose.nose) return;
  const r = headSize(pose, w, h);
  ctx.beginPath();
  ctx.ellipse(pose.nose.x * w, pose.nose.y * h - r * 0.15, r, r * 1.2, 0, 0, Math.PI * 2);
  fill ? ctx.fill() : ctx.stroke();
}

/**
 * @param target  模板关节（已决定是否镜像）
 * @param live    实时关节
 * @param state   { score, hintPart }
 */
export function drawOverlay(canvas, target, live, state = {}) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const unit = w / 100;

  if (target) {
    // 1) 半透明“身体”：粗线条 + 头部，形成轮廓剪影
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = unit * 7;
    strokeBones(ctx, target, w, h);
    strokeHead(ctx, target, w, h, true);
    // 2) 白色虚线描边
    ctx.setLineDash([unit * 2.2, unit * 1.8]);
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = unit * 1.1;
    strokeBones(ctx, target, w, h);
    strokeHead(ctx, target, w, h, false);
    ctx.setLineDash([]);
  }

  if (live) {
    const color = scoreColor(state.score);
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = unit;
    ctx.strokeStyle = color;
    ctx.lineWidth = unit * 1.2;
    strokeBones(ctx, live, w, h, (a, b) => BONE_PART[`${a}-${b}`] !== state.hintPart);
    if (state.hintPart) {
      // 需要调整的那条肢体标红并加粗
      ctx.strokeStyle = CORAL;
      ctx.lineWidth = unit * 1.8;
      strokeBones(ctx, live, w, h, (a, b) => BONE_PART[`${a}-${b}`] === state.hintPart);
    }
    ctx.fillStyle = '#fff';
    for (const p of Object.values(live)) {
      ctx.beginPath();
      ctx.arc(p.x * w, p.y * h, unit * 0.9, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }
}

/** 姿势库缩略图：SVG 字符串 */
export function poseSVG(joints, { mirror = false } = {}) {
  const pose = mirror ? mirrorPose(joints) : joints;
  const W = 75, H = 100;
  const n = pose.nose;
  const seg = ([a, b]) => {
    if (a === 'nose') { const y = n.y * H + 5.4; return pose.neck.y * H > y ? `M${(n.x * W).toFixed(1)} ${y.toFixed(1)}L${(pose.neck.x * W).toFixed(1)} ${(pose.neck.y * H).toFixed(1)}` : ''; }
    return `M${(pose[a].x * W).toFixed(1)} ${(pose[a].y * H).toFixed(1)}L${(pose[b].x * W).toFixed(1)} ${(pose[b].y * H).toFixed(1)}`;
  };
  const lines = BONES.filter(([a, b]) => pose[a] && pose[b]).map(seg).join('');
  const head = n ? `<ellipse cx="${(n.x * W).toFixed(1)}" cy="${(n.y * H - 1).toFixed(1)}" rx="4.6" ry="5.4"/>` : '';
  return `<svg viewBox="0 0 ${W} ${H}" aria-hidden="true"><g class="body"><path d="${lines}"/>${head}</g><g class="line"><path d="${lines}"/>${head}</g></svg>`;
}
