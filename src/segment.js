// Pure pre/post-processing for U2-Netp (no browser APIs, so it is unit-testable in Node).
export const SIZE = 320;
const MEAN = [0.485, 0.456, 0.406], STD = [0.229, 0.224, 0.225];

// rgba: SIZE*SIZE*4 bytes -> Float32 NCHW, divided by max pixel, ImageNet-normalised (as the model was trained).
export function toInput(rgba) {
  const n = SIZE * SIZE, out = new Float32Array(3 * n);
  let max = 1e-6;
  for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) max = Math.max(max, rgba[i * 4 + c]);
  for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) out[c * n + i] = (rgba[i * 4 + c] / max - MEAN[c]) / STD[c];
  return out;
}

// Model output d0 is already a sigmoid probability map; min-max normalise it to 0..1.
export function toMask(d) {
  let mn = Infinity, mx = -Infinity;
  for (let i = 0; i < d.length; i++) { const v = d[i]; if (v < mn) mn = v; if (v > mx) mx = v; }
  if (!Number.isFinite(mn) || !Number.isFinite(mx) || mx - mn < 1e-6) throw new Error('MODEL: the model returned an empty or invalid mask.');
  const m = new Float32Array(d.length), r = mx - mn;
  for (let i = 0; i < d.length; i++) m[i] = (d[i] - mn) / r;
  return m;
}
