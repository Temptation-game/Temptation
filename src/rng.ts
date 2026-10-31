/** Seeded PRNG (mulberry32) whose state is a plain number, so game states stay serialisable. */

/** Advance the generator; returns a float in [0, 1) and the next state. */
export function next(state: number): [number, number] {
  const s = (state + 0x6d2b79f5) | 0;
  let t = s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, s];
}

/** Fisher-Yates shuffle in place; returns the next generator state. */
export function shuffle<T>(items: T[], state: number): number {
  let s = state;
  for (let i = items.length - 1; i > 0; i--) {
    const [r, ns] = next(s);
    s = ns;
    const j = Math.floor(r * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return s;
}
