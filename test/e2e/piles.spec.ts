/** Deck and discard piles: counts, the deck and discard dialogs, tabs, placement, and the draw animation. */
import { expect, test } from "@playwright/test";
import { recordAnimations, recordedAnimations, startAi, startHotseat } from "./helpers.ts";

test("the deck pile shows the remaining count and opens the deck dialog", async ({ page }) => {
  await startAi(page, "Church");
  const pile = page.locator("#deck");
  const label = (await pile.getAttribute("aria-label"))!;
  const left = Number(label.match(/(\d+) cards? left/)![1]);
  await pile.click();
  await expect(page.getByRole("dialog").getByRole("heading")).toHaveText(`My deck: ${left} cards left`);
  await page.keyboard.press("Escape");
  await expect(pile).toBeFocused();
});

test("the discard pile starts empty and has Sent Home and Wedding Registry tabs", async ({ page }) => {
  await startAi(page, "Church");
  const pile = page.locator("#discards");
  await expect(pile).toHaveAccessibleName("Discard pile: 0 sent home, 0 couples married");
  await pile.click();
  const dialog = page.getByRole("dialog", { name: "Discard pile" });
  const sent = dialog.getByRole("tab", { name: "Sent Home" });
  const registry = dialog.getByRole("tab", { name: "Wedding Registry" });
  await expect(sent).toHaveAttribute("aria-selected", "true");
  await expect(sent).toBeFocused();
  await expect(dialog.getByRole("tabpanel")).toContainText("Church's girls sent home (0)");
  await page.keyboard.press("ArrowRight");
  await expect(registry).toHaveAttribute("aria-selected", "true");
  await expect(registry).toBeFocused();
  await expect(dialog.getByRole("tabpanel")).toContainText("No weddings yet.");
  await page.keyboard.press("ArrowLeft");
  await expect(sent).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("Escape");
  await expect(pile).toBeFocused();
});

test("piles sit beside the hand without overlapping the hand cards or the board", async ({ page }) => {
  await startAi(page, "Church");
  const boxes = await page.evaluate(() => {
    const r = (el: Element) => { const b = el.getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom }; };
    return {
      piles: [...document.querySelectorAll(".pile")].map(r),
      others: [...document.querySelectorAll(".hand .card, .grid")].map(r),
    };
  });
  const overlap = (a: typeof boxes.piles[0], b: typeof boxes.piles[0]) => a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;
  for (const p of boxes.piles) for (const o of boxes.others) expect(overlap(p, o)).toBe(false);
});

test.describe("with motion allowed", () => {
  test.use({ contextOptions: { reducedMotion: "no-preference" } });

  test("the opening hand is dealt from the deck pile", async ({ page }) => {
    await startHotseat(page);
    await recordAnimations(page);
    await page.getByRole("button", { name: "Continue" }).click();
    await expect.poll(async () => (await recordedAnimations(page)).filter((a) => a.includes("@hand:")).length).toBeGreaterThanOrEqual(5);
  });
});

test("under reduced motion the opening hand appears without animating", async ({ page }) => {
  await startHotseat(page);
  await recordAnimations(page);
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.locator(".hand .card").first()).toBeVisible();
  expect(await recordedAnimations(page)).toEqual([]);
});
