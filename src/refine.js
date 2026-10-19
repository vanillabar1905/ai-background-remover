// Edge-aware mask refinement + edge-only colour decontamination. Pure JS (testable in Node).
import { SIZE } from './segment.js';
export const DEFAULTS = { tighten: 0.5, defringe: true, recover: true };
const WORK = 2048; // refinement works at <=2048px on the long side to bound memory (images up to this size are refined at native resolution)

function box(a, w, h, r) { // separable box blur, edge-clamped window mean
  const t = new Float32Array(w * h), o = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const b = y * w; let s = 0;
    for (let i = 0; i <= Math.min(r, w - 1); i++) s += a[b + i];
    for (let x = 0; x < w; x++) {
      t[b + x] = s / (Math.min(w - 1, x + r) - Math.max(0, x - r) + 1);
      if (x + 1 + r < w) s += a[b + x + 1 + r];
      if (x - r >= 0) s -= a[b + x - r];
    }
  }
  for (let x = 0; x < w; x++) {
    let s = 0;
    for (let i = 0; i <= Math.min(r, h - 1); i++) s += t[i * w + x];
    for (let y = 0; y < h; y++) {
      o[y * w + x] = s / (Math.min(h - 1, y + r) - Math.max(0, y - r) + 1);
      if (y + 1 + r < h) s += t[(y + 1 + r) * w + x];
      if (y - r >= 0) s -= t[(y - r) * w + x];
    }
  }
  return o;
}
const mul = (a, b) => a.map((v, i) => v * b[i]);

function axis(n, m) { // sampling table for bilinear n -> m (pixel-centre aligned)
  const i0 = new Int32Array(m), i1 = new Int32Array(m), t = new Float32Array(m);
  for (let k = 0; k < m; k++) { const f = Math.min(Math.max((k + 0.5) * n / m - 0.5, 0), n - 1); i0[k] = Math.floor(f); i1[k] = Math.min(i0[k] + 1, n - 1); t[k] = f - i0[k]; }
  return { i0, i1, t };
}
function resize(src, sw, sh, dw, dh) {
  if (sw === dw && sh === dh) return src;
  const X = axis(sw, dw), Y = axis(sh, dh), o = new Float32Array(dw * dh);
  for (let y = 0; y < dh; y++) for (let x = 0; x < dw; x++) {
    const a = src[Y.i0[y] * sw + X.i0[x]] * (1 - X.t[x]) + src[Y.i0[y] * sw + X.i1[x]] * X.t[x];
    const b = src[Y.i1[y] * sw + X.i0[x]] * (1 - X.t[x]) + src[Y.i1[y] * sw + X.i1[x]] * X.t[x];
    o[y * dw + x] = a * (1 - Y.t[y]) + b * Y.t[y];
  }
  return o;
}
function guided(I, p, w, h, r, eps) { // He et al. guided filter, grey guide
  const mI = box(I, w, h, r), mp = box(p, w, h, r), mIp = box(mul(I, p), w, h, r), mII = box(mul(I, I), w, h, r);
  const a = new Float32Array(w * h), b = new Float32Array(w * h);
  for (let i = 0; i < a.length; i++) { a[i] = (mIp[i] - mI[i] * mp[i]) / (mII[i] - mI[i] * mI[i] + eps); b[i] = mp[i] - a[i] * mI[i]; }
  const ma = box(a, w, h, r), mb = box(b, w, h, r), q = new Float32Array(w * h);
  for (let i = 0; i < q.length; i++) q[i] = Math.min(1, Math.max(0, ma[i] * I[i] + mb[i]));
  return q;
}
// Pixel-accurate alpha in a narrow band around the silhouette. The 320px model mask cannot place thin structures
// (hair strands, hinge, frame) precisely, so where the nearby background is clean and clearly different from the
// nearby foreground, alpha is estimated from the pixel's colour distance to the local background colour.
// Elsewhere (busy backgrounds, low colour separation) conf -> 0 and the model-based alpha is used unchanged.
function recover(ch, q, aBase, w, h, lo, hi) {
  const n = w * h, rb = Math.max(4, Math.round(Math.max(w, h) / 90)), R = 2 * rb;
  const nf = box(q, w, h, rb), nb = box(q.map((v) => 1 - v), w, h, rb);
  const wB = nf.map((v) => (v < 0.01 ? 1 : 0)), wF = q.map((v) => (v > 0.9 ? 1 : 0)); // clean-background / sure-foreground samples
  const dB = box(wB, w, h, R), dF = box(wF, w, h, R);
  const B = ch.map((c) => box(mul(c, wB), w, h, R)), F = ch.map((c) => box(mul(c, wF), w, h, R));
  const S2 = new Float32Array(n);
  ch.forEach((c) => box(mul(mul(c, c), wB), w, h, R).forEach((v, i) => { S2[i] += v; }));
  const e = new Float32Array(aBase), conf = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    if (dB[i] < 0.02 || dF[i] < 0.02) continue;
    let dI = 0, dFB = 0, vb = S2[i] / dB[i];
    for (let c = 0; c < 3; c++) { const b = B[c][i] / dB[i], f = F[c][i] / dF[i]; dI += (ch[c][i] - b) ** 2; dFB += (f - b) ** 2; vb -= b * b; }
    dFB = Math.sqrt(dFB);
    const cf = smooth(0.01, 0.05, Math.min(nf[i], nb[i])) * (1 - smooth(0.0008, 0.006, vb / 3)) * smooth(0.1, 0.25, dFB);
    if (cf <= 0) continue;
    conf[i] = cf; e[i] = Math.min(1, Math.max(0, (Math.sqrt(dI) - 0.04) / (0.6 * dFB)));
  }
  const eb = box(e, w, h, 1), out = new Float32Array(n); // 3x3 smoothing of the estimate only, not of the mask
  for (let i = 0; i < n; i++) out[i] = conf[i] > 0 ? aBase[i] * (1 - conf[i]) + smooth(lo, hi, eb[i]) * conf[i] : aBase[i];
  return out;
}
// Drop small disconnected islands of alpha (stray background fragments). Anything attached to the subject
// (hinges, hair, ears) is one connected component with the body and is never removed.
function despeckle(A, w, h, minArea) {
  const n = w * h, seen = new Uint8Array(n), q = new Int32Array(n);
  let tail = 0;
  for (let s0 = 0; s0 < n; s0++) {
    if (A[s0] <= 0.05 || seen[s0]) continue;
    const start = tail; q[tail++] = s0; seen[s0] = 1;
    for (let head = start; head < tail; head++) {
      const p = q[head], x = p % w, y = (p - x) / w;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const k = ny * w + nx;
        if (!seen[k] && A[k] > 0.05) { seen[k] = 1; q[tail++] = k; }
      }
    }
    if (tail - start < minArea) for (let k = start; k < tail; k++) A[q[k]] = 0;
  }
}
const smooth = (lo, hi, v) => { const t = Math.min(1, Math.max(0, (v - lo) / (hi - lo))); return t * t * (3 - 2 * t); };

