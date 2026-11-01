/** Keyboard-only play: selection, arrow-key navigation over the field, and announcements. */
import { expect, test } from "@playwright/test";
import { startAi } from "./helpers.ts";

test("a card can be played with the keyboard alone", async ({ page }) => {
  await startAi(page, "Church");
  const card = page.locator(".hand .card.playable").first();
  await card.focus();
  await page.keyboard.press("Enter");
  await expect(card).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#announcer")).toContainText("selected. Can enter on");

  await page.locator('.square[tabindex="0"]').focus();
  for (let i = 0; i < 3; i++) await page.keyboard.press("ArrowRight");
  const focused = page.locator(".square:focus");
  await expect(focused).toHaveAccessibleName(/^D1, holy\. empty\. Press to play .+ here$/);
  await page.keyboard.press("Enter");
  await expect(page.locator('[data-focus="sq:3,0"]')).toHaveAccessibleName(/^D1, holy\. Yours: /);
  await expect(page.locator('[data-focus="sq:3,0"]')).toBeFocused();
  await expect(page.locator("#announcer")).toContainText("Church plays");
});

test("the field is a single tab stop that moves with the arrow keys", async ({ page }) => {
  await startAi(page, "Church");
  await page.locator('.square[tabindex="0"]').focus();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowRight");
  await expect(page.locator('[data-focus="sq:1,1"]')).toBeFocused();
  await expect(page.locator('.square[tabindex="0"]')).toHaveCount(1);
  await expect(page.locator('.square[tabindex="0"]')).toHaveAttribute("data-focus", "sq:1,1");
});

test("Escape clears the selection and announces it", async ({ page }) => {
  await startAi(page, "Church");
  const card = page.locator(".hand .card.playable").first();
  await card.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".square.target-play").first()).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".square.target-play")).toHaveCount(0);
  await expect(page.locator("#announcer")).toContainText("Selection cleared.");
});
