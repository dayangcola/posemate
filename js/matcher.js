// 移植自 ios/Packages/PoseKit（PoseMatcher.swift / Joint.swift），逻辑保持一致。
// 坐标：归一化，原点左上角，x/y ∈ [0,1]，按 3:4 竖画幅。左右指被拍者自己的左右。

export const JOINTS = [
  'nose', 'neck',
  'leftShoulder', 'rightShoulder',
  'leftElbow', 'rightElbow',
  'leftWrist', 'rightWrist',
  'root',
  'leftHip', 'rightHip',
  'leftKnee', 'rightKnee',
  'leftAnkle', 'rightAnkle',
];

export const BONES = [
  ['nose', 'neck'],
  ['neck', 'leftShoulder'], ['neck', 'rightShoulder'],
  ['leftShoulder', 'leftElbow'], ['leftElbow', 'leftWrist'],
  ['rightShoulder', 'rightElbow'], ['rightElbow', 'rightWrist'],
  ['neck', 'root'],
  ['root', 'leftHip'], ['root', 'rightHip'],
  ['leftHip', 'leftKnee'], ['leftKnee', 'leftAnkle'],
  ['rightHip', 'rightKnee'], ['rightKnee', 'rightAnkle'],
];

/** 每根骨头属于哪个部位，用于把提示对应的肢体标红 */
export const BONE_PART = {
  'leftShoulder-leftElbow': 'leftArm', 'leftElbow-leftWrist': 'leftArm',
  'rightShoulder-rightElbow': 'rightArm', 'rightElbow-rightWrist': 'rightArm',
  'leftHip-leftKnee': 'leftLeg', 'leftKnee-leftAnkle': 'leftLeg',
  'rightHip-rightKnee': 'rightLeg', 'rightKnee-rightAnkle': 'rightLeg',
};

const spec = (name, a, vertex, b, tolerance, part, whenTooOpen, whenTooClosed) =>
  ({ name, a, vertex, b, tolerance, part, whenTooOpen, whenTooClosed });

export const DEFAULT_SPECS = [
  spec('leftElbow', 'leftShoulder', 'leftElbow', 'leftWrist', 45, 'leftArm', 'bendMore', 'straighten'),
  spec('rightElbow', 'rightShoulder', 'rightElbow', 'rightWrist', 45, 'rightArm', 'bendMore', 'straighten'),
  spec('leftShoulder', 'leftElbow', 'leftShoulder', 'leftHip', 40, 'leftArm', 'lower', 'raise'),
  spec('rightShoulder', 'rightElbow', 'rightShoulder', 'rightHip', 40, 'rightArm', 'lower', 'raise'),
  spec('leftHip', 'leftShoulder', 'leftHip', 'leftKnee', 35, 'leftLeg', 'raise', 'lower'),
  spec('rightHip', 'rightShoulder', 'rightHip', 'rightKnee', 35, 'rightLeg', 'raise', 'lower'),
  spec('leftKnee', 'leftHip', 'leftKnee', 'leftAnkle', 35, 'leftLeg', 'bendMore', 'straighten'),
  spec('rightKnee', 'rightHip', 'rightKnee', 'rightAnkle', 35, 'rightLeg', 'bendMore', 'straighten'),
];

export const MATCH_THRESHOLD = 0.85;

export function swappedSide(joint) {
  if (joint.startsWith('left')) return 'right' + joint.slice(4);
  if (joint.startsWith('right')) return 'left' + joint.slice(5);
  return joint;
}

/** 左右镜像：坐标翻转，同时交换左/右关节名 */
export function mirrorPose(pose) {
  const out = {};
  for (const [j, p] of Object.entries(pose)) out[swappedSide(j)] = { x: 1 - p.x, y: p.y };
  return out;
}

/** a-vertex-b 的夹角，0...180 度；退化时返回 null */
export function angle(a, v, b) {
  const v1x = a.x - v.x, v1y = a.y - v.y, v2x = b.x - v.x, v2y = b.y - v.y;
  const n1 = Math.hypot(v1x, v1y), n2 = Math.hypot(v2x, v2y);
  if (n1 <= 1e-6 || n2 <= 1e-6) return null;
  const cos = Math.max(-1, Math.min(1, (v1x * v2x + v1y * v2y) / (n1 * n2)));
  return (Math.acos(cos) * 180) / Math.PI;
}

function specAngle(s, pose) {
  const a = pose[s.a], v = pose[s.vertex], b = pose[s.b];
  if (!a || !v || !b) return null;
  return angle(a, v, b);
}

function compare(live, target, mirrored, specs) {
  const scores = [];
  const deviations = {};
  const hints = [];
  for (const s of specs) {
    const l = specAngle(s, live), t = specAngle(s, target);
    if (l == null || t == null) continue;
    const diff = l - t;
    deviations[s.name] = diff;
    scores.push(Math.max(0, 1 - Math.abs(diff) / s.tolerance));
    if (Math.abs(diff) > s.tolerance * 0.4) {
      const action = diff > 0 ? s.whenTooOpen : s.whenTooClosed;
      hints.push({
        severity: Math.abs(diff) / s.tolerance,
        part: s.part, action, degrees: Math.round(Math.abs(diff)),
        key: `hint.${s.part}.${action}`,
      });
    }
  }
  if (!scores.length) return null;
  const score = scores.reduce((x, y) => x + y, 0) / scores.length;
  hints.sort((x, y) => y.severity - x.severity);
  return { score, deviations, hints, mirrored, isMatched: score >= MATCH_THRESHOLD, compared: scores.length };
}

/** 比较实时骨架与模板。只用两边都有的关节；一个角度都算不出时返回 null。 */
export function match(live, template, specs = DEFAULT_SPECS) {
  const target = template.joints;
  const direct = compare(live, target, false, specs);
  if (!template.allowMirror) return direct;
  // 注意：只露出一侧肢体时，直接比较可能完全没有重叠，镜像比较却有——两边都要算
  const flipped = compare(live, mirrorPose(target), true, specs);
  if (!direct || !flipped) return direct || flipped;
  return flipped.score > direct.score ? flipped : direct;
}

// MediaPipe Pose 33 点 → 15 个关节（neck/root 取中点，与 Apple Vision 对齐）
const MP = {
  nose: 0, leftShoulder: 11, rightShoulder: 12, leftElbow: 13, rightElbow: 14,
  leftWrist: 15, rightWrist: 16, leftHip: 23, rightHip: 24,
  leftKnee: 25, rightKnee: 26, leftAnkle: 27, rightAnkle: 28,
};

/**
 * @param landmarks MediaPipe normalizedLandmarks（相对视频原始画面）
 * @param toFrame   (x,y) => {x,y}，视频坐标 → 3:4 取景框坐标
 * @param minVisibility 低于此置信度的关节视为缺失
 */
export function fromMediaPipe(landmarks, toFrame, minVisibility = 0.5) {
  const pose = {};
  for (const [joint, i] of Object.entries(MP)) {
    const lm = landmarks[i];
    if (!lm || (lm.visibility ?? 1) < minVisibility) continue;
    pose[joint] = toFrame(lm.x, lm.y);
  }
  const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  if (pose.leftShoulder && pose.rightShoulder) pose.neck = mid(pose.leftShoulder, pose.rightShoulder);
  if (pose.leftHip && pose.rightHip) pose.root = mid(pose.leftHip, pose.rightHip);
  return pose;
}
