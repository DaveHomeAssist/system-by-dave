const { test, expect } = require('@playwright/test');
const path = require('path');

const repo = '/Users/daverobertson/Desktop/Code/10-projects/active/system-by-dave-clean';
const teleprompterUrl = 'file://' + path.join(repo, 'teleprompter.html');
const suiteUrl = 'file://' + path.join(repo, 'av-suite.html');

async function installDialogTripwire(page) {
  page.on('dialog', dialog => {
    throw new Error(`Native browser dialog opened: ${dialog.type()} ${dialog.message()}`);
  });
  await page.evaluate(() => {
    window.prompt = () => { throw new Error('window.prompt should not be used'); };
    window.confirm = () => { throw new Error('window.confirm should not be used'); };
  });
}

function watchErrors(page) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });
  return errors;
}

test.describe('System by Dave dialog guard', () => {
  test('teleprompter saved library uses in app dialogs and guarded deletes', async ({ page }) => {
    test.setTimeout(60000);
    const errors = watchErrors(page);
    await page.goto(teleprompterUrl);
    await expect(page.locator('#editorControlsToggleBtn')).toBeVisible();
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.locator('#editorControlsToggleBtn')).toBeVisible();
    await installDialogTripwire(page);

    await page.locator('#toolbarCompactBtn').click();
    await expect(page.locator('#saveLocalBtn')).toBeVisible();

    await page.locator('#saveLocalBtn').click();
    await expect(page.locator('#savedScriptSelect option')).toHaveCount(2);

    await page.locator('#renameLocalBtn').click();
    await expect(page.locator('#textDialogBackdrop')).toHaveClass(/open/);
    await expect(page.locator('#textDialogTitle')).toHaveText('Rename saved script');
    await page.locator('#textDialogInput').fill('Camera intro');
    await page.locator('#textDialogSubmit').click();
    await expect(page.locator('#textDialogBackdrop')).toBeHidden();
    await expect(page.locator('#savedScriptSelect')).toContainText('Camera intro');

    await page.locator('#tagLocalBtn').click();
    await expect(page.locator('#textDialogTitle')).toHaveText('Edit saved script tags');
    await page.locator('#textDialogInput').fill('show, camera');
    await page.locator('#textDialogSubmit').click();
    await expect(page.locator('#savedScriptSelect')).toContainText('show, camera');

    await page.locator('#savedScriptFilter').fill('safe typing');
    await page.keyboard.press('Space');
    await expect(page.locator('body')).not.toHaveClass(/playing/);

    await page.locator('#deleteLocalBtn').click();
    await expect(page.locator('#deleteLocalBtn')).toHaveText('Confirm delete');
    await expect(page.locator('#savedScriptSelect option')).toHaveCount(2);
    await page.locator('#deleteLocalBtn').click();
    await expect(page.locator('#savedScriptSelect option')).toHaveCount(1);

    await page.locator('#saveFormatBtn').click();
    await expect(page.locator('#textDialogTitle')).toHaveText('Save formatting look');
    await page.locator('#textDialogInput').fill('Stage look');
    await page.locator('#textDialogSubmit').click();
    await expect(page.locator('#savedFormatSelect')).toContainText('Stage look');

    await page.locator('#deleteFormatBtn').click();
    await expect(page.locator('#deleteFormatBtn')).toHaveText('Confirm delete');
    await page.locator('#deleteFormatBtn').click();
    await expect(page.locator('#savedFormatSelect')).toContainText('No saved looks');

    await page.setViewportSize({ width: 390, height: 844 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
    expect(errors).toEqual([]);
  });

  test('AV Suite reset actions use two click arming instead of native confirms', async ({ page }) => {
    test.setTimeout(60000);
    const errors = watchErrors(page);
    await page.goto(suiteUrl);
    await expect(page.locator('#markRecommendedReadyBtn')).toBeVisible();
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.locator('#markRecommendedReadyBtn')).toBeVisible();
    await installDialogTripwire(page);

    await page.locator('#ready-teleprompter').selectOption('issue');
    await expect(page.locator('#issueCountOut')).toHaveText('1');
    await page.locator('#resetReadinessBtn').click();
    await expect(page.locator('#resetReadinessBtn')).toHaveText('Confirm reset');
    await expect(page.locator('#issueCountOut')).toHaveText('1');
    await page.locator('#resetReadinessBtn').click();
    await expect(page.locator('#issueCountOut')).toHaveText('0');

    await page.locator('#showName').fill('Dialog Guard Show');
    await expect(page.locator('#showTitleOut')).toHaveText('Dialog Guard Show');
    await page.locator('#clearPrefsBtn').click();
    await expect(page.locator('#clearPrefsBtn')).toHaveText('Confirm clear');
    await expect(page.locator('#showTitleOut')).toHaveText('Dialog Guard Show');
    await page.locator('#clearPrefsBtn').click();
    await expect(page.locator('#showTitleOut')).toHaveText('AV Tool Suite');

    await page.setViewportSize({ width: 390, height: 844 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
    expect(errors).toEqual([]);
  });
});
