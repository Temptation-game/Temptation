/** Browser entry point: start screen, match screen, input handling, AI turns and hotseat hand-over. */
import cardsMd from "../../cards.md?raw";
import glossaryMd from "../../glossary.md?raw";
import overviewMd from "../../overview.md?raw";
import town from "../../data/locations/town_square.json";
import type { Action, DeckList, Faction, GameState, LocationDef, PlayerId } from "../types.ts";
import { apply, canAct, concede, face, legalActions, newGame, occupant, opponent } from "../engine.ts";
import { parseCards } from "../cards.ts";
import { greedyAction } from "../ai/greedy.ts";
import { parseGlossary } from "../glossary.ts";
import { renderMarkdown } from "./markdown.ts";
import { cardEl, cardLabel, cardTerms, flipCardEl, setGlossary, squareName, tileEl } from "./view.ts";

type Mode = { kind: "hotseat" } | { kind: "ai"; human: PlayerId };
type Selection = { from: "hand" | "field"; uid: number } | null;
type Panel = "deck" | null;

const defs = parseCards(cardsMd);
const glossary = parseGlossary(glossaryMd);
setGlossary(glossary);
const app = document.getElementById("app")!;

let state: GameState | null = null;
let mode: Mode = { kind: "hotseat" };
let selected: Selection = null;
let panel: Panel = null;
let handOver = false;
let aiRng = 1;
let matchId = 0;
let fieldFocus = { x: 0, y: 0 };
let pendingFocus: string | null = null;
let lastLogLen = 0;
let lastPhaseKey = "";
/** Whether the history log is shown in the sidebar. */
let historyOpen = false;
/** Card shown in the keyboard detail dialog, and the control to return focus to. */
let detail: { uid: number; returnTo: string } | null = null;
/** Field girl shown in the inspect area beside the board. */
let inspected: number | null = null;
let inspectTimer: number | undefined;
let shiftHeld = false;

const announcer = document.getElementById("announcer")!;

/** Queue a message for screen readers via the persistent live region. */
function announce(msg: string): void {
  if (!msg) return;
  const p = document.createElement("p");
  p.textContent = msg;
  announcer.append(p);
  while (announcer.childElementCount > 20) announcer.firstElementChild!.remove();
}

/** Replace engine coordinates "(x,y)" with square names. */
const named = (line: string) => line.replace(/\((\d+),(\d+)\)/g, (_, x, y) => squareName(Number(x), Number(y)));

/** The player whose hand and controls are shown. */
function viewer(): PlayerId {
  return mode.kind === "ai" ? mode.human : state!.active;
}

/** Whether the human may act right now. */
function humanTurn(): boolean {
  return state !== null && state.winner === null && !handOver && state.active === viewer();
}

const AI_DELAY_MS = 450;
const factionName = (f: Faction) => (f === "church" ? "Church" : "Court");

/** Start a match in the given mode. */
function startGame(m: Mode): void {
  mode = m;
  const ids = Object.keys(defs);
  const list = Array.from({ length: 12 }, (_, i) => ids[i % ids.length]);
  const decks: [DeckList, DeckList] = [{ faction: "church", cards: list }, { faction: "court", cards: list }];
  const seed = Date.now() % 1_000_000;
  aiRng = seed;
  matchId += 1;
  state = newGame(defs, town as LocationDef, decks, seed, (seed % 2) as PlayerId);
  lastLogLen = 0;
  lastPhaseKey = "";
  pendingFocus = null;
  inspected = null;
  selected = null;
  panel = null;
  handOver = m.kind === "hotseat";
  render();
  if (m.kind === "ai" && state.active !== m.human) scheduleAi();
}

/** Apply an action, clear selection, and hand over to the AI or the other hotseat player. */
function act(a: Action): void {
  const before = state!.active;
  state = apply(state!, a);
  selected = null;
  if (state.winner === null && state.active !== before) {
    if (mode.kind === "hotseat") handOver = true;
    else if (state.active !== mode.human) scheduleAi();
  }
  render();
}

