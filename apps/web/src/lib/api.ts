import type {
  Health,
  LoginInput,
  LoginRun,
  RunSummary,
  SimulatedSession,
  SuiteResult,
  TestCaseMeta,
} from './types'

const BASE = '/api/v1'

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly requestId: string | null
  readonly runId: string | null

  constructor(
    status: number,
    code: string,
    message: string,
    requestId: string | null,
    runId: string | null,
  ) {
    super(message)
    this.status = status
    this.code = code
    this.requestId = requestId
    this.runId = runId
  }
}

type ErrorBody = {
  error?: {
    code?: string
    message?: string
    request_id?: string
    run_id?: string
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    })
  } catch {
    throw new ApiError(
      0,
      'API_OFFLINE',
      'Không kết nối được API. Hãy khởi động Docker Compose.',
      null,
      null,
    )
  }
  if (!response.ok) {
    let body: ErrorBody = {}
    try {
      body = (await response.json()) as ErrorBody
    } catch {
      // Non-JSON error (e.g. proxy failure): keep defaults below.
    }
    throw new ApiError(
      response.status,
      body.error?.code ??
        (response.status >= 500 ? 'API_OFFLINE' : 'HTTP_ERROR'),
      body.error?.message ?? `Lỗi HTTP ${response.status}`,
      body.error?.request_id ?? response.headers.get('X-Request-ID'),
      body.error?.run_id ?? null,
    )
  }
  return (await response.json()) as T
}

export const api = {
  health: () => request<Health>('/health'),
  testCases: () => request<TestCaseMeta[]>('/labs/login-bypass/test-cases'),
  execute: (input: LoginInput) =>
    request<LoginRun>('/labs/login-bypass/execute', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  runSuite: () =>
    request<SuiteResult>('/labs/login-bypass/tests/run', { method: 'POST' }),
  results: (limit = 30) =>
    request<{ runs: RunSummary[] }>(
      `/labs/login-bypass/results?limit=${limit}`,
    ),
  simulatedSession: (runId: string) =>
    request<SimulatedSession>(
      `/securedesk/simulated-session/${encodeURIComponent(runId)}`,
    ),
}
