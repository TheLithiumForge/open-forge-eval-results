import { expect, test } from "@playwright/test";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const dealPairs = [[0, 11], [1, 9], [2, 6], [3, 7], [4, 5], [8, 15], [10, 14], [12, 13]] as const;

async function moveBoardFocus(page: import("@playwright/test").Page, from: number, to: number) {
  const side = 4;
  const rowSteps = Math.floor(to / side) - Math.floor(from / side);
  const columnSteps = (to % side) - (from % side);
  for (let count = 0; count < Math.abs(rowSteps); count += 1) await page.keyboard.press(rowSteps > 0 ? "ArrowDown" : "ArrowUp");
  for (let count = 0; count < Math.abs(columnSteps); count += 1) await page.keyboard.press(columnSteps > 0 ? "ArrowRight" : "ArrowLeft");
}

test("keyboard journey exposes the board, announces a win, then starts another deal", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByLabel("Grid size")).toHaveValue("4");
  await expect(page.getByRole("button", { name: "New Game" })).toBeVisible();
  const initialTree = await page.locator("main").ariaSnapshot();
  expect(initialTree).toContain('combobox "Grid size"');
  expect(initialTree).toContain('button "New Game"');
  expect(initialTree).toContain('button "Row 1, column 1, closed"');
  expect(initialTree).toContain('status');
  await expect(page.getByRole("status")).toHaveCount(1);

  await page.getByLabel("Grid size").focus();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "New Game" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Restart" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Row 1, column 1, closed" })).toBeFocused();
  await page.keyboard.press("Tab");
  const summary = page.getByText("Reproduce a game");
  await expect(summary).toBeFocused();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Tab");
  const boardCode = page.getByLabel("Board code");
  await expect(boardCode).toBeFocused();
  await boardCode.fill("np1-4-1");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await expect(page.locator(".game-announcement")).toHaveText("Loaded board.");
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Shift+Tab");
  const first = page.getByRole("button", { name: "Row 1, column 1, closed" });
  await expect(first).toBeFocused();

  let cursor = 0;
  for (const [firstIndex, secondIndex] of dealPairs) {
    await moveBoardFocus(page, cursor, firstIndex);
    await page.keyboard.press("Enter");
    if (firstIndex === 0) {
      const faceName = "Row 1, column 1, cyan solid plus, marker top, revealed";
      await expect(page.getByRole("button", { name: faceName })).toBeFocused();
      const revealedTree = await page.locator("main").ariaSnapshot();
      expect(revealedTree).toContain(faceName);
    }
    await moveBoardFocus(page, firstIndex, secondIndex);
    await page.keyboard.press("Enter");
    cursor = secondIndex;
  }

  await expect(page.getByText("Moves: 8")).toBeVisible();
  await expect(page.getByText("Pairs: 8/8")).toBeVisible();
  await expect(page.getByText("Best: 8")).toBeVisible();
  await expect(page.locator(".win-banner")).toContainText("8 moves");
  await expect(page.locator(".game-announcement")).toContainText("Pair found. All pairs found in 8 moves and");
  await page.keyboard.press("Shift+Tab");
  await expect(page.getByRole("button", { name: "Restart" })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(page.getByRole("button", { name: "New Game" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Moves: 0")).toBeVisible();
  await expect(page.getByText("Pairs: 0/8")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Best: 8")).toBeVisible();
});

test("board codes and snapshots preserve drafts and pause imported progress", async ({ page }) => {
  await page.goto("/");
  await page.getByText("Reproduce a game").click();
  const code = page.getByLabel("Board code");
  await code.fill("not-a-code");
  await page.getByRole("button", { name: "Load board" }).click();
  await expect(page.locator(".game-announcement")).toHaveText("Invalid board code.");
  await expect(page.getByRole("button", { name: "Row 1, column 1, closed" })).toBeVisible();

  await code.fill(" np1-4-1 ");
  await page.getByRole("button", { name: "Load board" }).click();
  await expect(code).toHaveValue("np1-4-1");
  const draft = page.getByRole("button", { name: "Row 1, column 1, closed" });
  await draft.click();
  await code.fill("edited draft");
  await expect(page.getByRole("button", { name: /cyan solid plus, marker top, revealed/ })).toBeVisible();

  await page.getByRole("button", { name: "Export snapshot" }).click();
  const snapshotField = page.getByLabel("Snapshot JSON");
  const exported = JSON.parse(await snapshotField.inputValue()) as { selection: { kind: string }; boardCode: string };
  expect(exported.boardCode).toBe("np1-4-1");
  expect(exported.selection.kind).toBe("one");
  await page.getByRole("button", { name: "Load snapshot" }).click();
  await expect(page.locator(".game-announcement")).toHaveText("Loaded snapshot. Select Resume to continue.");
  const resume = page.getByRole("button", { name: "Resume" });
  await expect(resume).toBeVisible();
  const pausedCard = page.getByRole("button", { name: /cyan solid plus, marker top, revealed/ });
  await pausedCard.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Moves: 0")).toBeVisible();
  await resume.click();
  await expect(page.getByRole("button", { name: "Resume" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /cyan solid plus, marker top, revealed/ })).toBeFocused();

  const completed = {
    version: 1, boardCode: "np1-4-1", matched: Array.from({ length: 16 }, (_, index) => index),
    selection: { kind: "closed" }, moves: 8, elapsedMs: 1200, started: true,
  };
  await snapshotField.fill(JSON.stringify(completed));
  await page.getByRole("button", { name: "Load snapshot" }).click();
  await expect(page.locator(".game-announcement")).toHaveText("Loaded completed snapshot.");
  await expect(page.locator(".win-banner")).not.toHaveClass(/animate-win/);
  await expect(page.getByText("Best: none")).toBeVisible();
});

test("saved size survives a reload from a local HTTP origin", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Grid size").selectOption("6");
  await expect(page.getByText("Pairs: 0/18")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Grid size")).toHaveValue("6");
  await expect(page.getByText("Pairs: 0/18")).toBeVisible();
});

test("restart cancels an earlier mismatch timeout", async ({ page }) => {
  await page.goto("/");
  await page.getByText("Reproduce a game").click();
  await page.getByLabel("Board code").fill("np1-4-1");
  await page.getByRole("button", { name: "Load board" }).click();
  await page.getByRole("button", { name: "Row 1, column 1, closed" }).click();
  await page.getByRole("button", { name: /Row 1, column 2, .*closed/ }).click();
  await expect(page.getByText("Moves: 1")).toBeVisible();
  await expect(page.locator(".game-announcement")).toHaveText("No match. Cards close after a short pause.");
  await page.getByRole("button", { name: "Restart" }).click();
  await expect(page.getByText("Moves: 0")).toBeVisible();
  await page.waitForTimeout(900);
  await expect(page.getByRole("button", { name: "Row 1, column 1, closed" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Row 1, column 2, closed" })).toBeVisible();
  await expect(page.getByText("Moves: 0")).toBeVisible();
});

test("each consecutive miss mutates the single polite status region", async ({ page }) => {
  await page.goto("/");
  await page.getByText("Reproduce a game").click();
  await page.getByLabel("Board code").fill("np1-4-1");
  await page.getByRole("button", { name: "Load board" }).click();
  const status = page.getByRole("status");
  await page.getByRole("button", { name: "Row 1, column 1, closed" }).click();
  await page.getByRole("button", { name: "Row 1, column 2, closed" }).click();
  await expect(status).toHaveText("No match. Cards close after a short pause.");
  await page.waitForTimeout(850);
  const firstAnnouncementMarker = await status.evaluate((element) => element.lastElementChild?.textContent ?? "");
  await page.getByRole("button", { name: "Row 1, column 3, closed" }).click();
  await page.getByRole("button", { name: "Row 1, column 4, closed" }).click();
  await expect(status).toHaveText("No match. Cards close after a short pause.");
  await expect.poll(async () => status.evaluate((element) => element.lastElementChild?.textContent ?? ""))
    .not.toBe(firstAnnouncementMarker);
});

test("the built HTML plays directly from disk without network requests", async ({ page }) => {
  const networkRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().startsWith("http://") || request.url().startsWith("https://")) networkRequests.push(request.url());
  });
  await page.goto(pathToFileURL(resolve("dist/index.html")).href);
  await expect(page).toHaveTitle("Neon Pairs");
  await page.getByRole("button", { name: "Row 1, column 1, closed" }).click();
  await expect(page.getByRole("button", { name: /Row 1, column 1, .*revealed/ })).toBeVisible();
  expect(networkRequests).toEqual([]);
});
