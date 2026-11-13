import { expect, test } from '@playwright/test'

// Requires APP_ENV=local and LAB_ENABLE_UNSAFE=true on the local stack.
// Every assertion reads the outcome rendered from a real API/PostgreSQL run.

test('Part 1: the payload bypasses the vulnerable login', async ({ page }) => {
  await page.goto('/demo?step=3')
  await expect(page.getByRole('heading', { name: "Tấn công: admin' -- " })).toBeVisible()
  await page.getByRole('button', { name: 'Chạy truy vấn thật' }).click()

  const result = page.getByTestId('run-vulnerable')
  await expect(result.getByRole('status')).toContainText('Đăng nhập thành công')
  await expect(result.getByRole('status')).toContainText('admin')
  await expect(result.locator('.seg--username.syn--comment')).toHaveText('-- ')
  await expect(result).not.toContainText('AdminDemo123!')

  await result.getByRole('link', { name: /Mở SecureDesk/ }).click()
  await expect(page.getByRole('heading', { name: /Xin chào, Quản trị hệ thống/ })).toBeVisible()
  await expect(page.getByText('[Nội bộ] Xoay vòng khóa sao lưu cơ sở dữ liệu')).toBeVisible()
})

test('Part 2: the same payload fails after parameterization', async ({ page }) => {
  await page.goto('/demo?step=5')
  await page.getByRole('button', { name: 'Chạy truy vấn thật' }).click()

  const result = page.getByTestId('run-secure')
  await expect(result.getByRole('status')).toContainText('Bị từ chối')
  await expect(result.getByLabel('Giá trị gửi riêng tới PostgreSQL')).toContainText("admin' --")
  await expect(result.getByRole('link', { name: /Mở SecureDesk/ })).toHaveCount(0)

  await page.goto('/demo?step=6')
  await page.getByRole('button', { name: 'Chạy truy vấn thật' }).click()
  await expect(page.getByTestId('run-secure').getByRole('status')).toContainText(
    'Đăng nhập thành công',
  )
})

test('Comparison runs identical input against both adapters', async ({ page }) => {
  await page.goto('/lab/comparison')
  await page.getByRole('button', { name: 'Chạy cả hai chế độ' }).click()
  await expect(page.getByTestId('run-vulnerable').getByRole('status')).toContainText(
    'Đăng nhập thành công',
  )
  await expect(page.getByTestId('run-secure').getByRole('status')).toContainText('Bị từ chối')
})

test('Automated suite passes every catalog case in both modes', async ({ page }) => {
  await page.goto('/lab/test-results')
  await page.getByRole('button', { name: 'Chạy bộ kiểm thử' }).click()
  await expect(page.getByText(/18\/18/)).toBeVisible()
  await expect(page.locator('.mark--fail')).toHaveCount(0)
})

test('SecureDesk login: wrong password shows a normal denial', async ({ page }) => {
  await page.goto('/app/login')
  await page.getByLabel('Tên đăng nhập').fill('student01')
  await page.getByLabel('Mật khẩu').fill('wrong-password')
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
  await expect(page.getByText('Tên đăng nhập hoặc mật khẩu không đúng.')).toBeVisible()
})
