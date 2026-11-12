import { useCallback, useState } from 'react'

import { api, ApiError } from './api'
import type { LoginInput, LoginRun } from './types'

export type RunState =
  | { status: 'idle' }
  | { status: 'running' }
  | { status: 'done'; run: LoginRun }
  | { status: 'error'; error: ApiError }

function toApiError(error: unknown): ApiError {
  return error instanceof ApiError
    ? error
    : new ApiError(0, 'UNKNOWN', 'Lỗi không xác định.', null, null)
}

export function useLoginRun() {
  const [state, setState] = useState<RunState>({ status: 'idle' })

  const execute = useCallback(async (input: LoginInput) => {
    setState({ status: 'running' })
    try {
      const run = await api.execute(input)
      setState({ status: 'done', run })
      return run
    } catch (error) {
      setState({ status: 'error', error: toApiError(error) })
      return null
    }
  }, [])

  const reset = useCallback(() => setState({ status: 'idle' }), [])

  return { state, execute, reset }
}

export { toApiError }
