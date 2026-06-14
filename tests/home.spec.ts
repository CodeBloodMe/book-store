import { test, expect } from '@playwright/test';

test('homepage loads and shows primary categories', async ({ page }) => {
  await page.goto('http://localhost:3000/');

  // Expect title
  await expect(page).toHaveTitle(/ChapterOne/);

  // Expect hero text
  await expect(page.locator('text=Every book on ChapterOne is chosen by')).toBeVisible();

  // Check if categories are rendered (Learning, Fiction, Personal Growth)
  await expect(page.getByRole('button', { name: /Learning/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Fiction/i })).toBeVisible();
});

test('navigation bar has search input', async ({ page }) => {
  await page.goto('http://localhost:3000/');

  // Search input should be visible in navbar
  const searchInput = page.getByPlaceholder('Search books, authors, topics…');
  await expect(searchInput).toBeVisible();
});
