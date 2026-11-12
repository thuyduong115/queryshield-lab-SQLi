import { CircleAlert, ShieldCheck, ShieldX, TriangleAlert } from 'lucide-react'
import { Link } from 'react-router'

import type { ApiError } from '../lib/api'
import { formatTime, shortId } from '../lib/format'
import { MODE_LABEL, OUTCOME_LABEL, ROLE_LABEL } from '../lib/labels'
import type { LoginRun } from '../lib/types'
import { SqlInspector } from './SqlInspector'

function verdictDetail(run: LoginRun): string {
  const auth = run.authentication
  if (run.outcome === 'AUTHENTICATED' && auth.simulated_user) {
    const role =
      ROLE_LABEL[auth.simulated_user.role] ?? auth.simulated_user.role
    return `PostgreSQL trả về ${auth.rows_returned} dòng; ứng dụng đăng nhập bằng dòng đầu tiên: ${auth.simulated_user.username} (${role}).`
  }
  if (run.outcome === 'DENIED') {
    return 'PostgreSQL trả về 0 dòng, không có tài khoản nào khớp.'
  }
  if (run.outcome === 'QUERY_ERROR') {
    return `PostgreSQL từ chối phân tích câu lệnh (SQLSTATE ${run.query_error?.sqlstate ?? '?'}). Input đã làm hỏng cấu trúc SQL.`
  }
  return ''
}

export function Verdict({ run }: { run: LoginRun }) {
  const breached =
    run.outcome === 'AUTHENTICATED' &&
    run.mode === 'vulnerable' &&
    run.inspector.observations.includes('PASSWORD_CHECK_COMMENTED_OUT')
  const tone =
    run.outcome === 'AUTHENTICATED'
      ? breached
        ? 'breach'
        : 'ok'
      : run.outcome === 'QUERY_ERROR'
        ? 'warn'
        : 'sealed'
  const Icon =
    tone === 'breach'
      ? ShieldX
      : tone === 'warn'
        ? TriangleAlert
        : tone === 'sealed'
          ? ShieldCheck
          : ShieldCheck

  return (
    <div className={`verdict verdict--${tone}`} role="status">
      <Icon aria-hidden size={34} strokeWidth={2.2} />
      <div>
        <p className="verdict__title">
          {OUTCOME_LABEL[run.outcome]}
          {breached && ' — mật khẩu không hề được kiểm tra'}
        </p>
        <p className="verdict__detail">{verdictDetail(run)}</p>
      </div>
    </div>
  )
}

export function RunMeta({ run }: { run: LoginRun }) {
  return (
    <dl className="run-meta">
      <div>
        <dt>Chế độ</dt>
        <dd>{MODE_LABEL[run.mode]}</dd>
      </div>
      <div>
        <dt>Run ID</dt>
        <dd className="mono" title={run.run_id}>
          {shortId(run.run_id)}
        </dd>
      </div>
      <div>
        <dt>Thời gian truy vấn</dt>
        <dd className="mono">{run.duration_ms} ms</dd>
      </div>
      <div>
        <dt>Dữ liệu</dt>
        <dd className="mono">{run.dataset_version}</dd>
      </div>
      <div>
        <dt>Lúc</dt>
        <dd className="mono">{formatTime(run.created_at)}</dd>
      </div>
    </dl>
  )
}

export function RunResult({
  run,
  showSecureDeskLink = true,
}: {
  run: LoginRun
  showSecureDeskLink?: boolean
}) {
  return (
    <div className="run-result" data-testid={`run-${run.mode}`}>
      <Verdict run={run} />
      <SqlInspector inspector={run.inspector} />
      <RunMeta run={run} />
      {showSecureDeskLink && run.authentication.authenticated && (
        <Link
          className="button button--ghost"
          to={`/app/dashboard?run=${run.run_id}`}
        >
          Mở SecureDesk với phiên mô phỏng này
        </Link>
      )}
    </div>
  )
}

const ERROR_GUIDE: Record<string, string> = {
  LAB_DISABLED:
    'Đặt APP_ENV=local và LAB_ENABLE_UNSAFE=true trong .env rồi khởi động lại Compose. Đây là chặn bảo vệ, không phải kết quả đăng nhập.',
  DATABASE_UNAVAILABLE:
    'Kiểm tra container db và lab-admin: docker compose -f infra/compose.yaml ps',
  API_OFFLINE: 'Khởi động lại stack: docker compose -f infra/compose.yaml up',
  VALIDATION_ERROR:
    'Tên đăng nhập và mật khẩu phải có 1–128 ký tự. Yêu cầu bị chặn trước khi tới cơ sở dữ liệu.',
}

export function ErrorNotice({ error }: { error: ApiError }) {
  return (
    <div className="notice notice--error" role="alert">
      <CircleAlert aria-hidden size={24} />
      <div>
        <p className="notice__title">
          {error.code === 'LAB_DISABLED'
            ? 'Chế độ dễ bị tấn công đang tắt (HTTP 403)'
            : error.message}
        </p>
        {ERROR_GUIDE[error.code] && <p>{ERROR_GUIDE[error.code]}</p>}
        <p className="mono subtle">
          {error.code}
          {error.requestId && ` · request ${shortId(error.requestId)}`}
          {error.runId && ` · run ${shortId(error.runId)}`}
        </p>
      </div>
    </div>
  )
}
