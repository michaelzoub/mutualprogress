// Clicking a card opens a dialog with the longer story behind the topic, set over a looping video.
// Each card links to #<slug>; the slug picks the copy below and the video at /media/<slug>.mp4.

import { gsap } from 'gsap';

const topics = {
  'ai-for-humans': {
    copy: [
      'We think AI should feel like a tool you own, not a service you rent. We’re excited about models that run on your own hardware, remember what matters to you, and work for you instead of whoever’s hosting them.',
    ],
    points: ['Personal and local models', 'Interpretability', 'User-aligned agents'],
  },
  'decentralized-training': {
    copy: [
      'Right now, training a frontier model takes one giant data center and a lot of money. We’re fascinated by the idea of pooling compute from all over the world instead, and we think whoever cracks it changes who gets to build AI.',
    ],
    points: ['Distributed optimization', 'Verifiable compute', 'Open compute networks'],
  },
  'self-sovereignty': {
    copy: [
      'We care a lot about people being in control of their own money, speech, and identity. Crypto was the first big step, and we’re excited about the tools that make that kind of ownership easy enough for everyone to use.',
    ],
    points: ['Self-custody', 'Censorship resistance', 'Portable identity'],
  },
  'new-computing-paradigms': {
    copy: [
      'Computers have looked basically the same since the 1940s, and we don’t think that lasts forever. We love following the weird stuff, like optical chips, neuromorphic hardware, and devices that blend into the world around you, and we think one of them will be the next big platform.',
    ],
    points: ['Novel hardware', 'Ambient interfaces', 'Post–von Neumann architectures'],
  },
  'human-augmentation': {
    copy: [
      'We’re most excited by technology that makes people better at things, not technology that makes them unnecessary. Headsets, wearables, brain-computer interfaces, and robotic hands all fall into that bucket for us, and we think the next decade is going to be wild.',
    ],
    points: ['Spatial computing', 'Neural interfaces', 'Assistive robotics'],
  },
  'space-exploration': {
    copy: [
      'We’re infatuated with everything related to the cosmos, and believe that commercial space exploration is one of the next unlocks in the tech tree. Launch costs keep dropping, and we want to help figure out what it takes to actually live and build out there.',
    ],
    points: ['Closed-loop habitats', 'In-situ resources', 'Propulsion'],
  },
};

export function createDetail({ cards, motion, onToggle }) {
  const dialog = document.querySelector('.detail');
  const video = dialog.querySelector('.detail-video');
  const mark = dialog.querySelector('.detail-mark');
  const title = dialog.querySelector('#detail-title');
  const lede = dialog.querySelector('.detail-lede');
  const copy = dialog.querySelector('.detail-copy');
  const points = dialog.querySelector('.detail-points');
  let tween;

  const element = (tag, text) => Object.assign(document.createElement(tag), { textContent: text });

  function open(card) {
    const slug = card.querySelector('.card-link').hash.slice(1);
    const topic = topics[slug];
    if (!topic) return false;

    mark.innerHTML = card.querySelector('.mark').innerHTML;
    title.textContent = card.querySelector('h2').textContent;
    lede.textContent = card.querySelector('.card-text p').textContent;
    copy.replaceChildren(...topic.copy.map((text) => element('p', text)));
    points.replaceChildren(...topic.points.map((text) => element('li', text)));

    video.poster = `/media/${slug}.jpg`;
    video.src = `/media/${slug}.mp4`;
    if (motion) video.play().catch(() => {});

    dialog.showModal();
    onToggle?.(true);

    if (motion) {
      tween?.kill();
      tween = gsap
        .timeline({ defaults: { ease: 'power3.out' } })
        .fromTo(dialog, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.7 })
        .fromTo(dialog.querySelectorAll('.detail-body > *'), { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.06 }, 0.15);
    }
    return true;
  }

  function close() {
    if (!dialog.open) return;
    if (!motion) {
      dialog.close();
      return;
    }
    tween?.kill();
    tween = gsap.to(dialog, { opacity: 0, y: 12, duration: 0.3, ease: 'power2.in', onComplete: () => dialog.close() });
  }

  cards.forEach((card) => {
    card.querySelector('.card-link').addEventListener('click', (event) => {
      if (open(card)) event.preventDefault();
    });
  });

  dialog.querySelector('.detail-close').addEventListener('click', close);
  // A click on the dialog element itself, rather than its contents, landed on the backdrop.
  dialog.addEventListener('click', (event) => event.target === dialog && close());
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    close();
  });
  dialog.addEventListener('close', () => {
    video.pause();
    video.removeAttribute('src');
    video.load();
    gsap.set(dialog, { clearProps: 'opacity,transform' });
    onToggle?.(false);
  });
}
