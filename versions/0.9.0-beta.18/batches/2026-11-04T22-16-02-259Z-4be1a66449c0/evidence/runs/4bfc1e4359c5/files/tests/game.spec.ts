import { expect, test } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadKnownBoard } from "./helpers.ts";

const deck = [6, 7, 0, 5, 2, 2, 0, 5, 3, 7, 1, 6, 4, 4, 1, 3];
const pairs = [...new Set(deck)].map((face) => deck.flatMap((value, index) => value === face ? [index] : []));

test("keyboard journey completes a known deal and records accessible-tree evidence", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("combobox", { name: "Grid size" })).toHaveValue("4");
  const initialTree = await page.locator("main").ariaSnapshot();
  expect(initialTree).toContain('combobox "Grid size"');
  expect(initialTree).toContain('button "New Game"');

  await loadKnownBoard(page);
  const initialBoard = await page.getByRole("group", { name: "Game board" }).ariaSnapshot();
  expect(initialBoard).toContain('button "Row 1, column 1, closed"');
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Shift+Tab");
  const firstCard = page.getByRole("button", { name: "Row 1, column 1, closed" });
  await expect(firstCard).toBeFocused();
  const hiddenMarkup = await firstCard.evaluate((button) => button.outerHTML);
  expect(hiddenMarkup).not.toContain("faceId");
  expect(hiddenMarkup).not.toContain("data-face");

  let focus = 0;
  const focusAt = async (destination: number) => {
    while (Math.floor(focus / 4) > Math.floor(destination / 4)) { await page.keyboard.press("ArrowUp"); focus -= 4; }
    while (Math.floor(focus / 4) < Math.floor(destination / 4)) { await page.keyboard.press("ArrowDown"); focus += 4; }
    while (focus % 4 > destination % 4) { await page.keyboard.press("ArrowLeft"); focus -= 1; }
    while (focus % 4 < destination % 4) { await page.keyboard.press("ArrowRight"); focus += 1; }
  };

  for (const [pairNumber, pair] of pairs.entries()) {
    const [first, second] = pair!;
    await focusAt(first!);
    await page.keyboard.press("Enter");
    if (pairNumber === 0) {
      await expect(page.getByRole("button", { name: "Row 1, column 1, cyan solid plus, marker top, revealed" })).toBeFocused();
    }
    await expect(page.getByRole("button", { name: new RegExp(`Row ${Math.floor(first! / 4) + 1}, column ${(first! % 4) + 1}, .* revealed`) })).toBeFocused();
    await focusAt(second!);
    await page.keyboard.press("Space");
    if (pairNumber < pairs.length - 1) {
      const count = pairNumber + 1;
      await expect(page.getByRole("status")).toHaveText(`Pair found. ${count} ${count === 1 ? "pair matched." : "pairs matched."}`);
    }
  }
  await expect(page.getByRole("status")).toHaveText(/Pair found\. All pairs found in 8 moves and \d+:\d{2}\./);
  await expect(page.getByLabel("Game complete")).toContainText("8 moves");
  await expect(page.getByText("Best:").locator(".." )).toContainText("8");

  const completedTree = await page.locator("main").ariaSnapshot();
  expect(completedTree).toContain("All pairs found in 8 moves");
  expect(completedTree).toContain("matched");
  const evidencePath = fileURLToPath(new URL("../evidence/accessibility-tree.md", import.meta.url));
  await mkdir(dirname(evidencePath), { recursive: true });
  await writeFile(evidencePath, `# Automated Chromium accessibility tree\n\nCollected after the keyboard completion journey.\n\n\`\`\`yaml\n${completedTree}\n\`\`\`\n`);

  await page.keyboard.press("Tab");
  await expect(page.getByText("Reproduce a game", { exact: true })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Board code")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Load board" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Snapshot JSON")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Export snapshot" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Load snapshot" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect.poll(() => page.evaluate(() => document.activeElement === document.body)).toBe(true);
  for (let index = 0; index < 9; index += 1) await page.keyboard.press("Shift+Tab");
  await expect(page.getByRole("button", { name: "New Game" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Moves:").locator(".." )).toContainText("0");
  await expect(page.getByText("Best:").locator(".." )).toContainText("8");
  await expect(page.getByRole("button", { name: "Row 1, column 1, closed" })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Grid size")).toHaveValue("4");
  await expect(page.getByText("Moves:").locator(".." )).toContainText("0");
  await expect(page.getByText("Best:").locator(".." )).toContainText("8");
});

test("restarts a mismatch without an earlier timer changing the new deal", async ({ page }) => {
  await page.goto("/");
  await loadKnownBoard(page);
  await page.getByRole("button", { name: "Row 1, column 1, closed" }).click();
  await page.getByRole("button", { name: "Row 1, column 2, closed" }).click();
  await expect(page.getByText("Moves:").locator(".." )).toContainText("1");
  await page.getByRole("button", { name: "Restart" }).click();
  await page.waitForTimeout(850);
  await expect(page.getByText("Moves:").locator(".." )).toContainText("0");
  await expect(page.getByRole("button", { name: "Row 1, column 1, closed" })).toBeVisible();
});

test("imports an unfinished snapshot paused and resumes at the remembered card", async ({ page }) => {
  await page.goto("/");
  await page.getByText("Reproduce a game", { exact: true }).click();
  const snapshot = { version: 1, boardCode: "np1-4-1", matched: [], selection: { kind: "one", index: 0 }, moves: 0, elapsedMs: 100, started: true };
  await page.getByLabel("Snapshot JSON").fill(JSON.stringify(snapshot));
  await page.getByRole("button", { name: "Load snapshot" }).click();
  await expect(page.getByRole("status")).toHaveText("Loaded snapshot. Select Resume to continue.");
  await expect(page.getByRole("button", { name: "Resume" })).toBeVisible();
  await page.getByRole("button", { name: "Resume" }).click();
  await expect(page.getByRole("button", { name: /Row 1, column 1, .* revealed/ })).toBeFocused();
  await expect(page.getByRole("button", { name: "Resume" })).toHaveCount(0);
});

test("offline distribution opens from disk with all code embedded", async ({ page }) => {
  const path = fileURLToPath(new URL("../dist/index.html", import.meta.url));
  await page.goto(`file://${path}`);
  await expect(page.getByRole("heading", { name: "Neon Pairs" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Row 1, column 1, closed/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("large boards scroll inside the board at phone and desktop widths", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/");
  await page.getByLabel("Grid size").selectOption("16");
  const cards = page.getByRole("button", { name: /Row \d+, column \d+, closed/ });
  await expect(cards).toHaveCount(256);
  const board = page.locator(".boardScroll");
  expect(await board.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(await page.locator(".memoryCard").first().evaluate((element) => element.getBoundingClientRect().width)).toBeGreaterThanOrEqual(44);

  await page.locator(".memoryCard").first().focus();
  for (let index = 0; index < 15; index += 1) await page.keyboard.press("ArrowDown");
  for (let index = 0; index < 15; index += 1) await page.keyboard.press("ArrowRight");
  const lastCard = page.getByRole("button", { name: "Row 16, column 16, closed" });
  await expect(lastCard).toBeFocused();
  expect(await lastCard.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    const area = element.closest(".boardScroll")!.getBoundingClientRect();
    return bounds.left >= area.left && bounds.right <= area.right && bounds.top >= area.top && bounds.bottom <= area.bottom;
  })).toBe(true);

  await page.setViewportSize({ width: 1280, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("repeats an identical live announcement for a second miss", async ({ page }) => {
  await page.goto("/");
  await loadKnownBoard(page);
  const miss = async () => {
    await page.getByRole("button", { name: "Row 1, column 1, closed" }).click();
    await page.getByRole("button", { name: "Row 1, column 2, closed" }).click();
    await expect(page.getByRole("status")).toHaveText("No match. Cards close after a short pause.");
  };
  await miss();
  const firstAnnouncement = await page.getByRole("status").elementHandle();
  await page.waitForTimeout(850);
  await miss();
  const secondAnnouncement = await page.getByRole("status").elementHandle();
  expect(firstAnnouncement).not.toBeNull();
  expect(secondAnnouncement).not.toBeNull();
  expect(await firstAnnouncement!.evaluate((element) => element.isConnected)).toBe(false);
});
