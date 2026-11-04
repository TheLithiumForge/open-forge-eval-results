import type { Page } from "@playwright/test";

export async function loadKnownBoard(page: Page, code = "np1-4-1") {
  await page.getByText("Reproduce a game", { exact: true }).click();
  await page.getByLabel("Board code").fill(code);
  await page.getByRole("button", { name: "Load board" }).click();
}
