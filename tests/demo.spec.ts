import { expect, test } from '@playwright/test';
import { addVirtualAuthenticator, mockApi, type MockApi } from './helpers';

const STORAGE_KEY = 'savedUsername';

let api: MockApi;

test.beforeEach(async ({ page }) => {
  api = await mockApi(page);
  await addVirtualAuthenticator(page);
  await page.goto('/');
  // The form only renders once WebAuthn support has been detected
  await expect(page.locator('#input-username')).toBeVisible();
});

const savedUsername = (page: import('@playwright/test').Page) =>
  page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY);

test.describe('registration', () => {
  test('generates a username when none is entered, and remembers it', async ({ page }) => {
    await page.click('#register-button');
    await expect(page.getByRole('status')).toContainText('Success');

    const [{ username }] = api.requests['/registration/options'];
    // e.g. "trustworthy-gazelle-667"
    expect(username).toMatch(/^[a-z-]+-[a-z]+-\d{1,3}$/);
    expect(username).not.toMatch(/^-/);

    await expect(page.locator('#input-username')).toHaveValue(username);
    expect(await savedUsername(page)).toBe(username);

    // The generated username is restored just like a typed one
    await page.reload();
    await expect(page.locator('#input-username')).toHaveValue(username);
  });

  test('uses a typed username as-is, and remembers it', async ({ page }) => {
    await page.fill('#input-username', 'alice');
    await page.click('#register-button');
    await expect(page.getByRole('status')).toContainText('Success');

    expect(api.requests['/registration/options'][0].username).toBe('alice');
    // Saving is debounced, so wait for it
    await expect.poll(() => savedUsername(page)).toBe('alice');
  });

  test('sends the selected registration settings', async ({ page }) => {
    await page.click('button:has-text("Advanced Settings")');
    await page.selectOption('#optRegUserVerification', 'required');
    await page.fill('#input-username', 'alice');
    await page.click('#register-button');
    await expect(page.getByRole('status')).toContainText('Success');

    expect(api.requests['/registration/options'][0]).toMatchObject({
      username: 'alice',
      userVerification: 'required',
      algorithms: ['ed25519', 'es256', 'rs256'],
    });
  });

  test('shows the error when verification fails', async ({ page }) => {
    await page.route('**/api/v1/registration/verification', (route) =>
      route.fulfill({ status: 400, json: { error: 'Bad attestation' } })
    );
    await page.fill('#input-username', 'alice');
    await page.click('#register-button');

    await expect(page.getByRole('status')).toContainText('Registration failed: Bad attestation');
  });
});

test.describe('authentication', () => {
  test('signs in with the registered passkey and opens the profile page', async ({ page }) => {
    await page.fill('#input-username', 'alice');
    await page.click('#register-button');
    await expect(page.getByRole('status')).toContainText('Success');

    await page.click('#login-button');
    await expect(page).toHaveURL(/\/profile\/$/);

    const [verification] = api.requests['/authentication/verification'];
    expect(verification.username).toBe('alice');
    expect(verification.response.id).toBeTruthy();
  });

  test('allows usernameless authentication', async ({ page }) => {
    await page.fill('#input-username', 'alice');
    await page.click('#register-button');
    await expect(page.getByRole('status')).toContainText('Success');

    await page.fill('#input-username', '');
    await page.click('#login-button');
    await expect(page).toHaveURL(/\/profile\/$/);

    const options = api.requests['/authentication/options'].at(-1);
    expect(options.username).toBeUndefined();
  });
});

test.describe('settings', () => {
  test('restores options from the query string', async ({ page }) => {
    await page.goto('/?regUserVerification=required&attestation=direct&regHints=hybrid');

    // Query params open the advanced settings drawer
    await expect(page.locator('#optRegUserVerification')).toHaveValue('required');
    await expect(page.locator('#attestation')).toHaveValue('direct');
  });

  test('ignores option values it does not offer', async ({ page }) => {
    await page.goto('/?regUserVerification=bogus');

    await expect(page.locator('#optRegUserVerification')).toHaveValue('preferred');
  });

  test('Reset Settings forgets the remembered username', async ({ page }) => {
    await page.fill('#input-username', 'alice');
    await expect.poll(() => savedUsername(page)).toBe('alice');

    await page.click('button:has-text("Advanced Settings")');
    await page.click('button:has-text("Reset Settings")');
    await expect(page.locator('#input-username')).toHaveValue('');
    expect(await savedUsername(page)).toBeNull();
  });
});
