import { expect, test } from "@playwright/test";
import { supportedSizes } from "../src/game/types.ts";
import { playAllPairs, startDeal } from "./support.ts";

test("every board size can be solved with one move per complete pair", async ({ page }) => {
  test.setTimeout(240_000);
  const clockStart = new Date("2020-01-01T00:00:00Z");
  await page.clock.install({ time: clockStart });
  await page.clock.pauseAt(new Date(clockStart.getTime() + 1_000));
  for (const size of supportedSizes) {
    const code = `np1-${size}-1`;
    await page.goto("/");
    await startDeal(page, code);
    const pairCount = await playAllPairs(page, code);
    await expect(page.locator(".score-strip")).toContainText(`Pairs: ${pairCount}/${pairCount}`);
    await expect(page.locator(".score-strip")).toContainText(`Moves: ${pairCount}`);
    await expect(page.locator(".win-banner")).toContainText(`Completed in ${pairCount} moves`);
    await expect(page.getByRole("status")).toHaveText(
      `Pair found. All pairs found in ${pairCount} moves and 0:00.`
    );
  }
});
