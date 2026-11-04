import { expect, test } from "@playwright/test";
import { advance, cardAt, finishBoardByClicks, startBoard } from "./helpers.ts";

test("completes all seven supported board sizes through native card actions", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/");
  for (const size of [4, 6, 8, 10, 12, 14, 16]) {
    if (size !== 4) await page.getByLabel("Grid size").selectOption(String(size));
    await startBoard(page, `np1-${size}-1`);
    await expect(page.locator(".board-grid > button")).toHaveCount(size * size);
    await finishBoardByClicks(page, size);
    await expect(page.locator(".win-banner")).toBeVisible();
    await expect(page.getByText(`Pairs: ${size * size / 2}/${size * size / 2}`, { exact: true })).toBeVisible();
    await expect(page.getByText(`Moves: ${size * size / 2}`, { exact: true })).toBeVisible();
  }
});

test("counts only valid reveals, keeps matches, blocks a miss and announces it once", async ({ page }) => {
  await page.clock.pauseAt(new Date("2026-01-01T00:00:00Z"));
  await startBoard(page);
  await cardAt(page, 0).click();
  const revealed = await cardAt(page, 0).getAttribute("aria-label");
  expect(revealed).toContain("revealed");
  await cardAt(page, 0).click();
  expect(await cardAt(page, 0).getAttribute("aria-label")).toBe(revealed);
  expect(await page.getByText("Moves: 0", { exact: true }).count()).toBe(1);

  await cardAt(page, 11).click();
  expect(await page.getByText("Pairs: 1/8", { exact: true }).count()).toBe(1);
  expect(await page.getByText("Moves: 1", { exact: true }).count()).toBe(1);
  await expect(cardAt(page, 0)).toHaveAttribute("aria-disabled", "true");
  await cardAt(page, 0).evaluate((button) => {
    if (!(button instanceof HTMLButtonElement)) throw new Error("The matched card is a native button.");
    button.click();
  });
  expect(await page.getByText("Moves: 1", { exact: true }).count()).toBe(1);

  const region = page.locator(".live-announcement");
  await cardAt(page, 1).click();
  await cardAt(page, 2).click();
  await expect(region).toHaveText("No match. Cards close after a short pause.");
  const previousAnnouncement = await region.locator("span").elementHandle();
  await page.keyboard.press("ArrowRight");
  expect(await page.locator(".card-revealed").count()).toBe(2);
  await advance(page, 799);
  expect(await page.locator(".card-revealed").count()).toBe(2);
  await advance(page, 1);
  expect(await page.locator(".card-revealed").count()).toBe(0);
  expect(await previousAnnouncement?.evaluate((node) => node.isSameNode(document.querySelector(".live-announcement > span")))).toBe(true);
});

test("issues a new live-region announcement for consecutive identical misses", async ({ page }) => {
  await page.clock.pauseAt(new Date("2026-01-01T00:00:00Z"));
  await startBoard(page);
  const region = page.locator(".live-announcement");
  await cardAt(page, 0).click();
  await cardAt(page, 1).click();
  await expect(region).toHaveText("No match. Cards close after a short pause.");
  const first = await region.locator("span").elementHandle();
  await advance(page, 800);
  expect(await page.locator(".card-revealed").count()).toBe(0);
  expect(await first?.evaluate((node) => node.isSameNode(document.querySelector(".live-announcement > span")))).toBe(true);
  await cardAt(page, 2).click();
  await cardAt(page, 3).click();
  await expect(region).toHaveText("No match. Cards close after a short pause.");
  expect(await first?.evaluate((node) => node.isSameNode(document.querySelector(".live-announcement > span")))).toBe(false);
});

test("validates reproduction drafts before replacing game state", async ({ page }) => {
  await page.goto("/");
  const details = page.locator(".reproduction-details");
  expect(await details.getAttribute("open")).toBeNull();
  await startBoard(page);
  const code = page.getByLabel("Board code");
  expect(await code.getAttribute("maxlength")).toBe("32");
  await code.fill("  np1-4-1 \n");
  await page.getByRole("button", { name: "Load board" }).click();
  expect(await code.inputValue()).toBe("np1-4-1");
  await code.fill("my retained draft");
  await cardAt(page, 0).click();
  expect(await code.inputValue()).toBe("my retained draft");
  await code.fill("np1-5-1");
  await page.getByRole("button", { name: "Load board" }).click();
  await expect(page.locator(".control-status")).toHaveText("Invalid board code.");
  expect(await cardAt(page, 0).getAttribute("aria-label")).toContain("revealed");
  expect(await code.inputValue()).toBe("np1-5-1");

  const snapshot = page.getByLabel("Snapshot JSON");
  expect(await snapshot.getAttribute("maxlength")).toBe("65536");
  await snapshot.fill("{");
  await page.getByRole("button", { name: "Load snapshot" }).click();
  await expect(page.locator(".control-status")).toHaveText("Invalid snapshot.");
  expect(await code.inputValue()).toBe("np1-5-1");
  expect(await cardAt(page, 0).getAttribute("aria-label")).toContain("revealed");
});

test("invalid board code, restart and new deal preserve size and discard old mismatch timers", async ({ page }) => {
  await page.clock.pauseAt(new Date("2026-01-01T00:00:00Z"));
  await startBoard(page);
  await page.getByLabel("Grid size").selectOption("6");
  await startBoard(page, "np1-6-1");
  await cardAt(page, 0).click();
  await cardAt(page, 1).click();
  await advance(page, 300);
  await page.getByRole("button", { name: "Restart" }).click();
  await expect(page.getByText("Pairs: 0/18", { exact: true })).toBeVisible();
  await expect(page.getByText("Moves: 0", { exact: true })).toBeVisible();
  expect(await page.getByLabel("Grid size").inputValue()).toBe("6");
  await cardAt(page, 2).click();
  await advance(page, 1_000);
  expect(await cardAt(page, 2).getAttribute("aria-label")).toContain("revealed");
  expect(await page.locator(".card-revealed").count()).toBe(1);
  await page.getByRole("button", { name: "New Game" }).click();
  const newCode = await page.getByLabel("Board code").inputValue();
  expect(newCode).toMatch(/^np1-6-[1-9][0-9]*$/);
  expect(newCode).not.toBe("np1-6-1");
  await expect(page.getByText("Moves: 0", { exact: true })).toBeVisible();
});
