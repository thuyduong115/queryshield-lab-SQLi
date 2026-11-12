import { LogIn } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'

import { CredentialFields } from '../../components/CredentialFields'
import { ModeSwitch } from '../../components/ModeSwitch'
import { ErrorNotice } from '../../components/RunResult'
import { shortId } from '../../lib/format'
import { useHealth } from '../../lib/health'
import type { Mode } from '../../lib/types'
import { useLoginRun } from '../../lib/useLoginRun'
import { SecureDeskFrame } from './SecureDeskFrame'

export function SecureDeskLogin() {
  const navigate = useNavigate()
  const { state: health } = useHealth()
  const [mode, setMode] = useState<Mode>('vulnerable')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const { state, execute } = useLoginRun()

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const run = await execute({ mode, username, password })
    if (run?.authentication.authenticated) {
      navigate(`/app/dashboard?run=${run.run_id}`)
    }
  }

  const failedRun = state.status === 'done' ? state.run : null

  return (
    <SecureDeskFrame>
      <main className="desk__login">
        <form className="desk-card" onSubmit={submit}>
          <h1>Đăng nhập</h1>
          <p className="subtle">
            Dùng tài khoản nội bộ để xem và xử lý yêu cầu hỗ trợ.
          </p>
          <CredentialFields
            idPrefix="desk"
            username={username}
            password={password}
            onUsername={setUsername}
            onPassword={setPassword}
          />
          <button
            type="submit"
            className="button button--desk"
            disabled={state.status === 'running'}
          >
            <LogIn size={20} aria-hidden />
            {state.status === 'running' ? 'Đang đăng nhập…' : 'Đăng nhập'}
          </button>

          {failedRun && failedRun.outcome === 'DENIED' && (
            <p className="desk-error" role="alert">
              Tên đăng nhập hoặc mật khẩu không đúng.
            </p>
          )}
          {failedRun && failedRun.outcome === 'QUERY_ERROR' && (
            <p className="desk-error" role="alert">
              Hệ thống gặp lỗi khi xử lý yêu cầu. Vui lòng thử lại sau.
            </p>
          )}
          {failedRun && (
            <p className="subtle mono">
              run {shortId(failedRun.run_id)} ·{' '}
              <Link to="/lab/login-bypass">xem truy vấn trong Lab</Link>
            </p>
          )}
          {state.status === 'error' && <ErrorNotice error={state.error} />}
        </form>

        <aside className="desk-side">
          <ModeSwitch
            value={mode}
            onChange={setMode}
            unsafeEnabled={
              health.kind === 'ready' ? health.health.unsafeLabEnabled : null
            }
          />
          <p className="subtle">
            Công tắc này là của phòng thí nghiệm, không phải của SecureDesk: nó
            chọn adapter đăng nhập phía backend.
          </p>
        </aside>
      </main>
    </SecureDeskFrame>
  )
}
