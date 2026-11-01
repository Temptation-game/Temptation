/** Pure rules core: build a game, list legal actions, apply an action to get the next state.
 * Usage: let s = newGame(defs, location, decks, seed); s = apply(s, legalActions(s)[0]);
 */
import type {
  AbilityId, Action, CardInstance, CharacterDef, DeckList, Faction, FaceStats,
  GameState, LocationDef, PlayerId, PlayerState, Pos, Sanctity,
} from "./types.ts";
import { RULES } from "./config/rules.ts";
import { shuffle } from "./rng.ts";

// ---------- helpers ----------

/** The other player. */
export function opponent(p: PlayerId): PlayerId {
  return p === 0 ? 1 : 0;
}

/** The stats of the face a card currently shows (its controller's faction). */
export function face(s: GameState, uid: number): FaceStats {
  const card = s.cards[uid];
  return s.defs[card.defId].faces[s.players[card.controller].faction];
}

/** The card standing on a square, if any. */
export function occupant(s: GameState, p: Pos): CardInstance | undefined {
  return Object.values(s.cards).find(
    (c) => c.zone === "field" && c.pos !== null && c.pos.x === p.x && c.pos.y === p.y,
  );
}

/** In-bounds orthogonal neighbours of a square. */
export function neighbours(s: GameState, p: Pos): Pos[] {
  const h = s.squares.length;
  const w = s.squares[0].length;
  return [
    { x: p.x, y: p.y - 1 }, { x: p.x + 1, y: p.y },
    { x: p.x, y: p.y + 1 }, { x: p.x - 1, y: p.y },
  ].filter((q) => q.x >= 0 && q.x < w && q.y >= 0 && q.y < h);
}

/** The square sanctity a faction may enter the field on. */
function entrySanctity(f: Faction): Sanctity {
  return f === "church" ? "holy" : "unholy";
}

/** Characters on the field controlled by a player. */
function fieldOf(s: GameState, p: PlayerId): CardInstance[] {
  return Object.values(s.cards).filter((c) => c.zone === "field" && c.controller === p);
}

/** Whether the card's current face has an ability. */
export function hasAbility(s: GameState, uid: number, id: AbilityId): boolean {
  return face(s, uid).abilities.includes(id);
}

/** Characters cannot act on the turn they entered unless Adventurous. */
export function canAct(s: GameState, c: CardInstance): boolean {
  return c.enteredOn !== s.turn || hasAbility(s, c.uid, "adventurous");
}

/** Whether two squares are orthogonally adjacent. */
function adjacent(a: Pos, b: Pos): boolean {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
}

// ---------- setup ----------

/** Parse a location's row strings into a sanctity grid. */
export function parseLocation(loc: LocationDef): Sanctity[][] {
  const symbols: Record<string, Sanctity> = { H: "holy", ".": "neutral", U: "unholy" };
  return loc.rows.map((row) =>
    [...row].map((ch) => {
      const v = symbols[ch];
      if (!v) throw new Error(`location ${loc.id}: unknown square symbol '${ch}'`);
      return v;
    }),
  );
}

/** Create a match: validate decks, shuffle, deal opening hands, start the first turn. */
export function newGame(
  defs: Record<string, CharacterDef>, location: LocationDef,
  decks: [DeckList, DeckList], seed: number, firstPlayer: PlayerId = 0,
): GameState {
  const factions = decks.map((d) => d.faction).sort().join();
  if (factions !== "church,court") throw new Error("a match needs one Church deck and one Court deck");

  const cards: Record<number, CardInstance> = {};
  let uid = 0;
  let rng = seed | 0;
  const players = decks.map((deck, i) => {
    const p = i as PlayerId;
    const ids: number[] = [];
    for (const defId of deck.cards) {
      if (!defs[defId]) throw new Error(`unknown card '${defId}'`);
      cards[uid] = { uid, defId, owner: p, controller: p, zone: "deck", composure: 0, pos: null, enteredOn: -1 };
      ids.push(uid++);
    }
    rng = shuffle(ids, rng);
    const hand = ids.splice(0, RULES.startingHand);
    for (const h of hand) cards[h].zone = "hand";
    return { faction: deck.faction, deck: ids, hand, discard: [], wine: 0, turnNumber: 0 };
  }) as [PlayerState, PlayerState];

  const s: GameState = {
    defs, squares: parseLocation(location), cards, players, married: [],
    firstPlayer, turn: 0, active: firstPlayer, phase: "play", actionsLeft: 0,
    winner: null, rng, log: [],
  };
  startTurn(s);
  return s;
}

// ---------- turn flow ----------

/** Run the start phase for the active player: draw, then discard phase or Wine reset. */
function startTurn(s: GameState): void {
  const p = s.players[s.active];
  p.turnNumber += 1;
  s.turn += 1;
  const drawn = p.deck.shift();
  if (drawn !== undefined) {
    p.hand.push(drawn);
    s.cards[drawn].zone = "hand";
  }
  s.log.push(`P${s.active} turn ${p.turnNumber}${drawn === undefined ? " (deck empty)" : ""}`);
  if (p.hand.length > RULES.handLimit) s.phase = "discard";
  else enterPlayPhase(s);
}

/** Reset Wine/Blood and enter the play phase. */
function enterPlayPhase(s: GameState): void {
  const p = s.players[s.active];
  const secondFirst = p.turnNumber === 1 && s.active !== s.firstPlayer;
  p.wine = secondFirst ? RULES.secondPlayerFirstWine : Math.min(p.turnNumber, RULES.wineCap);
  s.phase = "play";
}

