import { gsap } from 'gsap';

// A field of glowing particles over the carousel. At rest they drift and twinkle like dust in a light beam;
// as `intensity` (0–1) climbs, more of them wake, they speed up, and their motion stretches them into
// white light streaks with a soft blue halo. Everything is drawn from a few pre-rendered sprites, so even
// the full jump is a couple of hundred image blits a frame.

const HALO = { light: '96, 148, 214', dark: '151, 191, 231' };
const COUNT = 130;
const IDLE_SPEED = 16; // px/s, the ambient drift
const TOP_SPEED = 6200; // px/s at full intensity
const TRAIL = 0.032; // seconds of motion each streak smears across

function sprite(w, h, paint) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  paint(canvas.getContext('2d'), w, h);
  return canvas;
}

function glowDot(rgb) {
  return sprite(64, 64, (g) => {
    const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, 'rgba(255, 255, 255, 1)');
    r.addColorStop(0.22, 'rgba(255, 255, 255, 0.9)');
    r.addColorStop(0.45, `rgba(${rgb}, 0.35)`);
    r.addColorStop(1, `rgba(${rgb}, 0)`);
    g.fillStyle = r;
    g.fillRect(0, 0, 64, 64);
  });
}

// A streak with its bright head on the left and the tail burning off to the right.
function glowStreak(rgb, flip) {
  return sprite(512, 32, (g, w, h) => {
    if (flip) {
      g.translate(w, 0);
      g.scale(-1, 1);
    }
    const halo = g.createLinearGradient(0, 0, w, 0);
    halo.addColorStop(0, `rgba(${rgb}, 0)`);
    halo.addColorStop(0.03, `rgba(${rgb}, 0.6)`);
    halo.addColorStop(0.5, `rgba(${rgb}, 0.18)`);
    halo.addColorStop(1, `rgba(${rgb}, 0)`);
    g.fillStyle = halo;
    g.fillRect(0, 0, w, h);

    g.globalCompositeOperation = 'destination-in';
    const falloff = g.createLinearGradient(0, 0, 0, h);
    falloff.addColorStop(0, 'rgba(0, 0, 0, 0)');
    falloff.addColorStop(0.5, 'rgba(0, 0, 0, 1)');
    falloff.addColorStop(1, 'rgba(0, 0, 0, 0)');
    g.fillStyle = falloff;
    g.fillRect(0, 0, w, h);

    g.globalCompositeOperation = 'source-over';
    const core = g.createLinearGradient(0, 0, w, 0);
    core.addColorStop(0, 'rgba(255, 255, 255, 0)');
    core.addColorStop(0.02, 'rgba(255, 255, 255, 1)');
    core.addColorStop(0.55, 'rgba(255, 255, 255, 0.3)');
    core.addColorStop(1, 'rgba(255, 255, 255, 0)');
    g.fillStyle = core;
    g.fillRect(0, h / 2 - 1.5, w, 3);
  });
}

const sprites = Object.fromEntries(
  Object.entries(HALO).map(([theme, rgb]) => [
    theme,
    { dot: glowDot(rgb), ahead: glowStreak(rgb, false), behind: glowStreak(rgb, true), rgb },
  ]),
);

export function createWarp(track) {
  const canvas = document.createElement('canvas');
  canvas.className = 'warp';
  canvas.setAttribute('aria-hidden', 'true');
  track.after(canvas);

  const ctx = canvas.getContext('2d');
  const state = { intensity: 0, dir: 1 };
  const particles = Array.from({ length: COUNT }, () => ({
    x: Math.random(),
    y: Math.random(),
    depth: 0.25 + Math.random() * 0.75,
    rank: Math.random(),
    phase: Math.random() * Math.PI * 2,
    twinkle: 0.6 + Math.random() * 1.8,
  }));

  let width = 0;
  let height = 0;
  let time = 0;

  function fit() {
    const ratio = Math.min(devicePixelRatio || 1, 2);
    const bleed = 56;
    width = track.clientWidth;
    height = track.offsetHeight + bleed * 2;
    canvas.style.top = `${track.offsetTop - bleed}px`;
    canvas.style.height = `${height}px`;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function draw() {
    const dt = gsap.ticker.deltaRatio() / 60;
    const { intensity, dir } = state;
    const dark = document.documentElement.dataset.theme === 'dark';
    const art = sprites[dark ? 'dark' : 'light'];
    const rush = intensity ** 2.2;
    const awake = 0.22 + intensity * 0.95;
    time += dt;

    ctx.clearRect(0, 0, width, height);
    // Additive light reads as glow on the dark theme; on paper it would vanish, so blend normally there.
    ctx.globalCompositeOperation = dark ? 'lighter' : 'source-over';

    // At full tilt the whole lane brightens a little, like light pouring down a tunnel. On paper a tint
    // reads as haze rather than light, so it stays much fainter there.
    if (intensity > 0.3) {
      const sheen = ctx.createLinearGradient(0, 0, 0, height);
      sheen.addColorStop(0, `rgba(${art.rgb}, 0)`);
      sheen.addColorStop(0.5, `rgba(${art.rgb}, ${((intensity - 0.3) / 0.7) ** 3 * (dark ? 0.07 : 0.02)})`);
      sheen.addColorStop(1, `rgba(${art.rgb}, 0)`);
      ctx.fillStyle = sheen;
      ctx.fillRect(0, 0, width, height);
    }

    for (const p of particles) {
      const speed = (IDLE_SPEED + rush * TOP_SPEED) * p.depth;
      p.x -= (dir * speed * dt) / width;
      if (p.x < -0.25) p.x += 1.5;
      if (p.x > 1.25) p.x -= 1.5;

      // Particles wake in rank order as intensity rises, fading in rather than popping.
      const presence = gsap.utils.clamp(0, 1, (awake - p.rank) * 6);
      if (presence <= 0) continue;

      const flicker = 0.55 + 0.45 * Math.sin(time * p.twinkle + p.phase);
      const x = p.x * width;
      const y = p.y * height + Math.sin(time * 0.5 + p.phase) * 6 * (1 - intensity);
      const length = speed * TRAIL;
      // Dust twinkles at rest; streaks hold a steady, deliberately restrained brightness.
      ctx.globalAlpha = presence * p.depth * (flicker * (1 - intensity) + intensity * 0.5);

      if (length < 8) {
        const size = 2.5 + p.depth * 3;
        ctx.drawImage(art.dot, x - size / 2, y - size / 2, size, size);
      } else {
        const thick = 3 + p.depth * 5;
        const head = dir > 0 ? x : x - length;
        ctx.drawImage(dir > 0 ? art.ahead : art.behind, head, y - thick / 2, length, thick);
      }
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  fit();
  window.addEventListener('resize', fit);
  gsap.ticker.add(draw);

  return {
    state,
    to: (vars) => gsap.to(state, vars),
    // Stop drawing entirely while the carousel is off screen.
    active(on) {
      gsap.ticker.remove(draw);
      if (on) {
        fit();
        gsap.ticker.add(draw);
      }
    },
  };
}
