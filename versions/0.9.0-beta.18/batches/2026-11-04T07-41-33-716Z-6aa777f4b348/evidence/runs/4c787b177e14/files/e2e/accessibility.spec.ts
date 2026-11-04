import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";
import { matchingPairs, startBoard, cardAt } from "./helpers.ts";

async function moveFocus(page: Parameters<typeof cardAt>[0], from: number, to: number, size: number): Promise<void> {
  const rowChange = Math.floor(to / size) - Math.floor(from / size);
  const columnChange = (to % size) - (from % size);
  const horizontal = columnChange < 0 ? "ArrowLeft" : "ArrowRight";
  const vertical = rowChange < 0 ? "ArrowUp" : "ArrowDown";
  for (let step = 0; step < Math.abs(columnChange); step += 1) await page.keyboard.press(horizontal);
  for (let step = 0; step < Math.abs(rowChange); step += 1) await page.keyboard.press(vertical);
}

test("plays a complete named keyboard journey and saves accessibility-tree evidence", async ({ page, browser }) => {
  await page.clock.pauseAt(new Date("2026-01-01T00:00:00Z"));
  await startBoard(page, "np1-4-1");

  const sizeSelect = page.getByLabel("Grid size");
  await sizeSelect.focus();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "New Game" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Restart" })).toBeFocused();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Tab");

  const firstCard = cardAt(page, 0);
  await expect(firstCard).toBeFocused();
  const closedName = await firstCard.getAttribute("aria-label");
  expect(closedName).toBe("Row 1, column 1, closed");
  expect(await firstCard.getAttribute("tabindex")).toBe("0");
  expect(await page.locator(".card[tabindex='0']").count()).toBe(1);
  const closedTree = await page.getByRole("group", { name: "Memory cards" }).ariaSnapshot();

  const pairs = matchingPairs("np1-4-1");
  const turnAnnouncements: string[] = [];
  let focusedIndex = 0;
  let revealedName = "";
  let matchedName = "";
  for (const [pairIndex, [first, second]] of pairs.entries()) {
    await moveFocus(page, focusedIndex, first, 4);
    focusedIndex = first;
    if (first === 0) {
      await page.keyboard.press("Space");
      revealedName = (await cardAt(page, first).getAttribute("aria-label")) ?? "";
      expect(revealedName).toContain("revealed");
    } else {
      await page.keyboard.press("Space");
      expect(await cardAt(page, first).getAttribute("aria-label")).toContain("revealed");
    }
    await moveFocus(page, focusedIndex, second, 4);
    focusedIndex = second;
    await page.keyboard.press("Space");
    await expect(cardAt(page, first)).toHaveAttribute("aria-disabled", "true");
    await expect(cardAt(page, second)).toHaveAttribute("aria-disabled", "true");
    const announcement = pairIndex === pairs.length - 1
      ? "Pair found. All pairs found in 8 moves and 0:00."
      : `Pair found. ${pairIndex + 1} ${pairIndex === 0 ? "pair" : "pairs"} matched.`;
    await expect(page.locator(".live-announcement")).toHaveText(announcement);
    turnAnnouncements.push(announcement);
    if (pairIndex === 0) matchedName = (await cardAt(page, first).getAttribute("aria-label")) ?? "";
  }

  const finalAnnouncement = `Pair found. All pairs found in 8 moves and 0:00.`;
  await expect(page.locator(".live-announcement")).toHaveText(finalAnnouncement);
  await expect(page.getByRole("region", { name: "Game complete" })).toBeVisible();
  await expect(page.getByText("Moves: 8", { exact: true })).toBeVisible();
  const finalTree = await page.locator("main").ariaSnapshot();
  await mkdir("evidence", { recursive: true });
  const evidence = [
    "# Neon Pairs keyboard accessibility tree",
    "",
    `- Browser: Chromium ${browser.version()}`,
    "- Playwright: 1.64.1",
    "- Journey: named Grid size and New Game controls; keyboard enter; closed and revealed names; all matched cards; final result and time; Tab exit; new deal.",
    "- Screen reader: not used. Spoken-output confirmation remains user acceptance.",
    "",
    "## Closed card name",
    "",
    `- ${closedName}`,
    "",
    "## Revealed card name",
    "",
    `- ${revealedName}`,
    "",
    "## Matched card name",
    "",
    `- ${matchedName}`,
    "",
    "## Turn announcements",
    "",
    ...turnAnnouncements.map((announcement) => `- ${announcement}`),
    "",
    "## Initial card-group accessibility snapshot",
    "",
    "```yaml",
    closedTree,
    "```",
    "",
    "## Completed game accessibility snapshot",
    "",
    "```yaml",
    finalTree,
    "```",
    "",
  ].join("\n");
  await writeFile(resolve("evidence/keyboard-accessibility.md"), evidence, "utf8");

  await page.keyboard.press("Tab");
  await expect(page.locator(".reproduction-details > summary")).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(cardAt(page, 15)).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(page.getByRole("button", { name: "Restart" })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(page.getByRole("button", { name: "New Game" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Moves: 0", { exact: true })).toBeVisible();
  expect(await page.getByRole("button", { name: "New Game" }).evaluate((element) => element === document.activeElement)).toBe(true);
});
