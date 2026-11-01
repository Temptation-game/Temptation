/** Dialogs, panels and reading pages: what opens, what takes focus, and where focus returns. */
import { expect, test } from "@playwright/test";
import { openMenu, playFirstCard, square, startAi } from "./helpers.ts";

test("Surrender asks in-game, defaults to Keep playing, and Escape cancels back to the button", async ({ page }) => {
  await startAi(page, "Church");
  await page.getByRole("button", { name: "Surrender" }).click();
  const dialog = page.getByRole("dialog", { name: "Surrender this match?" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Keep playing" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Surrender" })).toBeFocused();
});

test("confirming Surrender ends the match for the opponent", async ({ page }) => {
  await startAi(page, "Church");
  await page.getByRole("button", { name: "Surrender" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Surrender" }).click();
  await expect(page.getByRole("dialog", { name: "Court wins" })).toBeVisible();
});

test("History opens inline without blocking the board", async ({ page }) => {
  await startAi(page, "Church");
  await page.getByRole("button", { name: "History" }).click();
  const history = page.getByRole("button", { name: "Hide history" });
  await expect(history).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator(".match")).not.toHaveAttribute("inert", "");
  await playFirstCard(page);
  await expect(page.locator("#history-log li").last()).toContainText("Church plays");
});

test("I opens card details with glossary terms as buttons; Escape returns focus to the card", async ({ page }) => {
  await startAi(page, "Church");
  const card = page.locator(".hand .card").filter({ has: page.locator(".term") }).first();
  await card.focus();
  await page.keyboard.press("i");
  const dialog = page.getByRole("dialog", { name: "Card details" });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator(".detail-card .card")).toBeFocused();
  const term = dialog.getByRole("button").first();
  await expect(term).toHaveAccessibleDescription(/.+: .+/);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(card).toBeFocused();
});

test("I on an occupied field square opens that girl's details", async ({ page }) => {
  await startAi(page, "Church");
  const placed = await playFirstCard(page);
  await square(page, placed).focus();
  await page.keyboard.press("i");
  await expect(page.getByRole("dialog", { name: "Card details" })).toBeVisible();
});

test("My deck dialog takes focus and Escape returns focus to My deck", async ({ page }) => {
  await startAi(page, "Church");
  await page.getByRole("button", { name: "My deck" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.locator(".match")).toHaveAttribute("inert", "");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "My deck" })).toBeFocused();
});

test("Rules page shows the rules only; Glossary page is a definition list; Back returns focus", async ({ page }) => {
  await openMenu(page);
  await page.getByRole("button", { name: "Rules" }).click();
  await expect(page.getByRole("heading", { name: "Rules", level: 1 })).toBeFocused();
  await expect(page.locator("article dl")).toHaveCount(0);
  await expect(page.locator("article")).not.toContainText("Consecrate:");
  await page.getByRole("button", { name: "Back to menu" }).click();
  await expect(page.getByRole("button", { name: "Rules" })).toBeFocused();

  await page.getByRole("button", { name: "Glossary" }).click();
  await expect(page.locator("dl.glossary dt").first()).toBeVisible();
  const terms = await page.locator("dl.glossary dt").allInnerTexts();
  expect(terms).toEqual([...terms].sort((a, b) => a.localeCompare(b)));
  expect(await page.locator("dl.glossary dd").count()).toBe(terms.length);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Glossary" })).toBeFocused();
});
