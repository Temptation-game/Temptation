/** One-ply greedy AI: tries every legal action and keeps the one with the best material score. */
import type { Action, GameState, PlayerId } from "../types.ts";
import { apply, legalActions } from "../engine.ts";
import { next } from "../rng.ts";

/** Material score from a player's point of view: field girls > hand girls, plus Composure and closeness to the enemy. */
export function evaluate(s: GameState, me: PlayerId): number {
  if (s.winner !== null) return s.winner === me ? 1e6 : -1e6;
  let score = 0;
  const mine: { x: number; y: number }[] = [];
  const theirs: { x: number; y: number }[] = [];
  for (const c of Object.values(s.cards)) {
    const sign = c.controller === me ? 1 : -1;
    if (c.zone === "field") {
      score += sign * (3 + 0.3 * c.composure);
      (c.controller === me ? mine : theirs).push(c.pos!);
    } else if (c.zone === "hand") {
      score += sign * 1;
    }
  }
  for (const a of mine) {
    const d = Math.min(...theirs.map((b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y)), 8);
    score -= 0.05 * d;
  }
  return score;
}

/** Returns the best-scoring action and the AI's next generator state. */
export function greedyAction(s: GameState, rng: number): [Action, number] {
  const me = s.active;
  let best: Action[] = [];
  let bestScore = -Infinity;
  for (const a of legalActions(s)) {
    const after = a.type === "endTurn" ? s : apply(s, a);
    const v = evaluate(after, me) + (a.type === "endPlay" || a.type === "endTurn" ? -0.01 : 0);
    if (v > bestScore + 1e-9) { best = [a]; bestScore = v; }
    else if (Math.abs(v - bestScore) <= 1e-9) best.push(a);
  }
  const [r, ns] = next(rng);
  return [best[Math.floor(r * best.length)], ns];
}
