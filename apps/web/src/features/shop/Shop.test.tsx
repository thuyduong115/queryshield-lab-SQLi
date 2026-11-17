import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import App from '../../App'

const health = {
  status: 'ok',
  environment: 'local',
  database: 'ok',
  unsafeLabEnabled: true,
  datasetVersion: 'fixtures-v3-shop',
}
const detail = {
  inspector: {
    query_template: 'SELECT fixture WHERE name = %s',
    sql_preview_redacted: 'SELECT fixture WHERE name = %s',
    preview_label: 'Bản diễn giải đã che',
    parameters: [],
  },
  rows: [],
  duration_ms: 1,
  sqlstate: null,
}

function start(
  route: string,
  responder: (url: string, body?: Record<string, unknown>) => unknown,
) {
  const calls: { url: string; body?: Record<string, unknown> }[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string, init?: RequestInit) => {
      const body = init?.body
        ? (JSON.parse(String(init.body)) as Record<string, unknown>)
        : undefined
      calls.push({ url, body })
      return Promise.resolve({
        ok: true,
        headers: new Headers(),
        json: () =>
          Promise.resolve(
            url.endsWith('/health') ? health : responder(url, body),
          ),
      })
    }),
  )
  render(
    <MemoryRouter initialEntries={[route]}>
      <App />
    </MemoryRouter>,
  )
  return calls
}

describe('Shop forms', () => {
  it('sends search input unchanged and renders the returned rows', async () => {
    const calls = start('/', (_url, body) => ({
      ...detail,
      id: 'search-id',
      mode: body?.mode,
      outcome: 'ROWS_RETURNED',
      operation: 'search',
      rows:
        body?.value === "a' b"
          ? [
              {
                id: 1,
                name: 'Sản phẩm từ API',
                category: 'Fixture',
                price: 1000,
                published: true,
              },
            ]
          : [],
    }))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Tìm kiếm' })).toBeEnabled(),
    )
    fireEvent.change(screen.getByLabelText('Tìm sản phẩm', { exact: true }), {
      target: { value: "a' b" },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Tìm kiếm' }))
    expect(
      await screen.findByRole('heading', { name: 'Sản phẩm từ API' }),
    ).toBeInTheDocument()
    expect(calls.at(-1)?.body).toEqual({ value: "a' b", mode: 'secure' })
  })

  it('reuses the saved profile ID across both report modes', async () => {
    const calls = start('/profile', (url, body) =>
      url.endsWith('/profiles')
        ? {
            ...detail,
            profile_id: 'saved-uuid',
            id: 'save',
            mode: 'secure',
            operation: 'profile-save',
            outcome: 'SAVED',
          }
        : {
            ...detail,
            id: 'report',
            mode: body?.mode,
            operation: 'order-report',
            outcome: 'ROWS_RETURNED',
          },
    )
    fireEvent.change(screen.getByLabelText('Tên khách hàng dùng tra đơn'), {
      target: { value: "admin' -- " },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu hồ sơ' }))
    await screen.findByText('Đã lưu nguyên văn:', { exact: false })
    fireEvent.change(screen.getByLabelText('Bản xử lý SQL'), {
      target: { value: 'vulnerable' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Xem đơn hàng' }))
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Xem đơn hàng' }),
      ).toBeEnabled(),
    )
    fireEvent.change(screen.getByLabelText('Bản xử lý SQL'), {
      target: { value: 'secure' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Xem đơn hàng' }))
    await waitFor(() =>
      expect(
        calls.filter((call) => call.url.endsWith('/order-report')),
      ).toHaveLength(2),
    )
    expect(
      calls
        .filter((call) => call.url.endsWith('/order-report'))
        .map((call) => call.body),
    ).toEqual([
      { profile_id: 'saved-uuid', mode: 'vulnerable' },
      { profile_id: 'saved-uuid', mode: 'secure' },
    ])
    expect(calls.filter((call) => call.url.endsWith('/profiles'))).toHaveLength(
      1,
    )
  })

  it('shows an API failure without inventing a successful login', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) =>
        url.endsWith('/health')
          ? Promise.resolve({ ok: true, json: () => Promise.resolve(health) })
          : Promise.reject(new Error('offline')),
      ),
    )
    render(
      <MemoryRouter initialEntries={['/login']}>
        <App />
      </MemoryRouter>,
    )
    fireEvent.change(screen.getByLabelText('Mật khẩu', { exact: true }), {
      target: { value: 'probe' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Không kết nối được API',
    )
    expect(screen.queryByText(/mô phỏng thành công/)).not.toBeInTheDocument()
  })
})
