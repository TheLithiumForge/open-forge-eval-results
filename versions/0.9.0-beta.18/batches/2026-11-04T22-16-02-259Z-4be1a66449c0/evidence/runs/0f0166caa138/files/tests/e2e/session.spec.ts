import { expect, test, type Page } from "@playwright/test";

declare global {
  interface Window {
    setTestHidden: (hidden: boolean) => void;
  }
}

async function loadSeedOne(page: Page): Promise<void> {
  await page.getByText("Reproduce a game", { exact: true }).click();
  await page.getByLabel("Board code").fill("np1-4-1");
  await page.getByRole("button", { name: "Load board" }).click();
  await expect(page.locator(".load-status")).toHaveText("Loaded board np1-4-1.");
}

test("a hidden page pauses the active mismatch interval", async ({ page }) => {
  await page.goto("/");
  await loadSeedOne(page);
  const cards = page.getByRole("group", { name: "Card board" }).getByRole("button");
  await cards.nth(0).click();
  await cards.nth(1).click();
  await expect(cards.nth(0)).toHaveAccessibleName("Row 1, column 1, cyan solid plus, marker top, revealed");
  await expect(cards.nth(1)).toHaveAccessibleName("Row 1, column 2, cyan solid chevron, marker top, revealed");
  await page.evaluate(() => {
    let hidden = false;
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => hidden,
    });
    window.setTestHidden = (value: boolean) => {
      hidden = value;
      document.dispatchEvent(new Event("visibilitychange"));
    };
  });
  await page.evaluate(() => window.setTestHidden(true));
  await page.waitForTimeout(850);
  await expect(cards.nth(0)).toHaveAccessibleName("Row 1, column 1, cyan solid plus, marker top, revealed");
  await page.evaluate(() => window.setTestHidden(false));
  await expect(cards.nth(0)).toHaveAccessibleName("Row 1, column 1, closed", { timeout: 1_500 });
});

test("completed snapshots stay static and do not replace best scores", async ({ page }) => {
  await page.goto("/");
  await page.getByText("Reproduce a game", { exact: true }).click();
  const snapshot = JSON.stringify({
    version: 1,
    boardCode: "np1-4-1",
    matched: Array.from({ length: 16 }, (_, index) => index),
    selection: { kind: "closed" },
    moves: 8,
    elapsedMs: 1_234,
    started: true,
  });
  await page.getByLabel("Snapshot JSON").fill(snapshot);
  await page.getByRole("button", { name: "Load snapshot" }).click();
  await expect(page.locator(".load-status")).toHaveText("Loaded completed snapshot.");
  await expect(page.getByRole("button", { name: "Resume" })).toHaveCount(0);
  await expect(page.locator(".win-banner")).not.toHaveClass(/win-banner-pulse/);
  await expect(page.getByText("Best: none")).toBeVisible();
});

test("the size preference persists on a local HTTP origin", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Grid size").selectOption("6");
  await expect(page.getByLabel("Grid size")).toHaveValue("6");
  await page.reload();
  await expect(page.getByLabel("Grid size")).toHaveValue("6");
});