/** Queue one AI step for the current match. */
function scheduleAi(): void {
  const id = matchId;
  setTimeout(() => aiStep(id), AI_DELAY_MS);
}

/** Let the AI take one action, then reschedule itself while it is still the AI's turn. */
function aiStep(id: number): void {
  if (id !== matchId || !state || state.winner !== null || mode.kind !== "ai" || state.active === mode.human) return;
  const [a, next] = greedyAction(state, aiRng);
  aiRng = next;
  state = apply(state, a);
  render();
  if (state.winner === null && state.active !== mode.human) scheduleAi();
}

/** Legal actions belonging to the current selection. */
function selectionActions(): Action[] {
  if (!selected || !humanTurn()) return [];
  const uid = selected.uid;
  return legalActions(state!).filter((a) => "uid" in a && a.uid === uid && a.type !== "discard");
}

/** The action of the current selection that targets a square, if any. */
function actionAt(x: number, y: number): Action | undefined {
  const target = occupant(state!, { x, y });
  return selectionActions().find((a) =>
    (a.type === "play" && a.at.x === x && a.at.y === y) ||
    (a.type === "move" && a.to.x === x && a.to.y === y) ||
    (a.type === "flirt" && target !== undefined && a.target === target.uid));
}

/** Name of the face a card currently shows. */
const nameOf = (uid: number) => face(state!, uid).name;

/** Spoken description of an action, including the predicted Composure loss for flirts. */
function describe(a: Action): string {
  switch (a.type) {
    case "play": return `play ${nameOf(a.uid)} here`;
    case "move": return `move ${nameOf(a.uid)} here`;
    case "flirt": {
      const mineLoss = face(state!, a.target).charm;
      const theirLoss = face(state!, a.uid).charm;
      return `${nameOf(a.uid)} flirts with ${nameOf(a.target)}: she loses ${theirLoss} Composure, yours loses ${mineLoss}`;
    }
    default: return a.type;
  }
}

/** Announce what the current selection can do. */
function announceSelection(): void {
  if (!selected) return announce("Selection cleared.");
  const acts = selectionActions();
  if (acts.length === 0) return announce(`${nameOf(selected.uid)} selected. Nothing she can do right now.`);
  const where = (a: Action) => {
    if (a.type === "play") return squareName(a.at.x, a.at.y);
    if (a.type === "move") return squareName(a.to.x, a.to.y);
    if (a.type === "flirt") { const p = state!.cards[a.target].pos!; return `${nameOf(a.target)} on ${squareName(p.x, p.y)}`; }
    return "";
  };
  const group = (t: Action["type"], verb: string) => {
    const xs = acts.filter((a) => a.type === t).map(where);
    return xs.length ? `${verb} ${xs.join(", ")}.` : "";
  };
  announce(`${nameOf(selected.uid)} selected. ${group("play", "Can enter on")} ${group("move", "Can move to")} ${group("flirt", "Can flirt with")}`);
}

/** Click on a hand card: discard it, or select it for playing. */
function onHandClick(uid: number): void {
  if (!humanTurn()) return;
  if (state!.phase === "discard") return act({ type: "discard", uid });
  selected = selected?.uid === uid ? null : { from: "hand", uid };
  announceSelection();
  render();
}

/** Click on a field square: play or move there, flirt with whoever stands there, or (de)select. */
function onSquareClick(x: number, y: number): void {
  if (!humanTurn()) return;
  const a = actionAt(x, y);
  if (a) return act(a);
  const here = occupant(state!, { x, y });
  const mine = here && here.controller === state!.active && state!.phase === "act";
  selected = mine && selected?.uid !== here.uid ? { from: "field", uid: here.uid } : null;
  announceSelection();
  render();
}

