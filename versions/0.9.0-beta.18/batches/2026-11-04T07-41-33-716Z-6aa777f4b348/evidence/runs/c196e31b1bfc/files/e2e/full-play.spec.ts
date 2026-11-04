import { expect, test } from "@playwright/test";
import { parseBoardCode } from "../src/game/boardCode.ts";
import { BOARD_SIZES, openReproduction } from "./support.ts";

for (const size of BOARD_SIZES) {
  test(`a fresh ${size}x${size} deal can be completed`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.clock.install({ time: new Date("2025-01-01T00:00:00Z") });
    await page.clock.pauseAt(new Date("2025-01-02T00:00:00Z"));
    await page.goto("/");
    await page.getByLabel("Grid size").selectOption(String(size));
    await openReproduction(page);
    const code = await page.getByLabel("Board code").inputValue();
    const board = parseBoardCode(code);
    expect(board?.size).toBe(size);
    if (board === null) throw new Error("The displayed board code must be valid.");

    const locations = new Map<number, number[]>();
    board.deck.forEach((face, index) => locations.set(face, [...(locations.get(face) ?? []), index]));
    const cards = page.locator(".memory-card");
    for (const [face, positions] of locations) {
      expect(positions).toHaveLength(2);
      const first = positions[0];
      const second = positions[1];
      if (first === undefined || second === undefined) throw new Error(`Face ${face} must occur twice.`);
      await cards.nth(first).press("Enter");
      await cards.nth(second).press("Enter");
    }
    const pairs = size * size / 2;
    await expect(page.getByText(`Pairs: ${pairs}/${pairs}`)).toBeVisible();
    await expect(page.getByText(`Moves: ${pairs}`)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Every pair found!" })).toBeVisible();
  });
}
