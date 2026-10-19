// All decoding-adjacent work, inference and compositing happen here, never on the UI thread.
import * as ort from 'onnxruntime-web/webgpu';
import { SIZE, toInput, toMask } from './segment.js';
import { refine } from './refine.js';

let session = null, backend = '', job = null; // job keeps the last image + mask so edge settings can be re-applied without re-running the model
const say = (pct, label) => postMessage({ type: 'progress', pct, label });

async function check(s) { // reject a WebGPU session that errors out or returns garbage
  const x = new Float32Array(3 * SIZE * SIZE).map((_, i) => Math.sin(i / 97));
  const r = await s.run({ [s.inputNames[0]]: new ort.Tensor('float32', x, [1, 3, SIZE, SIZE]) });
  toMask(r[s.outputNames[0]].data);
}

const within = (ms, p) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timed out after ' + ms + ' ms')), ms))]);
async function gpuUsable() { // real (non-software) adapter only
  try { const a = await within(4000, navigator.gpu.requestAdapter()); return !!a && !a.isFallbackAdapter && !a.info?.isFallbackAdapter; } catch { return false; }
}

async function loadWasm(base) { // the ORT wasm is hosted as small parts (Cloudflare 25 MiB file limit); join them back together
  const meta = await (await fetch(base + 'ort-wasm.json')).json();
  const parts = await Promise.all(meta.parts.map(async (p) => {
    const r = await fetch(base + p);
    if (!r.ok) throw new Error('WASM: download failed for ' + p + ' (HTTP ' + r.status + ').');
    return new Uint8Array(await r.arrayBuffer());
  }));
  const out = new Uint8Array(meta.size); let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  if (o !== meta.size) throw new Error('WASM: incomplete download (' + o + ' of ' + meta.size + ' bytes).');
  return out;
}

async function getSession(modelUrl, base) {
  if (session) return session;
  ort.env.wasm.wasmPaths = base;
  ort.env.wasm.proxy = false; // we are already in a worker
  ort.env.wasm.numThreads = self.crossOriginIsolated ? Math.min(4, navigator.hardwareConcurrency || 1) : 1;
  say(5, 'Loading AI model (4.6 MB, cached after first use)…');
  ort.env.wasm.wasmBinary = await loadWasm(base);
  const res = await fetch(modelUrl);
  if (!res.ok) throw new Error('MODEL: download failed (HTTP ' + res.status + ').');
  const buf = new Uint8Array(await res.arrayBuffer());
  if (await gpuUsable()) {
    try {
      const s = await within(30000, (async () => { // a hung or broken GPU must never block the app
        const x = await ort.InferenceSession.create(buf, { executionProviders: ['webgpu'] });
        await check(x); return x;
      })());
      session = s; backend = 'GPU'; return s;
    } catch (e) { console.warn('WebGPU unavailable for this model, using WASM:', e); }
  }
  session = await ort.InferenceSession.create(buf, { executionProviders: ['wasm'] });
  backend = 'CPU'; return session;
}

function finish(opts) {
  const { w, h } = job, out = refine(job.rgba, w, h, job.mask, opts);
  const c = new OffscreenCanvas(w, h); c.getContext('2d').putImageData(new ImageData(out, w, h), 0, 0);
  const bm = c.transferToImageBitmap(); postMessage({ type: 'done', bitmap: bm }, [bm]);
}

onmessage = async ({ data }) => {
  if (data.type === 'clear') { job = null; return; }
  if (data.type === 'refine') {
    try { if (!job) throw new Error('No image to refine.'); finish(data.opts); }
    catch (e) { postMessage({ type: 'error', message: String(e.message || e) }); }
    return;
  }
  if (data.type !== 'run') return;
  job = null;
  const bmp = data.bitmap;
  try {
    const w = bmp.width, h = bmp.height;
    const s = await getSession(data.modelUrl, data.base);
    say(35, 'Preparing image…');
    const sm = new OffscreenCanvas(SIZE, SIZE).getContext('2d', { willReadFrequently: true });
    sm.drawImage(bmp, 0, 0, SIZE, SIZE);
    const tensor = new ort.Tensor('float32', toInput(sm.getImageData(0, 0, SIZE, SIZE).data), [1, 3, SIZE, SIZE]);
    say(50, `Removing background (${backend})…`);
    const res = await s.run({ [s.inputNames[0]]: tensor });
    const d = res[s.outputNames[0]];
    if (d.dims.length !== 4 || d.dims[2] !== SIZE || d.dims[3] !== SIZE) throw new Error('MODEL: unexpected mask shape [' + d.dims + '].');
    const mask = toMask(d.data);
    tensor.dispose(); Object.values(res).forEach((t) => t.dispose?.());
    say(80, 'Refining edges…');
    const c0 = new OffscreenCanvas(w, h).getContext('2d', { willReadFrequently: true });
    c0.drawImage(bmp, 0, 0);
    job = { w, h, rgba: c0.getImageData(0, 0, w, h).data, mask };
    finish(data.opts);
  } catch (e) {
    postMessage({ type: 'error', message: /memory|alloc/i.test(String(e.message)) ? 'MEMORY: ran out of memory.' : String(e.message || e) });
  } finally { bmp.close?.(); }
};
