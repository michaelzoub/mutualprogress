// The initial theme is set by an inline script in each page's <head> so there's no flash; this wires up the toggle.

import { setSoundtrack } from './soundtrack.js';

const root = document.documentElement;
const toggle = document.querySelector('.theme-toggle');
const motion = !matchMedia('(prefers-reduced-motion: reduce)').matches;

function sync() {
  toggle?.setAttribute('aria-pressed', String(root.dataset.theme === 'dark'));
}

toggle?.addEventListener('click', () => {
  const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('theme', next);
  // Only a click toggles the music; a page that loads in dark mode stays quiet.
  setSoundtrack(next === 'dark');

  const apply = () => {
    root.dataset.theme = next;
    sync();
  };

  // Crossfade the whole page where supported rather than snapping every color at once.
  if (motion && document.startViewTransition) document.startViewTransition(apply);
  else apply();
});

sync();
