/** What the deck and discard piles show: sent-home girls grouped per owner, and married couples in wedding order.
 * Usage: sentHome(state) -> one group list per player; couples(state) -> [[uid, uid], ...]
 */
import type { Faction, GameState, PlayerId } from "../types.ts";

export interface PileGroup {
  defId: string;
  count: number;
}

export interface SentHomeList {
  owner: PlayerId;
  faction: Faction;
  groups: PileGroup[];
}

/** Discarded girls per owner, grouped by card and sorted by name. */
export function sentHome(s: GameState): SentHomeList[] {
  return ([0, 1] as const).map((owner) => {
    const counts = new Map<string, number>();
    for (const uid of s.players[owner].discard) {
      const id = s.cards[uid].defId;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    const groups = [...counts].map(([defId, count]) => ({ defId, count }))
      .sort((a, b) => s.defs[a.defId].name.localeCompare(s.defs[b.defId].name));
    return { owner, faction: s.players[owner].faction, groups };
  });
}

/** Married couples in the order they married; the engine records each couple as two consecutive uids. */
export function couples(s: GameState): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i + 1 < s.married.length; i += 2) out.push([s.married[i], s.married[i + 1]]);
  return out;
}
