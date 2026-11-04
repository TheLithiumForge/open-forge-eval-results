import { expect, test } from "@playwright/test";
import { activateCard, boardCards, freezeClock, openGame, openReproductionTools } from "./support.ts";

test("reproduction controls retain drafts, report exact failures, and keep action focus", async ({ page }) => {
  await freezeClock(page);
  await openGame(page);
  const details = page.locator("details.reproduction-tools");
  await expect(details).not.toHaveAttribute("open", "");
  await expect(page.getByText("Reproduce a game", { exact: true })).toBeVisible();
  await openReproductionTools(page);
  const boardCode = page.getByLabel("Board code");
  const snapshot = page.getByLabel("Snapshot JSON");
  const startingCode = await boardCode.inputValue();
  await page.getByRole("button", { name: "Restart" }).click();
  await expect(page.getByRole("button", { name: "Restart" })).toBeFocused();
  await expect(boardCode).toHaveValue(startingCode);
  await page.getByRole("button", { name: "New Game" }).click();
  await expect(page.getByRole("button", { name: "New Game" })).toBeFocused();
  await expect(boardCode).not.toHaveValue(startingCode);

  await expect(boardCode).toHaveAttribute("maxlength", "32");
  await expect(snapshot).toHaveAttribute("maxlength", "65536");
  await boardCode.fill("np1-4-2");
  await activateCard(page, 0);
  await expect(boardCode).toHaveValue("np1-4-2");

  await boardCode.fill("np1-5-1");
  await page.getByRole("button", { name: "Load board" }).click();
  await expect(page.locator(".control-status")).toHaveText("Invalid board code.");
  await expect(boardCode).toHaveValue("np1-5-1");
  await expect(boardCards(page).nth(0)).toHaveAttribute("aria-label", /revealed/);
  await expect(page.getByRole("button", { name: "Load board" })).toBeFocused();

  await boardCode.fill(" np1-6-1 ");
  await page.getByRole("button", { name: "Load board" }).click();
  await expect(page.getByLabel("Grid size")).toHaveValue("6");
  await expect(boardCode).toHaveValue("np1-6-1");
  await expect(boardCards(page)).toHaveCount(36);
  await expect(page.getByRole("button", { name: "Load board" })).toBeFocused();
  await page.reload();
  await expect(page.getByLabel("Grid size")).toHaveValue("6");
  await expect(boardCards(page)).toHaveCount(36);

  await openReproductionTools(page);
  await snapshot.fill("not JSON");
  await page.getByRole("button", { name: "Load snapshot" }).click();
  await expect(page.locator(".control-status")).toHaveText("Invalid snapshot.");
  await expect(snapshot).toHaveValue("not JSON");
  await expect(page.getByRole("button", { name: "Load snapshot" })).toBeFocused();
  await page.getByRole("button", { name: "Export snapshot" }).click();
  await expect(snapshot).toHaveValue(/"boardCode":\s*"np1-6-\d+"/);
  await expect(page.getByRole("button", { name: "Export snapshot" })).toBeFocused();

  const partial = {
    version: 1, boardCode: "np1-4-1", matched: [], selection: { kind: "one", index: 0 },
    moves: 0, elapsedMs: 400, started: true,
  };
  await snapshot.fill(JSON.stringify(partial));
  await page.getByRole("button", { name: "Load snapshot" }).click();
  await expect(page.locator(".control-status")).toHaveText("Loaded snapshot. Select Resume to continue.");
  await expect(page.getByLabel("Grid size")).toHaveValue("4");
  await expect(boardCards(page).nth(0)).toHaveAttribute("aria-label", /revealed/);
  await expect(page.getByRole("button", { name: "Resume" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Load snapshot" })).toBeFocused();
});
