/** Interface timings in milliseconds. */

/** Pause between AI actions, so the player can follow them. */
export const AI_DELAY_MS = 450;
/** Hovering a field girl swaps the inspect area after this delay, to avoid flicker while sweeping. */
export const INSPECT_DELAY_MS = 120;
/** Each half of a flip card turning over; keep equal to the .flip-inner transition in style.css. */
export const FLIP_HALF_MS = 160;

/** Board animation durations and delays (see src/ui/animate.ts). */
export const ANIM = {
  move: 240,
  flirtLean: 520,
  heartPop: 900,
  heartDelay: 180,
  blush: 700,
  blushDelay: 220,
  lossNumber: 900,
  lossNumberDelay: 300,
  leave: 320,
  enter: 340,
  discard: 380,
  weddingGlow: 700,
  weddingFade: 450,
  arrive: 650,
  draw: 480,
  drawStagger: 110,
} as const;
