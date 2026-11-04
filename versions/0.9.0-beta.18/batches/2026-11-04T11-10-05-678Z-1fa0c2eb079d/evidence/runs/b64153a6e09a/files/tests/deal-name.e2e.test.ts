import { expect, test } from './browser-test.ts';
import { exportedSnapshot, loadTimedBoard } from './game-fixture.ts';

test('editing a deal name preserves live progress, mismatch timing and board drafts', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('.card').nth(2).click();
  await page.locator('.card').nth(6).click();
  await page.locator('.card').nth(0).click();
  await page.locator('.card').nth(1).click();
  await page.clock.runFor(125);
  const before = await exportedSnapshot(page);
  await page.locator('.card').nth(9).focus();
  await page.locator('summary').click();
  const field = page.getByRole('textbox', { name: 'Deal name', exact: true });
  await expect(field).toHaveValue('');
  await expect(field).toHaveAttribute('type', 'text');
  await expect(field).toHaveAttribute('maxlength', '40');
  const board = page.getByLabel('Board code', { exact: true });
  await board.fill('unfinished board draft');
  await field.fill(' Café 😀 ');
  await expect(field).toBeFocused();
  await expect(page.locator('.card').nth(9)).toHaveAttribute('tabindex', '0');
  const exportButton = page.getByRole('button', { name: 'Export snapshot', exact: true });
  await exportButton.click();
  await expect(exportButton).toBeFocused();
  const snapshot = page.getByLabel('Snapshot JSON', { exact: true });
  expect(JSON.parse(await snapshot.inputValue())).toEqual({
    ...before,
    version: 2,
    name: ' Café 😀 ',
  });
  await expect(board).toHaveValue('unfinished board draft');
  await expect(page.getByRole('status')).toHaveText('No match. Cards close after a short pause.');
  await page.clock.runFor(674);
  await expect(page.locator('.card.revealed')).toHaveCount(2);
  await page.clock.runFor(1);
  await expect(page.locator('.card.revealed')).toHaveCount(0);
  await expect(page.locator('.card.matched')).toHaveCount(2);
  await field.fill('');
  await exportButton.click();
  expect(JSON.parse(await snapshot.inputValue())).toEqual({
    ...before,
    selection: { kind: 'closed' },
    elapsedMs: 800,
  });
});

test('the name control keeps Unicode and spaces within forty UTF-16 units and rejects multiline paste', async ({
  page,
}) => {
  await loadTimedBoard(page);
  await page.locator('summary').click();
  const field = page.getByLabel('Deal name', { exact: true });
  const name = '😀'.repeat(20);
  await field.fill(name);
  await field.press('End');
  await field.pressSequentially('x');
  await expect(field).toHaveValue(name);
  const rejected = await field.evaluate((input) => {
    const data = new DataTransfer();
    data.setData('text/plain', 'bad\r\nname');
    return !input.dispatchEvent(
      new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }),
    );
  });
  expect(rejected).toBe(true);
  await expect(field).toHaveValue(name);
  await field.fill(' Café ');
  await page.locator('summary').click();
  expect(await exportedSnapshot(page)).toMatchObject({ version: 2, name: ' Café ' });
});
