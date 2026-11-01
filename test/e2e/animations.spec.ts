/** Animations: they run with motion allowed, lock input while running, and are skipped under reduced motion. */
import { expect, test, type Page } from "@playwright/test";
import { playFirstCard, square, startAi, startHotseat, waitForMyTurn } from "./helpers.ts";

/** Surrender from the sidebar and confirm. */
async function surrender(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Surrender" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Surrender" }).click();
  await expect(page.getByRole("dialog", { name: /wins/ })).toBeVisible();
}

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

test.describe("game over, with motion allowed", () => {
  test.use({ contextOptions: { reducedMotion: "no-preference" } });

  test("a loss against the AI drains the board and tints towards the winner, without hearts", async ({ page }) => {
    await startAi(page, "Church");
    await surrender(page);
    await expect(page.locator(".overlay.end")).toHaveClass(/\blose\b/);
    await expect(page.locator(".overlay.end")).toHaveClass(/\bcourt\b/);
    await expect(page.locator(".match")).toHaveClass(/\bdefeated\b/);
    await expect(page.locator(".end-heart")).toHaveCount(0);
  });

  test("a hotseat win celebrates in the winner's colours with rising hearts", async ({ page }) => {
    await startHotseat(page);
    await page.getByRole("button", { name: "Continue" }).click();
    await surrender(page);
    await expect(page.locator(".overlay.end")).toHaveClass(/\bwin\b/);
    expect(await page.locator(".end-heart").count()).toBeGreaterThan(5);
  });
});

test("under reduced motion the game-over tint shows without hearts", async ({ page }) => {
  await startHotseat(page);
  await page.getByRole("button", { name: "Continue" }).click();
  await surrender(page);
  await expect(page.locator(".overlay.end")).toHaveClass(/\bwin\b/);
  await expect(page.locator(".end-heart")).toHaveCount(0);
});

test("under reduced motion a played girl appears without animating", async ({ page }) => {
  await startAi(page, "Church");
  const placed = await playFirstCard(page);
  expect(await running(page, placed)).toBe(0);
});
