/** DOM builders for cards and field tiles; no game logic lives here. */
import type { CharacterDef, Faction } from "../types.ts";

/** Portrait URL for a card face; files follow <id>_<nun|vampire>.webp. */
export function portraitUrl(def: CharacterDef, faction: Faction): string {
  return `/portraits/${def.id}_${faction === "church" ? "nun" : "vampire"}.webp`;
}

const SVG = {
  charm: '<path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.2 0 3.6 1.2 4.3 2.4.7-1.2 2.1-2.4 4.3-2.4 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z"/>',
  composure: '<path d="M12 2l8 3v6c0 5.2-3.4 9.3-8 11-4.6-1.7-8-5.8-8-11V5z"/>',
};

/** Small inline SVG icons: heart for Charm, shield for Composure; hidden from screen readers. */
export function icon(kind: "charm" | "composure"): string {
  return `<svg class="icon icon-${kind}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${SVG[kind]}</svg>`;
}

/** Chess-style square name: columns A, B, C... west to east, rows 1, 2, 3... top to bottom. */
export function squareName(x: number, y: number): string {
  return `${String.fromCharCode(65 + x)}${y + 1}`;
}

const sideName = (f: Faction) => (f === "church" ? "Church" : "Court");

/** Spoken description of a card face: name, side, cost, stats and text. */
export function cardLabel(def: CharacterDef, faction: Faction, composure?: number): string {
  const f = def.faces[faction];
  const comp = composure === undefined ? `Composure ${f.composure}` : `Composure ${composure} of ${f.composure}`;
  const text = f.text.map((t) => (f.unknown.includes(t) ? `${t} (not implemented yet)` : t)).join(" ");
  const cost = `cost ${f.cost} ${faction === "church" ? "Wine" : "Blood"}`;
  return `${f.name}, ${sideName(faction)}, ${cost}, Charm ${f.charm}, ${comp}.${text ? " " + text : ""}`;
}

const esc = (t: string) => t.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

/** Build an element from an HTML string. */
function html(markup: string): HTMLElement {
  const t = document.createElement("template");
  t.innerHTML = markup.trim();
  return t.content.firstElementChild as HTMLElement;
}

/** A full 2:3 card. As a button (hand) it carries a spoken label; otherwise (preview) it is hidden from screen readers. */
export function cardEl(def: CharacterDef, faction: Faction, composure?: number, label?: string): HTMLElement {
  const f = def.faces[faction];
  const text = f.text.map((t) =>
    f.unknown.includes(t) ? `<span class="unimpl" title="not implemented in the engine yet">${esc(t)}</span>` : esc(t),
  ).join(" ");
  const comp = composure ?? f.composure;
  const tag = label === undefined ? "div" : "button";
  const a11y = label === undefined ? 'aria-hidden="true"' : `type="button" aria-label="${esc(label)}"`;
  return html(`
    <${tag} class="card ${faction}" ${a11y}>
      <span class="cost"><span>${f.cost}</span></span>
      <img class="portrait" src="${portraitUrl(def, faction)}" alt="" draggable="false">
      <span class="name">${esc(f.name)}</span>
      <span class="text">${text}</span>
      <span class="stats">
        <span class="stat">${icon("charm")}${f.charm}</span>
        <span class="stat ${comp < f.composure ? "hurt" : ""}">${comp}${icon("composure")}</span>
      </span>
    </${tag}>`);
}

/** A compact square tile for a character on the field; decorative, the square's button carries the label. */
export function tileEl(def: CharacterDef, faction: Faction, composure: number, resting: boolean): HTMLElement {
  const f = def.faces[faction];
  return html(`
    <span class="tile ${faction} ${resting ? "resting" : ""}" aria-hidden="true">
      <img src="${portraitUrl(def, faction)}" alt="" draggable="false">
      <span class="slot item"></span>
      <span class="slot condition">${resting ? "Zz" : ""}</span>
      <span class="badge charm">${icon("charm")}${f.charm}</span>
      <span class="badge composure ${composure < f.composure ? "hurt" : ""}">${composure}${icon("composure")}</span>
    </span>`);
}
