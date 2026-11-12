import { Play } from 'lucide-react'
import { useState, type FormEvent } from 'react'

import { CredentialFields } from '../../components/CredentialFields'
import { ModeSwitch } from '../../components/ModeSwitch'
import { ErrorNotice, RunResult } from '../../components/RunResult'
import { DEMO, PRESETS } from '../../lib/fixtures'
import { useHealth } from '../../lib/health'
import type { Mode } from '../../lib/types'
import { useLoginRun } from '../../lib/useLoginRun'

export function PresetPicker({
  onPick,
}: {
  onPick: (username: string, password: string, id: string) => void
}) {
  return (
    <label className="field field--inline" htmlFor="preset">
      <span>Mẫu input</span>
      <select
        id="preset"
        defaultValue=""
        onChange={(event) => {
          const preset = PRESETS.find((p) => p.id === event.target.value)
          if (preset) onPick(preset.username, preset.password, preset.id)
        }}
      >
        <option value="" disabled>
          Chọn test case…
        </option>
        {PRESETS.map((preset) => (
          <option key={preset.id} value={preset.id}>
            {preset.label}
          </option>
        ))}
      </select>
    </label>
  )
}

export function LabPage() {
  const { state: health } = useHealth()
  const [mode, setMode] = useState<Mode>('vulnerable')
  const [username, setUsername] = useState<string>(DEMO.payload)
  const [password, setPassword] = useState<string>(DEMO.wrongPassword)
  const [caseId, setCaseId] = useState<string | undefined>('T03')
  const { state, execute } = useLoginRun()

  const submit = (event: FormEvent) => {
    event.preventDefault()
    void execute({ mode, username, password, test_case_id: caseId })
  }

  return (
    <section className="page">
      <header className="page__head">
        <h1>Lab tự do</h1>
        <p>
          Gửi bất kỳ input nào tới truy vấn đăng nhập cố định của SecureDesk.
          Kết quả đến từ PostgreSQL thật; không có danh sách chặn từ khóa.
        </p>
      </header>

      <form className="lab-form" onSubmit={submit}>
        <ModeSwitch
          value={mode}
          onChange={setMode}
          unsafeEnabled={
            health.kind === 'ready' ? health.health.unsafeLabEnabled : null
          }
        />
        <div className="lab-form__inputs">
          <PresetPicker
            onPick={(u, p, id) => {
              setUsername(u)
              setPassword(p)
              setCaseId(id)
            }}
          />
          <CredentialFields
            idPrefix="lab"
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
            className={`button button--primary${mode === 'vulnerable' ? ' button--breach' : ''}`}
            disabled={state.status === 'running'}
          >
            <Play size={20} aria-hidden />
            {state.status === 'running' ? 'Đang chạy…' : 'Chạy truy vấn thật'}
          </button>
        </div>
      </form>

      {state.status === 'error' && <ErrorNotice error={state.error} />}
      {state.status === 'done' && <RunResult run={state.run} />}
    </section>
  )
}
