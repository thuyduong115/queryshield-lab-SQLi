import { expect, test } from '@playwright/test'

test('Defense evaluation matrix meets every written expectation', async ({ page }) => {
  await page.goto('/lab/defenses')
  await expect(page.getByText('qs_lab_query')).toBeVisible()
  await expect(page.locator('.privileges')).toContainText('demo.users')

  await page.getByRole('button', { name: 'Chạy ma trận đánh giá' }).click()
  await expect(page.getByText(/20\/20/)).toBeVisible()
  await expect(page.locator('.eval-matrix .mark--fail')).toHaveCount(0)
  await expect(page.locator('.findings')).toContainText(
    'Cấu hình vừa chặn tấn công vừa không chặn nhầm: C2.',
  )
})

test('Allow-list layer rejects before any SQL is sent', async ({ page }) => {
  await page.goto('/lab/login-bypass')
  await page.getByLabel('L2 Allow-list tên đăng nhập').check()
  await page.getByRole('button', { name: 'Chạy truy vấn thật' }).click()
  const result = page.getByTestId('run-vulnerable')
  await expect(result.getByRole('status')).toContainText('Bị allow-list chặn')
  await expect(result).toContainText('Không có câu SQL nào được gửi')
})
