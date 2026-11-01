/** English interface text, grouped by screen. Text with values is a function, so a translation can reorder words.
 * Card text lives in cards.md and the rules in overview.md; engine log lines are formatted by the engine.
 */
import type { Faction } from "../types.ts";

const SIDE: Record<Faction, string> = { church: "Church", court: "Court" };
const RESOURCE: Record<Faction, string> = { church: "Wine", court: "Blood" };
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export const en = {
  side: (f: Faction) => SIDE[f],
  resource: (f: Faction) => RESOURCE[f],
  sanctity: { holy: "holy", neutral: "neutral", unholy: "unholy" },

  menu: {
    title: "Temptation, a trading card game",
    coverAlt: "Cover art: a nun kisses the cheek of a blushing vampire in a moonlit forest.",
    ageBadge: "Age rating: 16 and over",
    nav: "Game mode",
    hotseat: "Two players, one screen",
    playAgainstAi: (f: Faction) => `Play ${SIDE[f]} against the AI`,
    rules: "Rules",
    glossary: "Glossary",
    cards: "Cards",
    settings: "Settings",
    accessibility: "Accessibility",
    credits: "Credits",
  },

  page: {
    back: "Back to menu",
    navigation: (title: string) => `${title} navigation`,
    cardsShowAll: "Show all cards on one side",
    cardsShowAllAs: "Show all as:",
    cardsHint: "Click a card to see her reverse.",
    allCardsSide: (f: Faction) => `All cards: ${SIDE[f]} side.`,
    cardSide: (name: string, f: Faction) => `${name}, ${SIDE[f]} side.`,
  },

  settings: {
    difficulty: "AI difficulty",
    easy: ["Easy", "makes mistakes now and then"],
    normal: ["Normal", "plays the best move it can see"],
    hard: ["Hard", "also thinks through your reply"],
    animations: "Animations",
    motionSystem: ["Follow system setting", "off when the system asks for reduced motion"],
    motionOn: ["On", ""],
    motionOff: ["Off", ""],
    font: "Font",
    fontStandard: ["Standard", ""],
    fontDyslexic: ["Dyslexia-friendly", "OpenDyslexic"],
    saved: (group: string, choice: string) => `Saved: ${group}, ${choice}.`,
  } as const,

  match: {
    /** Contains markup: the "vs" is italic. */
    titleHtml: "Church <i>vs</i> Court",
    controls: "Match controls",
    status: "Match status",
    whosePhase: (who: string, phase: string) => `${who}, ${phase} phase`,
    phase: { discard: "discard", play: "play", act: "act" },
    ai: "AI",
    resourceLine: (f: Faction) => `${RESOURCE[f]}:`,
    actions: "Actions:",
    noActions: "none",
    opponentCounts: (hand: number, deck: number) => `Opponent: ${hand} in hand, ${deck} in deck`,
    yourDeck: (f: Faction, deck: number) => `You (${SIDE[f]}): ${deck} in deck`,
    end: { discard: "Discard down to 6", play: "End play phase", act: "End turn" },
    history: "History",
    hideHistory: "Hide history",
    historyLabel: "History, oldest first",
    surrender: "Surrender",
    field: (lastColumn: string, rows: number) =>
      `Field, Town Square: columns A to ${lastColumn} from west to east, rows 1 to ${rows} from top to bottom. Use the arrow keys to move between squares, and I for card details.`,
    inspected: "Inspected card",
    inspectEmpty: "Hover a girl on the field to inspect her.",
    showReverse: "Show reverse (F)",
    showReverseOf: (name: string) => `Show ${name}'s reverse`,
    keepOpen: "Press Shift to keep open",
    hand: (n: number) => `Your hand, ${plural(n, "card", "cards")}. Press I on a card for details.`,
    handHidden: (n: number) => `Hand of ${plural(n, "card", "cards")}, hidden until the next player continues`,
    handLimitBanner: "Hand limit: click a card to discard it",
    pressToDiscard: " Press to discard.",
    canBePlayed: " Can be played.",
    showingReverse: (label: string, f: Faction) => `Showing her reverse: ${label} In your hand she plays as ${SIDE[f]}.`,
    showingSide: (name: string, f: Faction) => `${name}: showing her ${SIDE[f]} side.`,
  },

  board: {
    empty: "empty",
    yours: "Yours",
    opponents: "Opponent's",
    occupant: (who: string, label: string) => `${who}: ${label}`,
    resting: " Cannot act this turn.",
    selected: " Selected.",
    pressTo: (what: string) => `Press to ${what}`,
    play: (name: string) => `play ${name} here`,
    move: (name: string) => `move ${name} here`,
    flirt: (a: string, t: string, theirLoss: number, yourLoss: number) =>
      `${a} flirts with ${t}: she loses ${theirLoss} Composure, yours loses ${yourLoss}`,
  },

  announce: {
    selectionCleared: "Selection cleared.",
    nothingToDo: (name: string) => `${name} selected. Nothing she can do right now.`,
    selected: (name: string) => `${name} selected.`,
    canEnter: "Can enter on",
    canMove: "Can move to",
    canFlirt: "Can flirt with",
    onSquare: (name: string, square: string) => `${name} on ${square}`,
    discardPhase: (n: number) => `Hand limit: you hold ${n} cards. Choose a card in your hand to discard.`,
    playPhase: (wine: number, f: Faction) => `Your play phase. ${wine} ${RESOURCE[f]}. Choose a card in your hand, then a square.`,
    actPhase: (n: number) => `Your act phase. ${plural(n, "action", "actions")}.`,
  },

  dialog: {
    handOverTitle: (f: Faction) => `${SIDE[f]}'s turn`,
    handOverText: "Pass the device, then continue.",
    continue: "Continue",
    surrenderTitle: "Surrender this match?",
    surrenderText: "The match ends and your opponent wins.",
    keepPlaying: "Keep playing",
    surrender: "Surrender",
    wins: (f: Faction) => `${SIDE[f]} wins`,
    youWin: "You win!",
    aiWins: "The AI wins.",
    playAgain: "Play again",
    mainMenu: "Main menu",
    close: "Close",
    cardDetails: "Card details",
    cardDetailsHint: "Tab through highlighted words for their meaning. Escape to close.",
  },

  piles: {
    deck: (left: number) => (left === 0 ? "My deck: empty" : `My deck: ${plural(left, "card", "cards")} left`),
    deckEmpty: "Deck empty",
    deckCaption: (left: number) => (left ? `Deck (${left})` : "Deck"),
    discards: (sent: number, couples: number) => `Out of play: ${sent} sent home, ${plural(couples, "couple", "couples")} married`,
    discardsEmpty: "Empty",
    discardsCaption: (total: number) => (total ? `Out of play (${total})` : "Out of play"),
    deckTitle: (left: number) => `My deck: ${left} cards left`,
    deckHint: "Sorted by name, so the draw order stays hidden. Click a card to see her reverse.",
    deckEmptyText: "Your deck is empty.",
    discardTitle: "Out of play",
    sentHome: "Sent Home",
    registry: "Wedding Registry",
    sentHomeOf: (f: Faction, n: number) => `${SIDE[f]}'s girls sent home (${n})`,
    nobody: "Nobody yet.",
    noWeddings: "No weddings yet.",
    wedding: (i: number, a: string, fa: Faction, b: string, fb: Faction) => `Wedding ${i}: ${a} (${SIDE[fa]}) and ${b} (${SIDE[fb]})`,
  },

  card: {
    label: (name: string, f: Faction, cost: number, charm: number, composure: string, text: string) =>
      `${name}, ${SIDE[f]}, cost ${cost} ${RESOURCE[f]}, Charm ${charm}, ${composure}.${text ? " " + text : ""}`,
    composure: (n: number) => `Composure ${n}`,
    composureOf: (n: number, max: number) => `Composure ${n} of ${max}`,
    notImplemented: " (not implemented yet)",
    notImplementedTitle: "not implemented in the engine yet",
    detailLabel: (name: string, f: Faction, cost: number, charm: number, composure: number, max: number) =>
      `${name}, ${SIDE[f]}, cost ${cost} ${RESOURCE[f]}, Charm ${charm}, Composure ${composure} of ${max}`,
    copies: (n: number) => ` ${n} copies.`,
    flipTo: (f: Faction) => ` Press to flip to the ${SIDE[f]} side.`,
    reverse: (label: string) => `Reverse: ${label}`,
    reverseTag: "reverse",
    showReverseOf: (name: string) => `Show ${name}'s reverse`,
    showReverseTitle: "Show reverse (F)",
    resting: "Zz",
  },
};

export type Strings = typeof en;
