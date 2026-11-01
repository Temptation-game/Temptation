/** Hotseat privacy: the next player's hand stays hidden until they press Continue. */
import { expect, test, type Page } from "@playwright/test";
import { playFirstCard, startHotseat, waitForMyTurn } from "./helpers.ts";

/** Card backs, revealed cards and portraits currently in the hand. */
const handContents = (page: Page) => page.locator(".hand").evaluate((h) => ({
  backs: h.querySelectorAll(".card-back").length,
  cards: h.querySelectorAll(".card:not(.card-back)").length,
  portraits: h.querySelectorAll("img").length,
}));

test("the hand is only card backs while the hand-over screen is up, and revealed after Continue", async ({ page }) => {
  await startHotseat(page);
  const hidden = await handContents(page);
  expect(hidden.backs).toBeGreaterThan(0);
  expect(hidden.cards).toBe(0);
  expect(hidden.portraits).toBe(0);
  await expect(page.locator(".match")).toHaveAttribute("inert", "");
  await page.getByRole("button", { name: "Continue" }).click();
  const shown = await handContents(page);
  expect(shown.backs).toBe(0);
  expect(shown.cards).toBe(hidden.backs);
});

test("ending a turn hides the next player's hand again", async ({ page }) => {
  await startHotseat(page);
  await page.getByRole("button", { name: "Continue" }).click();
  await waitForMyTurn(page);
  await playFirstCard(page);
  await page.getByRole("button", { name: "End play phase" }).click();
  await page.getByRole("button", { name: "End turn" }).click();
  await expect(page.getByRole("dialog")).toContainText("turn");
  const c = await handContents(page);
  expect(c.cards).toBe(0);
  expect(c.portraits).toBe(0);
  expect(c.backs).toBeGreaterThan(0);
});
