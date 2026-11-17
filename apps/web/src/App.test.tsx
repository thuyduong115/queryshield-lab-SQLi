import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import App from './App'
import { SqlInspector } from './components/SqlInspector'
import type { LoginRun } from './lib/types'

const HEALTH = {
  status: 'ok',
  environment: 'local',
  unsafeLabEnabled: true,
  database: 'ok',
  datasetVersion: 'fixtures-v1',
}

const ATTACK_RUN: LoginRun = {
  run_id: '581801e8-32ff-41fb-ba79-514bbe036ca2',
  scenario_id: 'login-bypass',
  mode: 'vulnerable',
  test_case_id: 'T03',
  outcome: 'AUTHENTICATED',
  authentication: {
    authenticated: true,
    simulated_user: { username: 'admin', role: 'admin' },
    rows_returned: 1,
  },
  inspector: {
    query_template: "SELECT ... WHERE username = '{username}' ...",
    sql_preview_redacted: "SELECT ... WHERE username = 'admin' -- ' AND ...",
    preview_label: 'Bản xem trước đã che',
    segments: [
      { text: 'WHERE username = ', origin: 'template', syntax: 'code' },
      { text: "'", origin: 'template', syntax: 'string' },
      { text: "admin'", origin: 'username', syntax: 'string' },
      { text: ' ', origin: 'username', syntax: 'code' },
      { text: '-- ', origin: 'username', syntax: 'comment' },
      {
        text: "' AND password = '",
        origin: 'template',
        syntax: 'comment',
      },
      { text: '[mật khẩu đã ẩn]', origin: 'password', syntax: 'comment' },
    ],
    parameters: [],
    explanation_code: 'UNSAFE_CONCATENATION',
    observations: ['INPUT_STARTED_COMMENT', 'PASSWORD_CHECK_COMMENTED_OUT'],
  },
  query_error: null,
  layers: ['monitoring'],
  alerts: ['QUOTE', 'COMMENT'],
  duration_ms: 4,
  dataset_version: 'fixtures-v1',
  created_at: '2026-11-13T02:00:00Z',
  simulation_notice: 'mô phỏng',
}

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve({
    ok: status < 400,
    status,
    headers: new Headers(),
    json: () => Promise.resolve(body),
  })
}

function renderAt(path: string, routes: Record<string, () => unknown>) {
  const fetchMock = vi.fn<(url: string, init?: RequestInit) => unknown>(
    (url) => {
      const handler = Object.entries(routes).find(([key]) => url.includes(key))
      return handler ? handler[1]() : jsonResponse(HEALTH)
    },
  )
  vi.stubGlobal('fetch', fetchMock)
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
  return fetchMock
}

describe('QueryShield Lab', () => {
  it('renders the overview with live API status', async () => {
    renderAt('/lab/overview', {})
    expect(
      screen.getByRole('heading', { name: 'Dữ liệu phải nằm ngoài mã SQL' }),
    ).toBeInTheDocument()
    expect(await screen.findByText('CSDL sẵn sàng')).toBeInTheDocument()
  })

  it('shows the observed attack outcome returned by the API', async () => {
    const fetchMock = renderAt('/demo?step=3', {
      '/execute': () => jsonResponse(ATTACK_RUN),
    })
    fireEvent.click(screen.getByRole('button', { name: /Chạy truy vấn thật/ }))

    const verdict = await screen.findByRole('status')
    expect(verdict).toHaveTextContent('Đăng nhập thành công')
    const call = fetchMock.mock.calls.find(([url]) =>
      String(url).includes('/execute'),
    )
    expect(JSON.parse(String(call?.[1]?.body))).toMatchObject({
      mode: 'vulnerable',
      username: "admin' -- ",
      test_case_id: 'T03',
    })
  })

  it('reports a disabled guard as an error, not as a denied login', async () => {
    renderAt('/demo?step=3', {
      '/execute': () =>
        jsonResponse(
          {
            error: {
              code: 'LAB_DISABLED',
              message: 'disabled',
              request_id: 'abcdef123456',
            },
          },
          403,
        ),
    })
    fireEvent.click(screen.getByRole('button', { name: /Chạy truy vấn thật/ }))
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Chế độ dễ bị tấn công đang tắt')
    expect(screen.queryByText('Bị từ chối')).not.toBeInTheDocument()
  })
})

describe('SqlInspector', () => {
  it('marks injected input and the commented-out password check', () => {
    render(<SqlInspector inspector={ATTACK_RUN.inspector} />)
    const sql = screen.getByLabelText('Câu SQL được dựng bằng nối chuỗi')
    // The injected "-- " is user input that PostgreSQL parses as a comment.
    expect(sql.querySelector('.seg--username.syn--comment')?.textContent).toBe(
      '-- ',
    )
    expect(within(sql).getByText('[mật khẩu đã ẩn]')).toHaveClass(
      'seg--password',
    )
    expect(
      screen.getByText(/password = \.\.\. nằm trong chú thích/),
    ).toBeInTheDocument()
  })

  it('shows bound parameters separately with the password redacted', () => {
    render(
      <SqlInspector
        inspector={{
          ...ATTACK_RUN.inspector,
          explanation_code: 'PARAMETER_BINDING',
          segments: [
            { text: 'WHERE username = ', origin: 'template', syntax: 'code' },
            { text: '%s', origin: 'placeholder', syntax: 'code' },
          ],
          parameters: [
            {
              position: 1,
              name: 'username',
              sql_type: 'text',
              value: "admin' -- ",
              redacted: false,
            },
            {
              position: 2,
              name: 'password',
              sql_type: 'text',
              value: null,
              redacted: true,
            },
          ],
          observations: ['VALUES_SENT_SEPARATELY'],
        }}
      />,
    )
    const envelopes = screen.getByLabelText('Giá trị gửi riêng tới PostgreSQL')
    expect(within(envelopes).getByText("admin' --")).toBeInTheDocument()
    expect(within(envelopes).getByText('mật khẩu đã ẩn')).toBeInTheDocument()
  })
})
