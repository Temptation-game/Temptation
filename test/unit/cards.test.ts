/** Unit tests for src/cards.ts: cards.md parser and ability recognition. Run: npm test */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseCards } from "../../src/cards.ts";

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
  const real = parseCards(readFileSync(new URL("../../cards.md", import.meta.url), "utf8"));
  assert.ok(Object.keys(real).length > 0);
});

test("ability matching ignores [term] markers", () => {
  const d = parseCards("## X\nn 1 1 1\n[Adventurous].\nv 1 1 1\nWhen this character would have been [tempted], [convert] her instead.\n").x;
  assert.deepEqual(d.faces.church.abilities, ["adventurous"]);
  assert.deepEqual(d.faces.court.abilities, ["convertInsteadOfTempt"]);
  assert.deepEqual(d.faces.court.unknown, []);
});
