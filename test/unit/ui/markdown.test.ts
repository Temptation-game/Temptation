/** Unit tests for src/ui/markdown.ts: the rules-page markdown renderer. Run: npm test */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { renderMarkdown } from "../../../src/ui/markdown.ts";

test("headings, paragraphs, lists and emphasis", () => {
  const md = "# Title\n\nSome *tempted* text\nwrapped.\n\n- one\n- **two**\n\n1) first\n2) second\n";
  assert.equal(renderMarkdown(md), [
    "<h1>Title</h1>",
    "<p>Some <em>tempted</em> text wrapped.</p>",
    "<ul><li>one</li><li><strong>two</strong></li></ul>",
    "<ol><li>first</li><li>second</li></ol>",
  ].join("\n"));
});

test("escaped asterisks stay literal and HTML is escaped", () => {
  assert.equal(renderMarkdown("Square\\* <b>"), "<p>Square* &#60;b&#62;</p>");
});

test("heading offset shifts levels", () => {
  assert.equal(renderMarkdown("# A", 1), "<h2>A</h2>");
});

test("overview.md renders with every line accounted for", () => {
  const html = renderMarkdown(readFileSync(new URL("../../../overview.md", import.meta.url), "utf8"));
  assert.ok(html.includes("<h2>Turn</h2>"));
  assert.ok(!html.includes("\\*"));
});

test("bullets under a numbered item nest inside it and numbering continues", () => {
  assert.equal(renderMarkdown("1) Start:\n- draw\n- discard\n2) Play.\n"),
    "<ol><li>Start:<ul><li>draw</li><li>discard</li></ul></li><li>Play.</li></ol>");
});

test("http(s) links become anchors opening in a new tab; other link targets stay text", () => {
  assert.equal(renderMarkdown("See [the license](https://example.org/L) or [x](javascript:alert(1))."),
    '<p>See <a href="https://example.org/L" target="_blank" rel="noopener">the license</a> or [x](javascript:alert(1)).</p>');
});