// rgba: full-res source (not modified). mask: SIZE*SIZE 0..1. Returns new RGBA Uint8ClampedArray, same w×h.
export function refine(rgba, w, h, mask, opts = {}) {
  const { tighten, defringe, recover: rec } = { ...DEFAULTS, ...opts };
  const lo = 0.2 + 0.25 * tighten, hi = 0.65 + 0.2 * tighten; // narrow transition band; centre rises with "tighten"
  const s = Math.min(1, WORK / Math.max(w, h)), ww = Math.round(w * s), hh = Math.round(h * s);
  const ch = [0, 1, 2].map(() => new Float32Array(ww * hh));
  const X = axis(w, ww), Y = axis(h, hh);
  for (let y = 0; y < hh; y++) for (let x = 0; x < ww; x++) { // working-res colour (bilinear)
    const k = y * ww + x;
    for (let c = 0; c < 3; c++) {
      const g = (yy, xx) => rgba[(yy * w + xx) * 4 + c];
      const t = X.t[x], u = Y.t[y];
      ch[c][k] = ((g(Y.i0[y], X.i0[x]) * (1 - t) + g(Y.i0[y], X.i1[x]) * t) * (1 - u) + (g(Y.i1[y], X.i0[x]) * (1 - t) + g(Y.i1[y], X.i1[x]) * t) * u) / 255;
    }
  }
  const I = ch[0].map((v, i) => 0.299 * v + 0.587 * ch[1][i] + 0.114 * ch[2][i]);
  const q = guided(I, resize(mask, SIZE, SIZE, ww, hh), ww, hh, Math.max(2, Math.round(Math.max(ww, hh) / 200)), 1e-3);

  const aBase = q.map((v) => smooth(lo, hi, v)), A = rec ? recover(ch, q, aBase, ww, hh, lo, hi) : aBase;
  despeckle(A, ww, hh, Math.max(30, 1e-4 * ww * hh));
  let F = null; // local foreground colour: mean of colours weighted by alpha^4 (≈ only confident pixels)
  if (defringe) {
    const wt = A.map((v) => v * v * v * v), r = Math.max(3, Math.round(Math.max(ww, hh) / 250)), den = box(wt, ww, hh, r);
    F = ch.map((c) => { const n = box(mul(c, wt), ww, hh, r); return n.map((v, i) => (den[i] > 0.02 ? v / den[i] : c[i])); });
  }
  const out = new Uint8ClampedArray(rgba), Xf = axis(ww, w), Yf = axis(hh, h);
  const bil = (p, y, x) => {
    const a = p[Yf.i0[y] * ww + Xf.i0[x]] * (1 - Xf.t[x]) + p[Yf.i0[y] * ww + Xf.i1[x]] * Xf.t[x];
    const b = p[Yf.i1[y] * ww + Xf.i0[x]] * (1 - Xf.t[x]) + p[Yf.i1[y] * ww + Xf.i1[x]] * Xf.t[x];
    return a * (1 - Yf.t[y]) + b * Yf.t[y];
  };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4, a = bil(A, y, x);
    out[i + 3] = Math.round(a * 255);
    if (F && a < 0.98 && a > 0) { // edge pixels only: interior and fully-opaque pixels keep their original colour
      const k = Math.min(1, 2 * (1 - a));
      for (let c = 0; c < 3; c++) out[i + c] = rgba[i + c] + k * (bil(F[c], y, x) * 255 - rgba[i + c]);
    }
  }
  return out;
}
