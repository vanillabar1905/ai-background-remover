// Shared brand and layout pieces: logo, header, footer.
export function Mark({ size = 28 }) {
  // A square with a round piece cut out of it; the yellow crescent is the piece lifting away.
  return (<svg className="mark" width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
    <circle cx="19" cy="18" r="7" fill="#FFC933" />
    <path fill="currentColor" fillRule="evenodd" d="M10 2h12a8 8 0 0 1 8 8v12a8 8 0 0 1-8 8H10a8 8 0 0 1-8-8V10a8 8 0 0 1 8-8Zm6 6a7 7 0 1 0 0 14 7 7 0 0 0 0-14Z" />
  </svg>);
}

export function Logo() {
  return <a className="logo" href="#/" aria-label="Cutout, home"><Mark /><span>Cutout</span></a>;
}

export function Header() {
  return (<header className="top"><div className="wrap row">
    <Logo />
    <nav aria-label="Primary"><a href="#how">How it works</a><a className="n-faq" href="#faq">FAQ</a><a href="#/about">About</a></nav>
  </div></header>);
}

export function Footer() {
  return (<footer className="foot"><div className="wrap">
    <div className="foot-top">
      <div className="foot-brand"><Logo /><p>A free background remover that runs in your browser, so your photos stay on your device.</p></div>
      <nav aria-label="Footer"><a href="#/about">About</a><a href="#/contact">Contact</a><a href="#/privacy">Privacy Policy</a><a href="#/terms">Terms of Use</a></nav>
    </div>
    <div className="foot-bot"><small>© Cutout</small>
      <small>Segmentation model: U²-Net by Xuebin Qin et al. (Apache 2.0), ONNX files via rembg (MIT).</small></div>
  </div></footer>);
}
