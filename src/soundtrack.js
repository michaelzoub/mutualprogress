// Dark mode's soundtrack: Carbon Based Lifeforms – MOS 6581 (slowed + reverb), played through a hidden YouTube embed.
// The player only loads on the first switch to dark, so the page doesn't pull in YouTube until someone asks for it.

const VIDEO_ID = 'EyQBIMpeeAI';
const VOLUME = 20;

let player;
let loading = false;
let loaded = false;
let wantPlaying = false;

function loadApi() {
  if (window.YT?.Player) return Promise.resolve();
  return new Promise((resolve) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve();
    };
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    document.head.append(script);
  });
}

function createPlayer() {
  const mount = document.createElement('div');
  // Kept rendered (not display: none) because browsers may refuse to play an invisible iframe.
  mount.setAttribute('aria-hidden', 'true');
  mount.style.cssText = 'position:fixed;left:0;bottom:0;width:1px;height:1px;opacity:0;pointer-events:none;';
  document.body.append(mount);
  const target = mount.appendChild(document.createElement('div'));

  loadApi().then(() => {
    player = new window.YT.Player(target, {
      videoId: VIDEO_ID,
      host: 'https://www.youtube-nocookie.com',
      playerVars: { autoplay: 1, controls: 0, loop: 1, playlist: VIDEO_ID, playsinline: 1 },
      events: {
        onReady: () => {
          loaded = true;
          player.setVolume(VOLUME);
          // The user may have switched back to light while the player was loading.
          if (wantPlaying) player.playVideo();
          else player.pauseVideo();
        },
      },
    });
  });
}

export function setSoundtrack(playing) {
  wantPlaying = playing;
  if (loaded) {
    if (playing) player.playVideo();
    else player.pauseVideo();
  } else if (playing && !loading) {
    loading = true;
    createPlayer();
  }
}
