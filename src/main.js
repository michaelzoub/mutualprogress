import '@fontsource-variable/inter';
import '@fontsource-variable/source-serif-4';
import './styles.css';
import './theme.js';
import { createWarp } from './warp.js';

import { gsap } from 'gsap';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import { CustomEase } from 'gsap/CustomEase';

gsap.registerPlugin(ScrollToPlugin, CustomEase);

// One slow, settling curve for everything: a hesitant start, a quick middle, a long tail.
CustomEase.create('settle', 'M0,0 C0.6,0.2 0,1 1,1');
gsap.defaults({ ease: 'settle', duration: 2 });

const motion = document.documentElement.classList.contains('motion');
const track = document.querySelector('#focus-track');
const buttons = document.querySelectorAll('.focus-controls button');
const cards = [...track.querySelectorAll('.card')];

/* Carousel */

function update() {
  const max = track.scrollWidth - track.clientWidth;
  buttons[0].disabled = track.scrollLeft <= 1;
  buttons[1].disabled = track.scrollLeft >= max - 1;
}

// Scroll positions at which each card sits flush against the left gutter.
function snapPoints() {
  const pad = parseFloat(getComputedStyle(track).scrollPaddingInlineStart) || 0;
  const origin = track.getBoundingClientRect().left + pad - track.scrollLeft;
  const max = track.scrollWidth - track.clientWidth;
  return cards.map((card) => Math.min(card.getBoundingClientRect().left - origin, max));
}

let target = null;

// The neighboring snap point in the given direction, or undefined at either end.
function neighbor(dir) {
  const from = target ?? track.scrollLeft;
  const points = snapPoints();
  return dir > 0 ? points.find((p) => p > from + 1) : points.findLast((p) => p < from - 1);
}

function go(dir) {
  const next = neighbor(dir);
  if (next !== undefined) slide(next);
}

function slide(next) {
  if (!motion) {
    track.scrollTo({ left: next });
    return;
  }

  // Snap and smooth-scroll would fight the tween, so hand control to GSAP for the trip.
  target = next;
  gsap.set(track, { scrollSnapType: 'none', scrollBehavior: 'auto' });
  gsap.to(track, {
    scrollTo: { x: next },
    overwrite: true,
    onComplete() {
      target = null;
      gsap.set(track, { clearProps: 'scrollSnapType,scrollBehavior' });
    },
  });
}

buttons.forEach((button) => {
  button.addEventListener('click', () => {
    go(Number(button.dataset.dir));
    autoplay?.reset();
  });
});

/* Autoplay */

// Every six seconds the whole carousel jumps one card forward (and from the last card, back to the first).
// A field of glowing dust always drifts over it. Through each wait the field slowly stirs, then gathers
// pace and stretches into light streaks; the carousel fires forward with the streaks at full burn, kicks
// past the stop as one block, and springs back while the light bleeds off into dust again.
// It holds while hovered, focused, or off screen; any manual scroll or click resets the clock.
// Reduced motion keeps the carousel still and skips the effect.
const autoplay = motion ? createAutoplay() : null;

function createAutoplay() {
  const warp = createWarp(track);
  const holds = new Set();
  let run;
  let launched = false;

  function cycle() {
    run?.kill();
    if (holds.size) return;

    run = gsap
      .timeline()
      .add(warp.to({ intensity: 0, duration: 0.9, ease: 'power3.out' }), 0)
      // A faint stir, then a steepening build: the cue that a jump is coming.
      .add(warp.to({ intensity: 0.14, duration: 2.6, ease: 'sine.inOut' }), 1.2)
      .add(warp.to({ intensity: 0.5, duration: 2.2, ease: 'power3.in' }), 3.8)
      .call(launch, null, 6);
  }

  function launch() {
    const next = neighbor(1) ?? 0;
    const dir = Math.sign(next - track.scrollLeft) || 1;
    const leap = 0.22 + Math.min(0.2, Math.abs(next - track.scrollLeft) / 6000);

    launched = true;
    target = next;
    warp.state.dir = dir;
    gsap.set(track, { scrollSnapType: 'none', scrollBehavior: 'auto' });

    gsap
      .timeline()
      .add(warp.to({ intensity: 1, duration: leap * 0.7, ease: 'power2.out' }), 0)
      .to(track, { scrollTo: { x: next }, duration: leap, ease: 'power3.in' }, 0)
      .addLabel('stop')
      .call(() => {
        target = null;
        launched = false;
        gsap.set(track, { clearProps: 'scrollSnapType,scrollBehavior' });
      })
      // The carousel lands as one solid block: a short overshoot and a single firm rebound.
      .to(track, { x: -24 * dir, duration: 0.08, ease: 'power2.out' }, 'stop')
      .to(track, { x: 0, duration: 0.7, ease: 'elastic.out(1, 0.75)' }, 'stop+=0.08')
      // The next wait starts at the moment of impact; its first move is letting the light die down.
      .call(cycle, null, 'stop');
  }

  // Drop a build-up in progress and let the field settle back to dust. A jump in flight always lands.
  function reset() {
    if (launched) return;
    run?.kill();
    warp.to({ intensity: 0, duration: 0.5, ease: 'power2.out' });
    cycle();
  }

  function hold(reason, on) {
    if (on) holds.add(reason);
    else holds.delete(reason);
    reset();
  }

  track.addEventListener('pointerenter', (e) => e.pointerType === 'mouse' && hold('hover', true));
  track.addEventListener('pointerleave', () => hold('hover', false));
  track.addEventListener('focusin', () => hold('focus', true));
  track.addEventListener('focusout', () => hold('focus', false));
  ['wheel', 'touchstart'].forEach((type) => track.addEventListener(type, reset, { passive: true }));
  new IntersectionObserver(([entry]) => {
    warp.active(entry.isIntersecting);
    hold('offscreen', !entry.isIntersecting);
  }).observe(track);

  return { reset };
}

track.addEventListener('scroll', update, { passive: true });
window.addEventListener('resize', update);
update();

/* Motion */

// Everything arrives at once on the same long curve, offset only by when it starts:
// the cards rise first, the title drifts in from the left, and the nav settles down from above.
async function intro() {
  await document.fonts.ready;

  const fade = { opacity: 0.001 };

  gsap
    .timeline()
    .from(cards, { ...fade, y: 96 }, 0.3)
    .from('#focus-title', { ...fade, x: -140 }, 0.6)
    .from('.focus-controls', { ...fade, y: 30 }, 0.6)
    .from('.site-header > *', { y: -96 }, 0.8);

  gsap.set(['.site-header', 'main'], { visibility: 'visible' });
}

if (motion) intro();
