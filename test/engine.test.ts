/** Rule tests for the core engine. Run: npm test */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { AbilityId, CharacterDef, DeckList, FaceStats, GameState, LocationDef } from "../src/types.ts";
import { apply, concede, legalActions, newGame, occupant } from "../src/engine.ts";
import { parseCards } from "../src/cards.ts";
import { randomAction } from "../src/ai/random.ts";

const f = (name: string, cost: number, charm: number, composure: number, abilities: AbilityId[] = []): FaceStats =>
  ({ name, cost, charm, composure, text: [], abilities, unknown: [] });

const defs: Record<string, CharacterDef> = {
  weak: { id: "weak", name: "Weak", faces: {
    church: f("Sister Weak", 1, 1, 2), court: f("Lady Weak", 1, 1, 2) } },
  strong: { id: "strong", name: "Strong", faces: {
    church: f("Sister Strong", 2, 3, 5), court: f("Lady Strong", 2, 2, 4) } },
  bold: { id: "bold", name: "Bold", faces: {
    church: f("Sister Bold", 1, 1, 2, ["adventurous"]),
    court: f("Lady Bold", 1, 1, 2, ["adventurous", "convertInsteadOfTempt"]) } },
};
const town: LocationDef = { id: "t", name: "T", rows: ["U..H", "U..H", "U..H", "U..H"] };
const deck = (faction: "church" | "court", n = 10, id = "weak"): DeckList =>
  ({ faction, cards: Array(n).fill(id) });

/** A fresh game with P0 Church first, already in P0's play phase. */
const fresh = (n = 10, id = "weak") => newGame(defs, town, [deck("church", n, id), deck("court", n, id)], 1);

/** Place a card from the active player's hand straight onto a square (test setup only). */
function place(s: GameState, uid: number, x: number, y: number, controller = s.cards[uid].controller) {
  const c = s.cards[uid];
  for (const p of s.players) p.hand = p.hand.filter((u) => u !== uid);
  c.zone = "field"; c.pos = { x, y }; c.controller = controller;
  c.composure = defs[c.defId].faces[s.players[controller].faction].composure;
}

test("setup rejects two decks of the same faction", () => {
  assert.throws(() => newGame(defs, town, [deck("church"), deck("church")], 1));
});

test("opening: 5 cards dealt, first player draws to 6 and gets 1 Wine", () => {
  const s = fresh();
  assert.equal(s.players[0].hand.length, 6);
  assert.equal(s.players[1].hand.length, 5);
  assert.equal(s.phase, "play");
  assert.equal(s.players[0].wine, 1);
});

test("Wine/Blood: second player gets 2 on turn 1, then min(turn, 10)", () => {
  let s = fresh();
  const p0 = s.players[0].hand[0];
  s = apply(s, { type: "play", uid: p0, at: { x: 3, y: 0 } });
  s = apply(s, { type: "endPlay" });
  s = apply(s, { type: "endTurn" });
  assert.equal(s.players[1].wine, 2);
  s.players[0].turnNumber = 11;
  place(s, s.players[1].hand[0], 0, 0);
  s = apply(s, { type: "endPlay" });
  s = apply(s, { type: "endTurn" });
  assert.equal(s.players[0].wine, 10);
});

test("Church enters only on holy squares, Court only on unholy", () => {
  let s = fresh();
  const plays = legalActions(s).filter((a) => a.type === "play");
  assert.ok(plays.length > 0);
  assert.ok(plays.every((a) => a.type === "play" && a.at.x === 3));
  s = apply(s, { type: "play", uid: s.players[0].hand[0], at: { x: 3, y: 0 } });
  s = apply(s, { type: "endPlay" });
  s = apply(s, { type: "endTurn" });
  assert.ok(legalActions(s).filter((a) => a.type === "play").every((a) => a.type === "play" && a.at.x === 0));
});

test("cards costing more than current Wine cannot be played", () => {
  const s = fresh(10, "strong");
  assert.deepEqual(legalActions(s).filter((a) => a.type === "play"), []);
});

test("hand over 6 at start of turn forces discards; discards go to owner's pile", () => {
  let s = fresh();
  const stolen = s.players[0].hand.pop()!;
  s.players[1].hand.push(stolen);
  s.cards[stolen].controller = 1;
  s.players[1].hand.push(s.players[1].deck.shift()!);
  s.cards[s.players[1].hand.at(-1)!].zone = "hand";
  place(s, s.players[0].hand[0], 3, 0);
  s = apply(s, { type: "endPlay" });
  s = apply(s, { type: "endTurn" });
  assert.equal(s.players[1].hand.length, 8);
  assert.equal(s.phase, "discard");
  s = apply(s, { type: "discard", uid: stolen });
  assert.equal(s.phase, "discard");
  assert.deepEqual(s.players[0].discard, [stolen]);
  s = apply(s, { type: "discard", uid: s.players[1].hand[0] });
  assert.equal(s.phase, "play");
  assert.equal(s.players[1].hand.length, 6);
});