/** Draw the start screen. */
function renderStart(): void {
  state = null;
  matchId += 1;
  app.innerHTML = `
    <main class="start">
      <h1 class="sr-only">Temptation, a trading card game</h1>
      <div class="cover-wrap">
        <img class="cover" src="cover.webp" alt="Cover art: a nun kisses the cheek of a blushing vampire in a moonlit forest.">
        <span class="age-badge" role="img" aria-label="Age rating: 16 and over">16+</span>
      </div>
      <nav class="menu" aria-label="Game mode">
        <button type="button" data-mode="hotseat">Two players, one screen</button>
        <button type="button" data-mode="church">Play Church against the AI</button>
        <button type="button" data-mode="court">Play Court against the AI</button>
        <button type="button" data-mode="rules">Rules</button>
        <button type="button" data-mode="glossary">Glossary</button>
        <button type="button" data-mode="cards">Cards</button>
      </nav>
    </main>`;
  app.querySelectorAll<HTMLButtonElement>("button").forEach((b) => b.addEventListener("click", () => {
    const m = b.dataset.mode!;
    if (m === "rules") renderRules();
    else if (m === "glossary") renderGlossary();
    else if (m === "cards") renderCardsPage();
    else if (m === "hotseat") startGame({ kind: "hotseat" });
    else startGame({ kind: "ai", human: (m === "church" ? 0 : 1) as PlayerId });
  }));
  app.querySelector<HTMLButtonElement>(`[data-mode="${startFocus}"]`)!.focus();
  startFocus = "hotseat";
}

let startFocus = "hotseat";

/** A reading page (rules, glossary) with a way back to the menu; `from` is the menu button to refocus. */
function renderPage(title: string, body: string, from: string): void {
  app.innerHTML = `
    <main class="doc-page">
      <nav aria-label="${title} navigation"><button type="button" id="back">Back to menu</button></nav>
      <article aria-labelledby="page-title">
        <h1 id="page-title" tabindex="-1">${title}</h1>
        ${body}
      </article>
    </main>`;
  const back = () => { startFocus = from; renderStart(); };
  app.querySelector("#back")!.addEventListener("click", back);
  app.querySelector(".doc-page")!.addEventListener("keydown", (e) => { if ((e as KeyboardEvent).key === "Escape") back(); });
  app.querySelector<HTMLElement>("#page-title")!.focus();
}

/** The rules from overview.md. */
function renderRules(): void {
  renderPage("Rules", renderMarkdown(overviewMd, 1), "rules");
}

/** Announce the side a flippable card now shows. */
const announceFlip = (name: string) => (f: Faction) => announce(`${name}, ${factionName(f)} side.`);

/** Every card in cards.md, Church side up; click a card to flip it. */
function renderCardsPage(): void {
  const ids = Object.keys(defs).sort((a, b) => defs[a].name.localeCompare(defs[b].name));
  renderPage("Cards", `<p class="muted">Click a card to see her other side.</p><div class="card-grid" role="list"></div>`, "cards");
  const grid = app.querySelector(".card-grid")!;
  for (const id of ids) {
    const item = document.createElement("div");
    item.setAttribute("role", "listitem");
    item.append(flipCardEl(defs[id], "church", announceFlip(defs[id].name)));
    grid.append(item);
  }
}

/** The glossary as a definition list, alphabetical. */
function renderGlossary(): void {
  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
  const entries = [...glossary].sort((a, b) => a.term.localeCompare(b.term));
  const body = `<dl class="glossary">${entries.map((e) => `<dt>${esc(e.term)}</dt><dd>${esc(e.definition)}</dd>`).join("")}</dl>`;
  renderPage("Glossary", body, "glossary");
}

/** Engine log lines with player numbers replaced by faction names and coordinates by square names. */
function readableLog(s: GameState): string[] {
  return s.log.map((l) => named(l.replace(/P([01])/g, (_, p) => factionName(s.players[Number(p)].faction))));
}

