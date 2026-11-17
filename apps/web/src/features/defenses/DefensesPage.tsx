import {
  Binary,
  Check,
  Download,
  EyeOff,
  KeyRound,
  ListChecks,
  Minus,
  Play,
  Radar,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'

import { ErrorNotice } from '../../components/RunResult'
import { api, ApiError } from '../../lib/api'
import { shortId } from '../../lib/format'
import { ALERT_LABEL, LAYER_LABEL, OUTCOME_SHORT } from '../../lib/labels'
import type {
  ConfigurationSummary,
  DefenseCatalog,
  EvaluationCell,
  EvaluationResult,
} from '../../lib/types'
import { toApiError } from '../../lib/useLoginRun'
import { download, toMarkdown } from './report'

const ROLE_LABEL = {
  legitimate: 'Người dùng hợp lệ',
  wrong_credentials: 'Sai thông tin',
  attack: 'Tấn công',
} as const

function LayerList({ catalog }: { catalog: DefenseCatalog | null }) {
  const privileges = catalog?.least_privilege
  return (
    <ol className="layers">
      <li>
        <Binary size={22} aria-hidden />
        <div>
          <h3>L1 · Bind tham số</h3>
          <p>
            Câu SQL là hằng số, giá trị đi riêng qua <code>$1</code>,{' '}
            <code>$2</code>. Đây là chế độ “Tham số hóa”.
          </p>
        </div>
      </li>
      <li>
        <ListChecks size={22} aria-hidden />
        <div>
          <h3>L2 · Allow-list tên đăng nhập</h3>
          <p>
            Chỉ nhận chữ, số và <code>. _ - @</code>, tối đa 64 ký tự. Chặn
            trước khi dựng SQL.
          </p>
          {catalog && (
            <p className="mono subtle">{catalog.allow_list_pattern}</p>
          )}
        </div>
      </li>
      <li>
        <KeyRound size={22} aria-hidden />
        <div>
          <h3>L3 · Quyền tối thiểu (đo trực tiếp)</h3>
          {!privileges && <p className="subtle">Đang đọc từ PostgreSQL…</p>}
          {privileges && (
            <>
              <p>
                Role <code>{privileges.role}</code>:{' '}
                {privileges.superuser ? 'là superuser' : 'không phải superuser'}
                , {privileges.settings.join(', ')}.
              </p>
              <table className="privileges">
                <thead>
                  <tr>
                    <th scope="col">Bảng</th>
                    <th scope="col">Quyền được cấp</th>
                  </tr>
                </thead>
                <tbody>
                  {privileges.tables.map((row) => (
                    <tr key={row.table}>
                      <td className="mono">{row.table}</td>
                      <td>
                        {row.granted.length ? (
                          row.granted.join(', ')
                        ) : (
                          <span className="subtle">không có</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </li>
      <li>
        <EyeOff size={22} aria-hidden />
        <div>
          <h3>L4 · Che chi tiết lỗi</h3>
          <p>
            Khi câu SQL lỗi, phản hồi không lộ SQLSTATE; mã lỗi vẫn được lưu nội
            bộ cho người vận hành.
          </p>
        </div>
      </li>
      <li>
        <Radar size={22} aria-hidden />
        <div>
          <h3>L5 · Giám sát</h3>
          <p>
            Chỉ ghi nhận, không chặn. Lưu mã luật, không lưu input:{' '}
            {catalog?.detection_rules.map((r) => r.id).join(', ') ?? '…'}.
          </p>
        </div>
      </li>
    </ol>
  )
}

function BoolMark({ value }: { value: boolean | null }) {
  if (value === null) return <span className="subtle">không đo</span>
  return value ? (
    <span className="mark mark--pass">
      <Check size={16} aria-hidden /> Có
    </span>
  ) : (
    <span className="mark mark--fail">
      <X size={16} aria-hidden /> Không
    </span>
  )
}

function SummaryTable({ rows }: { rows: ConfigurationSummary[] }) {
  return (
    <div className="table-wrap">
      <table className="eval-summary">
        <thead>
          <tr>
            <th scope="col">Cấu hình</th>
            <th scope="col">Chặn tấn công</th>
            <th scope="col" className="num">
              Hợp lệ vào được
            </th>
            <th scope="col" className="num">
              Chặn nhầm
            </th>
            <th scope="col" className="num">
              Từ chối sai thông tin
            </th>
            <th scope="col" className="num">
              Cảnh báo tấn công / hợp lệ
            </th>
            <th scope="col" className="num">
              TB ms
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <th scope="row">
                <span className="mono">{row.id}</span>
                <span className="suite-title">{row.title}</span>
                <span className="layer-tags">
                  {row.layers.map((layer) => (
                    <span key={layer} className="layer-tag">
                      {LAYER_LABEL[layer] ?? layer}
                    </span>
                  ))}
                </span>
              </th>
              {row.skipped ? (
                <td colSpan={6} className="subtle">
                  Bỏ qua: lab không an toàn đang tắt, không có số liệu.
                </td>
              ) : (
                <>
                  <td>
                    <BoolMark value={row.attack_blocked} />
                  </td>
                  <td className="mono num">
                    {row.legitimate_accepted}/{row.legitimate_total}
                  </td>
                  <td
                    className={`mono num${row.false_rejections ? ' text-breach' : ''}`}
                  >
                    {row.false_rejections}
                  </td>
                  <td className="mono num">
                    {row.wrong_credentials_denied}/{row.wrong_credentials_total}
                  </td>
                  <td className="mono num">
                    {row.alerts_on_attack} / {row.alerts_on_legitimate}
                  </td>
                  <td className="mono num">{row.mean_duration_ms ?? '—'}</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function MatrixCell({ cell }: { cell: EvaluationCell | undefined }) {
  if (!cell || cell.status === 'skipped') {
    return (
      <td className="subtle">
        <Minus size={16} aria-hidden /> Bỏ qua
      </td>
    )
  }
  const actual = cell.actual_outcome!
  return (
    <td>
      <div className="suite-cell">
        <span className={`outcome outcome--${actual}`}>
          {OUTCOME_SHORT[actual]}
        </span>
        {cell.status === 'failed' && (
          <span className="mark mark--fail">
            <X size={16} aria-hidden /> kỳ vọng{' '}
            {OUTCOME_SHORT[cell.expected_outcome]}
          </span>
        )}
        {cell.alerts.length > 0 && (
          <span className="alert-chip">
            <Radar size={14} aria-hidden />
            {cell.alerts.map((a) => ALERT_LABEL[a] ?? a).join(', ')}
          </span>
        )}
        <span className="mono subtle" title={cell.run_id ?? ''}>
          {shortId(cell.run_id)}
        </span>
      </div>
    </td>
  )
}

function MatrixTable({ result }: { result: EvaluationResult }) {
  const ids = result.configurations.map((c) => c.id)
  return (
    <div className="table-wrap">
      <table className="eval-matrix">
        <thead>
          <tr>
            <th scope="col">Ca</th>
            {ids.map((id) => (
              <th key={id} scope="col">
                {id}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {result.cases.map((testCase) => (
            <tr
              key={testCase.id}
              className={testCase.role === 'attack' ? 'row--key' : ''}
            >
              <th scope="row">
                <span className="mono">{testCase.id}</span>
                <code className="input-chip">{testCase.input_label}</code>
                <span className="suite-title">{ROLE_LABEL[testCase.role]}</span>
              </th>
              {ids.map((id) => (
                <MatrixCell
                  key={id}
                  cell={result.cells.find(
                    (c) =>
                      c.configuration_id === id &&
                      c.test_case_id === testCase.id,
                  )}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Sentences derived from measured numbers only; nothing here is pre-written. */
function Findings({ rows }: { rows: ConfigurationSummary[] }) {
  const measured = rows.filter((r) => !r.skipped)
  const best = measured.filter(
    (r) => r.attack_blocked && r.false_rejections === 0,
  )
  return (
    <ul className="findings">
      {measured.map((r) => (
        <li key={r.id}>
          <strong>{r.id}</strong>:{' '}
          {r.attack_blocked ? 'chặn được tấn công' : 'tấn công lọt qua'},{' '}
          {r.false_rejections === 0
            ? 'không chặn nhầm người dùng hợp lệ nào'
            : `chặn nhầm ${r.false_rejections}/${r.legitimate_total} người dùng hợp lệ`}
          .
        </li>
      ))}
      {measured.length > 0 && (
        <li>
          {best.length
            ? `Cấu hình vừa chặn tấn công vừa không chặn nhầm: ${best.map((r) => r.id).join(', ')}.`
            : 'Không cấu hình nào vừa chặn tấn công vừa không chặn nhầm.'}
        </li>
      )}
    </ul>
  )
}

export function DefensesPage() {
  const [catalog, setCatalog] = useState<DefenseCatalog | null>(null)
  const [result, setResult] = useState<EvaluationResult | null>(null)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)

  useEffect(() => {
    api
      .defenses()
      .then(setCatalog)
      .catch((err: unknown) => setError(toApiError(err)))
  }, [])

  const run = async () => {
    setRunning(true)
    setError(null)
    try {
      setResult(await api.runEvaluation())
    } catch (err) {
      setError(toApiError(err))
    } finally {
      setRunning(false)
    }
  }

  const exportFile = (kind: 'md' | 'json') => {
    if (!result) return
    const stem = `evaluation-${shortId(result.suite_id)}`
    if (kind === 'md') {
      download(`${stem}.md`, toMarkdown(result, new Date()), 'text/markdown')
    } else {
      download(
        `${stem}.json`,
        JSON.stringify(result, null, 2),
        'application/json',
      )
    }
  }

  return (
    <section className="page">
      <header className="page__head">
        <h1>Đánh giá phòng thủ nhiều lớp</h1>
        <p>
          Cùng năm ca kiểm thử chạy qua bốn cấu hình. Mỗi ô là một lần truy vấn
          thật. Kỳ vọng được ghi sẵn trong mã trước khi chạy, không suy ra từ
          kết quả.
        </p>
      </header>

      <section className="panel" aria-labelledby="layers-title">
        <h2 id="layers-title">Các lớp phòng thủ</h2>
        <LayerList catalog={catalog} />
      </section>

      <div className="toolbar">
        <button
          type="button"
          className="button button--primary"
          onClick={run}
          disabled={running}
        >
          <Play size={20} aria-hidden />
          {running ? 'Đang chạy 20 lần…' : 'Chạy ma trận đánh giá'}
        </button>
        {result && (
          <>
            <p className="suite-summary">
              <strong>
                {result.expectations_met}/{result.expectations_total}
              </strong>{' '}
              ô đúng kỳ vọng · suite{' '}
              <span className="mono">{shortId(result.suite_id)}</span>
            </p>
            <button
              type="button"
              className="icon-button"
              onClick={() => exportFile('md')}
            >
              <Download size={16} aria-hidden /> Markdown
            </button>
            <button
              type="button"
              className="icon-button"
              onClick={() => exportFile('json')}
            >
              <Download size={16} aria-hidden /> JSON
            </button>
          </>
        )}
      </div>

      {error && <ErrorNotice error={error} />}
      {!result && !error && (
        <p className="empty">
          Chưa có kết quả trong phiên này. Bấm “Chạy ma trận đánh giá”.
        </p>
      )}

      {result && (
        <>
          <section className="panel" aria-labelledby="summary-title">
            <h2 id="summary-title">Tổng hợp theo cấu hình</h2>
            <SummaryTable rows={result.configurations} />
            <Findings rows={result.configurations} />
          </section>
          <section className="panel" aria-labelledby="matrix-title">
            <h2 id="matrix-title">Ma trận chi tiết</h2>
            <MatrixTable result={result} />
          </section>
          <p className="subtle">
            Giới hạn: một kịch bản đăng nhập, một payload, dữ liệu tổng hợp. Kết
            quả không chứng minh ứng dụng miễn nhiễm SQL Injection.
          </p>
        </>
      )}
    </section>
  )
}
