import { Play, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import { ErrorNotice } from '../../components/RunResult'
import { api, ApiError } from '../../lib/api'
import { formatDate, formatTime, shortId } from '../../lib/format'
import { MODE_LABEL, OUTCOME_SHORT } from '../../lib/labels'
import type { RunSummary, SuiteResult } from '../../lib/types'
import { toApiError } from '../../lib/useLoginRun'
import { SuiteSummary, SuiteTable } from './SuiteTable'

function RecentRuns() {
  const [runs, setRuns] = useState<RunSummary[] | null>(null)
  const [error, setError] = useState<ApiError | null>(null)

  const load = useCallback(() => {
    api
      .results(30)
      .then((body) => {
        setRuns(body.runs)
        setError(null)
      })
      .catch((err: unknown) => setError(toApiError(err)))
  }, [])

  useEffect(load, [load])

  return (
    <section className="panel" aria-labelledby="recent-title">
      <header className="panel__head">
        <h2 id="recent-title">30 lần chạy gần nhất</h2>
        <button type="button" className="icon-button" onClick={load}>
          <RefreshCw size={16} aria-hidden /> Tải lại
        </button>
      </header>
      {error && <ErrorNotice error={error} />}
      {runs && runs.length === 0 && (
        <p className="empty">
          Chưa có lần chạy nào kể từ lần reset fixture gần nhất.
        </p>
      )}
      {runs && runs.length > 0 && (
        <div className="table-wrap">
          <table className="runs-table">
            <thead>
              <tr>
                <th scope="col">Lúc</th>
                <th scope="col">Run</th>
                <th scope="col">Ca</th>
                <th scope="col">Chế độ</th>
                <th scope="col">Kết quả</th>
                <th scope="col">Người dùng mô phỏng</th>
                <th scope="col" className="num">
                  ms
                </th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.run_id}>
                  <td className="mono">
                    {formatDate(run.created_at)} {formatTime(run.created_at)}
                  </td>
                  <td className="mono" title={run.run_id}>
                    {shortId(run.run_id)}
                  </td>
                  <td className="mono">{run.test_case_id ?? '—'}</td>
                  <td>
                    <span className={`mode-tag mode-tag--${run.mode}`}>
                      {MODE_LABEL[run.mode]}
                    </span>
                  </td>
                  <td>
                    <span className={`outcome outcome--${run.outcome}`}>
                      {OUTCOME_SHORT[run.outcome]}
                    </span>
                  </td>
                  <td>{run.simulated_user ?? '—'}</td>
                  <td className="mono num">{run.duration_ms}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export function TestResultsPage() {
  const [suite, setSuite] = useState<SuiteResult | null>(null)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const run = async () => {
    setRunning(true)
    setError(null)
    try {
      setSuite(await api.runSuite())
      setRefreshKey((key) => key + 1)
    } catch (err) {
      setError(toApiError(err))
    } finally {
      setRunning(false)
    }
  }

  return (
    <section className="page">
      <header className="page__head">
        <h1>Kiểm thử so sánh</h1>
        <p>
          Bộ test cố định (T01–T08, T11) chạy trên cả hai chế độ. Mỗi ô là một
          lần chạy thật có run ID; ca bị chặn bởi cấu hình được ghi “Bỏ qua”,
          không bao giờ ghi “Đạt”.
        </p>
      </header>

      <div className="toolbar">
        <button
          type="button"
          className="button button--primary"
          onClick={run}
          disabled={running}
        >
          <Play size={20} aria-hidden />
          {running ? 'Đang chạy…' : 'Chạy bộ kiểm thử'}
        </button>
        {suite && <SuiteSummary suite={suite} />}
      </div>

      {error && <ErrorNotice error={error} />}
      {!suite && !error && (
        <p className="empty">
          Chưa chạy trong phiên này. Kết quả trước đó nằm ở bảng lịch sử bên
          dưới.
        </p>
      )}
      {suite && <SuiteTable suite={suite} />}

      <RecentRuns key={refreshKey} />
    </section>
  )
}
