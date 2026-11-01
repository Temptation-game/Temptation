/** Browser entry point: start screen, match screen, input handling, AI turns and hotseat hand-over. */
import cardsMd from "../../cards.md?raw";
import town from "../../data/locations/town_square.json";
import type { Action, DeckList, Faction, GameState, LocationDef, PlayerId } from "../types.ts";
import { apply, canAct, concede, legalActions, newGame, occupant, opponent } from "../engine.ts";
import { parseCards } from "../cards.ts";
import { greedyAction } from "../ai/greedy.ts";
import { cardEl, tileEl } from "./view.ts";

type Mode = { kind: "hotseat" } | { kind: "ai"; human: PlayerId };
type Selection = { from: "hand" | "field"; uid: number } | null;
type Panel = "history" | "deck" | null;

const defs = parseCards(cardsMd);
const app = document.getElementById("app")!;

let state: GameState | null = null;
let mode: Mode = { kind: "hotseat" };
let selected: Selection = null;
let panel: Panel = null;
let handOver = false;
let aiRng = 1;
let matchId = 0;

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

/** Click on a hand card: discard it, or select it for playing. */
function onHandClick(uid: number): void {
  if (!humanTurn()) return;
  if (state!.phase === "discard") return act({ type: "discard", uid });
  selected = selected?.uid === uid ? null : { from: "hand", uid };
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
  render();
}

/** Draw the start screen. */
function renderStart(): void {
  state = null;
  matchId += 1;
  app.innerHTML = `
    <div class="start">
      <img class="cover" src="/cover.webp" alt="Temptation cover">
      <div class="menu">
        <button data-mode="hotseat">Two players, one screen</button>
        <button data-mode="church">Play Church against the AI</button>
        <button data-mode="court">Play Court against the AI</button>
      </div>
    </div>`;
  app.querySelectorAll<HTMLButtonElement>("button").forEach((b) => b.addEventListener("click", () => {
    const m = b.dataset.mode!;
    if (m === "hotseat") startGame({ kind: "hotseat" });
    else startGame({ kind: "ai", human: (m === "church" ? 0 : 1) as PlayerId });
  }));
}

/** Engine log lines with player numbers replaced by faction names. */
function readableLog(s: GameState): string[] {
  return s.log.map((l) => l.replace(/P([01])/g, (_, p) => factionName(s.players[Number(p)].faction)));
}

