import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// ORT's bundle contains new URL('ort-wasm-simd-threaded.asyncify.wasm', import.meta.url), which makes Vite copy the 26.8 MB
// wasm into dist/assets. We never use that path (the worker passes the wasm bytes itself), and Cloudflare rejects files over 25 MiB.
const dropOrtWasm = { name: 'drop-ort-wasm', enforce: 'post', generateBundle(_, bundle) { for (const k of Object.keys(bundle)) if (/ort-wasm.*\.wasm$/.test(k)) delete bundle[k]; } };

// ===== PRODUCTION URL: the ONLY place to change it (or set a SITE_URL build variable in Cloudflare). No trailing slash. =====
const SITE_URL = (process.env.SITE_URL || 'https://YOUR-SITE.workers.dev').replace(/\/+$/, '');
// Fills the canonical URL in index.html and writes robots.txt + sitemap.xml into dist/ from SITE_URL.
const seo = {
  name: 'seo-files',
  transformIndexHtml: (html) => html.replaceAll('__SITE_URL__', SITE_URL),
  generateBundle() {
    if (SITE_URL.includes('YOUR-SITE')) this.warn('SITE_URL is still the placeholder. Set your real URL in vite.config.js before the final deploy.');
    this.emitFile({ type: 'asset', fileName: 'robots.txt', source: `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n` });
    this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>${SITE_URL}/</loc>\n    <lastmod>${new Date().toISOString().slice(0, 10)}</lastmod>\n  </url>\n</urlset>\n` });
  },
};
export default defineConfig({ plugins: [react(), dropOrtWasm, seo], base: './', worker: { format: 'es', plugins: () => [dropOrtWasm] }, optimizeDeps: { exclude: ['onnxruntime-web'] } });
