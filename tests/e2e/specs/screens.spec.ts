import { test } from '@playwright/test'

// Visual evidence captures (not assertions). Enabled with CAPTURE_SCREENS=1.
test.skip(!process.env.CAPTURE_SCREENS, 'set CAPTURE_SCREENS=1 to capture screenshots')

const OUT = process.env.CAPTURE_DIR ?? 'screens'

for (const width of [1440, 390]) {
  test(`capture ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: width > 500 ? 900 : 844 })
    const shot = (name: string) =>
      page.screenshot({ path: `${OUT}/${name}-${width}.png`, fullPage: true })

    await page.goto('/')
    await page.getByText('CSDL sẵn sàng').waitFor()
    await shot('overview')

    await page.goto('/demo?step=3')
    await page.getByRole('button', { name: 'Chạy truy vấn thật' }).click()
    await page.getByRole('status').waitFor()
    await page.waitForTimeout(500)
    await shot('demo-attack')

    await page.goto('/demo?step=4')
    await shot('demo-patch')

    await page.goto('/demo?step=5')
    await page.getByRole('button', { name: 'Chạy truy vấn thật' }).click()
    await page.getByRole('status').first().waitFor()
    await page.waitForTimeout(500)
    await shot('demo-retest')

    await page.goto('/lab/comparison')
    await page.getByRole('button', { name: 'Chạy cả hai chế độ' }).click()
    await page.getByTestId('run-secure').waitFor()
    await page.waitForTimeout(500)
    await shot('comparison')

    await page.goto('/lab/test-results')
    await page.getByRole('button', { name: 'Chạy bộ kiểm thử' }).click()
    await page.getByText(/\/18/).first().waitFor()
    await shot('tests')

    await page.goto('/lab/defenses')
    await page.getByRole('button', { name: 'Chạy ma trận đánh giá' }).click()
    await page.locator('.eval-matrix').waitFor()
    await page.waitForTimeout(500)
    await shot('defenses')

    await page.goto('/app/login')
    await shot('desk-login')
  })
}
