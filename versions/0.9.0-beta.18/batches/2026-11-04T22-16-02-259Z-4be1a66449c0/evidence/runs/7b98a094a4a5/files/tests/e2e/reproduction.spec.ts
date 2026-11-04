import { expect, test } from "@playwright/test";

const COMPLETED_SNAPSHOT = JSON.stringify({
  version: 1,
  boardCode: "np1-4-1",
  matched: Array.from({ length: 16 }, (_, index) => index),
  selection: { kind: "closed" },
  moves: 8,
  elapsedMs: 5_000,
  started: true,
});

test("loads a completed snapshot without pausing, celebrating, or changing best", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    window.localStorage.setItem("neonPairs.best.v1", '{"version":1,"scores":{"4":4}}');
  });
  await page.reload();
  await page.getByText("Reproduce a game", { exact: true }).click();
  await page.getByLabel("Snapshot JSON").fill(COMPLETED_SNAPSHOT);
  await page.getByRole("button", { name: "Load snapshot" }).click();

  await expect(page.locator(".reproduction-status")).toHaveText("Loaded completed snapshot.");
  await expect(page.getByRole("button", { name: "Resume" })).toHaveCount(0);
  await expect(page.getByText("Game complete. 8 moves in 0:05.")).toBeVisible();
  await expect(page.locator(".win-banner")).toHaveCSS("animation-name", "none");
  await expect(page.getByText(/Best:/)).toContainText("4");
});