test("losing: ending the play phase with no characters on the field", () => {
  let s = fresh();
  s = apply(s, { type: "endPlay" });
  assert.equal(s.winner, 1);
  assert.deepEqual(legalActions(s), []);
});

test("move costs an action; at 0 actions only endTurn remains", () => {
  let s = fresh();
  const uid = s.players[0].hand[0];
  place(s, uid, 3, 0);
  s = apply(s, { type: "endPlay" });
  s = apply(s, { type: "move", uid, to: { x: 2, y: 0 } });
  s = apply(s, { type: "move", uid, to: { x: 1, y: 0 } });
  s = apply(s, { type: "move", uid, to: { x: 1, y: 1 } });
  assert.equal(s.actionsLeft, 0);
  assert.deepEqual(legalActions(s), [{ type: "endTurn" }]);
  assert.equal(occupant(s, { x: 1, y: 1 })?.uid, uid);
});

test("flirt: both lose Composure equal to the other's Charm", () => {
  let s = fresh(10, "strong");
  const a = s.players[0].hand[0];
  const t = s.players[1].hand[0];
  place(s, a, 1, 0);
  place(s, t, 0, 0);
  s = apply(s, { type: "endPlay" });
  s = apply(s, { type: "flirt", uid: a, target: t });
  assert.equal(s.cards[a].composure, 5 - 2);
  assert.equal(s.cards[t].composure, 4 - 3);
});

test("tempt: target at 0 Composure flips into the flirter's hand", () => {
  let s = fresh(10, "strong");
  const a = s.players[0].hand[0];
  const t = s.players[1].hand[0];
  place(s, a, 1, 0);
  place(s, t, 0, 0);
  s = apply(s, { type: "endPlay" });
  s = apply(s, { type: "flirt", uid: a, target: t });
  s = apply(s, { type: "flirt", uid: a, target: t });
  assert.equal(s.cards[t].zone, "hand");
  assert.equal(s.cards[t].controller, 0);
  assert.equal(s.cards[t].owner, 1);
  assert.ok(s.players[0].hand.includes(t));
  assert.equal(s.cards[a].zone, "field");
});

test("tempted card re-enters on its new faction's squares with full Composure of that face", () => {
  let s = fresh(10, "strong");
  const a = s.players[0].hand[0];
  const t = s.players[1].hand[0];
  place(s, a, 1, 0);
  place(s, t, 0, 0);
  s = apply(s, { type: "endPlay" });
  s = apply(s, { type: "flirt", uid: a, target: t });
  s = apply(s, { type: "flirt", uid: a, target: t });
  place(s, s.players[1].hand[0], 0, 3);
  s = apply(s, { type: "endTurn" });
  s = apply(s, { type: "endPlay" });
  s = apply(s, { type: "endTurn" });
  assert.equal(s.phase, "discard");
  s = apply(s, { type: "discard", uid: s.players[0].hand.find((u) => u !== t)! });
  assert.equal(s.players[0].wine, 2);
  s = apply(s, { type: "play", uid: t, at: { x: 3, y: 2 } });
  assert.equal(s.cards[t].composure, defs.strong.faces.church.composure);
});

test("flirter at 0 Composure is tempted to the opponent", () => {
  let s = fresh(10, "strong");
  const a = s.players[0].hand[0];
  const t = s.players[1].hand[0];
  place(s, a, 1, 0);
  place(s, t, 0, 0);
  s.cards[a].composure = 2;
  s = apply(s, { type: "endPlay" });
  s = apply(s, { type: "flirt", uid: a, target: t });
  assert.equal(s.cards[a].zone, "hand");
  assert.equal(s.cards[a].controller, 1);
  assert.equal(s.cards[t].zone, "field");
});

test("marriage: both at 0 Composure leave the game", () => {
  let s = fresh();
  const a = s.players[0].hand[0];
  const t = s.players[1].hand[0];
  place(s, a, 1, 0);
  place(s, t, 0, 0);
  s.cards[a].composure = 1;
  s.cards[t].composure = 1;
  s = apply(s, { type: "endPlay" });
  s = apply(s, { type: "flirt", uid: a, target: t });
  assert.equal(s.cards[a].zone, "married");
  assert.equal(s.cards[t].zone, "married");
  assert.deepEqual(s.married.sort(), [a, t].sort());
});