/** Announce log lines added since the last render, and the start of each of the viewer's phases. */
function announceChanges(s: GameState): void {
  const lines = readableLog(s).slice(lastLogLen);
  lastLogLen = s.log.length;
  if (lines.length) announce(lines.join(". ") + ".");
  const key = `${s.active}-${s.turn}-${s.phase}`;
  if (key === lastPhaseKey || !humanTurn()) return;
  lastPhaseKey = key;
  const p = s.players[s.active];
  const res = p.faction === "church" ? "Wine" : "Blood";
  if (s.phase === "discard") announce(`Hand limit: you hold ${p.hand.length} cards. Choose a card in your hand to discard.`);
  if (s.phase === "play") announce(`Your play phase. ${p.wine} ${res}. Choose a card in your hand, then a square.`);
  if (s.phase === "act") announce(`Your act phase. ${s.actionsLeft} actions.`);
}

/** Spoken label of a field square: name, sanctity, occupant, and the action a press would take. */
function squareLabel(s: GameState, x: number, y: number): string {
  const parts = [`${squareName(x, y)}, ${s.squares[y][x]}`];
  const c = occupant(s, { x, y });
  if (c) {
    const who = c.controller === viewer() ? "Yours" : "Opponent's";
    const resting = c.controller === s.active && !canAct(s, c) ? " Cannot act this turn." : "";
    const sel = selected?.uid === c.uid ? " Selected." : "";
    parts.push(`${who}: ${cardLabel(s.defs[c.defId], s.players[c.controller].faction, c.composure)}${resting}${sel}`);
  } else {
    parts.push("empty");
  }
  const a = selected ? actionAt(x, y) : undefined;
  if (a) parts.push(`Press to ${describe(a)}`);
  return parts.join(". ");
}

/** Move keyboard focus within the field with the arrow keys (one tab stop for the whole field). */
function onFieldKey(e: KeyboardEvent): void {
  const s = state!;
  const d: Record<string, [number, number]> = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
  const step = d[e.key];
  if (!step) return;
  e.preventDefault();
  const x = Math.min(Math.max(fieldFocus.x + step[0], 0), s.squares[0].length - 1);
  const y = Math.min(Math.max(fieldFocus.y + step[1], 0), s.squares.length - 1);
  fieldFocus = { x, y };
  app.querySelectorAll<HTMLButtonElement>(".square").forEach((b) => (b.tabIndex = -1));
  const target = app.querySelector<HTMLButtonElement>(`[data-focus="sq:${x},${y}"]`)!;
  target.tabIndex = 0;
  target.focus();
}

