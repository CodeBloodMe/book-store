import { test, expect } from '@playwright/test';

test('search returns results', async ({ page }) => {
  await page.goto('http://localhost:3000/');

  // Type in the search box
  const searchInput = page.getByPlaceholder('Search books, authors, topics…');
  await searchInput.fill('Python');
  await searchInput.press('Enter');

  // Wait for navigation and verify URL
  await page.waitForURL('**/search?q=Python');
  
  // Expect the search title to reflect the query
  await expect(page.locator('h1')).toContainText('Results for "Python"');

  // Expect at least one book card to be rendered
  // Our seed data has "Python for Everybody" and "Python Crash Course"
  await expect(page.locator('article').first()).toBeVisible();
});
