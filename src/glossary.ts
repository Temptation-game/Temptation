/** Parser for glossary.md ("Term: definition" lines) and matcher that finds glossary terms in card text.
 * Usage: const g = parseGlossary(md); splitTerms("Adventurous.", g) -> [{ text: "Adventurous", term: ... }, { text: "." }]
 */

export interface GlossaryEntry {
  term: string;
  definition: string;
}

/** A run of card text; `term` is set when the run is a glossary word. */
export interface TextRun {
  text: string;
  term?: GlossaryEntry;
}

/** Parse "Term: definition" lines; headings, comments and other lines are skipped. */
export function parseGlossary(md: string): GlossaryEntry[] {
  return md
    .replace(/<!--[\s\S]*?-->/g, "")
    .split("\n")
    .map((l) => l.match(/^\s*([A-Za-z][\w' -]*?)\s*:\s*(.+)$/))
    .filter((m): m is RegExpMatchArray => m !== null)
    .map((m) => ({ term: m[1], definition: m[2].trim() }));
}

/** Split text into runs, marking words that start with a glossary term (so "tempted" matches Tempt). */
export function splitTerms(text: string, glossary: GlossaryEntry[]): TextRun[] {
  const runs: TextRun[] = [];
  let last = 0;
  for (const m of text.matchAll(/[A-Za-z][\w']*/g)) {
    const word = m[0].toLowerCase();
    const entry = glossary
      .filter((g) => word.startsWith(g.term.toLowerCase()))
      .sort((a, b) => b.term.length - a.term.length)[0];
    if (!entry) continue;
    if (m.index! > last) runs.push({ text: text.slice(last, m.index) });
    runs.push({ text: m[0], term: entry });
    last = m.index! + m[0].length;
  }
  if (last < text.length) runs.push({ text: text.slice(last) });
  return runs;
}

/** The distinct glossary entries used in a text, in order of first use. */
export function termsIn(text: string, glossary: GlossaryEntry[]): GlossaryEntry[] {
  const seen = new Set<string>();
  return splitTerms(text, glossary)
    .map((r) => r.term)
    .filter((t): t is GlossaryEntry => t !== undefined && !seen.has(t.term) && seen.add(t.term) !== undefined);
}
