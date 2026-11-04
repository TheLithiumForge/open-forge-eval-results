import { chromium, expect, test } from "@playwright/test";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { cardAt, completedSnapshot, loadBoard, solveWithPointer } from "./helpers/game.ts";
import { saveScreenshot } from "./helpers/evidence.ts";

test("pulse one played win once, then keep the banner static", async ({ page }) => {
  await page.addInitScript(() => {
    document.addEventListener("animationstart", (event) => {
      if (event.animationName !== "completion-pulse") return;
      const element = document.documentElement;
      const count = Number(element.dataset.pulsesStarted ?? 0) + 1;
      element.dataset.pulsesStarted = String(count);
    });
    document.addEventListener("animationend", (event) => {
      if (event.animationName !== "completion-pulse") return;
      const element = document.documentElement;
      const count = Number(element.dataset.pulsesFinished ?? 0) + 1;
      element.dataset.pulsesFinished = String(count);
    });
  });
  await page.goto("/");
  await loadBoard(page, "np1-4-1");
  await solveWithPointer(page, "np1-4-1");
  const banner = page.locator(".win-banner");
  await expect(banner).toHaveClass(/win-banner--pulse/);
  await expect(page.locator("html")).toHaveAttribute("data-pulses-started", "1");
  await expect(page.locator("html")).toHaveAttribute("data-pulses-finished", "1", { timeout: 3000 });
  expect(await banner.evaluate((element) => getComputedStyle(element).animationDuration)).toBe("0.6s");
  expect(await banner.evaluate((element) => getComputedStyle(element).animationIterationCount)).toBe("1");
  await saveScreenshot(page, "completion-banner-static.png");
});

test("show the static completion banner immediately under reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await loadBoard(page, "np1-4-1");
  await solveWithPointer(page, "np1-4-1");
  const banner = page.locator(".win-banner");
  await expect(banner).toHaveClass(/win-banner--pulse/);
  const motion = await banner.evaluate((element) => ({
    animationName: getComputedStyle(element).animationName,
    duration: getComputedStyle(element).animationDuration,
  }));
  expect(motion.animationName).toBe("none");
  expect(motion.duration).toBe("0s");
  expect(await page.locator(".card-button").first().evaluate((element) => {
    return getComputedStyle(element).transitionDuration;
  })).toBe("0s");
});

test("open and play the single HTML distribution while network access is blocked", async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  await context.setOffline(true);
  const page = await context.newPage();
  const requests: string[] = [];
  const errors: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  page.on("pageerror", (error) => errors.push(error.message));
  const path = pathToFileURL(resolve("dist/index.html")).href;
  await page.goto(path);
  await loadBoard(page, "np1-4-1");
  await solveWithPointer(page, "np1-4-1");
  await expect(page.locator(".score-line")).toContainText("Moves: 8");
  await expect(page.locator(".win-banner")).toContainText("Time:");
  expect(requests).toEqual([path]);
  expect(errors).toEqual([]);
  await expect(page.locator("audio, video, canvas, img")).toHaveCount(0);
  await expect(page.locator("svg")).toHaveCount(16);
  await saveScreenshot(page, "offline-file-win.png");
  await context.close();
  await browser.close();
});

test("importing a completed game stays silent about score and celebration", async ({ page }) => {
  await page.goto("/");
  await loadBoard(page, "np1-4-1");
  await page.getByLabel("Snapshot JSON").fill(completedSnapshot("np1-4-1"));
  await page.getByRole("button", { name: "Load snapshot", exact: true }).click();
  await expect(page.locator(".win-banner")).not.toHaveClass(/pulse/);
  await expect(cardAt(page, 0)).toHaveAttribute("aria-disabled", "true");
});
