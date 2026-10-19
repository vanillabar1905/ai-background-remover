import { useEffect } from 'react';

// Contact details. Nothing is invented here: add your real address between the quotes to show an email on the Contact page.
const CONTACT_EMAIL = '';
const REPO = 'https://github.com/vanillabar1905/ai-background-remover';
const UPDATED = '19 October 2026';

export const PAGES = {
  about: 'About', contact: 'Contact', privacy: 'Privacy Policy', terms: 'Terms of Use',
};

export function Header({ home }) {
  return (<header className="top"><div className="wrap row">
    <a className="logo" href="#/">Cutout</a>
    {home
      ? <nav aria-label="Primary"><a href="#how">How it works</a><a href="#faq">FAQ</a><a href="#/privacy">Privacy</a></nav>
      : <nav aria-label="Primary"><a href="#/">Back to the tool</a></nav>}
  </div></header>);
}

export function Footer() {
  return (<footer className="wrap foot"><small>© Cutout</small>
    <nav aria-label="Footer"><a href="#/about">About</a><a href="#/contact">Contact</a><a href="#/privacy">Privacy Policy</a><a href="#/terms">Terms of Use</a></nav>
  </footer>);
}

function Privacy() {
  return (<>
    <p className="lead">Cutout removes image backgrounds inside your web browser. This page explains what that means for your data.</p>
    <div className="note"><strong>In short:</strong> the images you choose are processed on your own device and are not uploaded to our servers. The site has no accounts and no database, and it does not currently use analytics or show ads.</div>

    <h2>Your images</h2>
    <p>When you select or drop an image, it is read and processed locally by code running in your browser. The image, the cutout and any downloaded PNG are never sent to a server operated for this site.</p>

    <h2>What the hosting provider may log</h2>
    <p>The site is served by Cloudflare. As with almost any website, the hosting provider may automatically record technical information when your browser requests a page or file, such as your IP address, browser type, the address requested and the time. We do not use this information to identify you, and the site itself does not read these logs. Cloudflare handles that data under its own privacy policy.</p>

    <h2>Cookies and browser storage</h2>
    <p>The site’s own code does not set cookies and does not use local storage or similar browser storage. Your browser may keep the AI model and its runtime files in its normal cache so the tool loads faster next time. You can clear this at any time in your browser settings.</p>

    <h2>Analytics</h2>
    <p>No analytics or tracking tools are currently used on this site.</p>

    <h2>Advertising</h2>
    <p>No advertising is currently shown. The site may apply to display ads from Google AdSense in the future to help cover running costs. If ads are enabled, third-party vendors, including Google, may use cookies to serve ads based on a person’s previous visits to this or other websites. Google’s use of advertising cookies enables it and its partners to serve ads based on those visits. You can opt out of personalised advertising in <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer">Google Ads Settings</a> or at <a href="https://www.aboutads.info" target="_blank" rel="noopener noreferrer">aboutads.info</a>. This policy will be updated before any ads appear, and a consent choice will be offered where the law requires one.</p>

    <h2>Children</h2>
    <p>The site is a general-purpose tool and is not directed at children. It does not ask for or collect personal information.</p>

    <h2>Your choices and requests</h2>
    <p>Because the site does not hold accounts or personal data of its own, there is nothing stored on our side to access, correct or delete. If you have a question about this policy or about data handled by the hosting provider, see the <a href="#/contact">Contact page</a>.</p>

    <h2>Changes to this policy</h2>
    <p>If the way the site handles data changes, for example if analytics or advertising is added, this page will be updated and the “Last updated” date at the top will change.</p>
  </>);
}

function Terms() {
  return (<>
    <p className="lead">These terms apply when you use Cutout. By using the site you agree to them. If you do not agree, please do not use it.</p>

    <h2>The service</h2>
    <p>Cutout is a free tool that removes the background from images and lets you download the result as a PNG. It runs in your browser. Features may change, and the site may be paused or removed at any time without notice.</p>

    <h2>Your images and your responsibility</h2>
    <ul>
      <li>You keep all rights you already have in your images and in the results you create.</li>
      <li>You are responsible for making sure you have the right to use any image you process.</li>
      <li>Do not use the tool for unlawful purposes or to infringe the rights of others.</li>
    </ul>

    <h2>Acceptable use</h2>
    <p>Do not try to disrupt, overload or gain unauthorised access to the site or its hosting, and do not use automated means to place excessive load on it.</p>

    <h2>No guarantee of results</h2>
    <p>Automatic background removal is imperfect. Fine detail such as hair, transparent objects or cluttered scenes may not be cut out cleanly. Always check the result before you rely on it.</p>

    <h2>No warranty and limit of liability</h2>
    <p>The site is provided “as is” and “as available”, without warranties of any kind, express or implied. To the extent permitted by law, the site operator is not liable for any loss or damage arising from your use of, or inability to use, the site or its results.</p>

    <h2>Third-party components</h2>
    <p>Cutout uses open-source software. The segmentation model is U²-Net (small) by Xuebin Qin et al., released under the Apache License 2.0, in the ONNX form distributed by the rembg project (MIT). Inference uses ONNX Runtime Web. These components remain subject to their own licences.</p>

    <h2>Advertising and links</h2>
    <p>The site may show advertising in the future and may link to third-party sites. We do not control those sites and are not responsible for their content or practices. See the <a href="#/privacy">Privacy Policy</a> for details.</p>

    <h2>Changes to these terms</h2>
    <p>These terms may be updated from time to time. The “Last updated” date at the top shows the latest revision. Continued use of the site after a change means you accept the updated terms.</p>

    <h2>Contact</h2>
    <p>Questions about these terms: see the <a href="#/contact">Contact page</a>.</p>
  </>);
}

