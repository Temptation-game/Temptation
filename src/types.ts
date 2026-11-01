/** Core data model: card definitions, locations, game state and player actions. */

export type Faction = "church" | "court";
export type PlayerId = 0 | 1;
export type Sanctity = "holy" | "neutral" | "unholy";

/** Grid coordinates; x grows eastwards, y grows southwards. */
export interface Pos {
  x: number;
  y: number;
}

/** Engine-implemented abilities, recognised from card description sentences. */
export type AbilityId = "adventurous" | "convertInsteadOfTempt";

/** Stats and text of one side of a Character card. */
export interface FaceStats {
  name: string;
  cost: number;
  charm: number;
  composure: number;
  /** Description sentences as written in cards.md. */
  text: string[];
  /** Abilities the engine recognised in the text. */
  abilities: AbilityId[];
  /** Sentences with no engine implementation yet; shown on the card but without effect. */
  unknown: string[];
}

/** Static definition of a Character card, as authored in cards.md. */
export interface CharacterDef {
  id: string;
  name: string;
  faces: Record<Faction, FaceStats>;
}

/** Static definition of a battle location; rows are strings of H (holy), . (neutral), U (unholy). */
export interface LocationDef {
  id: string;
  name: string;
  rows: string[];
}

/** A deck as brought to a match. */
export interface DeckList {
  faction: Faction;
  cards: string[];
}

/** Where a card currently is. Married cards are out of the game for good. */
export type Zone = "deck" | "hand" | "field" | "discard" | "married";

/** One physical card in a match. Its face always shows its controller's faction. */
export interface CardInstance {
  uid: number;
  defId: string;
  owner: PlayerId;
  controller: PlayerId;
  zone: Zone;
  composure: number;
  pos: Pos | null;
  /** Global turn count at which she last entered the field. */
  enteredOn: number;
}

export interface PlayerState {
  faction: Faction;
  deck: number[];
  hand: number[];
  discard: number[];
  wine: number;
  turnNumber: number;
}

/** The phase the active player is in; the start phase only needs input for hand-limit discards. */
export type Phase = "discard" | "play" | "act";

export interface GameState {
  defs: Record<string, CharacterDef>;
  squares: Sanctity[][];
  cards: Record<number, CardInstance>;
  players: [PlayerState, PlayerState];
  married: number[];
  firstPlayer: PlayerId;
  /** Global turn count, both players' turns included. */
  turn: number;
  active: PlayerId;
  phase: Phase;
  actionsLeft: number;
  winner: PlayerId | null;
  rng: number;
  log: string[];
}

export type Action =
  | { type: "discard"; uid: number }
  | { type: "play"; uid: number; at: Pos }
  | { type: "endPlay" }
  | { type: "move"; uid: number; to: Pos }
  | { type: "flirt"; uid: number; target: number }
  | { type: "endTurn" };

/** Tunable numbers from the core rules. */
export const RULES = {
  startingHand: 5,
  handLimit: 6,
  wineCap: 10,
  secondPlayerFirstWine: 2,
  actionsPerTurn: 3,
} as const;
