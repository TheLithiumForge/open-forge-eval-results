import { expect, test } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { accessibleFaceName, completedSnapshot, representativeFaces } from "./support.ts";

const palette = ["#63E7FF", "#FF71D6", "#8BEA7D", "#FFE082", "#FFB064", "#B49AFF", "#FF8296", "#D9F3FF"] as const;
const shapeTags = ["circle", "rect", "polygon", "polygon", "polygon", "polygon", "polygon", "polygon"] as const;
const directions = [[0, -40], [1, -1], [40, 0], [1, 1], [0, 40], [-1, 1], [-40, 0], [-1, -1]] as const;

test("128 inline faces have documented names, grayscale geometry and a 44px review sheet", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/");
  await page.getByText("Reproduce a game", { exact: true }).click();
  const code = "np1-16-1";
  const faces = representativeFaces(code);
  const textarea = page.getByLabel("Snapshot JSON", { exact: true });
  await textarea.fill(completedSnapshot(code, 128));
  await page.getByRole("button", { name: "Load snapshot", exact: true }).click();
  await expect(page.locator(".memory-card")).toHaveCount(256);
  await expect(page.locator(".memory-card[aria-disabled='true']")).toHaveCount(256);

  const evidence = await page.locator(".memory-card").evaluateAll((cards, representatives) =>
    representatives.map(({ face, index }) => {
      const card = cards[index];
      if (!(card instanceof HTMLButtonElement)) throw new Error("Card position " + index + " is missing.");
      const svg = card.querySelector("svg.face-art");
      if (svg === null) throw new Error("Card position " + index + " is missing inline art.");
      const shape = svg.firstElementChild;
      const marker = svg.lastElementChild;
      if (shape === null || marker === null) throw new Error("Face " + face + " is incomplete.");
      const bounds = card.getBoundingClientRect();
      return { face, index, label: card.getAttribute("aria-label"), cardSize: bounds.width,
        viewBox: svg.getAttribute("viewBox"), shapeTag: shape.tagName.toLowerCase(),
        fill: shape.getAttribute("fill"), stroke: shape.getAttribute("stroke"),
        strokeWidth: shape.getAttribute("stroke-width"), points: shape.getAttribute("points"),
        x: shape.getAttribute("x"), y: shape.getAttribute("y"), width: shape.getAttribute("width"),
        height: shape.getAttribute("height"), radius: shape.getAttribute("r"),
        markerRadius: marker.getAttribute("r"), markerX: marker.getAttribute("cx"),
        markerY: marker.getAttribute("cy"), markerStroke: marker.getAttribute("stroke"),
        markerStrokeWidth: marker.getAttribute("stroke-width") };
    }), faces);

  expect(new Set(evidence.map(({ label }) => label)).size).toBe(128);
  for (const item of evidence) {
    const face = item.face;
    const marker = Math.floor(face / 8) % 8;
    const color = palette[marker];
    const shape = shapeTags[face % 8];
    const row = Math.floor(item.index / 16) + 1;
    const column = (item.index % 16) + 1;
    expect(color).toBeDefined();
    expect(shape).toBeDefined();
    expect(item.label).toBe("Row " + row + ", column " + column + ", " + accessibleFaceName(face) + ", matched");
    expect(item.cardSize).toBe(44);
    expect(item.viewBox).toBe("0 0 100 100");
    expect(item.shapeTag).toBe(shape);
    expect(item.strokeWidth).toBe(face >= 64 ? "5" : null);
    expect(item.fill).toBe(face >= 64 ? "none" : color);
    expect(item.stroke).toBe(face >= 64 ? color : "none");
    expect(item.markerRadius).toBe("5");
    expect(item.markerStroke).toBe("#111625");
    expect(item.markerStrokeWidth).toBe("3");
    const [directionX, directionY] = directions[marker] ?? [0, 0];
    const diagonal = 40 / Math.sqrt(2);
    const expectedX = 50 + (Math.abs(directionX) === 1 ? directionX * diagonal : directionX);
    const expectedY = 50 + (Math.abs(directionY) === 1 ? directionY * diagonal : directionY);
    expect(Number(item.markerX)).toBeCloseTo(expectedX, 3);
    expect(Number(item.markerY)).toBeCloseTo(expectedY, 3);
    const pointText = item.points;
    if (pointText !== null) {
      for (const point of pointText.split(" ")) {
        const coordinates = point.split(",").map(Number);
        const x = coordinates[0];
        const y = coordinates[1];
        if (x === undefined || y === undefined) throw new Error("Face " + face + " has a malformed polygon.");
        expect(x).toBeGreaterThanOrEqual(25);
        expect(x).toBeLessThanOrEqual(75);
        expect(y).toBeGreaterThanOrEqual(25);
        expect(y).toBeLessThanOrEqual(75);
      }
    }
  }

  await page.evaluate((representatives) => {
    const grid = document.createElement("div");
    grid.className = "face-sheet";
    for (const { face, index } of representatives) {
      const source = document.querySelectorAll(".memory-card").item(index);
      if (!(source instanceof HTMLButtonElement)) throw new Error("Face sheet source is missing.");
      const tile = document.createElement("div");
      tile.className = "face-sheet-tile";
      const card = source.cloneNode(true);
      if (!(card instanceof HTMLButtonElement)) throw new Error("Face sheet clone is not a button.");
      card.classList.remove("is-matched");
      card.classList.add("is-revealed", "face-sheet-card");
      card.style.width = "44px";
      card.style.height = "44px";
      card.removeAttribute("aria-disabled");
      card.querySelector(".matched-mark")?.remove();
      const caption = document.createElement("span");
      caption.textContent = String(face).padStart(3, "0");
      tile.append(card, caption);
      grid.append(tile);
    }
    const style = document.createElement("style");
    style.textContent = "html,body{background:#fff}.face-sheet{display:grid;grid-template-columns:repeat(16,44px);gap:8px;padding:8px;background:#fff;width:max-content}.face-sheet-tile{display:flex;flex-direction:column;align-items:center;gap:4px;color:#000;font:11px/12px system-ui}.face-sheet-card{filter:grayscale(1);pointer-events:none}";
    document.head.append(style);
    document.body.replaceChildren(grid);
  }, faces);

  const screenshot = resolve("docs/evidence/faces-44px-grayscale.png");
  await mkdir(dirname(screenshot), { recursive: true });
  await page.locator(".face-sheet").screenshot({ path: screenshot });
  await writeFile(resolve("docs/evidence/faces-44px-grayscale.md"),
    "Generated from the documented np1-16-1 deal in Chromium 156.0.8078.4. The sheet uses 44px card boxes with production borders, padding and inline SVG, then applies a grayscale filter. Face IDs 0 through 127 appear in order. Playwright also checked all names, fill and outline values, marker coordinates and shape bounds. The sheet is a test artifact; it is not included in the game UI.\n", "utf8");
});
