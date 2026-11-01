/** Parser for glossary.md ("Term: definition" lines) and the [term] markers used in card text.
 * Usage: const g = parseGlossary(md); splitTerms("[Adventurous].", g) -> [{ text: "Adventurous", term: ... }, { text: "." }]
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

/** The glossary entry for a marked word: the longest term the word starts with (so "tempted" finds Tempt). */
export function lookupTerm(word: string, glossary: GlossaryEntry[]): GlossaryEntry | undefined {
  const w = word.toLowerCase();
  return glossary
    .filter((g) => w.startsWith(g.term.toLowerCase()))
    .sort((a, b) => b.term.length - a.term.length)[0];
}

/** Remove the [term] markers from card text. */
export const stripMarkers = (text: string) => text.replace(/\[([^\]]*)\]/g, "$1");

/** Split card text into runs; words marked as [word] become glossary runs, brackets are dropped. */
export function splitTerms(text: string, glossary: GlossaryEntry[]): TextRun[] {
  const runs: TextRun[] = [];
  let last = 0;
  for (const m of text.matchAll(/\[([^\]]*)\]/g)) {
    if (m.index! > last) runs.push({ text: text.slice(last, m.index) });
    const term = lookupTerm(m[1], glossary);
    runs.push(term ? { text: m[1], term } : { text: m[1] });
    last = m.index! + m[0].length;
  }
  if (last < text.length) runs.push({ text: text.slice(last) });
  return runs;
}

/** Marked words in a text that have no glossary entry. */
export function unknownTerms(text: string, glossary: GlossaryEntry[]): string[] {
  return [...text.matchAll(/\[([^\]]*)\]/g)].map((m) => m[1]).filter((w) => !lookupTerm(w, glossary));
}

/** The distinct glossary entries used in a text, in order of first use. */
export function termsIn(text: string, glossary: GlossaryEntry[]): GlossaryEntry[] {
  const seen = new Set<string>();
  return splitTerms(text, glossary)
    .map((r) => r.term)
    .filter((t): t is GlossaryEntry => t !== undefined && !seen.has(t.term) && seen.add(t.term) !== undefined);
}
