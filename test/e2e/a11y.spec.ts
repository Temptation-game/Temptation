/** Accessibility: names, alt text, the live region, and accessibility-tree snapshots of key screens. */
import { expect, test, type Page } from "@playwright/test";
import { openMenu, startAi } from "./helpers.ts";

/** Buttons without an accessible name on the current page. */
const unnamedButtons = (page: Page) => page.locator("button").evaluateAll((btns) =>
  btns.filter((b) => !b.closest("[inert]") && !(b.getAttribute("aria-label") ?? b.textContent ?? "").trim()).map((b) => b.outerHTML.slice(0, 80)));

test("every button has an accessible name on the menu, in a match and on the Cards page", async ({ page }) => {
  await openMenu(page);
  expect(await unnamedButtons(page)).toEqual([]);
  await page.getByRole("button", { name: "Cards" }).click();
  expect(await unnamedButtons(page)).toEqual([]);
  await startAi(page, "Church");
  expect(await unnamedButtons(page)).toEqual([]);
});

test("every image has alt text (empty for decorative portraits inside labelled controls)", async ({ page }) => {
  await startAi(page, "Church");
  const missing = await page.locator("img").evaluateAll((imgs) => imgs.filter((i) => !i.hasAttribute("alt")).length);
  expect(missing).toBe(0);
  await expect(page.locator(".hand .card img").first()).toHaveAttribute("alt", "");
});

test("the live region sits outside the re-rendered app and is polite", async ({ page }) => {
  await startAi(page, "Church");
  const region = page.locator("#announcer");
  await expect(region).toHaveAttribute("aria-live", "polite");
  expect(await region.evaluate((r) => !!r.closest("#app"))).toBe(false);
});

test("start screen accessibility tree", async ({ page }) => {
  await openMenu(page);
  await expect(page.locator("#app")).toMatchAriaSnapshot({ name: "start-screen.aria.yml" });
});

test("match sidebar and hand accessibility tree (structure and label format, independent of card content)", async ({ page }) => {
  await startAi(page, "Church");
  await expect(page.locator(".sidebar")).toMatchAriaSnapshot(`
    - complementary "Match controls":
      - heading "Church vs Court" [level=1]
      - region "Match status":
        - paragraph: /Church, play phase/
        - paragraph: /Wine.\\s\\d+/
        - paragraph: /Actions.\\snone/
        - paragraph: /Opponent.\\s\\d+ in hand, \\d+ in deck/
        - paragraph: /You \\(Church\\).\\s\\d+ in deck/
      - button "End play phase"
      - button "History"
      - button "Surrender"
  `);
  await expect(page.locator(".hand")).toMatchAriaSnapshot(`
    - region /Your hand, \\d+ cards\\. Press I on a card for details\\./:
      - button /^.+, Church, cost \\d+ Wine, Charm \\d+, Composure \\d+\\./
  `);
});
