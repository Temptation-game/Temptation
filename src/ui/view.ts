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

/** Small inline SVG icons: heart for Charm, shield for Composure. */
export function icon(kind: "charm" | "composure"): string {
  return `<svg class="icon icon-${kind}" viewBox="0 0 24 24">${SVG[kind]}</svg>`;
}

const esc = (t: string) => t.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

/** Build an element from an HTML string. */
function html(markup: string): HTMLElement {
  const t = document.createElement("template");
  t.innerHTML = markup.trim();
  return t.content.firstElementChild as HTMLElement;
}

/** A full 2:3 card for the hand and the hover preview; composure shows the current value when given. */
export function cardEl(def: CharacterDef, faction: Faction, composure?: number): HTMLElement {
  const f = def.faces[faction];
  const text = f.text.map((t) =>
    f.unknown.includes(t) ? `<span class="unimpl" title="not implemented in the engine yet">${esc(t)}</span>` : esc(t),
  ).join(" ");
  const comp = composure ?? f.composure;
  return html(`
    <div class="card ${faction}">
      <div class="cost"><span>${f.cost}</span></div>
      <img class="portrait" src="${portraitUrl(def, faction)}" alt="${esc(f.name)}" draggable="false">
      <div class="name">${esc(f.name)}</div>
      <div class="text">${text}</div>
      <div class="stats">
        <span class="stat">${icon("charm")}${f.charm}</span>
        <span class="stat ${comp < f.composure ? "hurt" : ""}">${comp}${icon("composure")}</span>
      </div>
    </div>`);
}

/** A compact square tile for a character on the field. */
export function tileEl(def: CharacterDef, faction: Faction, composure: number, resting: boolean): HTMLElement {
  const f = def.faces[faction];
  return html(`
    <div class="tile ${faction} ${resting ? "resting" : ""}">
      <img src="${portraitUrl(def, faction)}" alt="${esc(f.name)}" draggable="false">
      <span class="slot item"></span>
      <span class="slot condition">${resting ? "Zz" : ""}</span>
      <span class="badge charm">${icon("charm")}${f.charm}</span>
      <span class="badge composure ${composure < f.composure ? "hurt" : ""}">${composure}${icon("composure")}</span>
    </div>`);
}
