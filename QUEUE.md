# Work queue

Requests and ideas, in rough priority order. Anyone can add an item at any time; Claude checks this file at the start of each task and ticks items off when they are done.

## Open

Priority may not match the chronological order. Pick them up in order of effort (small stuff first) and importance (bugs first).

- [ ] Collect string consts (including menus etc.) into a separate folder. Reference them in code rather than keeping them as magic string. This will matter is something is renamed, if we add localications, etc.
- [ ] Collect game constants (such as deck size) into another separate file.

## Large features

Like Future features, but partially fleshed out. Ask when picking up.

1) Deck editor

Probably the most important part of the game. The feature should include:
- At the Main Menu, there should be a "Decks" button. When opened, it should have Church and Court tabs.
- At the start, both tabs have one "Default" deck. You can add decks through a creator by adding cards from the available pool. (in the future, there shouldn't be card duplicated in the deck, but for now we ignore that).
- It should be possible to import and export a deck (as a text file, or custom format (.deck?), as well as all decks at once (as a ZIP file).
- When playing against each other, both players should choose a deck from the corresponding pool on the machine. It should be possible to view the deck (briefly, just the card names, probably no deck viewer there) when in the deck selection menu.
- When playing against AI, choose your and AI's deck, or let the AI make the choice (for now, probably just randomly).

2) Artsy design

The game is Catholic-themed and should feel more "old", despite being whimsy. We could make some (minimalistic) clipart of gold/silver card frames, button framed etc. Gothic-y font. A minimalist theme should still be available in Settings.

3) Marriage registry

Just for fun, let's have the machine store all married couples throughout the games. There should be a counter of all possible couples and how many of them have been collected so far.
A poly registry should appear only if at least one poly marriage have been collected. It should not have a counter of all possible poly marriages, only how many have been collected. They should still be listed in the registry.

## Future features

Need discussion before pickup, and require significant work. Here for reference. After fleshing out, can be split into tasks and moved to work queue.
- Sound effects (with level in settings)
- Music (but wait for @an_amazin_login)
- Online play
- Background & field artwork
- User accounts
- Card drop after each won game (at random, with different cards having different drop frequency)
- Card trading between users

## Done
- [x] Discard pile (bottom right) with Sent Home and Wedding Registry tabs; both players' discards are visible.
- [x] Game-over screen: win glow with rising hearts in the winner's colours; a loss drains the board with a vignette in the winner's colour.
- [x] Settings (AI difficulty: easy / normal / hard) and Accessibility (animations: follow system / on / off; font: standard / OpenDyslexic).
- [x] Deck pile (bottom left) with count and "Deck empty" state; drawn cards fly in from it, opening hand dealt one by one.
- [x] Other-side view: flip button on hand cards, "Show other side" in the inspect area, F hotkey; screen readers get the other side in descriptions.
- [x] Settings are saved in the browser (localStorage) and survive reloads (covered by a browser test).
- [x] Short windows: hand cards scale with height, compact sidebar (board 384 -> 434 px at 1366x700, no sidebar scrolling).
- [x] Tempted girl flies from her square into your hand.
- [x] Smoother discard: the slot closes while the card sinks (no 90 px jump).
- [x] Discord contact on the Credits page.
- [x] CI visual snapshots match the local baselines (all 39 browser tests passed in CI).
- [x] License information on the Credits page.
- [x] License: GPL-3.0-or-later for code, CC BY-NC-SA 4.0 for game content, art all rights reserved by its artists (LICENSE, LICENSE-CONTENT.txt, README).
- [x] Credits file and Credits page.
