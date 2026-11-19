// 对应 ios/Packages/PoseKit/Tests/PoseKitTests/PoseMatcherTests.swift
// 运行：node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { angle, match, mirrorPose, fromMediaPipe } from '../js/matcher.js';

const template = (joints, allowMirror = false) => ({ id: 't', allowMirror, joints });

const straightArm = {
  rightShoulder: { x: 0.4, y: 0.3 },
  rightElbow: { x: 0.4, y: 0.45 },
  rightWrist: { x: 0.4, y: 0.6 },
  rightHip: { x: 0.42, y: 0.6 },
};

test('right angle', () => {
  assert.ok(Math.abs(angle({ x: 1, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 1 }) - 90) < 0.001);
});

test('identical pose scores one', () => {
  const r = match(straightArm, template(straightArm));
  assert.ok(Math.abs(r.score - 1) < 1e-4);
  assert.equal(r.hints.length, 0);
  assert.ok(r.isMatched);
});

test('bent arm produces straighten hint', () => {
  const bent = { ...straightArm, rightWrist: { x: 0.55, y: 0.45 } };
  const r = match(bent, template(straightArm));
  assert.ok(r.score < 0.85);
  assert.equal(r.hints[0].part, 'rightArm');
  assert.equal(r.hints[0].action, 'straighten');
  assert.equal(r.hints[0].key, 'hint.rightArm.straighten');
});

test('mirrored pose matches when allowed', () => {
  const r = match(mirrorPose(straightArm), template(straightArm, true));
  assert.ok(r.mirrored);
  assert.ok(Math.abs(r.score - 1) < 1e-4);
});

test('no overlap returns null', () => {
  assert.equal(match({ nose: { x: 0.5, y: 0.1 } }, template(straightArm)), null);
});

test('every bundled pose matches itself perfectly', () => {
  const poses = JSON.parse(readFileSync(new URL('../poses.json', import.meta.url)));
  assert.ok(poses.length >= 8);
  for (const p of poses) {
    const r = match(p.joints, p);
    assert.ok(r && Math.abs(r.score - 1) < 1e-4, p.id);
  }
});

test('MediaPipe landmarks map to joints with derived neck/root', () => {
  const lms = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 0.9 }));
  lms[11] = { x: 0.6, y: 0.3, visibility: 0.9 };
  lms[12] = { x: 0.4, y: 0.3, visibility: 0.9 };
  lms[27] = { x: 0.5, y: 0.9, visibility: 0.1 }; // 看不见的左脚踝
  const pose = fromMediaPipe(lms, (x, y) => ({ x, y }));
  assert.deepEqual(pose.neck, { x: 0.5, y: 0.3 });
  assert.equal(pose.leftAnkle, undefined);
  assert.ok(pose.root);
});
