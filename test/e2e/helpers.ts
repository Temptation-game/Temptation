/** Shared steps for the browser tests: starting matches, reading the board, playing a card. */
import { expect, type Locator, type Page } from "@playwright/test";

/** Seed used unless a test needs another deal; fixes the deal, first player and AI choices. */
export const SEED = 7;

/** Open the start screen with a fixed seed. */
export async function openMenu(page: Page, seed = SEED): Promise<void> {
  await page.goto(`/?seed=${seed}`);
  await expect(page.getByRole("button", { name: "Two players, one screen" })).toBeVisible();
}

/** Start a match against the AI and wait until the human may act. */
export async function startAi(page: Page, side: "Church" | "Court", seed = SEED): Promise<void> {
  await openMenu(page, seed);
  await page.getByRole("button", { name: `Play ${side} against the AI` }).click();
  await waitForMyTurn(page);
}

/** Start a two-player match; the first hand-over screen is left open. */
export async function startHotseat(page: Page, seed = SEED): Promise<void> {
  await openMenu(page, seed);
  await page.getByRole("button", { name: "Two players, one screen" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
}

/** Wait until the End phase / End turn button is enabled, i.e. it is the human's turn and nothing is animating. */
export async function waitForMyTurn(page: Page): Promise<void> {
  await expect(page.locator("#end")).toBeEnabled({ timeout: 20_000 });
}

/** The field square button with a chess-style name such as "D1". */
export function square(page: Page, name: string): Locator {
  const x = name.charCodeAt(0) - 65;
  const y = Number(name.slice(1)) - 1;
  return page.locator(`[data-focus="sq:${x},${y}"]`);
}

/** Play the first affordable hand card on the first legal square; returns that square's name. */
export async function playFirstCard(page: Page): Promise<string> {
  await page.locator(".hand .card.playable").first().click();
  const target = page.locator(".square.target-play").first();
  const name = (await target.getAttribute("aria-label"))!.split(",")[0];
  await target.click();
  await expect(square(page, name)).toHaveAttribute("aria-label", /Yours:/);
  return name;
}

/** Size of an element's box, rounded, as "WxH". */
export async function size(locator: Locator): Promise<string> {
  const b = (await locator.boundingBox())!;
  return `${Math.round(b.width)}x${Math.round(b.height)}`;
}