// ---------- queries ----------

/** All actions the active player may take right now. */
export function legalActions(s: GameState): Action[] {
  if (s.winner !== null) return [];
  const me = s.active;
  const p = s.players[me];

  if (s.phase === "discard") return p.hand.map((uid) => ({ type: "discard", uid }));

  if (s.phase === "play") {
    const out: Action[] = [{ type: "endPlay" }];
    const want = entrySanctity(p.faction);
    const free: Pos[] = [];
    s.squares.forEach((row, y) => row.forEach((sq, x) => {
      if (sq === want && !occupant(s, { x, y })) free.push({ x, y });
    }));
    for (const uid of p.hand) {
      if (face(s, uid).cost > p.wine) continue;
      for (const at of free) out.push({ type: "play", uid, at });
    }
    return out;
  }

  const out: Action[] = [{ type: "endTurn" }];
  if (s.actionsLeft <= 0) return out;
  for (const c of fieldOf(s, me)) {
    if (!canAct(s, c)) continue;
    for (const q of neighbours(s, c.pos!)) {
      const other = occupant(s, q);
      if (!other) out.push({ type: "move", uid: c.uid, to: q });
      else if (other.controller !== me) out.push({ type: "flirt", uid: c.uid, target: other.uid });
    }
  }
  return out;
}

// ---------- transitions ----------

/** Apply an action to a copy of the state and return the copy; throws on illegal actions. */
export function apply(state: GameState, action: Action): GameState {
  const key = JSON.stringify(action);
  if (!legalActions(state).some((a) => JSON.stringify(a) === key)) {
    throw new Error(`illegal action ${key}`);
  }
  const s = structuredClone(state);
  const me = s.active;
  const p = s.players[me];

  switch (action.type) {
    case "discard": {
      p.hand = p.hand.filter((u) => u !== action.uid);
      const c = s.cards[action.uid];
      c.zone = "discard";
      s.players[c.owner].discard.push(c.uid);
      s.log.push(`P${me} discards ${s.defs[c.defId].id}`);
      if (p.hand.length <= RULES.handLimit) enterPlayPhase(s);
      break;
    }
    case "play": {
      const c = s.cards[action.uid];
      p.wine -= face(s, c.uid).cost;
      p.hand = p.hand.filter((u) => u !== c.uid);
      c.zone = "field";
      c.pos = { ...action.at };
      c.composure = face(s, c.uid).composure;
      c.enteredOn = s.turn;
      s.log.push(`P${me} plays ${face(s, c.uid).name} at (${c.pos.x},${c.pos.y})`);
      break;
    }
    case "endPlay": {
      if (fieldOf(s, me).length === 0) {
        s.winner = opponent(me);
        s.log.push(`P${me} has no characters on the field: P${s.winner} wins`);
      } else {
        s.phase = "act";
        s.actionsLeft = RULES.actionsPerTurn;
      }
      break;
    }
    case "move": {
      s.cards[action.uid].pos = { ...action.to };
      s.log.push(`${face(s, action.uid).name} moves to (${action.to.x},${action.to.y})`);
      s.actionsLeft -= 1;
      break;
    }
    case "flirt": {
      resolveFlirt(s, action.uid, action.target);
      s.actionsLeft -= 1;
      break;
    }
    case "endTurn": {
      s.active = opponent(me);
      startTurn(s);
      break;
    }
  }
  return s;
}

/** Both characters lose Composure equal to the other's Charm; then tempt or marry. */
function resolveFlirt(s: GameState, attacker: number, target: number): void {
  const a = s.cards[attacker];
  const t = s.cards[target];
  const toA = face(s, t.uid).charm;
  const toT = face(s, a.uid).charm;
  s.log.push(`${face(s, a.uid).name} flirts with ${face(s, t.uid).name} (-${toT} / -${toA})`);
  a.composure -= toA;
  t.composure -= toT;
  const aOut = a.composure <= 0;
  const tOut = t.composure <= 0;
  if (aOut && tOut) {
    s.log.push(`${face(s, a.uid).name} and ${face(s, t.uid).name} get married`);
    marry(s, a);
    marry(s, t);
  } else {
    if (aOut) tempt(s, a);
    if (tOut) tempt(s, t);
  }
}

/** Remove a character from the field into the opposing player's hand, unless she converts instead. */
function tempt(s: GameState, c: CardInstance): void {
  const to = opponent(c.controller);
  if (hasAbility(s, c.uid, "convertInsteadOfTempt")) {
    convert(s, c);
    return;
  }
  s.log.push(`${face(s, c.uid).name} is tempted to P${to}`);
  c.controller = to;
  c.zone = "hand";
  c.pos = null;
  c.composure = 0;
  s.players[to].hand.push(c.uid);
}

/** Flip a character to the other side in place, restoring the new face's full Composure. */
function convert(s: GameState, c: CardInstance): void {
  c.controller = opponent(c.controller);
  c.composure = face(s, c.uid).composure;
  s.log.push(`${face(s, c.uid).name} converts to P${c.controller}`);
}

/** Remove a character from the game for good. */
function marry(s: GameState, c: CardInstance): void {
  c.zone = "married";
  c.pos = null;
  s.married.push(c.uid);
}

/** A player surrenders; available to the UI at any time, never offered to AIs as a legal action. */
export function concede(state: GameState, p: PlayerId): GameState {
  if (state.winner !== null) return state;
  const s = structuredClone(state);
  s.winner = opponent(p);
  s.log.push(`P${p} surrenders: P${s.winner} wins`);
  return s;
}
