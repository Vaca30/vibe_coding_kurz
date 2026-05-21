import { expect, test } from '@playwright/test';

// P1: text-to-print acceptance scenarios from spec.md User Story 1.
//
// This suite is structured to run against a fully-bootstrapped local stack:
//   - docker compose up (Postgres, Redis, MinIO, mock-generation)
//   - DB migrated + seeded
//   - apps/web + apps/worker running via `pnpm dev`
//   - Stripe test mode + a `stripe listen` forwarding to /api/webhooks/stripe
//
// Without those, the test will fail early in the prompt-submit step. That is
// the intended posture: the suite is a runtime gate, not a unit harness.

test.describe('P1: text-to-print', () => {
  test('happy path — prompt → preview → approve → checkout', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('prompt-input').fill('a chess knight shaped like a dragon');
    await page.getByTestId('prompt-submit').click();

    // Status page opens; wait for the model preview to render.
    await page.waitForURL(/\/generations\//);
    await expect(page.getByTestId('generation-pending')).toBeVisible();

    // Mock generation provider responds in ~3s by default. Wait up to 60s.
    await expect(page.getByTestId('model-preview')).toBeVisible({ timeout: 60_000 });

    await page.getByTestId('approve-button').click();
    await page.waitForURL(/\/order\/new/);

    // Order configurator shows price.
    await expect(page.getByTestId('order-price')).toBeVisible();

    // Validate a real-looking address (SmartyStreets in test mode accepts these).
    await page.getByTestId('address-recipientName').fill('Lukas');
    await page.getByTestId('address-street1').fill('1600 Amphitheatre Parkway');
    await page.getByTestId('address-city').fill('Mountain View');
    await page.getByTestId('address-state').fill('CA');
    await page.getByTestId('address-postalCode').fill('94043');
    await page.getByTestId('address-validate').click();
    await expect(page.getByTestId('address-valid')).toBeVisible({ timeout: 10_000 });
  });

  test('refused: weapons trigger pre-check', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('prompt-input').fill('a small AR-15 rifle for my desk');
    await page.getByTestId('prompt-submit').click();
    await expect(page.getByTestId('prompt-error')).toBeVisible({ timeout: 5_000 });
  });
});
