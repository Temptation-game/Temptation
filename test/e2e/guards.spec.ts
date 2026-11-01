/** Guards: the leave-page warning appears only during an unfinished match. */
import { expect, test, type Page } from "@playwright/test";
import { openMenu, startAi } from "./helpers.ts";

/** Try to close the tab; resolves to the dialog type shown, or null if it closed without asking. */
async function tryClose(page: Page): Promise<string | null> {
  const dialog = page.waitForEvent("dialog", { timeout: 3_000 }).then(async (d) => { const t = d.type(); await d.dismiss(); return t; }).catch(() => null);
  await page.close({ runBeforeUnload: true });
  return dialog;
}

test("closing the tab mid-match asks for confirmation", async ({ page }) => {
  await startAi(page, "Church");
  await page.getByRole("button", { name: "History" }).click();
  expect(await tryClose(page)).toBe("beforeunload");
});

test("closing the tab after the match has ended does not ask", async ({ page }) => {
  await startAi(page, "Church");
  await page.getByRole("button", { name: "Surrender" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Surrender" }).click();
  await expect(page.getByRole("dialog", { name: /wins/ })).toBeVisible();
  expect(await tryClose(page)).toBeNull();
});

test("closing the tab on the menu does not ask", async ({ page }) => {
  await openMenu(page);
  await page.getByRole("button", { name: "Rules" }).click();
  expect(await tryClose(page)).toBeNull();
});