/** Draw the match screen: sidebar, field, hand and overlays. */
function render(): void {
  clearTimeout(inspectTimer);
  const s = state!;
  const focusKey = pendingFocus ?? (document.activeElement as HTMLElement | null)?.dataset?.focus ?? null;
  pendingFocus = null;
  const me = viewer();
  const mine = s.players[me];
  const theirs = s.players[opponent(me)];
  const myTurn = humanTurn();
  const resource = mine.faction === "church" ? "Wine" : "Blood";
  const endLabel = { discard: "Discard down to 6", play: "End play phase", act: "End turn" }[s.phase];
  const whose = mode.kind === "ai" && s.active !== me ? "AI" : factionName(s.players[s.active].faction);
  const w = s.squares[0].length;
  const h = s.squares.length;

  app.innerHTML = `
    <div class="match ${mine.faction}">
      <aside class="sidebar" aria-label="Match controls">
        <h1>Church <i>vs</i> Court</h1>
        <section class="status" aria-label="Match status">
          <p><b>${whose}</b>, ${s.phase} phase</p>
          <p>${resource}: <b>${mine.wine}</b></p>
          <p>Actions: <b>${s.phase === "act" && s.active === me ? s.actionsLeft : "none"}</b></p>
          <p class="muted">Opponent: ${theirs.hand.length} in hand, ${theirs.deck.length} in deck</p>
          <p class="muted">You (${factionName(mine.faction)}): ${mine.deck.length} in deck</p>
        </section>
        <button type="button" id="end" data-focus="btn:end" ${myTurn && s.phase !== "discard" ? "" : "disabled"}>${endLabel}</button>
        <button type="button" id="history" data-focus="btn:history" aria-expanded="${historyOpen}" aria-controls="history-log">${historyOpen ? "Hide history" : "History"}</button>
        ${historyOpen ? `<section id="history-log" class="history-inline" aria-label="History, oldest first" tabindex="0"><ol>${readableLog(s).map((l) => `<li>${l.replace(/</g, "&lt;")}</li>`).join("")}</ol></section>` : ""}
        <button type="button" id="deck" data-focus="btn:deck">My deck</button>
        <div class="spacer"></div>
        <button type="button" id="surrender" class="danger" data-focus="btn:surrender">Surrender</button>
      </aside>
      <main class="board">
        <div class="grid" role="group" style="--cols:${w}"
          aria-label="Field, Town Square: columns A to ${String.fromCharCode(64 + w)} from west to east, rows 1 to ${h} from top to bottom. Use the arrow keys to move between squares, and I for card details."></div>
      </main>
      <aside class="inspect" aria-hidden="true">
        <div class="inspect-card"></div>
        <p class="hint">Press Shift to keep open</p>
      </aside>
      <section class="hand" aria-label="Your hand, ${mine.hand.length} cards. Press I on a card for details."></section>
    </div>`;

  const grid = app.querySelector<HTMLElement>(".grid")!;
  s.squares.forEach((row, y) => row.forEach((sanctity, x) => {
    const sq = document.createElement("button");
    sq.type = "button";
    sq.className = `square ${sanctity}`;
    sq.dataset.focus = `sq:${x},${y}`;
    sq.tabIndex = fieldFocus.x === x && fieldFocus.y === y ? 0 : -1;
    sq.setAttribute("aria-label", squareLabel(s, x, y));
    const occ = occupant(s, { x, y });
    const terms = occ ? cardTerms(s.defs[occ.defId], s.players[occ.controller].faction) : "";
    if (terms) sq.setAttribute("aria-description", terms);
    sq.insertAdjacentHTML("beforeend", `<span class="coord" aria-hidden="true">${squareName(x, y)}</span>`);
    const a = selected ? actionAt(x, y) : undefined;
    if (a) sq.classList.add(`target-${a.type}`);
    const c = occupant(s, { x, y });
    if (c) {
      const tile = tileEl(s.defs[c.defId], s.players[c.controller].faction, c.composure, c.controller === s.active && !canAct(s, c));
      if (selected?.uid === c.uid) tile.classList.add("selected");
      sq.append(tile);
      sq.addEventListener("mouseenter", (e) => inspectSoon(c.uid, e.shiftKey));
      sq.addEventListener("focus", () => inspect(c.uid));
    }
    sq.addEventListener("focus", () => { fieldFocus = { x, y }; });
    sq.addEventListener("click", () => onSquareClick(x, y));
    grid.append(sq);
  }));
  grid.addEventListener("keydown", onFieldKey);
  grid.addEventListener("mouseleave", () => clearTimeout(inspectTimer));
  drawInspect();

  const hand = app.querySelector<HTMLElement>(".hand")!;
  hand.style.setProperty("--n", String(Math.max(2, mine.hand.length)));
  const playable = new Set(myTurn ? legalActions(s).filter((a) => a.type === "play").map((a) => (a as { uid: number }).uid) : []);
  const discarding = myTurn && s.phase === "discard";
  if (discarding) hand.insertAdjacentHTML("beforeend", `<p class="banner" aria-hidden="true">Hand limit: click a card to discard it</p>`);
  for (const uid of mine.hand) {
    const def = s.defs[s.cards[uid].defId];
    const hint = discarding ? " Press to discard." : playable.has(uid) ? " Can be played." : "";
    const el = cardEl(def, mine.faction, { mode: "button", label: cardLabel(def, mine.faction) + hint });
    el.dataset.focus = `hand:${uid}`;
    el.setAttribute("aria-pressed", String(selected?.uid === uid));
    if (playable.has(uid)) el.classList.add("playable");
    if (discarding) el.classList.add("discardable");
    if (selected?.uid === uid) el.classList.add("selected");
    el.addEventListener("click", () => onHandClick(uid));
    hand.append(el);
  }

  app.querySelector("#end")!.addEventListener("click", () => {
    if (!humanTurn()) return;
    act({ type: s.phase === "play" ? "endPlay" : "endTurn" });
  });
  app.querySelector("#history")!.addEventListener("click", () => { historyOpen = !historyOpen; pendingFocus = "btn:history"; render(); });
  const log = app.querySelector<HTMLElement>("#history-log");
  if (log) log.scrollTop = log.scrollHeight;
  app.querySelector("#deck")!.addEventListener("click", () => { panel = "deck"; render(); });
  app.querySelector("#surrender")!.addEventListener("click", () => {
    if (s.winner === null && confirm("Surrender this match?")) { state = concede(s, me); render(); }
  });

  announceChanges(s);

  let dialogFocus: HTMLElement | null = null;
  if (panel === "deck") dialogFocus = renderDeckView();
  if (detail) dialogFocus = renderDetail(detail.uid);
  if (handOver && s.winner === null) {
    dialogFocus = overlay(`${factionName(s.players[s.active].faction)}'s turn`, `<p>Pass the device, then continue.</p>
      <button type="button" id="ready">Continue</button>`);
    app.querySelector("#ready")!.addEventListener("click", () => { handOver = false; pendingFocus = "btn:end"; render(); });
  }
  if (s.winner !== null) {
    const youWon = mode.kind === "ai" ? (s.winner === mode.human ? "You win!" : "The AI wins.") : "";
    dialogFocus = overlay(`${factionName(s.players[s.winner].faction)} wins`, `<p>${youWon}</p>
      <button type="button" id="again">Play again</button><button type="button" id="menu">Main menu</button>`);
    app.querySelector("#again")!.addEventListener("click", () => startGame(mode));
    app.querySelector("#menu")!.addEventListener("click", renderStart);
  }

  if (dialogFocus) {
    app.querySelector(".match")!.setAttribute("inert", "");
    dialogFocus.focus();
  } else if (focusKey) {
    const el = app.querySelector<HTMLElement>(`[data-focus="${focusKey}"]`);
    (el && !(el as HTMLButtonElement).disabled ? el : app.querySelector<HTMLElement>("#history"))?.focus();
  }
}

