import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { expect } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";

declare global {
  interface Window {
    __npAnnouncementAdds: number;
    __npSetHidden(hidden: boolean): void;
  }
}

export function boardCards(page: Page): Locator {
  return page.getByRole("group", { name: "Game board" }).getByRole("button");
}

export async function freezeClock(page: Page): Promise<void> {
  const now = new Date("2026-01-01T00:00:00.000Z");
  await page.clock.install({ time: now });
  await page.clock.pauseAt(now);
}

export async function openGame(page: Page): Promise<void> {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Neon Pairs" })).toBeVisible();
}

export async function installVisibilityDriver(page: Page): Promise<void> {
  await page.addInitScript(() => {
    let hidden = false;
    Object.defineProperty(document, "hidden", { configurable: true, get: () => hidden });
    Object.defineProperty(window, "__npSetHidden", {
      configurable: true,
      value: (next: boolean) => {
        hidden = next;
        document.dispatchEvent(new Event("visibilitychange"));
      },
    });
  });
}

export async function setSimulatedHidden(page: Page, hidden: boolean): Promise<void> {
  await page.evaluate((value) => window.__npSetHidden(value), hidden);
}

export async function watchAnnouncements(page: Page): Promise<void> {
  await page.evaluate(() => {
    const region = document.querySelector(".turn-announcement");
    if (!(region instanceof HTMLElement)) throw new Error("Announcement region was not found.");
    let additions = 0;
    new MutationObserver((records) => {
      for (const record of records) {
        additions += Array.from(record.addedNodes).filter((node) => node instanceof HTMLSpanElement).length;
      }
      window.__npAnnouncementAdds = additions;
    }).observe(region, { childList: true, subtree: true });
    window.__npAnnouncementAdds = 0;
  });
}

export async function announcementCount(page: Page): Promise<number> {
  return page.evaluate(() => window.__npAnnouncementAdds);
}

export async function openReproductionTools(page: Page): Promise<void> {
  const details = page.locator("details.reproduction-tools");
  const isOpen = await details.evaluate((node) => {
    if (!(node instanceof HTMLDetailsElement)) throw new Error("Reproduction panel was not found.");
    return node.open;
  });
  if (!isOpen) {
    await page.getByText("Reproduce a game", { exact: true }).click();
  }
}

export async function readBoardCode(page: Page): Promise<string> {
  await openReproductionTools(page);
  return page.getByLabel("Board code").inputValue();
}

export async function loadBoardCode(page: Page, boardCode: string): Promise<void> {
  await openReproductionTools(page);
  await page.getByLabel("Board code").fill(boardCode);
  await page.getByRole("button", { name: "Load board" }).click();
}

export async function loadSnapshot(page: Page, value: unknown): Promise<void> {
  await openReproductionTools(page);
  await page.getByLabel("Snapshot JSON").fill(JSON.stringify(value));
  await page.getByRole("button", { name: "Load snapshot" }).click();
}

export async function activateCard(page: Page, index: number): Promise<void> {
  await boardCards(page).nth(index).evaluate((node) => {
    if (!(node instanceof HTMLButtonElement)) throw new Error("Card button was not found.");
    node.click();
  });
}

export async function activateCards(page: Page, indices: readonly number[]): Promise<void> {
  await page.evaluate((positions) => {
    const board = document.querySelector(".board-grid");
    if (!(board instanceof HTMLElement)) throw new Error("Game board was not found.");
    const cards = board.querySelectorAll("button.card");
    for (const index of positions) {
      const card = cards.item(index);
      if (!(card instanceof HTMLButtonElement)) throw new Error(`Card ${index} was not found.`);
      card.click();
    }
  }, [...indices]);
}

export async function saveEvidence(relativePath: string, contents: string): Promise<void> {
  const path = resolve(relativePath);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, contents);
}

export async function captureScreenshot(page: Page, relativePath: string): Promise<void> {
  const path = resolve(relativePath);
  await mkdir(dirname(path), { recursive: true });
  await page.screenshot({ path, fullPage: true });
}

export async function dragTouch(page: Page, startX: number, startY: number, endX: number, endY: number): Promise<void> {
  const session = await page.context().newCDPSession(page);
  try {
    await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: startX, y: startY }] });
    for (let step = 1; step <= 5; step += 1) {
      const progress = step / 5;
      await session.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: startX + (endX - startX) * progress, y: startY + (endY - startY) * progress }],
      });
    }
    await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  } finally {
    await session.detach();
  }
}
