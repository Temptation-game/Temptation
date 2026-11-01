/** DOM builders for cards and field tiles; no game logic lives here. */
import type { CharacterDef, Faction } from "../types.ts";
import type { GlossaryEntry } from "../glossary.ts";
import { splitTerms, stripMarkers, termsIn } from "../glossary.ts";

let glossary: GlossaryEntry[] = [];

/** Set the glossary used to mark terms in card text. */
export function setGlossary(g: GlossaryEntry[]): void {
  glossary = g;
}

/** Portrait URL for a card face; files follow <id>_<nun|vampire>.webp. */
export function portraitUrl(def: CharacterDef, faction: Faction): string {
  return `portraits/${def.id}_${faction === "church" ? "nun" : "vampire"}.webp`;
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
  const text = f.text.map((t) => (f.unknown.includes(t) ? `${stripMarkers(t)} (not implemented yet)` : stripMarkers(t))).join(" ");
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

/** Definitions of the glossary terms used on a card face, as one sentence list for screen readers. */
export function cardTerms(def: CharacterDef, faction: Faction): string {
  return termsIn(def.faces[faction].text.join(" "), glossary).map((g) => `${g.term}: ${g.definition}`).join(" ");
}

let tipCount = 0;

/** Card text with glossary terms wrapped in tooltip spans; focusable terms are reachable by keyboard. */
function richText(text: string, focusable: boolean): string {
  return splitTerms(text, glossary).map((r) => {
    if (!r.term) return esc(r.text);
    const id = `tip-${++tipCount}`;
    const tip = `<span class="tip" id="${id}" role="tooltip" aria-hidden="true">${esc(r.term.term)}: ${esc(r.term.definition)}</span>`;
    return focusable
      ? `<button type="button" class="term" aria-describedby="${id}">${esc(r.text)}${tip}</button>`
      : `<span class="term">${esc(r.text)}${tip}</span>`;
  }).join("");
}

export interface CardOptions {
  /** Current Composure; the face's full value when omitted. */
  composure?: number;
  /** button: hand card with a spoken label; preview: decorative hover copy; detail: readable card in the info panel. */
  mode: "button" | "preview" | "detail";
  label?: string;
  /** Extra text for the accessible description, after the glossary definitions. */
  description?: string;
}

/** A full card (2:3, taller when the text needs it). */
export function cardEl(def: CharacterDef, faction: Faction, opts: CardOptions): HTMLElement {
  const f = def.faces[faction];
  const focusable = opts.mode === "detail";
  const text = f.text.map((t) =>
    f.unknown.includes(t)
      ? `<span class="unimpl" title="not implemented in the engine yet">${richText(t, focusable)}${focusable ? '<span class="sr-only"> (not implemented yet)</span>' : ""}</span>`
      : richText(t, focusable),
  ).join(" ");
  const comp = opts.composure ?? f.composure;
  const tag = opts.mode === "button" ? "button" : "div";
  const description = [cardTerms(def, faction), opts.description ?? ""].filter(Boolean).join(" ");
  const a11y = {
    button: `type="button" aria-label="${esc(opts.label ?? cardLabel(def, faction))}"${description ? ` aria-description="${esc(description)}"` : ""}`,
    preview: 'aria-hidden="true"',
    detail: `tabindex="-1" role="group" aria-label="${esc(f.name)}, ${sideName(faction)}, cost ${f.cost} ${faction === "church" ? "Wine" : "Blood"}, Charm ${f.charm}, Composure ${comp} of ${f.composure}"`,
  }[opts.mode];
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

/** A card that turns over on click to show its other side; `count` adds an "xN" copies badge.
 * Only one face is rendered at a time: the card squashes to zero width, swaps face, and widens again.
 */
/** A flippable card element; `showSide` turns it to a side if it is not already showing it. */
export type FlipCard = HTMLElement & { showSide(side: Faction): void };

export function flipCardEl(def: CharacterDef, start: Faction, onFlip: (shown: Faction) => void, count?: number): FlipCard {
  const other = (f: Faction): Faction => (f === "church" ? "court" : "church");
  const copies = count && count > 1 ? ` ${count} copies.` : "";
  const label = (f: Faction) => `${cardLabel(def, f)}${copies} Press to flip to the ${sideName(other(f))} side.`;
  const btn = html(`
    <button type="button" class="flip-card">
      <span class="flip-inner"></span>
      ${count && count > 1 ? `<span class="copies" aria-hidden="true">x${count}</span>` : ""}
    </button>`);
  const inner = btn.querySelector<HTMLElement>(".flip-inner")!;
  let shown = start;
  const show = () => {
    inner.replaceChildren(cardEl(def, shown, { mode: "preview" }));
    btn.setAttribute("aria-label", label(shown));
  };
  show();
  /** Turn the card to the given side, animated unless reduced motion is requested. */
  const turnTo = (side: Faction) => {
    shown = side;
    if (document.documentElement.classList.contains("reduce-motion")) return show();
    btn.classList.add("turning");
    window.setTimeout(() => { show(); btn.classList.remove("turning"); }, FLIP_HALF_MS);
  };
  btn.addEventListener("click", () => {
    if (btn.classList.contains("turning")) return;
    turnTo(other(shown));
    onFlip(shown);
  });
  const card = btn as FlipCard;
  card.showSide = (side) => { if (side !== shown) turnTo(side); };
  return card;
}

/** Duration of each half of the flip animation; matches .flip-inner's transition in style.css. */
const FLIP_HALF_MS = 160;

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

/** The other side of a face. */
export const otherSide = (f: Faction): Faction => (f === "church" ? "court" : "church");

/** Spoken summary of a card's other side, for accessible descriptions. */
export function otherSideText(def: CharacterDef, shown: Faction): string {
  return `Other side: ${cardLabel(def, otherSide(shown))}`;
}

/** Small round button that shows a card's other side in place. */
export function peekButton(name: string, pressed: boolean): HTMLButtonElement {
  return html(`
    <button type="button" class="peek-btn" aria-pressed="${pressed}" aria-label="Show ${esc(name)}'s other side" title="Show other side (F)">
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 8h13l-3.5-3.5M20 16H7l3.5 3.5"/></svg>
    </button>`) as HTMLButtonElement;
}
