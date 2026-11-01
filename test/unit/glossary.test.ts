/** Unit tests for src/glossary.ts: glossary parser and [term] markers. Run: npm test */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseGlossary, splitTerms, stripMarkers, termsIn, unknownTerms } from "../../src/glossary.ts";

const g = parseGlossary("# Glossary\n\nTempt: Send her away.\nAdventurous: Acts at once.\nnot a term line\n");

test("parses Term: definition lines and skips the rest", () => {
  assert.deepEqual(g, [
    { term: "Tempt", definition: "Send her away." },
    { term: "Adventurous", definition: "Acts at once." },
  ]);
});

test("only [marked] words become terms; brackets are dropped; inflections match by prefix", () => {
  const text = "[Adventurous]. When she would have been [tempted], run. Tempt is unmarked.";
  const runs = splitTerms(text, g);
  assert.equal(runs.map((r) => r.text).join(""), stripMarkers(text));
  assert.deepEqual(runs.filter((r) => r.term).map((r) => [r.text, r.term!.term]), [["Adventurous", "Adventurous"], ["tempted", "Tempt"]]);
});

test("a marked word with no glossary entry renders as plain text and is reported", () => {
  const runs = splitTerms("Bakes [bread].", g);
  assert.deepEqual(runs, [{ text: "Bakes " }, { text: "bread" }, { text: "." }]);
  assert.deepEqual(unknownTerms("Bakes [bread]. [Tempts].", g), ["bread"]);
});

test("termsIn lists each term once, in order of first use", () => {
  assert.deepEqual(termsIn("[Tempt] her. [Adventurous]. [Tempted] again.", g).map((t) => t.term), ["Tempt", "Adventurous"]);
});

test("glossary.md in the repo parses", () => {
  const real = parseGlossary(readFileSync(new URL("../../glossary.md", import.meta.url), "utf8"));
  assert.ok(real.some((e) => e.term === "Tempt"));
});
