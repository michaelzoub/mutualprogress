import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import './styles.css';

gsap.registerPlugin(ScrollTrigger);

const year = document.querySelector('#year');
const nav = document.querySelector('[data-spatial-nav]');
const navLinks = [...document.querySelectorAll('.spatial-nav a')];
const sections = [...document.querySelectorAll('#goals, #team, #work')];
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = window.matchMedia('(pointer: fine)');

if (year) year.textContent = new Date().getFullYear();

const setCurrentSection = (id) => {
  navLinks.forEach((link) => {
    if (link.hash === `#${id}`) link.setAttribute('aria-current', 'true');
    else link.removeAttribute('aria-current');
  });

  document.body.classList.toggle('dark-nav', id === 'goals');
};

sections.forEach((section) => {
  ScrollTrigger.create({
    trigger: section,
    start: 'top 52%',
    end: 'bottom 52%',
    onToggle: ({ isActive }) => {
      if (isActive) setCurrentSection(section.id);
    },
  });
});

if (nav && finePointer.matches && !reducedMotion.matches) {
  const resetNav = () => {
    navLinks.forEach((link) => {
      const active = link.getAttribute('aria-current') === 'true';
      gsap.to(link, {
        scale: active ? 1.08 : 1,
        x: 0,
        duration: 0.28,
        ease: 'power2.out',
        overwrite: 'auto',
      });
    });
  };

  window.addEventListener('pointermove', (event) => {
    const navRect = nav.getBoundingClientRect();
    const horizontalDistance = Math.max(0, navRect.left - event.clientX);

    if (horizontalDistance > 180) {
      resetNav();
      return;
    }

    navLinks.forEach((link) => {
      const rect = link.getBoundingClientRect();
      const verticalDistance = Math.abs(event.clientY - (rect.top + rect.height / 2));
      const distance = Math.hypot(horizontalDistance * 0.7, verticalDistance);
      const proximity = Math.max(0, 1 - distance / 135);
      const activeLift = link.getAttribute('aria-current') === 'true' ? 0.07 : 0;

      gsap.to(link, {
        scale: 1 + proximity * 0.16 + activeLift,
        x: -proximity * 4,
        duration: 0.24,
        ease: 'power2.out',
        overwrite: 'auto',
      });
    });
  }, { passive: true });

  window.addEventListener('blur', resetNav);
  nav.addEventListener('pointerleave', resetNav);
}

const motion = gsap.matchMedia();

motion.add('(prefers-reduced-motion: no-preference)', () => {
  const intro = gsap.timeline({ defaults: { ease: 'power3.out' } });

  intro
    .fromTo('.evolution-figure',
      { autoAlpha: 0, y: 8 },
      { autoAlpha: 1, y: 0, duration: 0.72, stagger: 0.065 },
      0.05)
    .fromTo('.technology-block',
      { autoAlpha: 0, y: 7, scale: 0.92 },
      { autoAlpha: 1, y: 0, scale: 1, duration: 0.56, stagger: 0.11 },
      0.34)
    .fromTo('.stage-label',
      { autoAlpha: 0 },
      { autoAlpha: 1, duration: 0.42, stagger: 0.045 },
      0.56)
    .fromTo('.hero-kicker, .hero-copy h1',
      { autoAlpha: 0, y: 10 },
      { autoAlpha: 1, y: 0, duration: 0.72, stagger: 0.08 },
      0.7)
    .fromTo('.hero-principles p',
      { autoAlpha: 0, y: 7 },
      { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.07 },
      0.9);

  gsap.to('.evolution-sequence', {
    yPercent: 1.5,
    ease: 'none',
    scrollTrigger: {
      trigger: '.hero',
      start: 'top top',
      end: 'bottom top',
      scrub: 1.4,
    },
  });

  gsap.utils.toArray('[data-reveal]').forEach((element) => {
    gsap.fromTo(element,
      { autoAlpha: 0, y: 18 },
      {
        autoAlpha: 1,
        y: 0,
        duration: 0.82,
        ease: 'power3.out',
        scrollTrigger: { trigger: element, start: 'top 78%', once: true },
      });
  });

  gsap.utils.toArray('[data-reveal-row]').forEach((row) => {
    gsap.fromTo(row,
      { autoAlpha: 0, x: 14 },
      {
        autoAlpha: 1,
        x: 0,
        duration: 0.7,
        ease: 'power3.out',
        scrollTrigger: { trigger: row, start: 'top 84%', once: true },
      });
  });

  gsap.fromTo('.invitation-link, .footer-main',
    { autoAlpha: 0, y: 12 },
    {
      autoAlpha: 1,
      y: 0,
      duration: 0.72,
      stagger: 0.08,
      ease: 'power3.out',
      scrollTrigger: { trigger: '.invitation-link', start: 'top 84%', once: true },
    });

  return () => intro.kill();
});

window.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
document.fonts?.ready.then(() => ScrollTrigger.refresh());
