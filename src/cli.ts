/** Random-vs-random simulator for sanity checks and rough balance numbers.
 * Usage: node src/cli.ts [games=100] [seed=1] [--verbose]
 */
import { readFileSync } from "node:fs";
import type { CharacterDef, DeckList, GameState, LocationDef } from "./types.ts";
import { apply, newGame } from "./engine.ts";
import { parseCards } from "./cards.ts";
import { DECK_SIZE } from "./config/match.ts";
import { parseGlossary, unknownTerms } from "./glossary.ts";
import { randomAction } from "./ai/random.ts";

const MAX_STEPS = 2000;

const load = (path: string) => JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
const glossary = parseGlossary(readFileSync(new URL("../glossary.md", import.meta.url), "utf8"));
const defs: Record<string, CharacterDef> = parseCards(readFileSync(new URL("../cards.md", import.meta.url), "utf8"));
for (const d of Object.values(defs)) {
  for (const [side, fc] of Object.entries(d.faces)) {
    for (const u of fc.unknown) console.log(`unimplemented (${d.name}, ${side}): ${u}`);
    for (const w of unknownTerms(fc.text.join(" "), glossary)) console.log(`not in glossary (${d.name}, ${side}): [${w}]`);
  }
}
const town: LocationDef = load("../data/locations/town_square.json");

const ids = Object.keys(defs);
const cardList = Array.from({ length: DECK_SIZE }, (_, i) => ids[i % ids.length]);
const decks: [DeckList, DeckList] = [
  { faction: "church", cards: cardList },
  { faction: "court", cards: cardList },
];

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const games = Number(args[0] ?? 100);
const seed = Number(args[1] ?? 1);
const verbose = process.argv.includes("--verbose");

const tally = { church: 0, court: 0, unfinished: 0 };
let totalTurns = 0;
for (let g = 0; g < games; g++) {
  let s: GameState = newGame(defs, town, decks, seed + g, (g % 2) as 0 | 1);
  let ai = seed * 7919 + g;
  let steps = 0;
  while (s.winner === null && steps++ < MAX_STEPS) {
    const [a, next] = randomAction(s, ai);
    ai = next;
    s = apply(s, a);
  }
  if (s.winner === null) tally.unfinished++;
  else tally[s.players[s.winner].faction]++;
  totalTurns += s.players[0].turnNumber + s.players[1].turnNumber;
  if (verbose) console.log(s.log.join("\n"), "\n---");
}
console.log(`games: ${games}`, tally, `avg turns: ${(totalTurns / games).toFixed(1)}`);
