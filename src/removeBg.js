const MAX_MP = 16; // 16 megapixels ≈ 64 MB of pixels, plus copies in the worker
let worker = null;  // reused between images so the model is loaded once

export function checkSupport() {
  if (typeof WebAssembly === 'undefined' || typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined' || typeof createImageBitmap === 'undefined')
    throw new Error('UNSUPPORTED: This browser lacks Web Workers/OffscreenCanvas/WebAssembly. Please use a recent Chrome, Edge, Firefox or Safari 16.4+.');
}

// One request/response round-trip with the worker. Abort terminates the worker (the only way to interrupt inference).
function call(msg, transfer, onProgress, signal) {
  return new Promise((resolve, reject) => {
    worker ||= new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
    const wk = worker;
    const abort = () => { wk.terminate(); if (worker === wk) worker = null; reject(new DOMException('Cancelled', 'AbortError')); };
    if (signal?.aborted) return abort();
    signal?.addEventListener('abort', abort, { once: true });
    wk.onmessage = ({ data }) => {
      if (data.type === 'progress') return onProgress?.(data.pct, data.label);
      signal?.removeEventListener('abort', abort);
      if (data.type === 'error') return reject(new Error(data.message));
      const c = document.createElement('canvas'); c.width = data.bitmap.width; c.height = data.bitmap.height;
      c.getContext('2d').drawImage(data.bitmap, 0, 0); data.bitmap.close();
      resolve(c);
    };
    wk.onerror = (e) => { if (worker === wk) worker = null; wk.terminate(); reject(new Error('WORKER: processing crashed. ' + (e.message || ''))); };
    wk.postMessage(msg, transfer);
  });
}

// opts: { tighten: 0..1, defringe: boolean } (see src/refine.js)
export async function removeBackground(file, onProgress, signal, opts) {
  checkSupport();
  const bitmap = await createImageBitmap(file).catch(() => { throw new Error('That image could not be decoded. It may be corrupt.'); });
  const { width: w, height: h } = bitmap;
  if ((w * h) / 1e6 > MAX_MP) { bitmap.close(); throw new Error(`TOO_LARGE: ${w}×${h}px exceeds the ${MAX_MP} megapixel limit.`); }
  return call({ type: 'run', opts, bitmap, base: new URL('ort/', document.baseURI).href, modelUrl: new URL('models/u2netp.onnx', document.baseURI).href }, [bitmap], onProgress, signal);
}

// Re-apply edge settings to the last processed image (no model re-run).
export function refineCutout(opts) {
  if (!worker) return Promise.reject(new Error('No processed image available.'));
  return call({ type: 'refine', opts }, [], null, null);
}

export function clearJob() { worker?.postMessage({ type: 'clear' }); }
