import { useEffect, useRef, useState } from 'react';
import { removeBackground, refineCutout, clearJob } from './removeBg.js';
import { Page, PAGES } from './pages.jsx';
import { Header, Footer } from './components.jsx';

const OK = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_MB = 25;
const SWATCHES = ['transparent', '#ffffff', '#f4efe6', '#1f3d36', '#e4572e'];
const FAQ = [
  ['Is Cutout free?', 'Yes. The model runs on your own device, so there are no per-image server costs.'],
  ['Are my images uploaded?', 'No. Images are processed in your browser and never sent to a server. You can read the details in the Privacy Policy.'],
  ['Why is the first image slower?', 'The small model (about 5 MB) loads once and is then cached by your browser. Large images take longer on devices without WebGPU.'],
  ['What formats and sizes can I use?', 'JPG, PNG and WebP files up to 25 MB and 16 megapixels. The result is always a PNG with a transparent background.'],
  ['How do I get a cleaner edge?', 'Move the Edge slider toward Tight for hard-edged objects such as products, or toward Soft for hair and fur. Keep Remove colour fringe on when you place the cutout on a different background.'],
  ['Which browsers work?', 'Recent versions of Chrome, Edge and Firefox, and Safari 16.4 or later. The browser needs Web Workers, OffscreenCanvas and WebAssembly. Speed depends on your device, and very large images can fail on devices with limited memory.'],
];
const STEPS = [
  ['Add your image', 'Drop or choose a JPG, PNG or WebP file. It is opened on your device and is not uploaded.'],
  ['The model finds the subject', 'A compact segmentation model, U²-Netp (about 5 MB), runs in your browser. It uses WebGPU when available and the CPU otherwise, and loads once, so the first image takes longer.'],
  ['Refine and download', 'Adjust the edge, remove colour fringing, preview on a transparent or solid background, then save the result as a PNG.'],
];
const USES = [
  ['Product and listing photos', 'Place products on plain white or a brand colour for shops, marketplaces and catalogues.'],
  ['Profile pictures and avatars', 'Isolate a portrait, then set it on a colour or drop it into a design.'],
  ['Slides, documents and mockups', 'A transparent PNG layers cleanly over any page, slide or design file.'],
  ['Posters, thumbnails and stickers', 'Cut a subject out to build social graphics and sticker-style images.'],
];
const TIPS = [
  ['Start with contrast.', 'A subject that differs clearly in colour and brightness from its background cuts out more cleanly.'],
  ['Use a sharp, well-lit photo.', 'Blur and heavy shadows make edges harder to find.'],
  ['Tune the edge.', 'Raise the Edge slider for hard-edged objects such as products. Lower it for soft edges such as hair or fur.'],
  ['Keep colour-fringe removal on', 'when the cutout will sit on a different background. It reduces the halo left by the original one.'],
  ['Check the result at full size', 'before you download. If a part is missing, try another crop or photo.'],
];
const bgName = (c) => (c === 'transparent' ? 'Transparent' : c === '#ffffff' ? 'White' : c);

