/** Parser for cards.md (the human-authored card list) and the registry of implemented ability texts.
 * Usage: const defs = parseCards(readFileSync("cards.md", "utf8"));
 */
import type { AbilityId, CharacterDef, Faction, FaceStats } from "./types.ts";
import { stripMarkers } from "./glossary.ts";

/** Implemented ability sentences, normalised (lower case, no [term] markers, no final full stop). Keywords come from glossary.md. */
const ABILITY_TEXT: Record<string, AbilityId> = {
  "adventurous": "adventurous",
  "when this character would have been tempted, convert her instead": "convertInsteadOfTempt",
};

const normalise = (sentence: string) => stripMarkers(sentence).trim().replace(/\.$/, "").toLowerCase();

/** Split a description line into sentences, keeping their full stops. */
function sentences(line: string): string[] {
  return line.split(/(?<=\.)\s+/).map((x) => x.trim()).filter(Boolean);
}

/** Build a face from its stat line and description lines. */
function makeFace(name: string, stats: number[], lines: string[]): FaceStats {
  const [cost, charm, composure] = stats;
  const text = lines.flatMap(sentences);
  const abilities: AbilityId[] = [];
  const unknown: string[] = [];
  for (const t of text) {
    const id = ABILITY_TEXT[normalise(t)];
    if (id) abilities.push(id);
    else unknown.push(t);
  }
  return { name, cost, charm, composure, text, abilities, unknown };
}

/** Parse cards.md into card definitions keyed by id (the lower-cased name). */
export function parseCards(md: string): Record<string, CharacterDef> {
  const body = md.replace(/<!--[\s\S]*?-->/g, "");
  const defs: Record<string, CharacterDef> = {};
  for (const block of body.split(/^## /m).slice(1)) {
    const [header, ...rest] = block.split("\n");
    const name = header.trim();
    const id = name.toLowerCase().replace(/\s+/g, "_");
    const faces: Partial<Record<Faction, FaceStats>> = {};
    let current: { faction: Faction; stats: number[]; lines: string[] } | null = null;
    const flush = () => {
      if (current) faces[current.faction] = makeFace(name, current.stats, current.lines);
    };
    for (const raw of rest) {
      const line = raw.trim();
      const stat = line.match(/^([nv])\s+(\d+)\s+(\d+)\s+(\d+)$/);
      if (stat) {
        flush();
        current = {
          faction: stat[1] === "n" ? "church" : "court",
          stats: stat.slice(2).map(Number),
          lines: [],
        };
      } else if (line && current) {
        current.lines.push(line);
      }
    }
    flush();
    if (!faces.church || !faces.court) throw new Error(`card '${name}' needs both an n and a v line`);
    defs[id] = { id, name, faces: faces as Record<Faction, FaceStats> };
  }
  return defs;
}
