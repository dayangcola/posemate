// 相机：getUserMedia + 3:4 取景框（object-fit: cover）坐标换算 + 拍照。
export const FRAME_ASPECT = 3 / 4; // 与 poses.json 模板画幅一致

export class Camera {
  constructor(video) {
    this.video = video;
    this.stream = null;
    this.facing = 'user';
  }

  get mirrored() { return this.facing === 'user'; }
  get ready() { return !!this.stream && this.video.videoWidth > 0; }

  static check() {
    if (!window.isSecureContext) return 'camera.insecure';
    if (!navigator.mediaDevices?.getUserMedia) return 'camera.unsupported';
    return null;
  }

  async start(facing = this.facing) {
    this.stop();
    this.facing = facing;
    const constraints = {
      audio: false,
      video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1920 } },
    };
    try {
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (e) {
      if (e.name === 'OverconstrainedError') {
        this.stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      } else throw e;
    }
    const track = this.stream.getVideoTracks()[0];
    const fm = track.getSettings?.().facingMode;
    if (fm === 'user' || fm === 'environment') this.facing = fm;
    this.video.srcObject = this.stream;
    this.video.muted = true;
    this.video.setAttribute('playsinline', '');
    await this.video.play();
    if (!this.video.videoWidth) await new Promise((r) => this.video.addEventListener('loadedmetadata', r, { once: true }));
  }

  stop() {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
  }

  flip() { return this.start(this.facing === 'user' ? 'environment' : 'user'); }

  /** cover 裁切：视频里 3:4 区域的 (sx, sy, sw, sh)，单位为视频像素 */
  cropRect() {
    const vw = this.video.videoWidth, vh = this.video.videoHeight;
    if (vw / vh > FRAME_ASPECT) {
      const sw = vh * FRAME_ASPECT;
      return { sx: (vw - sw) / 2, sy: 0, sw, sh: vh };
    }
    const sh = vw / FRAME_ASPECT;
    return { sx: 0, sy: (vh - sh) / 2, sw: vw, sh };
  }

  /** 视频归一化坐标 → 取景框归一化坐标（未镜像，与模板同一坐标系） */
  toFrameMapper() {
    const vw = this.video.videoWidth, vh = this.video.videoHeight;
    const { sx, sy, sw, sh } = this.cropRect();
    return (x, y) => ({ x: (x * vw - sx) / sw, y: (y * vh - sy) / sh });
  }

  /** 拍一张 3:4 照片；前置镜头按预览所见（镜像）保存 */
  capture(type = 'image/jpeg', quality = 0.92) {
    const { sx, sy, sw, sh } = this.cropRect();
    const scale = Math.min(1, 2400 / sh);
    const c = document.createElement('canvas');
    c.width = Math.round(sw * scale);
    c.height = Math.round(sh * scale);
    const ctx = c.getContext('2d');
    if (this.mirrored) { ctx.translate(c.width, 0); ctx.scale(-1, 1); }
    ctx.drawImage(this.video, sx, sy, sw, sh, 0, 0, c.width, c.height);
    return new Promise((resolve) => c.toBlob(resolve, type, quality));
  }
}
