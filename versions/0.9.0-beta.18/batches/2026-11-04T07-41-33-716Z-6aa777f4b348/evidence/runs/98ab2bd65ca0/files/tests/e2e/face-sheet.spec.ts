import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "@playwright/test";
import { Face } from "../../src/game/board/Face.tsx";
import { getFaceData } from "../../src/game/board/face-data.ts";
import { saveElementScreenshot } from "./helpers/evidence.ts";

function sheetMarkup(): string {
  const cells: string[] = [];
  for (let id = 0; id < 128; id += 1) {
    const face = getFaceData(id);
    if (face === null) throw new Error(`Missing face ${id}.`);
    cells.push(
      `<div class="face-cell" aria-label="${face.accessibleName}">${renderToStaticMarkup(
        createElement(Face, { face }),
      )}</div>`,
    );
  }

  return `<!doctype html><html lang="en"><meta charset="utf-8"><title>Neon Pairs grayscale face sheet</title>
    <style>*{box-sizing:border-box}body{margin:8px;background:#fff}.face-sheet{display:grid;inline-size:max-content;grid-template-columns:repeat(16,44px);gap:4px}
      .face-cell{width:44px;height:44px;display:grid;place-items:center;background:#111625;border:2px solid #757c9a}
      svg{display:block;width:40px;height:40px;filter:grayscale(1)}</style>
    <main class="face-sheet">${cells.join("")}</main></html>`;
}

test("render the 128 documented face identities as a 44px grayscale sheet", async ({ page }) => {
  await page.setContent(sheetMarkup());
  await expect(page.locator(".face-cell")).toHaveCount(128);
  await saveElementScreenshot(page.locator(".face-sheet"), "faces-grayscale-44px.png");
});
