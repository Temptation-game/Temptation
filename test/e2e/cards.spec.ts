/** Cards: the card gallery, flipping, the deck dialog and card rendering details. */
import { expect, test, type Page } from "@playwright/test";
import { openMenu, startAi } from "./helpers.ts";

/** Open the Cards page from the menu. */
async function openCards(page: Page): Promise<void> {
  await openMenu(page);
  await page.getByRole("button", { name: "Cards" }).click();
  await expect(page.getByRole("heading", { name: "Cards", level: 1 })).toBeVisible();
}

/** The side each flip card currently shows, in page order. */
const sides = (page: Page) =>
  page.locator(".flip-card .card").evaluateAll((cards) => cards.map((c) => (c.classList.contains("court") ? "court" : "church")));

test("every flip card renders exactly one face and one cost drop", async ({ page }) => {
  await openCards(page);
  const counts = await page.locator(".flip-card").evaluateAll((btns) =>
    btns.map((b) => [b.querySelectorAll(".card").length, b.querySelectorAll(".cost").length]));
  expect(counts.length).toBeGreaterThan(0);
  for (const c of counts) expect(c).toEqual([1, 1]);
});

test("clicking a card flips it to the other side and back, updating its label", async ({ page }) => {
  await openCards(page);
  const first = page.locator(".flip-card").first();
  await expect(first).toHaveAccessibleName(/Church.*Press to flip to the Court side/);
  await first.click();
  await expect(first.locator(".card")).toHaveClass(/court/);
  await expect(first).toHaveAccessibleName(/Court.*Press to flip to the Church side/);
  await expect(first.locator(".card")).toHaveCount(1);
  await first.click();
  await expect(first.locator(".card")).toHaveClass(/church/);
});

test("Church and Court buttons flip all cards and mark the active side", async ({ page }) => {
  await openCards(page);
  const church = page.getByRole("button", { name: "Church", exact: true });
  const court = page.getByRole("button", { name: "Court", exact: true });
  await expect(church).toHaveAttribute("aria-pressed", "true");
  await page.locator(".flip-card").first().click();
  await expect(church).toHaveAttribute("aria-pressed", "false");
  await court.click();
  await expect.poll(() => sides(page)).toEqual(expect.arrayContaining(["court"]));
  expect(new Set(await sides(page))).toEqual(new Set(["court"]));
  await expect(court).toHaveAttribute("aria-pressed", "true");
  await church.click();
  expect(new Set(await sides(page))).toEqual(new Set(["church"]));
});

test("card frame gradient is painted once from the border box (no seam under the top border)", async ({ page }) => {
  await openCards(page);
  const bg = await page.locator(".flip-card .card").first().evaluate((c) => {
    const s = getComputedStyle(c);
    return [s.backgroundRepeat, s.backgroundOrigin];
  });
  expect(bg).toEqual(["no-repeat", "border-box"]);
});

test("glossary words in card text are marked and their brackets are never shown", async ({ page }) => {
  await openCards(page);
  await expect(page.locator(".flip-card .term").first()).toBeVisible();
  const text = await page.locator(".card-grid").innerText();
  expect(text).not.toContain("[");
});

test("My deck dialog groups copies by name and its counts add up to the deck size", async ({ page }) => {
  await startAi(page, "Church");
  await page.getByRole("button", { name: "My deck" }).click();
  const dialog = page.getByRole("dialog");
  const total = Number((await dialog.getByRole("heading").innerText()).match(/(\d+) cards left/)![1]);
  const groups = await dialog.locator(".flip-card").evaluateAll((btns) =>
    btns.map((b) => [b.querySelector(".name")!.textContent!, Number(b.querySelector(".copies")?.textContent?.slice(1) ?? 1)] as const));
  const names = groups.map((g) => g[0]);
  expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  expect(new Set(names).size).toBe(names.length);
  expect(groups.reduce((n, g) => n + g[1], 0)).toBe(total);
});