test("a character cannot act on the turn she enters", () => {
  let s = fresh();
  s = apply(s, { type: "play", uid: s.players[0].hand[0], at: { x: 3, y: 0 } });
  s = apply(s, { type: "endPlay" });
  assert.deepEqual(legalActions(s), [{ type: "endTurn" }]);
});

test("an Adventurous character can act on the turn she enters", () => {
  let s = fresh(10, "bold");
  const uid = s.players[0].hand[0];
  s = apply(s, { type: "play", uid, at: { x: 3, y: 0 } });
  s = apply(s, { type: "endPlay" });
  assert.ok(legalActions(s).some((a) => a.type === "move" && a.uid === uid));
});

test("convert instead of tempt: she flips in place with full Composure on the new face", () => {
  let s = fresh(10, "bold");
  const a = s.players[0].hand[0];
  const t = s.players[1].hand[0];
  place(s, a, 1, 0);
  place(s, t, 0, 0);
  s.cards[t].composure = 1;
  s = apply(s, { type: "endPlay" });
  s = apply(s, { type: "flirt", uid: a, target: t });
  assert.equal(s.cards[t].zone, "field");
  assert.deepEqual(s.cards[t].pos, { x: 0, y: 0 });
  assert.equal(s.cards[t].controller, 0);
  assert.equal(s.cards[t].composure, defs.bold.faces.church.composure);
  assert.ok(!s.players[0].hand.includes(t));
});

test("marriage takes precedence over convert instead of tempt", () => {
  let s = fresh(10, "bold");
  const a = s.players[0].hand[0];
  const t = s.players[1].hand[0];
  place(s, a, 1, 0);
  place(s, t, 0, 0);
  s.cards[a].composure = 1;
  s.cards[t].composure = 1;
  s = apply(s, { type: "endPlay" });
  s = apply(s, { type: "flirt", uid: a, target: t });
  assert.equal(s.cards[t].zone, "married");
  assert.equal(s.cards[a].zone, "married");
});

test("concede ends the game for the conceding player", () => {
  const s = concede(fresh(), 0);
  assert.equal(s.winner, 1);
  assert.deepEqual(legalActions(s), []);
});

test("cards.md parser: stats per face, known abilities, unknown sentences kept", () => {
  const md = `<!-- n 9 9 9 -->\n## Test Girl\nn 2 1 3\nAdventurous. Bakes bread.\nv 1 2 2\n`;
  const d = parseCards(md).test_girl;
  assert.equal(d.name, "Test Girl");
  assert.deepEqual([d.faces.church.cost, d.faces.church.charm, d.faces.church.composure], [2, 1, 3]);
  assert.deepEqual(d.faces.church.abilities, ["adventurous"]);
  assert.deepEqual(d.faces.church.unknown, ["Bakes bread."]);
  assert.deepEqual(d.faces.court.text, []);
});

test("cards.md in the repo parses", () => {
  const real = parseCards(readFileSync(new URL("../cards.md", import.meta.url), "utf8"));
  assert.ok(Object.keys(real).length > 0);
});

test("illegal actions throw and do not mutate the state", () => {
  const s = fresh();
  const before = JSON.stringify(s);
  assert.throws(() => apply(s, { type: "move", uid: 0, to: { x: 0, y: 0 } }));
  assert.equal(JSON.stringify(s), before);
});

test("fuzz: random games keep card counts, zones and squares consistent", () => {
  for (let g = 0; g < 50; g++) {
    let s = newGame(defs, town, [deck("church", 12, ["weak", "strong", "bold"][g % 3]), deck("court", 12, ["bold", "weak"][g % 2])], g);
    let ai = g;
    for (let step = 0; step < 1500 && s.winner === null; step++) {
      const [a, n] = randomAction(s, ai);
      ai = n;
      s = apply(s, a);
      const all = Object.values(s.cards);
      assert.equal(all.length, 24);
      const listed = [
        ...s.players.flatMap((p) => [...p.deck, ...p.hand, ...p.discard]), ...s.married,
        ...all.filter((c) => c.zone === "field").map((c) => c.uid),
      ];
      assert.equal(new Set(listed).size, 24, "every card in exactly one zone");
      assert.equal(listed.length, 24);
      const squares = all.filter((c) => c.zone === "field").map((c) => `${c.pos!.x},${c.pos!.y}`);
      assert.equal(new Set(squares).size, squares.length, "no two characters share a square");
      for (const p of [0, 1] as const) {
        for (const u of s.players[p].hand) assert.equal(s.cards[u].controller, p);
      }
    }
  }
});
