import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { expect, test } from "@playwright/test";

test("plays the built HTML from disk with network access blocked and no external assets", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", (request) => {
    if (request.url().startsWith("http:" ) || request.url().startsWith("https:")) requests.push(request.url());
  });
  await page.context().setOffline(true);
  await page.goto(pathToFileURL(resolve("dist/index.html")).href);
  await expect(page.getByRole("heading", { name: "Neon Pairs" })).toBeVisible();
  await expect(page.getByLabel("Grid size")).toHaveValue("4");
  await expect(page.locator(".board-grid > button")).toHaveCount(16);
  await expect(page.locator(".face-art")).toHaveCount(0);
  await page.locator(".board-grid > button").nth(0).click();
  await expect(page.locator(".board-grid > button").nth(0)).toHaveAttribute("aria-label", /revealed/);
  expect(requests).toEqual([]);
  const html = await readFile("dist/index.html", "utf8");
  expect(html).not.toMatch(/(?:src|href)=["']https?:/i);
  expect(html).not.toMatch(/<audio|AudioContext|new Audio\(/i);
});
