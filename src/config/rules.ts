/** Core rule numbers from overview.md; the engine reads these and nothing else hardcodes them. */
export const RULES = {
  startingHand: 5,
  handLimit: 6,
  wineCap: 10,
  secondPlayerFirstWine: 2,
  actionsPerTurn: 3,
} as const;
