import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";
import { cards, clickPairs, CODE_4, loadBoard } from "./helpers.ts";

test("the single HTML file opens and plays with network access blocked", async ({ browser }) => {
  const context = await browser.newContext({ offline: true });
  const externalRequests: string[] = [];
  try {
    await context.route("**/*", async (route) => {
      const url = route.request().url();
      if (url.startsWith("file:")) await route.continue();
      else {
        externalRequests.push(url);
        await route.abort();
      }
    });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(pathToFileURL(resolve("dist/index.html")).href);
    await expect(page).toHaveTitle("Neon Pairs");
    await expect(page.getByRole("combobox", { name: "Grid size" })).toBeVisible();
    await expect(cards(page)).toHaveCount(16);
    await loadBoard(page, CODE_4);
    await clickPairs(page);
    await expect(page.getByRole("heading", { name: "All pairs found!" })).toBeVisible();
    await page.getByRole("button", { name: "Restart" }).click();
    await expect(cards(page)).toHaveCount(16);
    await expect(cards(page).nth(0)).toHaveAttribute("aria-label", "Row 1, column 1, closed");
    expect(externalRequests).toEqual([]);
    expect(errors).toEqual([]);
    expect(await page.locator("audio,video").count()).toBe(0);
  } finally {
    await context.close();
  }
});
