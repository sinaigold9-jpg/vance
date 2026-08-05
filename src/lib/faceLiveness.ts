// Lightweight, dependency-free liveness + quality helpers for account verification.
// All processing happens on-device using canvas pixel analysis.

export interface FrameStats {
  brightness: number;      // 0..255 average luma
  sharpness: number;       // Laplacian variance
  leftLuma: number;
  rightLuma: number;
  upperLuma: number;
  data: Uint8ClampedArray; // downsampled grayscale (GRID x GRID)
  rMean: number;
  gMean: number;
  bMean: number;
  saturation: number;      // mean chroma spread 0..255
  skinRatio: number;       // 0..1 fraction of skin-like pixels in the centre
  borderContrast: number;  // bright rectangular frame cue (phone-screen replay)
  eyeBandContrast: number; // horizontal contrast in the eye band (glasses cue)
  mouthVariance: number;   // texture in the lower face (mask cue)
}

export const GRID = 32;

const toGray = (d: Uint8ClampedArray, i: number) =>
  0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];

export const analyzeFrame = (
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
): FrameStats | null => {
  const w = video.videoWidth;
  const h = video.videoHeight;
  if (!w || !h) return null;
  canvas.width = GRID;
  canvas.height = GRID;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  // center square crop (approximate face region)
  const size = Math.min(w, h) * 0.75;
  ctx.drawImage(video, (w - size) / 2, (h - size) / 2 - h * 0.03, size, size, 0, 0, GRID, GRID);
  const img = ctx.getImageData(0, 0, GRID, GRID);
  const d = img.data;

  const gray = new Uint8ClampedArray(GRID * GRID);
  let sum = 0;
  let rSum = 0, gSum = 0, bSum = 0, satSum = 0;
  let skin = 0, centre = 0;
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    const r = d[i], g0 = d[i + 1], b = d[i + 2];
    const g = toGray(d, i);
    gray[p] = g;
    sum += g;
    rSum += r; gSum += g0; bSum += b;
    satSum += Math.max(r, g0, b) - Math.min(r, g0, b);
    const x = p % GRID, y = (p / GRID) | 0;
    if (x > GRID * 0.2 && x < GRID * 0.8 && y > GRID * 0.15 && y < GRID * 0.85) {
      centre++;
      if (r > 70 && r > g0 && g0 > b && r - g0 > 10 && r - b > 18) skin++;
    }
  }
  const brightness = sum / gray.length;
  const px = gray.length;

  // Laplacian variance = sharpness / focus
  let lapSum = 0;
  let lapSq = 0;
  let n = 0;
  for (let y = 1; y < GRID - 1; y++) {
    for (let x = 1; x < GRID - 1; x++) {
      const i = y * GRID + x;
      const lap =
        4 * gray[i] - gray[i - 1] - gray[i + 1] - gray[i - GRID] - gray[i + GRID];
      lapSum += lap;
      lapSq += lap * lap;
      n++;
    }
  }
  const mean = lapSum / n;
  const sharpness = lapSq / n - mean * mean;

  let left = 0, right = 0, upper = 0;
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      const v = gray[y * GRID + x];
      if (x < GRID / 2) left += v; else right += v;
      if (y < GRID / 2) upper += v;
    }
  }
  const half = (GRID * GRID) / 2;

  // outer ring vs inner region — a phone/monitor replay usually shows a bezel frame
  let ring = 0, ringN = 0, inner = 0, innerN = 0;
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      const v = gray[y * GRID + x];
      const edge = x < 3 || y < 3 || x >= GRID - 3 || y >= GRID - 3;
      if (edge) { ring += v; ringN++; } else { inner += v; innerN++; }
    }
  }
  const borderContrast = Math.abs(ring / ringN - inner / innerN);

  // eye band (upper third) row contrast — glasses create a strong dark horizontal band
  const rowMeans: number[] = [];
  for (let y = Math.round(GRID * 0.25); y < Math.round(GRID * 0.5); y++) {
    let s2 = 0;
    for (let x = 0; x < GRID; x++) s2 += gray[y * GRID + x];
    rowMeans.push(s2 / GRID);
  }
  const rowAvg = rowMeans.reduce((a, b) => a + b, 0) / rowMeans.length;
  const eyeBandContrast = Math.max(...rowMeans.map((m) => Math.abs(m - rowAvg)));

  // lower face texture — a mask flattens it
  let mSum = 0, mSq = 0, mN = 0;
  for (let y = Math.round(GRID * 0.6); y < Math.round(GRID * 0.92); y++) {
    for (let x = Math.round(GRID * 0.25); x < Math.round(GRID * 0.75); x++) {
      const v = gray[y * GRID + x];
      mSum += v; mSq += v * v; mN++;
    }
  }
  const mouthVariance = mSq / mN - (mSum / mN) ** 2;

  return {
    brightness,
    sharpness,
    leftLuma: left / half,
    rightLuma: right / half,
    upperLuma: upper / half,
    data: gray,
    rMean: rSum / px,
    gMean: gSum / px,
    bMean: bSum / px,
    saturation: satSum / px,
    skinRatio: centre ? skin / centre : 0,
    borderContrast,
    eyeBandContrast,
    mouthVariance,
  };
};

