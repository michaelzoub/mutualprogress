import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import './styles.css';

gsap.registerPlugin(ScrollTrigger);

const year = document.querySelector('#year');
const header = document.querySelector('[data-header]');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

if (year) year.textContent = new Date().getFullYear();

let lastScroll = 0;
const updateHeader = () => {
  const currentScroll = window.scrollY;
  header?.classList.toggle('is-scrolled', currentScroll > 18);
  header?.classList.toggle('is-hidden', currentScroll > lastScroll && currentScroll > 180);
  lastScroll = Math.max(0, currentScroll);
};

window.addEventListener('scroll', updateHeader, { passive: true });
updateHeader();

const motion = gsap.matchMedia();

motion.add('(prefers-reduced-motion: no-preference)', () => {
  const intro = gsap.timeline({ defaults: { ease: 'power3.out' } });

  intro
    .fromTo('.hero-eyebrow', { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.55 }, 0.05)
    .fromTo('.evolution-figure', { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.07 }, 0.12)
    .fromTo('.technology-block', { autoAlpha: 0, scale: 0.88, y: 8 }, { autoAlpha: 1, scale: 1, y: 0, duration: 0.5, stagger: 0.08 }, 0.42)
    .fromTo('.stage-label', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4, stagger: 0.05 }, 0.62)
    .fromTo('.hero-kicker, .hero-copy h1, .hero-summary, .hero-actions', { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.68, stagger: 0.07 }, 0.64)
    .fromTo('.hero-footnote', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6 }, 1.02);

  gsap.utils.toArray('[data-reveal]').forEach((element) => {
    gsap.fromTo(element, { autoAlpha: 0, y: 18 }, {
      autoAlpha: 1,
      y: 0,
      duration: 0.8,
      ease: 'power3.out',
      scrollTrigger: { trigger: element, start: 'top 82%', once: true },
    });
  });

  gsap.utils.toArray('[data-reveal-row]').forEach((element, index) => {
    gsap.fromTo(element, { autoAlpha: 0, y: 14 }, {
      autoAlpha: 1,
      y: 0,
      duration: 0.66,
      delay: (index % 3) * 0.05,
      ease: 'power3.out',
      scrollTrigger: { trigger: element, start: 'top 86%', once: true },
    });
  });

  return () => intro.kill();
});

if (reducedMotion.matches) document.documentElement.classList.add('reduced-motion');
window.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
document.fonts?.ready.then(() => ScrollTrigger.refresh());
