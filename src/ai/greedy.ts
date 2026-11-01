/** One-ply greedy AIs: try every legal action and keep the best-scoring one.
 * Difficulty: easy adds noise and occasional random moves, normal scores material, hard plays each of its best few
 * candidates out through the opponent's reply (beats normal about 3 in 4 on a symmetric card pool).
 * Usage: const [action, rng2] = aiAction(state, rng, "hard");
 */
import type { Action, GameState, PlayerId } from "../types.ts";
import { apply, legalActions } from "../engine.ts";
import { next } from "../rng.ts";
import { AI } from "../config/ai.ts";

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

export type Difficulty = "easy" | "normal" | "hard";

/** Best action under a scoring function; ties are broken with the generator. */
function bestBy(s: GameState, rng: number, score: (after: GameState) => number): [Action, number] {
  let best: Action[] = [];
  let bestScore = -Infinity;
  for (const a of legalActions(s)) {
    const after = a.type === "endTurn" ? s : apply(s, a);
    const v = score(after) + (a.type === "endPlay" || a.type === "endTurn" ? -0.01 : 0);
    if (v > bestScore + 1e-9) { best = [a]; bestScore = v; }
    else if (Math.abs(v - bestScore) <= 1e-9) best.push(a);
  }
  const [r, ns] = next(rng);
  return [best[Math.floor(r * best.length)], ns];
}

/** Play greedily to the end of the opponent's next turn and score the result for `me`. */
function rollout(s: GameState, me: PlayerId, rng: number): number {
  const until = s.turn + (s.active === me ? 1 : 0);
  let t = s;
  let r = rng;
  for (let steps = 0; t.winner === null && t.turn <= until && steps < 40; steps++) {
    const [a, nr] = greedyAction(t, r);
    r = nr;
    t = apply(t, a);
  }
  return evaluate(t, me);
}

/** Hard difficulty: the best few one-ply candidates are each played out through the opponent's reply. */
export function lookaheadAction(s: GameState, rng: number, candidates: number = AI.hardCandidates): [Action, number] {
  const me = s.active;
  const scored = legalActions(s).map((a) => {
    const after = a.type === "endTurn" ? s : apply(s, a);
    return { a, after, v: evaluate(after, me) };
  }).sort((x, y) => y.v - x.v).slice(0, candidates);
  let best = scored[0];
  let bestScore = -Infinity;
  for (const c of scored) {
    const next = c.a.type === "endTurn" ? apply(s, c.a) : c.after;
    const v = rollout(next, me, rng) + (c.a.type === "endPlay" || c.a.type === "endTurn" ? -0.01 : 0);
    if (v > bestScore) { bestScore = v; best = c; }
  }
  const [, ns] = next(rng);
  return [best.a, ns];
}

/** Normal difficulty: the best material score. Returns the action and the AI's next generator state. */
export function greedyAction(s: GameState, rng: number): [Action, number] {
  return bestBy(s, rng, (after) => evaluate(after, s.active));
}

/** Pick an action for the given difficulty. */
export function aiAction(s: GameState, rng: number, difficulty: Difficulty): [Action, number] {
  const me = s.active;
  if (difficulty === "hard") return lookaheadAction(s, rng);
  if (difficulty === "normal") return greedyAction(s, rng);
  const [roll, r1] = next(rng);
  if (roll < AI.easyRandomMove) {
    const acts = legalActions(s).filter((a) => a.type !== "endPlay" || legalActions(s).length === 1);
    const [pick, r2] = next(r1);
    return [acts[Math.floor(pick * acts.length)], r2];
  }
  let noise = r1;
  return bestBy(s, r1, (after) => {
    const [n, nn] = next(noise);
    noise = nn;
    return evaluate(after, me) + (n - 0.5) * AI.easyNoise;
  });
}
