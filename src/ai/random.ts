/** Baseline AI: picks a uniformly random legal action using its own seeded generator. */
import type { Action, GameState } from "../types.ts";
import { legalActions } from "../engine.ts";
import { next } from "../rng.ts";

/** Returns the chosen action and the AI's next generator state. */
export function randomAction(s: GameState, rng: number): [Action, number] {
  const actions = legalActions(s);
  const [r, ns] = next(rng);
  return [actions[Math.floor(r * actions.length)], ns];
}
