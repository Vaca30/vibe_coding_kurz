import { expect, test } from '@playwright/test';
import { join } from 'node:path';

// P2: image-to-print.
//
// Requires the same infra as P1 plus an MinIO/R2 bucket reachable from the
// browser host. The test uses a tiny PNG fixture committed alongside the spec.

const FIXTURE = join(import.meta.dirname, 'fixtures', 'sample.png');

test.describe('P2: image-to-print', () => {
  test('upload → preview → approve', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('mode-image').click();

    const input = page.getByTestId('image-upload-input');
    await input.setInputFiles(FIXTURE);

    await page.getByTestId('prompt-submit').click();
    await page.waitForURL(/\/generations\//);
    await expect(page.getByTestId('model-preview')).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId('approve-button')).toBeVisible();
  });

  test('lego-branded hint is refused before generation', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('mode-image').click();
    await page.getByTestId('image-upload-input').setInputFiles(FIXTURE);
    await page.getByTestId('prompt-hint').fill('lego brick replica');
    await page.getByTestId('prompt-submit').click();
    await expect(page.getByTestId('prompt-error')).toBeVisible({ timeout: 5_000 });
  });
});