/** Draw the match screen: sidebar, field, hand and overlays. */
function render(): void {
  hidePreview();
  const s = state!;
  const me = viewer();
  const mine = s.players[me];
  const theirs = s.players[opponent(me)];
  const myTurn = humanTurn();
  const resource = mine.faction === "church" ? "Wine" : "Blood";
  const endLabel = { discard: "Discard down to 6", play: "End play phase", act: "End turn" }[s.phase];
  const whose = mode.kind === "ai" && s.active !== me ? "AI" : factionName(s.players[s.active].faction);

  app.innerHTML = `
    <div class="match ${mine.faction}">
      <aside class="sidebar">
        <h1>Church <i>vs</i> Court</h1>
        <div class="status">
          <div><b>${whose}</b>, ${s.phase} phase</div>
          <div>${resource}: <b>${mine.wine}</b></div>
          <div>Actions: <b>${s.phase === "act" && s.active === me ? s.actionsLeft : "-"}</b></div>
          <div class="muted">Opponent: ${theirs.hand.length} in hand, ${theirs.deck.length} in deck</div>
          <div class="muted">You: ${mine.deck.length} in deck</div>
        </div>
        <button id="end" ${myTurn && s.phase !== "discard" ? "" : "disabled"}>${endLabel}</button>
        <button id="history">History</button>
        <button id="deck">My deck</button>
        <div class="spacer"></div>
        <button id="surrender" class="danger">Surrender</button>
      </aside>
      <main class="board"><div class="grid" style="--cols:${s.squares[0].length}"></div></main>
      <footer class="hand"></footer>
    </div>`;

  const grid = app.querySelector<HTMLElement>(".grid")!;
  s.squares.forEach((row, y) => row.forEach((sanctity, x) => {
    const sq = document.createElement("div");
    sq.className = `square ${sanctity}`;
    const a = selected ? actionAt(x, y) : undefined;
    if (a) sq.classList.add(`target-${a.type}`);
    const c = occupant(s, { x, y });
    if (c) {
      const faction = s.players[c.controller].faction;
      const tile = tileEl(s.defs[c.defId], faction, c.composure, c.controller === s.active && !canAct(s, c));
      if (selected?.uid === c.uid) tile.classList.add("selected");
      tile.addEventListener("mouseenter", () => showPreview(tile, c.uid));
      tile.addEventListener("mouseleave", hidePreview);
      sq.append(tile);
    }
    sq.addEventListener("click", () => onSquareClick(x, y));
    grid.append(sq);
  }));

  const hand = app.querySelector<HTMLElement>(".hand")!;
  hand.style.setProperty("--n", String(Math.max(2, mine.hand.length)));
  const playable = new Set(myTurn ? legalActions(s).filter((a) => a.type === "play").map((a) => (a as { uid: number }).uid) : []);
  if (myTurn && s.phase === "discard") hand.insertAdjacentHTML("beforeend", `<div class="banner">Hand limit: click a card to discard it</div>`);
  for (const uid of mine.hand) {
    const el = cardEl(s.defs[s.cards[uid].defId], mine.faction);
    if (playable.has(uid)) el.classList.add("playable");
    if (myTurn && s.phase === "discard") el.classList.add("discardable");
    if (selected?.uid === uid) el.classList.add("selected");
    el.addEventListener("click", () => onHandClick(uid));
    hand.append(el);
  }

  app.querySelector("#end")!.addEventListener("click", () => {
    if (!humanTurn()) return;
    act({ type: s.phase === "play" ? "endPlay" : "endTurn" });
  });
  app.querySelector("#history")!.addEventListener("click", () => { panel = panel === "history" ? null : "history"; render(); });
  app.querySelector("#deck")!.addEventListener("click", () => { panel = panel === "deck" ? null : "deck"; render(); });
  app.querySelector("#surrender")!.addEventListener("click", () => {
    if (s.winner === null && confirm("Surrender this match?")) { state = concede(s, me); render(); }
  });

  if (panel) renderPanel(panel);
  if (handOver && s.winner === null) {
    overlay(`<h2>${factionName(s.players[s.active].faction)}'s turn</h2><p>Pass the device, then continue.</p>
      <button id="ready">Continue</button>`);
    app.querySelector("#ready")!.addEventListener("click", () => { handOver = false; render(); });
  }
  if (s.winner !== null) {
    const w = factionName(s.players[s.winner].faction);
    const youWon = mode.kind === "ai" ? (s.winner === mode.human ? "You win!" : "The AI wins.") : "";
    overlay(`<h2>${w} wins</h2><p>${youWon}</p>
      <button id="again">Play again</button><button id="menu">Main menu</button>`);
    app.querySelector("#again")!.addEventListener("click", () => startGame(mode));
    app.querySelector("#menu")!.addEventListener("click", renderStart);
  }
}

/** Show a modal box over the match. */
function overlay(inner: string): void {
  app.insertAdjacentHTML("beforeend", `<div class="overlay"><div class="dialog">${inner}</div></div>`);
}

/** History or deck contents in a closable side panel. */
function renderPanel(p: "history" | "deck"): void {
  const s = state!;
  let body: string;
  if (p === "history") {
    body = readableLog(s).map((l) => `<li>${l.replace(/</g, "&lt;")}</li>`).join("");
  } else {
    const counts: Record<string, number> = {};
    for (const uid of s.players[viewer()].deck) {
      const name = s.defs[s.cards[uid].defId].name;
      counts[name] = (counts[name] ?? 0) + 1;
    }
    body = Object.entries(counts).sort().map(([n, k]) => `<li>${n} x${k}</li>`).join("") || "<li>Empty</li>";
  }
  app.insertAdjacentHTML("beforeend", `
    <div class="panel"><h2>${p === "history" ? "History" : "My deck"}</h2><ul>${body}</ul>
    <button id="close-panel">Close</button></div>`);
  const list = app.querySelector<HTMLElement>(".panel ul")!;
  list.scrollTop = list.scrollHeight;
  app.querySelector("#close-panel")!.addEventListener("click", () => { panel = null; render(); });
}

/** Full-card preview next to a field tile. */
function showPreview(tile: HTMLElement, uid: number): void {
  hidePreview();
  const s = state!;
  const c = s.cards[uid];
  const el = cardEl(s.defs[c.defId], s.players[c.controller].faction, c.composure);
  el.classList.add("preview");
  const r = tile.getBoundingClientRect();
  const left = r.right + 12 + 200 > window.innerWidth ? r.left - 212 : r.right + 12;
  el.style.left = `${left}px`;
  el.style.top = `${Math.max(8, Math.min(r.top - 40, window.innerHeight - 320))}px`;
  document.body.append(el);
}

/** Remove the hover preview. */
function hidePreview(): void {
  document.querySelectorAll(".card.preview").forEach((e) => e.remove());
}

renderStart();
