/** Tuning of the AI difficulties (see src/ai/greedy.ts). */
export const AI = {
  /** Easy: chance of a random legal move instead of a scored one. */
  easyRandomMove: 0.2,
  /** Easy: spread of the random noise added to each move's score. */
  easyNoise: 4,
  /** Hard: how many of the best one-move candidates are played out through the opponent's reply. */
  hardCandidates: 6,
} as const;
