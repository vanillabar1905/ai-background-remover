import { useEffect, useRef, useState } from 'react';
import { removeBackground, refineCutout, clearJob } from './removeBg.js';

const OK = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_MB = 25;
const SWATCHES = ['transparent', '#ffffff', '#f4efe6', '#1f3d36', '#e4572e'];
const FAQ = [
  ['Is it free?', 'Yes. The model runs on your own device, so there are no per-image server costs.'],
  ['Are my images uploaded?', 'No. Images are processed in your browser and never sent to a server.'],
  ['Why is the first image slower?', 'The small model (about 5 MB) loads once and is cached by your browser. Large images take longer on devices without WebGPU.'],
  ['What formats are supported?', 'JPG, PNG and WebP up to 25 MB. The result is always a PNG.'],
];

function Legal({ page }) {
  const privacy = page === 'privacy';
  return (<main className="wrap legal"><a href="#/">← Back to the tool</a>
    <h1>{privacy ? 'Privacy policy' : 'Terms of use'}</h1>
    {privacy ? <>
      <p>Images you select are processed locally in your browser. They are not uploaded to our servers.</p>
      <p>The AI model and its runtime files are served from this site and cached by your browser. Like any website, the hosting provider may keep standard access logs (for example your IP address and requested files).</p>
      <p>This site currently has no accounts, database, analytics or advertising. If that changes, this policy will be updated first.</p>
    </> : <>
      <p>This tool is provided “as is”, without warranty. Results may be imperfect.</p>
      <p>You are responsible for having the rights to any image you process. Do not use the tool for unlawful purposes.</p>
    </>}
    <p className="muted"><small>Template text: have it reviewed and add your contact details before launch.</small></p></main>);
}

export default function App() {
  const [route, setRoute] = useState(location.hash);
  useEffect(() => { const f = () => setRoute(location.hash); addEventListener('hashchange', f); return () => removeEventListener('hashchange', f); }, []);
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

  if (route === '#/privacy') return <Legal page="privacy" />;
  if (route === '#/terms') return <Legal page="terms" />;

  return (<>
    <header className="top"><div className="wrap row">
      <a className="logo" href="#/">Cutout</a>
      <nav aria-label="Primary"><a href="#how">How it works</a><a href="#faq">FAQ</a><a href="#/privacy">Privacy</a></nav>
    </div></header>
    <main className="wrap">
      <section className="tool" aria-labelledby="title">
        <h1 id="title">Remove Image Background</h1>
        <p className="sub">Get a transparent PNG in seconds. Everything runs in your browser.</p>
        {err && <p role="alert" className="msg">{err}</p>}

        {stage === 'idle' && (
          <div className={'drop' + (drag ? ' on' : '')} role="button" tabIndex={0}
            aria-label="Choose an image or drop it here"
            onClick={() => input.current.click()}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), input.current.click())}
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files[0]); }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 16V5m0 0-4 4m4-4 4 4M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" /></svg>
            <span className="drop-t">Drop an image or <u>browse</u></span>
            <span className="muted">JPG, PNG or WebP · up to 25 MB</span>
            <input ref={input} type="file" accept={OK.join()} hidden onChange={(e) => handle(e.target.files[0])} />
          </div>)}

        {stage === 'working' && (<div className="frame"><img src={src} alt="Your uploaded image" />
          <div role="status" aria-live="polite" className="status">
            <span className="st-t">{label || 'Starting…'}</span>
            <progress max="100" value={pct} aria-label="Progress" />
            <button className="btn ghost sm" onClick={reset}>Cancel</button></div></div>)}

        {stage === 'done' && (<>
          <div className="frame cmp" style={{ '--p': pos + '%', '--bg': bg }}>
            <div className={'layer after' + (bg === 'transparent' ? ' checker' : '')}><img src={cut} alt="Background removed" /></div>
            <div className="layer before"><img src={src} alt="Original" /></div>
            <span className="tag l" aria-hidden="true">Original</span><span className="tag r" aria-hidden="true">Result</span>
            <span className="handle" aria-hidden="true" />
            <input type="range" min="0" max="100" value={pos} aria-label="Before and after comparison"
              onChange={(e) => setPos(+e.target.value)} />
          </div>
          <div className="controls">
            <label className="ctl">Edge <input type="range" min="0" max="1" step="0.05" value={edge} onChange={(e) => setEdge(+e.target.value)} aria-label="Edge tightness: soft to tight" /></label>
            <label className="ctl"><input type="checkbox" checked={defringe} onChange={(e) => setDefringe(e.target.checked)} /> Remove colour fringe</label>
            <div role="group" aria-label="Background colour" className="sw">
              <span className="muted">Background</span>
              {SWATCHES.map((c) => <button key={c} aria-pressed={bg === c} title={c === 'transparent' ? 'Transparent' : c === '#ffffff' ? 'White' : c}
                aria-label={c === 'transparent' ? 'Transparent' : c === '#ffffff' ? 'White' : c}
                className={c === 'transparent' ? 'checker' : ''} style={{ background: c === 'transparent' ? undefined : c }} onClick={() => setBg(c)} />)}
              <input type="color" aria-label="Custom background colour" title="Custom colour" onChange={(e) => setBg(e.target.value)} />
            </div>
            <div className="actions">
              <button className="btn ghost sm" onClick={reset}>Process another</button>
              <button className="btn" onClick={download}>Download PNG</button>
            </div>
          </div></>)}
      </section>

      {/* Reserved for a future ad unit. Give it a min-height when ads are added; it is intentionally empty and collapsed now. */}
      <aside aria-label="Advertisement space" className="adslot" />

      <section id="how" className="info"><h2>How it works</h2>
        <ol>
          <li>Add a JPG, PNG or WebP image (up to 25 MB).</li>
          <li>A small segmentation model (U²-Netp, about 5 MB) runs on your device, using WebGPU when available and the CPU otherwise.</li>
          <li>Fine-tune the edge, choose a background if you like, and download a PNG.</li>
        </ol>
        <p><strong>Privacy:</strong> your image is processed locally and is not uploaded. <a href="#/privacy">Read the policy</a>.</p>
      </section>
      <section id="faq" className="info"><h2>Questions</h2>
        {FAQ.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</section>
    </main>
    <footer className="wrap foot"><small>© Cutout</small><small><a href="#/privacy">Privacy</a> · <a href="#/terms">Terms</a></small></footer>
  </>);
}
