import { expect, test } from '@playwright/test';

test('loads the game title from the built distribution', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Neon Pairs' })).toBeVisible();
});