/** The viewer's remaining deck as flippable cards, one per card with a copies badge, in name order. */
function renderDeckView(): HTMLElement {
  const s = state!;
  const mine = s.players[viewer()];
  const counts = new Map<string, number>();
  for (const uid of mine.deck) counts.set(s.cards[uid].defId, (counts.get(s.cards[uid].defId) ?? 0) + 1);
  const ids = [...counts.keys()].sort((a, b) => s.defs[a].name.localeCompare(s.defs[b].name));
  app.insertAdjacentHTML("beforeend", `
    <div class="overlay deck-view"><div class="dialog" role="dialog" aria-modal="true" aria-labelledby="deck-title">
      <h2 id="deck-title">My deck: ${mine.deck.length} cards left</h2>
      <p class="muted">Sorted by name, so the draw order stays hidden. Click a card to see her other side.</p>
      <div class="card-grid" role="list"></div>
      <button type="button" id="close-deck">Close</button>
    </div></div>`);
  const grid = app.querySelector(".deck-view .card-grid")!;
  if (ids.length === 0) grid.innerHTML = '<p role="listitem">Your deck is empty.</p>';
  for (const id of ids) {
    const item = document.createElement("div");
    item.setAttribute("role", "listitem");
    item.append(flipCardEl(s.defs[id], mine.faction, announceFlip(s.defs[id].name), counts.get(id)));
    grid.append(item);
  }
  const close = () => { panel = null; pendingFocus = "btn:deck"; render(); };
  app.querySelector("#close-deck")!.addEventListener("click", close);
  app.querySelector(".deck-view")!.addEventListener("keydown", (e) => { if ((e as KeyboardEvent).key === "Escape") { e.stopPropagation(); close(); } });
  return app.querySelector<HTMLElement>(".deck-view .flip-card") ?? app.querySelector<HTMLElement>("#close-deck")!;
}

