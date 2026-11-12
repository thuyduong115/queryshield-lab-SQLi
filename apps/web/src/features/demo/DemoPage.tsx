import { ArrowLeft, ArrowRight, Check, Play } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'

import { ErrorNotice, RunResult, Verdict } from '../../components/RunResult'
import { api, ApiError } from '../../lib/api'
import { MODE_LABEL, OUTCOME_LABEL } from '../../lib/labels'
import type { LoginRun, SuiteResult } from '../../lib/types'
import { toApiError } from '../../lib/useLoginRun'
import { SuiteSummary, SuiteTable } from '../test-results/SuiteTable'
import { CodeDiff } from './CodeDiff'
import { PARTS, STEPS, type DemoStep } from './steps'

type StepState =
  | { status: 'idle' }
  | { status: 'running' }
  | { status: 'done'; run: LoginRun }
  | { status: 'suite'; suite: SuiteResult }
  | { status: 'error'; error: ApiError }

function clampStep(raw: string | null): number {
  const value = Number(raw ?? '1')
  if (!Number.isInteger(value)) return 0
  return Math.min(Math.max(value, 1), STEPS.length) - 1
}

function StepList({
  active,
  states,
  onSelect,
}: {
  active: number
  states: Record<string, StepState>
  onSelect: (index: number) => void
}) {
  return (
    <nav className="steps" aria-label="Các bước demo">
      {([1, 2] as const).map((part) => (
        <div key={part} className={`steps__part steps__part--${part}`}>
          <h2>{PARTS[part]}</h2>
          <ol>
            {STEPS.map((step, index) => {
              if (step.part !== part) return null
              const state = states[step.id]
              const done = state?.status === 'done' || state?.status === 'suite'
              return (
                <li key={step.id}>
                  <button
                    type="button"
                    className={`step-link${index === active ? ' is-active' : ''}`}
                    aria-current={index === active ? 'step' : undefined}
                    onClick={() => onSelect(index)}
                  >
                    <span className="step-link__num">{index + 1}</span>
                    <span className="step-link__title">{step.title}</span>
                    {done && (
                      <Check
                        className="step-link__done"
                        size={18}
                        aria-label="đã chạy"
                      />
                    )}
                  </button>
                </li>
              )
            })}
          </ol>
        </div>
      ))}
    </nav>
  )
}

function InputCard({ step }: { step: DemoStep }) {
  if (!step.input) return null
  return (
    <dl className="input-card">
      <div>
        <dt>Chế độ</dt>
        <dd>
          <span className={`mode-tag mode-tag--${step.input.mode}`}>
            {MODE_LABEL[step.input.mode]}
          </span>
        </dd>
      </div>
      <div>
        <dt>Tên đăng nhập</dt>
        <dd>
          <code className="input-chip input-chip--lg">
            {step.usernameLabel}
          </code>
        </dd>
      </div>
      <div>
        <dt>Mật khẩu</dt>
        <dd>{step.passwordLabel}</dd>
      </div>
      <div>
        <dt>Dự đoán</dt>
        <dd>{step.expect ? OUTCOME_LABEL[step.expect] : '—'}</dd>
      </div>
    </dl>
  )
}

export function DemoPage() {
  const [params, setParams] = useSearchParams()
  const active = clampStep(params.get('step'))
  const step = STEPS[active]
  const [states, setStates] = useState<Record<string, StepState>>({})
  const state = states[step.id] ?? { status: 'idle' }
  const attackRun = states.attack

  const go = useCallback(
    (index: number) => {
      const next = Math.min(Math.max(index, 0), STEPS.length - 1)
      setParams({ step: String(next + 1) })
    },
    [setParams],
  )

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
      if (event.key === 'ArrowRight') go(active + 1)
      if (event.key === 'ArrowLeft') go(active - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, go])

  const setStepState = (id: string, next: StepState) =>
    setStates((current) => ({ ...current, [id]: next }))

  const run = async () => {
    setStepState(step.id, { status: 'running' })
    try {
      if (step.kind === 'suite') {
        setStepState(step.id, { status: 'suite', suite: await api.runSuite() })
      } else if (step.input) {
        setStepState(step.id, {
          status: 'done',
          run: await api.execute(step.input),
        })
      }
    } catch (error) {
      setStepState(step.id, { status: 'error', error: toApiError(error) })
    }
  }

  return (
    <div className="demo">
      <StepList active={active} states={states} onSelect={go} />

      <section className="stage" aria-labelledby="stage-title">
        <header className="stage__head">
          <p className={`part-tag part-tag--${step.part}`}>
            {PARTS[step.part]} · Bước {active + 1}/{STEPS.length}
          </p>
          <h1 id="stage-title">{step.title}</h1>
          <p className="stage__goal">{step.goal}</p>
        </header>

        <p className="narration">{step.narration}</p>

        {step.kind === 'patch' && <CodeDiff />}

        {step.kind !== 'patch' && (
          <div className="stage__action">
            <InputCard step={step} />
            <button
              type="button"
              className={`button button--primary${step.input?.mode === 'vulnerable' ? ' button--breach' : ''}`}
              onClick={run}
              disabled={state.status === 'running'}
            >
              <Play size={20} aria-hidden />
              {state.status === 'running'
                ? 'Đang chạy…'
                : step.kind === 'suite'
                  ? 'Chạy bộ kiểm thử'
                  : 'Chạy truy vấn thật'}
            </button>
          </div>
        )}

        {state.status === 'error' && <ErrorNotice error={state.error} />}
        {state.status === 'done' && <RunResult run={state.run} />}
        {state.status === 'suite' && (
          <div className="suite-block">
            <SuiteSummary suite={state.suite} />
            <SuiteTable suite={state.suite} onlyGating />
            <Link className="button button--ghost" to="/lab/test-results">
              Xem đủ T01–T08 và lịch sử chạy
            </Link>
          </div>
        )}

        {step.id === 'retest-attack' &&
          state.status === 'done' &&
          attackRun?.status === 'done' && (
            <aside className="recap" aria-label="Cùng input ở Phần 1">
              <h2>Cùng input ở Phần 1 (bước 3)</h2>
              <Verdict run={attackRun.run} />
            </aside>
          )}

        <footer className="stage__nav">
          <button
            type="button"
            className="button button--ghost"
            onClick={() => go(active - 1)}
            disabled={active === 0}
          >
            <ArrowLeft size={18} aria-hidden /> Bước trước
          </button>
          <span className="subtle">Phím ← → để chuyển bước</span>
          <button
            type="button"
            className="button button--ghost"
            onClick={() => go(active + 1)}
            disabled={active === STEPS.length - 1}
          >
            Bước tiếp <ArrowRight size={18} aria-hidden />
          </button>
        </footer>
      </section>
    </div>
  )
}