function About() {
  return (<>
    <p className="lead">Cutout is a free, privacy-friendly background remover that works entirely in your web browser.</p>

    <h2>What it does</h2>
    <p>Add a JPG, PNG or WebP image and Cutout separates the subject from the background. You can fine-tune the edge, remove colour fringing, preview the result against a transparent or solid-colour background, and download it as a PNG.</p>

    <h2>Why it runs in your browser</h2>
    <p>Most online background removers upload your photo to a server. Cutout does not. The AI model is small enough (about 5 MB) to download once and run on your own device, so your images stay with you. It also means there are no per-image server costs, which is why the tool can be free.</p>

    <h2>How it works</h2>
    <ul>
      <li>A compact segmentation model called U²-Netp predicts which pixels belong to the subject.</li>
      <li>ONNX Runtime Web runs the model inside a Web Worker so the page stays responsive. It uses WebGPU when your device supports it and falls back to the CPU otherwise.</li>
      <li>Edge refinement and colour-fringe removal then clean up the cutout before you download it.</li>
    </ul>

    <h2>Limitations</h2>
    <p>Results are automatic and not perfect. Hair, fur, glass and busy backgrounds can be difficult. Images are limited to 25 MB, and very large images may fail on devices with limited memory. On devices without WebGPU, processing takes longer, and the first image takes a little longer while the model loads.</p>

    <h2>Credits and open source</h2>
    <p>Cutout is built on U²-Net by Xuebin Qin et al. (Apache License 2.0), the ONNX model files distributed by the rembg project (MIT), ONNX Runtime Web, React and Vite. The source code is published at <a href={REPO} target="_blank" rel="noopener noreferrer">github.com/vanillabar1905/ai-background-remover</a>.</p>

    <h2>Cost and advertising</h2>
    <p>Cutout is free to use. Advertising may be added in the future to help cover hosting costs. If that happens, it will be described in the <a href="#/privacy">Privacy Policy</a>.</p>

    <h2>Get in touch</h2>
    <p>Feedback and bug reports are welcome. See the <a href="#/contact">Contact page</a>.</p>
  </>);
}

function Contact() {
  return (<>
    <p className="lead">Found a bug, have a suggestion, or have a question about privacy? Here is how to reach us.</p>

    <h2>Bug reports and feedback</h2>
    <p>The best way to reach us is to open an issue on the project’s public GitHub page. A GitHub account is required.</p>
    <p><a className="btn sm" href={`${REPO}/issues`} target="_blank" rel="noopener noreferrer">Open GitHub issues</a></p>
    <p>To help us reproduce a problem, please include your browser and device, the image type and approximate size, and any error message shown. Issues are public, so please do not post private images or personal information.</p>

    {CONTACT_EMAIL && <>
      <h2>Email</h2>
      <p><a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></p></>}

    <h2>Privacy and legal questions</h2>
    <p>For questions about the <a href="#/privacy">Privacy Policy</a> or the <a href="#/terms">Terms of Use</a>, use the same channel{CONTACT_EMAIL ? ' or the email address above' : ''}. Cutout does not store your images or personal data, so there is nothing on our side to look up or delete.</p>

    <h2>Please note</h2>
    <p>Cutout is a free tool and we cannot promise a reply time or answer every message. There is no phone support.</p>
  </>);
}

const BODY = { about: About, contact: Contact, privacy: Privacy, terms: Terms };

export function Page({ page }) {
  useEffect(() => {
    const prev = document.title;
    document.title = `${PAGES[page]} – Cutout`;
    scrollTo(0, 0);
    return () => { document.title = prev; };
  }, [page]);
  const Body = BODY[page];
  const legal = page === 'privacy' || page === 'terms';
  return (<>
    <Header />
    <main className="wrap page">
      <h1>{PAGES[page]}</h1>
      {legal && <p className="muted">Last updated: {UPDATED}</p>}
      <Body />
    </main>
    <Footer />
  </>);
}
