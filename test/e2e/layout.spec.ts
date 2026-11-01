/** Layout: the board keeps its size, and nothing covers it. */
import { expect, test } from "@playwright/test";
import { playFirstCard, size, square, startAi } from "./helpers.ts";

const VIEWPORTS = [
  { width: 1920, height: 1080 },
  { width: 1400, height: 900 },
  { width: 1366, height: 700 },
  { width: 1280, height: 600 },
];

for (const vp of VIEWPORTS) {
  test(`History toggle leaves board, sidebar and hand sizes unchanged at ${vp.width}x${vp.height}`, async ({ page }) => {
    await page.setViewportSize(vp);
    await startAi(page, "Church");
    const measure = async () => [await size(page.locator(".grid")), await size(page.locator(".sidebar")), await size(page.locator(".hand"))];
    const closed = await measure();
    await page.getByRole("button", { name: "History" }).click();
    await expect(page.locator("#history-log")).toBeVisible();
    expect(await measure()).toEqual(closed);
    await page.getByRole("button", { name: "Hide history" }).click();
    expect(await measure()).toEqual(closed);
  });
}

test("every board square is the topmost element at its centre, with History open and a card inspected", async ({ page }) => {
  await startAi(page, "Church");
  const placed = await playFirstCard(page);
  await square(page, placed).hover();
  await expect(page.locator(".inspect-card .card")).toBeVisible();
  await page.getByRole("button", { name: "History" }).click();
  const covered = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>(".square")].filter((sq) => {
      const r = sq.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return !hit || !sq.contains(hit);
    }).map((sq) => sq.dataset.focus),
  );
  expect(covered).toEqual([]);
});

test("the inspect area does not overlap the board", async ({ page }) => {
  await startAi(page, "Church");
  const placed = await playFirstCard(page);
  await square(page, placed).hover();
  await expect(page.locator(".inspect-card .card")).toBeVisible();
  const grid = (await page.locator(".grid").boundingBox())!;
  const card = (await page.locator(".inspect-card .card").boundingBox())!;
  expect(card.x).toBeGreaterThanOrEqual(grid.x + grid.width);
});
