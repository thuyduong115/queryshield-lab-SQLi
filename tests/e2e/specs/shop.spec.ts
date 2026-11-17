import { expect, test } from '@playwright/test'

test('shop login sends real queries and admin observes them across tabs', async ({
  page,
  context,
}) => {
  const admin = await context.newPage()
  await admin.goto('/admin')
  await page.goto('/login')
  await page.getByLabel('Bản xử lý SQL').selectOption('vulnerable')
  await page.getByLabel('Tên đăng nhập').fill("admin' -- ")
  await page.getByLabel('Mật khẩu', { exact: true }).fill('wrong-password')
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('thành công: admin')
  await expect(admin.locator('.observer-detail')).toContainText('AUTHENTICATED')
  await page.getByLabel('Bản xử lý SQL').selectOption('secure')
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('không đúng')
  await expect(admin.locator('.observer-detail')).toContainText('DENIED')
  await expect(admin.locator('.observer-detail')).not.toContainText(
    'wrong-password',
  )
})

test('second-order compares reuse of the same saved profile', async ({
  page,
}) => {
  await page.goto('/profile')
  await page.getByLabel('Tên khách hàng dùng tra đơn').fill("admin' -- ")
  await page.getByRole('button', { name: 'Lưu hồ sơ', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Đã lưu nguyên văn')
  await page.getByLabel('Bản xử lý SQL').selectOption('vulnerable')
  await page.getByRole('button', { name: 'Xem đơn hàng', exact: true }).click()
  await expect(
    page.getByText('Kết quả bước đọc', { exact: false }),
  ).toContainText('2 dòng')
  await page.getByLabel('Bản xử lý SQL').selectOption('secure')
  await page.getByRole('button', { name: 'Xem đơn hàng', exact: true }).click()
  await expect(
    page.getByText('Kết quả bước đọc', { exact: false }),
  ).toContainText('0 dòng')
})

test('product search compares identical input', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Bản xử lý SQL').selectOption('vulnerable')
  await expect(
    page.getByRole('button', { name: 'Tìm kiếm', exact: true }),
  ).toBeEnabled()
  await page.getByLabel('Tìm sản phẩm', { exact: true }).fill("' OR true -- ")
  await page.getByRole('button', { name: 'Tìm kiếm', exact: true }).click()
  await expect(
    page.getByRole('heading', {
      name: '[Nội bộ] Bộ thử nghiệm chưa mở bán',
      exact: true,
    }),
  ).toBeVisible()
  await page.getByLabel('Bản xử lý SQL').selectOption('secure')
  await expect(
    page.getByRole('button', { name: 'Tìm kiếm', exact: true }),
  ).toBeEnabled()
  await page.getByRole('button', { name: 'Tìm kiếm', exact: true }).click()
  await expect(
    page.getByText('Không tìm thấy sản phẩm phù hợp.', { exact: true }),
  ).toBeVisible()
})
