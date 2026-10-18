// Clicking a card opens a dialog with the longer story behind the topic, set over a looping video.
// Each card links to #<slug>; the slug picks the copy below and the video at /media/<slug>.mp4.

import { gsap } from 'gsap';

const topics = {
  'ai-for-humans': {
    copy: [
      'The most capable AI systems are being built by a handful of organizations, tuned to their incentives and governed by their terms. We study what it would take for intelligence to work on behalf of the person using it: models people can run, inspect, and direct, with interests that stay aligned with theirs.',
      'We back teams building assistants that keep data local, interfaces that make a model’s reasoning legible, and the evaluation work that tells us whether a system actually serves its user.',
    ],
    points: ['Personal and local models', 'Interpretability', 'User-aligned agents'],
  },
  'decentralized-training': {
    copy: [
      'Training a frontier model today takes a single data center and the capital to fill it. That bottleneck decides who gets to build the most powerful systems. We research methods that let training run across many independent machines: low-communication optimizers, verifiable compute, and incentive schemes that hold a network together.',
      'If those methods work at scale, the ability to train frontier models stops depending on one company’s balance sheet.',
    ],
    points: ['Distributed optimization', 'Verifiable compute', 'Open compute networks'],
  },
  'self-sovereignty': {
    copy: [
      'Money, speech, and identity increasingly pass through intermediaries that can freeze, censor, or revoke them. We look at the tools that return that control to individuals: self-custodied money, communication that can’t be quietly switched off, and credentials that belong to the person they describe.',
      'Our focus is on making those tools usable enough for everyone, not just the technically fluent.',
    ],
    points: ['Self-custody', 'Censorship resistance', 'Portable identity'],
  },
  'new-computing-paradigms': {
    copy: [
      'Most of computing still follows the architecture laid out in the 1940s, and the limits of shrinking silicon are getting closer. We follow the alternatives seriously: analog and optical processors, neuromorphic hardware, reversible logic, and computers that live closer to the body and the world.',
      'We want to understand which of these can become practical, and what new kinds of software and interfaces each would make possible.',
    ],
    points: ['Novel hardware', 'Ambient interfaces', 'Post–von Neumann architectures'],
  },
  'human-augmentation': {
    copy: [
      'Technology can replace people or extend them. We focus on the second path: tools that sharpen perception, memory, movement, and judgment, so that people become more capable alongside the machines they use.',
      'That spans spatial computing and wearables, brain–computer interfaces, and assistive robotics, each judged by how much more a person can do with it.',
    ],
    points: ['Spatial computing', 'Neural interfaces', 'Assistive robotics'],
  },
  'space-exploration': {
    copy: [
      'Getting to orbit has never been cheaper, but living beyond Earth is still far from practical. We study the hard problems in between: life support that closes the loop, manufacturing from local materials, propulsion, and the institutions that settlements will need to govern themselves.',
      'Much of what works in space also makes life on Earth more resilient, which is part of why we care about it.',
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
