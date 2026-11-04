import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

test("the single-file build opens directly from disk with network requests blocked", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  const blocked: string[] = [];
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  await context.route("**/*", async (route) => {
    const url = route.request().url();
    if (url.startsWith("file:")) await route.continue();
    else {
      blocked.push(url);
      await route.abort();
    }
  });
  const distribution = resolve("dist/index.html");
  await page.goto(pathToFileURL(distribution).href);
  await expect(page.getByRole("heading", { name: "NEON PAIRS", exact: true })).toBeVisible();
  await expect(page.locator(".memory-card")).toHaveCount(16);
  await page.getByText("Reproduce a game", { exact: true }).click();
  await page.getByLabel("Board code", { exact: true }).fill("np1-4-1");
  await page.getByRole("button", { name: "Load board", exact: true }).click();
  await page.locator(".memory-card").nth(0).click();
  await page.locator(".memory-card").nth(11).click();
  await expect(page.locator(".score-strip")).toContainText("Pairs: 1/8");
  await page.getByRole("button", { name: "Restart", exact: true }).click();
  await expect(page.locator(".score-strip")).toContainText("Moves: 0");
  await expect(page.locator(".score-strip")).toContainText("Pairs: 0/8");
  expect(blocked).toEqual([]);
  expect(requests.filter((url) => !url.startsWith("file:"))).toEqual([]);
  const html = await readFile(distribution, "utf8");
  expect(html).not.toMatch(/<script[^>]+\bsrc=/i);
  expect(html).not.toMatch(/<link[^>]+\bhref=/i);
  await context.close();
});
