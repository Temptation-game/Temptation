/** Animations: they run with motion allowed, lock input while running, and are skipped under reduced motion. */
import { expect, test, type Page } from "@playwright/test";
import { playFirstCard, square, startAi, waitForMyTurn } from "./helpers.ts";

/** Number of running animations on the tile inside a square. */
const running = (page: Page, sq: string) =>
  square(page, sq).locator(".tile").evaluate((t) => t.getAnimations().length).catch(() => 0);

test.describe("with motion allowed", () => {
  test.use({ contextOptions: { reducedMotion: "no-preference" } });

  test("a played girl animates onto her square", async ({ page }) => {
    await startAi(page, "Church");
    await page.locator(".hand .card.playable").first().click();
    const target = page.locator(".square.target-play").first();
    const name = (await target.getAttribute("aria-label"))!.split(",")[0];
    await target.click();
    expect(await running(page, name)).toBeGreaterThan(0);
    await expect.poll(() => running(page, name)).toBe(0);
  });

  test("input is locked while a move animates and unlocked afterwards", async ({ page }) => {
    await startAi(page, "Church");
    const placed = await playFirstCard(page);
    await page.getByRole("button", { name: "End play phase" }).click();
    await page.getByRole("button", { name: "End turn" }).click();
    await waitForMyTurn(page);
    await page.getByRole("button", { name: "End play phase" }).click();
    await square(page, placed).click();
    const dest = page.locator(".square.target-move").first();
    const destName = (await dest.getAttribute("aria-label"))!.split(",")[0];
    await dest.click();
    await page.locator("#end").click({ force: true });
    await expect(square(page, destName)).toHaveAccessibleName(/Yours:/);
    await expect(page.locator(".status")).toContainText("act phase");
    await expect(page.locator(".status")).toContainText("Actions: 2");
    await expect(page.locator("#end")).toBeEnabled();
  });
});

test("under reduced motion a played girl appears without animating", async ({ page }) => {
  await startAi(page, "Church");
  const placed = await playFirstCard(page);
  expect(await running(page, placed)).toBe(0);
});