export const frameDiff = (a: Uint8ClampedArray, b: Uint8ClampedArray) => {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]);
  return s / a.length;
};

/** Quality score 0..100 based on lighting, focus and stability. */
export const qualityScore = (s: FrameStats, motion: number) => {
  const light =
    s.brightness < 45 || s.brightness > 225
      ? 0
      : 100 - Math.abs(s.brightness - 135) / 1.1;
  const focus = Math.max(0, Math.min(100, (s.sharpness / 220) * 100));
  const stability = Math.max(0, 100 - motion * 4);
  return Math.round(light * 0.35 + focus * 0.4 + stability * 0.25);
};

export interface FaceIssue { code: string; message: string }

/**
 * Presentation-attack + occlusion heuristics.
 * Returns the blocking issue (if any) for the current frame.
 */
export const inspectFace = (s: FrameStats, motion: number): FaceIssue | null => {
  if (s.brightness < 55) return { code: "dark", message: "الإضاءة ضعيفة، اتجه لمكان أكثر إضاءة" };
  if (s.brightness > 225) return { code: "bright", message: "الإضاءة قوية جداً، ابتعد عن مصدر الضوء" };
  if (s.sharpness < 25) return { code: "blur", message: "الصورة غير واضحة، ثبّت الكاميرا" };
  if (s.skinRatio < 0.12) return { code: "noface", message: "ضع وجهك بالكامل داخل الدائرة" };
  if (s.saturation < 14) return { code: "screen", message: "لا يُسمح بتصوير صورة أو شاشة، استخدم وجهك مباشرة" };
  if (s.borderContrast > 62) return { code: "screen", message: "تم رصد إطار شاشة/صورة مطبوعة، استخدم وجهك مباشرة" };
  if (motion < 0.25) return { code: "static", message: "صورة ثابتة تماماً، تأكد أنك أمام الكاميرا مباشرة" };
  if (s.eyeBandContrast > 46) return { code: "glasses", message: "من فضلك أزل النظارة واكشف عينيك" };
  if (s.mouthVariance < 28) return { code: "mask", message: "أزل الكمامة أو أي شيء يغطي وجهك" };
  return null;
};

/** Perceptual average-hash of the captured face, used only to detect the same face reused across accounts. */
export const faceSignature = (gray: Uint8ClampedArray) => {
  const step = GRID / 16;
  const cells: number[] = [];
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      let sum = 0, c = 0;
      for (let dy = 0; dy < step; dy++) {
        for (let dx = 0; dx < step; dx++) {
          sum += gray[(y * step + dy) * GRID + (x * step + dx)];
          c++;
        }
      }
      cells.push(sum / c);
    }
  }
  const avg = cells.reduce((a, b) => a + b, 0) / cells.length;
  let hex = "";
  for (let i = 0; i < cells.length; i += 4) {
    let nib = 0;
    for (let j = 0; j < 4; j++) if (cells[i + j] > avg) nib |= 1 << j;
    hex += nib.toString(16);
  }
  return hex;
};

export interface DetectedFaces { count: number; supported: boolean }

export const detectFaces = async (video: HTMLVideoElement): Promise<DetectedFaces> => {
  const FD = (window as unknown as { FaceDetector?: new (o?: unknown) => { detect: (s: unknown) => Promise<unknown[]> } }).FaceDetector;
  if (!FD) return { count: 1, supported: false };
  try {
    const det = new FD({ fastMode: true, maxDetectedFaces: 5 });
    const faces = await det.detect(video);
    return { count: faces.length, supported: true };
  } catch {
    return { count: 1, supported: false };
  }
};

export const captureJpeg = (video: HTMLVideoElement, maxSide = 720): Promise<Blob | null> => {
  const w = video.videoWidth, h = video.videoHeight;
  const scale = Math.min(1, maxSide / Math.max(w, h));
  const c = document.createElement("canvas");
  c.width = Math.round(w * scale);
  c.height = Math.round(h * scale);
  const ctx = c.getContext("2d");
  if (!ctx) return Promise.resolve(null);
  ctx.drawImage(video, 0, 0, c.width, c.height);
  return new Promise((res) => c.toBlob((b) => res(b), "image/jpeg", 0.9));
};
