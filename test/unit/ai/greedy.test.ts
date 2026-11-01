/** Unit tests for src/ai/greedy.ts: every difficulty plays legal moves; hard prefers playing a card to passing. Run: npm test */
import { test } from "node:test";
import assert from "node:assert/strict";
import type { CharacterDef, FaceStats } from "../../../src/types.ts";
import { apply, legalActions, newGame } from "../../../src/engine.ts";
import { aiAction, type Difficulty } from "../../../src/ai/greedy.ts";

const f = (name: string, cost: number, charm: number, composure: number): FaceStats => ({ name, cost, charm, composure, text: [], abilities: [], unknown: [] });
const defs: Record<string, CharacterDef> = {
  a: { id: "a", name: "A", faces: { church: f("A", 1, 1, 2), court: f("A", 1, 1, 2) } },
  b: { id: "b", name: "B", faces: { church: f("B", 2, 2, 3), court: f("B", 2, 2, 3) } },
};
const town = { id: "t", name: "T", rows: ["U..H", "U..H", "U..H", "U..H"] };
const deck = Array.from({ length: 12 }, (_, i) => (i % 2 ? "a" : "b"));
const fresh = (seed: number) => newGame(defs, town, [{ faction: "church", cards: deck }, { faction: "court", cards: deck }], seed);

for (const d of ["easy", "normal", "hard"] as Difficulty[]) {
  test(`${d}: always returns a legal action and finishes games`, () => {
    for (let g = 0; g < 6; g++) {
      let s = fresh(g);
      let r = g;
      for (let step = 0; step < 400 && s.winner === null; step++) {
        const legal = legalActions(s).map((a) => JSON.stringify(a));
        const [a, nr] = aiAction(s, r, d);
        r = nr;
        assert.ok(legal.includes(JSON.stringify(a)), `${d} chose an illegal action`);
        s = apply(s, a);
      }
    }
  });
}

test("hard plays an affordable card instead of ending the play phase", () => {
  const s = fresh(1);
  assert.equal(s.phase, "play");
  assert.ok(legalActions(s).some((a) => a.type === "play"));
  const [a] = aiAction(s, 5, "hard");
  assert.equal(a.type, "play");
});
