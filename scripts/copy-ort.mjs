// Prepares ONNX Runtime's WASM for self-hosting on Cloudflare (25 MiB max per file).
// The app imports 'onnxruntime-web/webgpu', which needs ONLY ort-wasm-simd-threaded.asyncify.wasm (~26.8 MB, too big),
// so we split that one file into small parts. src/worker.js downloads the parts and joins them again.
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, cpSync } from 'node:fs';
const src = 'node_modules/onnxruntime-web/dist', dst = 'public/ort';
const WASM = 'ort-wasm-simd-threaded.asyncify.wasm', MJS = 'ort-wasm-simd-threaded.asyncify.mjs'; // loader (53 KB) is fetched at runtime too
const PART = 12 * 1024 * 1024; // 12 MiB per part, well under the 25 MiB limit

if (!existsSync(`${src}/${WASM}`) || !existsSync(`${src}/${MJS}`)) throw new Error(`${WASM} not found in ${src}. The onnxruntime-web version changed; update scripts/copy-ort.mjs and src/worker.js.`);
rmSync(dst, { recursive: true, force: true }); // never leave stale or oversized files behind
mkdirSync(dst, { recursive: true });

cpSync(`${src}/${MJS}`, `${dst}/${MJS}`);
const buf = readFileSync(`${src}/${WASM}`), parts = [];
for (let i = 0, o = 0; o < buf.length; i++, o += PART) {
  const name = `ort-wasm.part${i}.bin`;
  writeFileSync(`${dst}/${name}`, buf.subarray(o, Math.min(o + PART, buf.length)));
  parts.push(name);
}
writeFileSync(`${dst}/ort-wasm.json`, JSON.stringify({ size: buf.length, parts }));
console.log(`ORT wasm: ${(buf.length / 1048576).toFixed(1)} MiB split into ${parts.length} parts`);
