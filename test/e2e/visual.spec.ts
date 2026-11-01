/** Visual snapshots of a few small, stable targets. Text uses DejaVu Serif so font fallback cannot differ between machines.
 * After an intentional change to the cover or to Scarlet's card, refresh baselines: npm run test:e2e -- visual --update-snapshots
 */
import { expect, test, type Page } from "@playwright/test";
import { openMenu, playFirstCard, square, startAi } from "./helpers.ts";

/** Pin all text to one installed font for pixel-stable snapshots. */
const pinFonts = (page: Page) => page.addStyleTag({ content: '* { font-family: "DejaVu Serif", serif !important; }' });

test("cover with age badge", async ({ page }) => {
  await openMenu(page);
  await pinFonts(page);
  await expect(page.locator(".cover-wrap")).toHaveScreenshot("cover.png");
});

test("a card on both sides", async ({ page }) => {
  await openMenu(page);
  await page.getByRole("button", { name: "Cards" }).click();
  await pinFonts(page);
  const card = page.locator(".flip-card").filter({ has: page.locator(".name", { hasText: "Scarlet" }) });
  await expect(card).toHaveScreenshot("card-church.png");
  await card.click();
  await expect(card.locator(".card")).toHaveClass(/court/);
  await expect(card).toHaveScreenshot("card-court.png");
});

test("a girl on a field square", async ({ page }) => {
  await startAi(page, "Church");
  await pinFonts(page);
  const placed = await playFirstCard(page);
  await page.mouse.move(0, 0);
  await expect(square(page, placed)).toHaveScreenshot("field-tile.png");
});