export default function App() {
  const [route, setRoute] = useState(location.hash);
  useEffect(() => { const f = () => setRoute(location.hash); addEventListener('hashchange', f); return () => removeEventListener('hashchange', f); }, []);
  useEffect(() => { // anchors like #faq are not real routes, so scroll to them after the home page renders
    const id = route.startsWith('#/') ? '' : route.slice(1);
    if (id) document.getElementById(id)?.scrollIntoView(); else if (!route.startsWith('#/')) scrollTo(0, 0);
  }, [route]);
  const wsRef = useRef(null);
  const [src, setSrc] = useState(null), [cut, setCut] = useState(null);
  const [stage, setStage] = useState('idle'), [pct, setPct] = useState(0), [err, setErr] = useState('');
  const [bg, setBg] = useState('transparent'), [pos, setPos] = useState(50), [drag, setDrag] = useState(false);
  const canvas = useRef(null), input = useRef(null), ctl = useRef(null);
  const [label, setLabel] = useState('');
  const [edge, setEdge] = useState(0.5), [defringe, setDefringe] = useState(true);
  useEffect(() => { // re-apply edge settings (debounced); the model is not re-run
    if (stage !== 'done') return;
    const id = setTimeout(() => refineCutout({ tighten: edge, defringe }).then((c) => { canvas.current = c; setCut(c.toDataURL('image/png')); }).catch(() => {}), 150);
    return () => clearTimeout(id);
  }, [edge, defringe]); // eslint-disable-line

  useEffect(() => { // bring the workspace into view when processing starts, so the result is not below the fold
    if (stage === 'working') wsRef.current?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }, [stage]);

  const reset = () => { ctl.current?.abort(); clearJob(); setSrc(null); setCut(null); setStage('idle'); setErr(''); setPct(0); canvas.current = null; };

  async function handle(file) {
    setErr('');
    if (!file) return;
    if (!OK.includes(file.type)) return setErr('Unsupported file. Please use JPG, PNG or WebP.');
    if (file.size > MAX_MB * 1048576) return setErr(`File is larger than ${MAX_MB} MB.`);
    setSrc(URL.createObjectURL(file)); setStage('working');
    try {
      ctl.current = new AbortController();
      const c = await removeBackground(file, (p, l) => { setPct(p); setLabel(l); }, ctl.current.signal, { tighten: edge, defringe });
      canvas.current = c;
      setCut(c.toDataURL('image/png')); setStage('done');
    } catch (e) {
      if (e.name === 'AbortError') return;
      const m = String(e.message);
      setErr(m.startsWith('MODEL') ? 'The AI model could not be loaded or run. ' + m.replace(/^\w+: /, '')
        : m.startsWith('TOO_LARGE') ? 'That image is too large to process in the browser.'
        : m.startsWith('UNSUPPORTED') || m.startsWith('MEMORY') ? m.replace(/^\w+: /, '')
        : 'Background removal failed. ' + m);
      setStage('idle'); setSrc(null);
    }
  }

  function download() {
    const s = canvas.current, o = document.createElement('canvas');
    o.width = s.width; o.height = s.height;
    const x = o.getContext('2d');
    if (bg !== 'transparent') { x.fillStyle = bg; x.fillRect(0, 0, o.width, o.height); }
    x.drawImage(s, 0, 0);
    o.toBlob((b) => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'cutout.png'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); }, 'image/png');
  }

  const page = route.replace('#/', '');
  if (route.startsWith('#/') && PAGES[page]) return <Page page={page} />;

  return (<>
    <Header />
    <main>
      <section className="hero wrap" id="tool" aria-labelledby="title">
        <div className="hero-copy">
          <h1 id="title">Remove image backgrounds without uploading them</h1>
          <p className="lead">Cutout separates the subject from the background of JPG, PNG and WebP images with an AI model that runs on your own device. Download the result as a transparent PNG, free.</p>
        </div>

        {err && <div role="alert" className="alert">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5.5M12 16.5v.01" /></svg>
          <div><strong>That image could not be processed</strong><p>{err}</p></div></div>}

        {stage === 'idle' && (<>
          <div className={'mat drop' + (drag ? ' on' : '')} role="button" tabIndex={0}
            aria-label="Choose an image or drop it here"
            onClick={() => input.current.click()}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), input.current.click())}
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files[0]); }}>
            <div className="mat-in">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 16V5m0 0-4 4m4-4 4 4M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" /></svg>
              <span className="drop-t">{drag ? 'Release to cut it out' : 'Drop an image here'}</span>
              <span className="btn lg" aria-hidden="true">Choose image</span>
              <span className="muted">JPG, PNG or WebP, up to 25 MB</span>
            </div>
            <input ref={input} type="file" accept={OK.join()} hidden onChange={(e) => { handle(e.target.files[0]); e.target.value = ''; }} />
          </div>
          <p className="privacy-line"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
            <span>Your image is processed on this device. Nothing is uploaded. <a href="#/privacy">Privacy Policy</a></span></p></>)}

        <div ref={wsRef} className="ws-anchor" />
        {stage === 'working' && (<div className="ws">
          <div className="mat-wrap"><div className="frame scanning"><img src={src} alt="Your uploaded image" /><span className="scan" aria-hidden="true" /></div></div>
          <div className="side" role="status" aria-live="polite">
            <div><p className="side-h">Cutting out the subject</p>
              <p className="st-t">{label || 'Starting…'}</p></div>
            <div className="prog"><progress max="100" value={pct} aria-label="Progress" /><span className="pct">{Math.round(pct)}%</span></div>
            <button className="btn ghost" onClick={reset}>Cancel</button>
          </div></div>)}

        {stage === 'done' && (<div className="ws">
          <div className="mat-wrap">
            <div className="frame cmp" style={{ '--p': pos + '%', '--bg': bg }}>
              <div className={'layer after' + (bg === 'transparent' ? ' checker' : '')}><img src={cut} alt="Background removed" /></div>
              <div className="layer before"><img src={src} alt="Original" /></div>
              <span className="tag l" aria-hidden="true">Original</span><span className="tag r" aria-hidden="true">Result</span>
              <span className="handle" aria-hidden="true" />
              <input type="range" min="0" max="100" value={pos} aria-label="Before and after comparison"
                onChange={(e) => setPos(+e.target.value)} />
            </div>
          </div>
          <div className="side">
            <div>
              <button className="btn lg block" onClick={download}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 4v11m0 0-4-4m4 4 4-4M5 19h14" /></svg>Download PNG</button>
              <p className="muted cap">{bg === 'transparent' ? 'Saved as cutout.png with a transparent background' : `Saved as cutout.png on a ${bgName(bg).toLowerCase()} background`}</p>
            </div>
            <div role="group" aria-label="Background colour" className="sw">
              <p className="side-h">Background</p>
              <div className="sw-row">
                {SWATCHES.map((c) => <button key={c} aria-pressed={bg === c} title={bgName(c)} aria-label={bgName(c)}
                  className={c === 'transparent' ? 'checker' : ''} style={{ background: c === 'transparent' ? undefined : c }} onClick={() => setBg(c)} />)}
                <input type="color" aria-label="Custom background colour" title="Custom colour" onChange={(e) => setBg(e.target.value)} />
              </div>
            </div>
            <label className="ctl"><span className="side-h">Edge</span>
              <input type="range" min="0" max="1" step="0.05" value={edge} onChange={(e) => setEdge(+e.target.value)} aria-label="Edge tightness: soft to tight" />
              <span className="ends muted"><span>Soft</span><span>Tight</span></span></label>
            <label className="check"><input type="checkbox" checked={defringe} onChange={(e) => setDefringe(e.target.checked)} /><span>Remove colour fringe</span></label>
            <button className="btn ghost" onClick={reset}>Process another</button>
          </div></div>)}
      </section>

      {/* Reserved for a future ad unit. Give it a min-height when ads are added; it is intentionally empty and collapsed now. */}
      <aside aria-label="Advertisement space" className="adslot" />

      <section id="how" className="sec wrap">
        <div className="sec-head"><h2>How Cutout works</h2><p>Three steps, all on your device.</p></div>
        <ol className="steps">{STEPS.map(([t, d], i) => <li key={t}><span className="num" aria-hidden="true">{i + 1}</span><div><h3>{t}</h3><p>{d}</p></div></li>)}</ol>
      </section>

      <section className="sec wrap">
        <div className="sec-head"><h2>Where a transparent background helps</h2></div>
        <dl className="uses">{USES.map(([t, d]) => <div key={t}><dt>{t}</dt><dd>{d}</dd></div>)}</dl>
      </section>

      <section className="sec wrap">
        <div className="sec-head"><h2>Tips for cleaner cutouts</h2><p>Automatic results are not perfect. These habits help most.</p></div>
        <ul className="tips">{TIPS.map(([b, t]) => <li key={b}><strong>{b}</strong> {t}</li>)}</ul>
      </section>

      <section id="faq" className="sec wrap">
        <div className="sec-head"><h2>Questions</h2><p>Can’t find an answer? Visit the <a href="#/contact">Contact page</a>.</p></div>
        <div className="faq">{FAQ.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div>
      </section>
    </main>
    <Footer />
  </>);
}
