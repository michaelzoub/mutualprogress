---
name: "Mutual Progress"
description: "A restrained research-institution system for studying and advancing technological progress."
colors:
  research-paper: "#FDF6EE"
  soft-paper: "#F5EFE8"
  institutional-ink: "#151513"
  secondary-copy: "#625E57"
  primitive-tools: "#2F9B66"
  printing: "#E2B173"
  industry: "#D42D1C"
  computing: "#BDCCF2"
  intelligence: "#1741D5"
typography:
  family: '"Public Sans Variable", "Helvetica Neue", Arial, sans-serif'
  displayWeight: 430
  bodyWeight: 400
  displayTracking: "-0.06em"
spacing:
  pageGutter: "clamp(1.25rem, 4.5vw, 4.75rem)"
  sectionBlock: "clamp(8rem, 13vw, 13rem)"
  contentShell: "82rem"
---

# Design System: Mutual Progress

## Direction

Mutual Progress should read as a serious research organization: precise, technical, warm, and ambitious. The system uses disciplined sans-serif typography, long whitespace intervals, compact research annotations, and table-like information structures. It avoids magazine composition, decorative serif type, portraits used as mood imagery, card grids, and fashion-brand gestures.

## Hero

The hero is a systematic five-stage progression. Exactly five grayscale scientific figures are paired with exactly five colored technology blocks: tools, printing, industry, computing, and intelligence. Each block maps to one stage and appears in the same visual grammar. Color is concentrated here so the rest of the site can remain neutral.

## Typography

Public Sans is the only type family. Display copy uses restrained variable weights, tight tracking, and short line lengths. Supporting copy remains compact and legible. Small uppercase indices establish a research-document tone without turning the page into an editorial spread.

## Layout

The page uses a twelve-column institutional grid on large screens and a straightforward stacked flow on small screens. Sections rely on whitespace and a small number of hairline rules. Lists behave like directories or research tables rather than cards.

## Navigation

Primary navigation remains fixed at the right edge. Pointer proximity produces a subtle spatial scale response; the active section receives a small weight and line change. On touch screens, the same destinations become a fixed bottom index without proximity motion.

## Motion

GSAP sequences the five technology blocks, applies restrained section reveals, and manages the navigation response. Motion uses short distances, transform and opacity properties, and conservative easing. Reduced-motion users receive the complete static experience.

## Accessibility

The page preserves semantic landmarks, visible keyboard focus, sufficient contrast, descriptive alternative text, touch-sized navigation targets, and a reduced-motion path. No information depends on hover or animation alone.
