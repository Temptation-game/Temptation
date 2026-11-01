/** Settings and Accessibility: choices persist, animations follow the setting over the system, the dyslexic font loads. */
import { expect, test, type Page } from "@playwright/test";
import { openMenu, playFirstCard, recordAnimations, recordedAnimations, startAi } from "./helpers.ts";

/** Open a settings page from the menu and choose an option by its label. */
async function choose(page: Page, pageName: "Settings" | "Accessibility", group: string, option: string): Promise<void> {
  await page.getByRole("button", { name: pageName, exact: true }).click();
  await page.getByRole("group", { name: group }).getByRole("radio", { name: new RegExp(`^${option}`) }).check();
  await page.getByRole("button", { name: "Back to menu" }).click();
}

test("AI difficulty is saved and survives a reload", async ({ page }) => {
  await openMenu(page);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const hard = page.getByRole("group", { name: "AI difficulty" }).getByRole("radio", { name: /^Hard/ });
  await expect(page.getByRole("radio", { name: /^Normal/ })).toBeChecked();
  await hard.check();
  await expect(page.locator("#announcer")).toContainText("Saved: AI difficulty, Hard.");
  await page.reload();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.getByRole("group", { name: "AI difficulty" }).getByRole("radio", { name: /^Hard/ })).toBeChecked();
});

test.describe("system allows motion", () => {
  test.use({ contextOptions: { reducedMotion: "no-preference" } });

  test("Animations: Off stops animations", async ({ page }) => {
    await openMenu(page);
    await choose(page, "Accessibility", "Animations", "Off");
    await page.getByRole("button", { name: "Play Church against the AI" }).click();
    await expect(page.locator("#end")).toBeEnabled({ timeout: 20_000 });
    await recordAnimations(page);
    await playFirstCard(page);
    expect(await recordedAnimations(page)).toEqual([]);
  });
});

test("Animations: On plays animations even when the system asks for reduced motion", async ({ page }) => {
  await openMenu(page);
  await choose(page, "Accessibility", "Animations", "On");
  await page.getByRole("button", { name: "Play Church against the AI" }).click();
  await expect(page.locator("#end")).toBeEnabled({ timeout: 20_000 });
  await recordAnimations(page);
  await playFirstCard(page);
  await expect.poll(() => recordedAnimations(page)).toContainEqual(expect.stringMatching(/^tile /));
});

test("Font: Dyslexia-friendly loads OpenDyslexic and applies it everywhere", async ({ page }) => {
  await openMenu(page);
  await choose(page, "Accessibility", "Font", "Dyslexia-friendly");
  await startAi(page, "Church");
  const family = await page.locator(".hand .card .name").first().evaluate((el) => getComputedStyle(el).fontFamily);
  expect(family).toContain("OpenDyslexic");
  await expect.poll(() => page.evaluate(async () => { await document.fonts.ready; return document.fonts.check('16px "OpenDyslexic"'); })).toBe(true);
});
