import { expect, test } from "@playwright/test";
import { loadSnapshot, positionsForFaces, snapshot } from "./support.ts";

test("a played win starts and ends one 600ms completion pulse", async ({ page }) => {
  await page.addInitScript(() => {
    document.addEventListener("animationstart", (event) => {
      if (!(event.target instanceof Element) || !event.target.classList.contains("win-banner")) return;
      const starts = Number(event.target.getAttribute("data-pulse-starts") ?? "0") + 1;
      event.target.setAttribute("data-pulse-starts", String(starts));
    }, true);
    document.addEventListener("animationend", (event) => {
      if (!(event.target instanceof Element) || !event.target.classList.contains("win-banner")) return;
      const ends = Number(event.target.getAttribute("data-pulse-ends") ?? "0") + 1;
      event.target.setAttribute("data-pulse-ends", String(ends));
    }, true);
  });
  await page.clock.install({ time: new Date("2025-01-01T00:00:00Z") });
  await page.clock.pauseAt(new Date("2025-01-02T00:00:00Z"));
  await page.goto("/");
  const code = "np1-4-1";
  await loadSnapshot(page, snapshot(code, [0]));
  await page.getByRole("button", { name: "Resume" }).click();
  for (const index of positionsForFaces(code, [0])) await page.locator(".memory-card").nth(index).click();
  const banner = page.locator(".win-banner");
  await expect(banner).toHaveClass(/win-banner-celebration/);
  await expect(banner).toHaveCSS("animation-duration", "0.6s");
  await expect(banner).toHaveCSS("animation-iteration-count", "1");
  await expect(banner).toHaveAttribute("data-pulse-starts", "1");
  await page.clock.runFor(601);
  await expect(banner).toHaveAttribute("data-pulse-ends", "1");
  await expect(banner).toHaveCSS("animation-duration", "0.6s");
});

test("reduced-motion wins and card borders use no transition", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const code = "np1-4-1";
  await loadSnapshot(page, snapshot(code, [0]));
  await page.getByRole("button", { name: "Resume" }).click();
  for (const index of positionsForFaces(code, [0])) await page.locator(".memory-card").nth(index).click();
  const banner = page.locator(".win-banner");
  await expect(banner).toHaveCSS("animation-name", "none");
  await expect(page.locator(".memory-card").first()).toHaveCSS("transition-duration", "0s");
});
