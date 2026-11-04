import { mkdir, writeFile } from "node:fs/promises";
import type { Locator, Page } from "@playwright/test";

export async function saveScreenshot(
  page: Page,
  filename: string,
  fullPage = true,
): Promise<void> {
  await mkdir("evidence", { recursive: true });
  await page.screenshot({ path: `evidence/${filename}`, fullPage });
}

export async function saveJson(filename: string, value: unknown): Promise<void> {
  await mkdir("evidence", { recursive: true });
  await writeFile(`evidence/${filename}`, `${JSON.stringify(value, null, 2)}\n`);
}

export async function saveText(filename: string, value: string): Promise<void> {
  await mkdir("evidence", { recursive: true });
  await writeFile(`evidence/${filename}`, `${value.trim()}\n`);
}

export async function saveElementScreenshot(element: Locator, filename: string): Promise<void> {
  await mkdir("evidence", { recursive: true });
  await element.screenshot({ path: `evidence/${filename}` });
}
