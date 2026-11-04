import { expect, test } from "@playwright/test";
import { cards, clickPairs, CODE_4, loadBoard, MATCHES, openReproduction, openWithFrozenClock } from "./helpers.ts";

test("known board, repeated and matched activations, active mismatch deadline", async ({ page }) => {
  await openWithFrozenClock(page);
  expect(await cards(page).count()).toBe(16);
  await loadBoard(page, CODE_4);
  await cards(page).nth(0).click();
  await expect(cards(page).nth(0)).toHaveAttribute("aria-label", "Row 1, column 1, cyan solid plus, marker top, revealed");
  await cards(page).nth(0).click();
  await expect(page.getByText("Moves: 0", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Restart" }).click();
  await cards(page).nth(2).dispatchEvent("click", { button: 0 });
  await cards(page).nth(6).click();
  await expect(page.getByText("Pairs: 1/8", { exact: true })).toBeVisible();
  await expect(page.getByText("Moves: 1", { exact: true })).toBeVisible();
  await cards(page).nth(2).dispatchEvent("click", { button: 0 });
  await expect(page.getByText("Moves: 1", { exact: true })).toBeVisible();

  await cards(page).nth(0).click();
  await page.clock.runFor(5);
  await cards(page).nth(1).click();
  await expect(page.getByText("Moves: 2", { exact: true })).toBeVisible();
  await cards(page).nth(3).click();
  await expect(cards(page).nth(0)).toHaveAttribute("aria-label", "Row 1, column 1, cyan solid plus, marker top, revealed");
  await page.clock.runFor(799);
  await expect(cards(page).nth(0)).toHaveAttribute("aria-label", /revealed$/);
  await page.clock.runFor(1);
  await cards(page).nth(3).click();
  await expect(cards(page).nth(3)).toHaveAttribute("aria-label", "Row 1, column 4, cyan solid hexagon, marker top, revealed");
  await cards(page).nth(7).click();
  await expect(page.getByText("Moves: 3", { exact: true })).toBeVisible();
  await expect(page.getByText("Pairs: 2/8", { exact: true })).toBeVisible();
});

test("restarting invalidates a pending miss and all supported sizes render", async ({ page }) => {
  await openWithFrozenClock(page);
  await loadBoard(page, CODE_4);
  await cards(page).nth(0).click();
  await cards(page).nth(1).click();
  await page.getByRole("button", { name: "Restart" }).click();
  await cards(page).nth(3).click();
  await page.clock.runFor(1_200);
  await expect(page.getByText("Moves: 0", { exact: true })).toBeVisible();
  await expect(cards(page).nth(3)).toHaveAttribute("aria-label", /revealed$/);
  await expect(page.getByText("Moves: 0", { exact: true })).toBeVisible();

  const size = page.getByRole("combobox", { name: "Grid size" });
  for (const side of [6, 8, 10, 12, 14, 16, 4]) {
    await size.selectOption(String(side));
    await expect(cards(page)).toHaveCount(side * side);
    await expect(page.getByText(`Pairs: 0/${side * side / 2}`, { exact: true })).toBeVisible();
  }
});

test("New Game deals a new code while Restart repeats its code and keeps best", async ({ page }) => {
  await page.goto("http://127.0.0.1:4173/");
  await openReproduction(page);
  await page.getByLabel("Board code").fill(CODE_4);
  await page.getByRole("button", { name: "Load board" }).click();
  await page.getByLabel("Board code").fill("edited draft");
  await cards(page).nth(2).click();
  await expect(page.getByLabel("Board code")).toHaveValue("edited draft");
  await page.getByRole("button", { name: "Restart" }).click();
  await expect(page.getByLabel("Board code")).toHaveValue(CODE_4);
  await cards(page).nth(2).click();
  await cards(page).nth(6).click();
  await clickPairs(page, MATCHES.filter(([first]) => first !== 2));
  await expect(page.getByRole("heading", { name: "All pairs found!" })).toBeVisible();
  await expect(page.getByText("Best: 8", { exact: true })).toBeVisible();
  const code = await page.getByLabel("Board code").inputValue();
  await page.getByRole("button", { name: "Restart" }).click();
  await expect(page.getByLabel("Board code")).toHaveValue(code);
  await expect(page.getByText("Best: 8", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "New Game" }).click();
  await expect(page.getByLabel("Board code")).not.toHaveValue(code);
  await expect(page.getByText("Best: 8", { exact: true })).toBeVisible();
});
