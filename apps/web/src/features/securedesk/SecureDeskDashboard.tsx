import { LockKeyhole, LogOut } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'

import { ErrorNotice } from '../../components/RunResult'
import { api, ApiError } from '../../lib/api'
import { formatDate, shortId } from '../../lib/format'
import { MODE_LABEL, ROLE_LABEL } from '../../lib/labels'
import type { SimulatedSession, Ticket } from '../../lib/types'
import { toApiError } from '../../lib/useLoginRun'
import { SecureDeskFrame } from './SecureDeskFrame'

const STATUS_LABEL: Record<Ticket['status'], string> = {
  open: 'Mở',
  in_progress: 'Đang xử lý',
  resolved: 'Đã xong',
}

const PRIORITY_LABEL: Record<Ticket['priority'], string> = {
  low: 'Thấp',
  normal: 'Thường',
  high: 'Cao',
}

export function SecureDeskDashboard() {
  const [params] = useSearchParams()
  const runId = params.get('run')
  const [session, setSession] = useState<SimulatedSession | null>(null)
  const [error, setError] = useState<ApiError | null>(null)

  useEffect(() => {
    if (!runId) return
    api
      .simulatedSession(runId)
      .then(setSession)
      .catch((err: unknown) => setError(toApiError(err)))
  }, [runId])

  if (!runId || (error && error.status === 404)) {
    return (
      <SecureDeskFrame>
        <main className="desk__main">
          <div className="desk-card">
            <h1>Chưa đăng nhập</h1>
            <p>
              Không có phiên mô phỏng nào gắn với địa chỉ này. Hãy đăng nhập
              trước.
            </p>
            <Link className="button button--desk" to="/app/login">
              Tới trang đăng nhập
            </Link>
          </div>
        </main>
      </SecureDeskFrame>
    )
  }

  const internal = session?.tickets.filter((t) => t.visibility === 'internal')

  return (
    <SecureDeskFrame>
      <main className="desk__main">
        {error && <ErrorNotice error={error} />}
        {!session && !error && <p className="empty">Đang tải phiên…</p>}
        {session && (
          <>
            <header className="desk-profile">
              <div>
                <h1>Xin chào, {session.profile.display_name}</h1>
                <p>
                  <code>{session.profile.username}</code> ·{' '}
                  {ROLE_LABEL[session.profile.role] ?? session.profile.role} ·{' '}
                  {session.profile.department}
                </p>
              </div>
              <Link className="button button--ghost" to="/app/login">
                <LogOut size={18} aria-hidden /> Đăng xuất
              </Link>
            </header>

            <p
              className={`desk-provenance desk-provenance--${session.mode}`}
              role="note"
            >
              Phiên mô phỏng từ run{' '}
              <span className="mono">{shortId(session.run_id)}</span>, chế độ{' '}
              <strong>{MODE_LABEL[session.mode]}</strong>. {session.notice}
            </p>

            {internal && internal.length > 0 && (
              <p className="desk-impact">
                <LockKeyhole size={20} aria-hidden />
                Tài khoản quản trị nhìn thấy {internal.length} yêu cầu nội bộ và
                toàn bộ yêu cầu của người dùng khác.
              </p>
            )}

            <section aria-labelledby="tickets-title">
              <h2 id="tickets-title">
                Yêu cầu hỗ trợ ({session.tickets.length})
              </h2>
              <div className="table-wrap">
                <table className="desk-table">
                  <thead>
                    <tr>
                      <th scope="col">Mã</th>
                      <th scope="col">Tiêu đề</th>
                      <th scope="col">Người gửi</th>
                      <th scope="col">Ưu tiên</th>
                      <th scope="col">Trạng thái</th>
                      <th scope="col">Ngày tạo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {session.tickets.map((ticket) => (
                      <tr
                        key={ticket.id}
                        className={
                          ticket.visibility === 'internal'
                            ? 'row--internal'
                            : ''
                        }
                      >
                        <td className="mono">#{ticket.id}</td>
                        <td>{ticket.title}</td>
                        <td>{ticket.owner_username}</td>
                        <td>
                          <span className={`prio prio--${ticket.priority}`}>
                            {PRIORITY_LABEL[ticket.priority]}
                          </span>
                        </td>
                        <td>{STATUS_LABEL[ticket.status]}</td>
                        <td className="mono">
                          {formatDate(ticket.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </main>
    </SecureDeskFrame>
  )
}
