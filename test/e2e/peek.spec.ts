/** Other-side view: flip buttons and the F key show a card's other side without changing play. */
import { expect, test } from "@playwright/test";
import { playFirstCard, square, startAi } from "./helpers.ts";

test("the hand flip button shows the card's other side and back", async ({ page }) => {
  await startAi(page, "Church");
  const slot = page.locator(".hand .hand-slot").first();
  const card = slot.locator(".card");
  const flip = slot.locator(".peek-btn");
  await expect(card).toHaveClass(/\bchurch\b/);
  await expect(card).toHaveAccessibleDescription(/Other side: .+, Court,/);
  await flip.click();
  await expect(slot.locator(".card")).toHaveClass(/\bcourt\b.*\bpeeking\b|\bpeeking\b.*\bcourt\b/);
  await expect(slot.locator(".card")).toHaveAccessibleName(/^Showing her other side: .+, Court, .+ In your hand she plays as Church\./);
  await expect(slot.locator(".peek-btn")).toHaveAttribute("aria-pressed", "true");
  await expect(slot.locator(".peek-btn")).toBeFocused();
  await slot.locator(".peek-btn").click();
  await expect(slot.locator(".card")).toHaveClass(/\bchurch\b/);
  await expect(slot.locator(".card")).not.toHaveClass(/peeking/);
});

test("F flips the focused hand card, and a peeked card is still played as your side", async ({ page }) => {
  await startAi(page, "Church");
  const first = page.locator(".hand .card.playable").first();
  const key = await first.getAttribute("data-focus");
  await first.focus();
  await page.keyboard.press("f");
  const card = page.locator(`[data-focus="${key}"]`);
  await expect(card).toHaveClass(/peeking/);
  await expect(card).toBeFocused();
  await card.click();
  const target = page.locator(".square.target-play").first();
  await expect(target).toBeVisible();
  const name = (await target.getAttribute("aria-label"))!.split(",")[0];
  await target.click();
  await expect(square(page, name)).toHaveAccessibleName(/Yours: .+, Church,/);
});

test("field girls describe their other side, and F on a square flips the inspect view", async ({ page }) => {
  await startAi(page, "Church");
  const placed = await playFirstCard(page);
  const sq = square(page, placed);
  await expect(sq).toHaveAccessibleDescription(/Other side: .+, Court,/);
  await sq.focus();
  await expect(page.locator(".inspect-card .card")).toHaveClass(/\bchurch\b/);
  await page.keyboard.press("f");
  await expect(page.locator(".inspect-card .card")).toHaveClass(/\bcourt\b/);
  await expect(page.locator(".inspect-card .card")).toHaveClass(/peeking/);
  await expect(page.locator(".inspect-peek")).toHaveAttribute("aria-pressed", "true");
  await page.locator(".inspect-peek").click();
  await expect(page.locator(".inspect-card .card")).toHaveClass(/\bchurch\b/);
});
