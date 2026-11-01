/** Unit tests for src/ui/piles.ts: sent-home grouping and wedding couples. Run: npm test */
import { test } from "node:test";
import assert from "node:assert/strict";
import type { CharacterDef, FaceStats } from "../../../src/types.ts";
import { newGame } from "../../../src/engine.ts";
import { couples, sentHome } from "../../../src/ui/piles.ts";

const f = (name: string): FaceStats => ({ name, cost: 1, charm: 1, composure: 2, text: [], abilities: [], unknown: [] });
const defs: Record<string, CharacterDef> = {
  zoe: { id: "zoe", name: "Zoe", faces: { church: f("Zoe"), court: f("Zoe") } },
  ann: { id: "ann", name: "Ann", faces: { church: f("Ann"), court: f("Ann") } },
};
const town = { id: "t", name: "T", rows: ["U..H", "U..H", "U..H", "U..H"] };
const fresh = () => newGame(defs, town, [{ faction: "church", cards: ["zoe", "ann", "zoe", "ann", "zoe", "zoe"] }, { faction: "court", cards: ["ann", "ann", "zoe", "zoe", "ann", "ann"] }], 3);

/** Move a card into its owner's discard pile (test setup only). */
function discard(s: ReturnType<typeof fresh>, uid: number) {
  for (const p of s.players) { p.hand = p.hand.filter((u) => u !== uid); p.deck = p.deck.filter((u) => u !== uid); }
  s.cards[uid].zone = "discard";
  s.players[s.cards[uid].owner].discard.push(uid);
}

test("sentHome groups each owner's discards by card, sorted by name, with the owner's side", () => {
  const s = fresh();
  const churchZoes = Object.values(s.cards).filter((c) => c.owner === 0 && c.defId === "zoe").slice(0, 2);
  const churchAnn = Object.values(s.cards).find((c) => c.owner === 0 && c.defId === "ann")!;
  for (const c of [...churchZoes, churchAnn]) discard(s, c.uid);
  const [church, court] = sentHome(s);
  assert.equal(church.faction, "church");
  assert.deepEqual(church.groups, [{ defId: "ann", count: 1 }, { defId: "zoe", count: 2 }]);
  assert.equal(court.faction, "court");
  assert.deepEqual(court.groups, []);
});

test("couples pairs married girls in wedding order", () => {
  const s = fresh();
  s.married = [4, 9, 2, 7];
  assert.deepEqual(couples(s), [[4, 9], [2, 7]]);
  s.married = [];
  assert.deepEqual(couples(s), []);
});