/** Show a modal dialog over the match; returns the element that should take focus. */
function overlay(title: string, inner: string): HTMLElement {
  app.insertAdjacentHTML("beforeend", `
    <div class="overlay"><div class="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
      <h2 id="dialog-title">${title}</h2>${inner}</div></div>`);
  return app.querySelector<HTMLElement>(".dialog button")!;
}


/** Show a field girl in the inspect area after a short delay, unless Shift keeps the current one. */
function inspectSoon(uid: number, shift: boolean): void {
  clearTimeout(inspectTimer);
  if (shift || shiftHeld) return;
  inspectTimer = window.setTimeout(() => inspect(uid), 120);
}

/** Show a field girl in the inspect area now, unless Shift keeps the current one. */
function inspect(uid: number): void {
  if (shiftHeld && inspected !== null) return;
  inspected = uid;
  drawInspect();
}

/** Redraw the inspect area from the current state; decorative, the square labels carry the same information. */
function drawInspect(): void {
  const box = app.querySelector<HTMLElement>(".inspect-card");
  if (!box || !state) return;
  box.replaceChildren();
  if (inspected === null) {
    box.innerHTML = '<p class="muted">Hover a girl on the field to inspect her.</p>';
    return;
  }
  const c = state.cards[inspected];
  const composure = c.zone === "field" ? c.composure : undefined;
  box.append(cardEl(state.defs[c.defId], state.players[c.controller].faction, { composure, mode: "preview" }));
}

document.addEventListener("keydown", (e) => { if (e.key === "Shift") shiftHeld = true; });
document.addEventListener("keyup", (e) => { if (e.key === "Shift") shiftHeld = false; });
window.addEventListener("blur", () => { shiftHeld = false; });

/** The card in the keyboard detail dialog, with focusable glossary terms; returns the element to focus. */
function renderDetail(uid: number): HTMLElement {
  const s = state!;
  const c = s.cards[uid];
  const faction = s.players[c.controller].faction;
  const card = cardEl(s.defs[c.defId], faction, { composure: c.zone === "field" ? c.composure : undefined, mode: "detail" });
  app.insertAdjacentHTML("beforeend", `
    <div class="overlay detail"><div class="dialog" role="dialog" aria-modal="true" aria-labelledby="detail-title">
      <h2 id="detail-title">Card details</h2>
      <div class="detail-card"></div>
      <p class="muted">Tab through highlighted words for their meaning. Escape to close.</p>
      <button type="button" id="close-detail">Close</button>
    </div></div>`);
  app.querySelector(".detail-card")!.append(card);
  const close = () => { pendingFocus = detail!.returnTo; detail = null; render(); };
  app.querySelector("#close-detail")!.addEventListener("click", close);
  app.querySelector(".overlay.detail")!.addEventListener("keydown", (e) => { if ((e as KeyboardEvent).key === "Escape") { e.stopPropagation(); close(); } });
  return card;
}

/** I on a focused field square or hand card opens its detail dialog. */
document.addEventListener("keydown", (e) => {
  if ((e.key !== "i" && e.key !== "I") || !state || detail || panel) return;
  const key = (document.activeElement as HTMLElement | null)?.dataset?.focus ?? "";
  let uid: number | undefined;
  if (key.startsWith("hand:")) uid = Number(key.slice(5));
  if (key.startsWith("sq:")) {
    const [x, y] = key.slice(3).split(",").map(Number);
    uid = occupant(state, { x, y })?.uid;
  }
  if (uid === undefined) return;
  e.preventDefault();
  detail = { uid, returnTo: key };
  render();
});

/** Escape clears the current selection. */
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && state && selected && !panel && !detail) {
    selected = null;
    announceSelection();
    render();
  }
});

renderStart();
