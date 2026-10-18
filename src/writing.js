import '@fontsource-variable/inter';
import '@fontsource-variable/source-serif-4';
import './styles.css';
import './writing.css';

import { gsap } from 'gsap';
import { CustomEase } from 'gsap/CustomEase';

gsap.registerPlugin(CustomEase);

// Same settling curve as the home page, so moving between pages feels like one site.
CustomEase.create('settle', 'M0,0 C0.6,0.2 0,1 1,1');
gsap.defaults({ ease: 'settle', duration: 2 });

async function intro() {
  await document.fonts.ready;

  const fade = { opacity: 0.001 };

  gsap
    .timeline()
    .from('.writing-head, .article-head', { ...fade, x: -140 }, 0.3)
    .from('.post, .post-empty, .article-cover, .article-body', { ...fade, y: 96, stagger: 0.08 }, 0.4)
    .from('.site-header > *', { y: -96 }, 0.8)
    .from(['.article-byline', '.article-back', '.site-footer'], { ...fade }, 0.8);

  gsap.set(['.site-header', 'main', '.site-footer'], { visibility: 'visible' });
}

if (document.documentElement.classList.contains('motion')) intro();
