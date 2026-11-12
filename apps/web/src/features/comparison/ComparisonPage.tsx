import { Columns2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'

import { CredentialFields } from '../../components/CredentialFields'
import { ErrorNotice, RunResult } from '../../components/RunResult'
import { DEMO } from '../../lib/fixtures'
import { MODE_HINT, MODE_LABEL } from '../../lib/labels'
import type { Mode } from '../../lib/types'
import { useLoginRun } from '../../lib/useLoginRun'
import { PresetPicker } from '../laboratory/LabPage'

function Column({
  mode,
  state,
}: {
  mode: Mode
  state: ReturnType<typeof useLoginRun>['state']
}) {
  return (
    <div className={`compare-col compare-col--${mode}`}>
      <h2>
        {MODE_LABEL[mode]}
        <span className="subtle"> · {MODE_HINT[mode]}</span>
      </h2>
      {state.status === 'idle' && (
        <p className="empty">Chưa chạy. Bấm “Chạy cả hai chế độ”.</p>
      )}
      {state.status === 'running' && <p className="empty">Đang chạy…</p>}
      {state.status === 'error' && <ErrorNotice error={state.error} />}
      {state.status === 'done' && (
        <RunResult run={state.run} showSecureDeskLink={false} />
      )}
    </div>
  )
}

export function ComparisonPage() {
  const [username, setUsername] = useState<string>(DEMO.payload)
  const [password, setPassword] = useState<string>(DEMO.wrongPassword)
  const [caseId, setCaseId] = useState<string | undefined>('T03')
  const vulnerable = useLoginRun()
  const secure = useLoginRun()

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    // Sequential on purpose: identical input, one mode after the other, no shared state.
    await vulnerable.execute({
      mode: 'vulnerable',
      username,
      password,
      test_case_id: caseId,
    })
    await secure.execute({
      mode: 'secure',
      username,
      password,
      test_case_id: caseId,
    })
  }

  const busy =
    vulnerable.state.status === 'running' || secure.state.status === 'running'

  return (
    <section className="page">
      <header className="page__head">
        <h1>So sánh trước / sau</h1>
        <p>
          Cùng một input, cùng dữ liệu fixture, gửi lần lượt tới hai adapter.
          Khác biệt duy nhất là cách giá trị đến được PostgreSQL.
        </p>
      </header>

      <form className="lab-form lab-form--row" onSubmit={submit}>
        <PresetPicker
          onPick={(u, p, id) => {
            setUsername(u)
            setPassword(p)
            setCaseId(id)
          }}
        />
        <CredentialFields
          idPrefix="cmp"
          username={username}
          password={password}
          onUsername={(value) => {
            setUsername(value)
            setCaseId(undefined)
          }}
          onPassword={(value) => {
            setPassword(value)
            setCaseId(undefined)
          }}
        />
        <button
          type="submit"
          className="button button--primary"
          disabled={busy}
        >
          <Columns2 size={20} aria-hidden />
          {busy ? 'Đang chạy…' : 'Chạy cả hai chế độ'}
        </button>
      </form>

      <div className="compare">
        <Column mode="vulnerable" state={vulnerable.state} />
        <Column mode="secure" state={secure.state} />
      </div>
    </section>
  )
}
