import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";
import { cardButtons, deckFor, loadBoard, pairsFor, revealPairs } from "./support.ts";

const SIZES = [4, 6, 8, 10, 12, 14, 16] as const;

test("completes each supported size and saves a grayscale 128-face sheet", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/");
  await mkdir(resolve("evidence"), { recursive: true });

  for (const size of SIZES) {
    const code = `np1-${size}-1`;
    await loadBoard(page, code);
    await expect(cardButtons(page)).toHaveCount(size * size);
    await revealPairs(page, pairsFor(deckFor(code)));
    await expect(page.getByText(`Pairs: ${size * size / 2}/${size * size / 2}`)).toBeVisible();
    await expect(page.locator(".win-banner")).toContainText(`${size * size / 2} moves`);
    await expect(page.locator(".board-scroll")).toHaveCount(1);
  }

  const count = await page.evaluate(() => {
    const labels = new Map<string, SVGElement>();
    for (const card of document.querySelectorAll<HTMLButtonElement>(".board-grid > button.card")) {
      const label = card.getAttribute("aria-label");
      const artwork = card.querySelector("svg.face-artwork");
      if (label === null || !(artwork instanceof SVGElement)) continue;
      const faceName = label.replace(/^Row \d+, column \d+, /, "").replace(/, matched$/, "");
      const clone = artwork.cloneNode(true);
      if (!labels.has(faceName) && clone instanceof SVGElement) labels.set(faceName, clone);
    }
    if (labels.size !== 128) throw new Error(`Expected 128 face identities, found ${labels.size}`);
    const root = document.getElementById("root");
    if (root === null) throw new Error("Game root is missing");
    root.replaceChildren();
    root.style.width = "max-content";
    const sheet = document.createElement("div");
    sheet.className = "board-grid";
    sheet.style.setProperty("--columns", "16");
    sheet.style.setProperty("--card-size", "44px");
    for (const artwork of labels.values()) {
      const card = document.createElement("div");
      card.className = "card card--face";
      card.style.setProperty("--card-size", "44px");
      card.append(artwork);
      sheet.append(card);
    }
    root.append(sheet);
    document.body.style.filter = "grayscale(1)";
    return labels.size;
  });
  expect(count).toBe(128);
  await page.screenshot({ path: "evidence/face-sheet.png", clip: { x: 0, y: 0, width: 794, height: 394 } });
});

