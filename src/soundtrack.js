// Dark mode's soundtrack: Carbon Based Lifeforms – MOS 6581 (slowed + reverb).
// preload="none" keeps the 9 MB file off the network until someone switches to dark.

const VOLUME = 0.2;

let audio;
let context;

function create() {
  audio = new Audio('/audio/soundtrack.mp3');
  audio.preload = 'none';
  audio.loop = true;
  // iOS ignores audio.volume, so the level is set with a gain node instead.
  context = new AudioContext();
  const gain = context.createGain();
  gain.gain.value = VOLUME;
  context.createMediaElementSource(audio).connect(gain).connect(context.destination);
}

export function setSoundtrack(playing) {
  if (!audio && !playing) return;
  if (!audio) create();
  // Called straight from the click handler, so the browser counts it as a user gesture and allows sound.
  if (playing) {
    context.resume();
    audio.play().catch(() => {});
  } else {
    audio.pause();
  }
}
