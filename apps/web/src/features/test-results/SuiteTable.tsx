import { Check, Minus, X } from 'lucide-react'

import { shortId } from '../../lib/format'
import { OUTCOME_SHORT } from '../../lib/labels'
import type { Mode, SuiteCaseResult, SuiteResult } from '../../lib/types'

function StatusMark({ result }: { result: SuiteCaseResult }) {
  if (result.status === 'passed') {
    return (
      <span className="mark mark--pass">
        <Check size={16} aria-hidden /> Đạt
      </span>
    )
  }
  if (result.status === 'skipped') {
    return (
      <span className="mark mark--skip">
        <Minus size={16} aria-hidden /> Bỏ qua
      </span>
    )
  }
  return (
    <span className="mark mark--fail">
      <X size={16} aria-hidden /> Trượt
    </span>
  )
}

function Cell({ result }: { result: SuiteCaseResult | undefined }) {
  if (!result) return <td>—</td>
  return (
    <td>
      <div className="suite-cell">
        <span className={`outcome outcome--${result.actual_outcome}`}>
          {OUTCOME_SHORT[result.actual_outcome]}
        </span>
        <span className="suite-cell__expect">
          kỳ vọng {OUTCOME_SHORT[result.expected_outcome]}
        </span>
        <StatusMark result={result} />
        <span className="mono subtle" title={result.run_id ?? ''}>
          {shortId(result.run_id)}
        </span>
      </div>
    </td>
  )
}

export function SuiteSummary({ suite }: { suite: SuiteResult }) {
  return (
    <p className="suite-summary">
      <strong>
        {suite.passed}/{suite.total}
      </strong>{' '}
      đạt · {suite.failed} trượt · {suite.skipped} bỏ qua ·{' '}
      <span className="mono">{suite.dataset_version}</span> · suite{' '}
      <span className="mono">{shortId(suite.suite_id)}</span>
    </p>
  )
}

export function SuiteTable({
  suite,
  onlyGating = false,
}: {
  suite: SuiteResult
  onlyGating?: boolean
}) {
  const ids = [...new Set(suite.results.map((r) => r.test_case_id))]
  const lookup = (id: string, mode: Mode) =>
    suite.results.find((r) => r.test_case_id === id && r.mode === mode)

  return (
    <div className="table-wrap">
      <table className="suite-table">
        <thead>
          <tr>
            <th scope="col">Ca</th>
            <th scope="col">Input</th>
            <th scope="col">Dễ bị tấn công</th>
            <th scope="col">Tham số hóa</th>
          </tr>
        </thead>
        <tbody>
          {ids
            .filter((id) => !onlyGating || lookup(id, 'secure')?.gating)
            .map((id) => {
              const any = lookup(id, 'secure') ?? lookup(id, 'vulnerable')!
              return (
                <tr key={id} className={id === 'T03' ? 'row--key' : ''}>
                  <th scope="row">
                    <span className="mono suite-id">{id}</span>
                    <span className="suite-title">{any.title}</span>
                  </th>
                  <td>
                    <code className="input-chip">{any.input_label}</code>
                    <span className="subtle"> / {any.password_label}</span>
                  </td>
                  <Cell result={lookup(id, 'vulnerable')} />
                  <Cell result={lookup(id, 'secure')} />
                </tr>
              )
            })}
        </tbody>
      </table>
    </div>
  )
}
