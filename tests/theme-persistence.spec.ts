import { expect, test } from '@playwright/test'

test('applies the selected theme after a reload', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.setItem('jobtrail-theme', 'light'))
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
})
