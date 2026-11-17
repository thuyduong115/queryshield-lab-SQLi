import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { api } from '../../lib/api'
import type { DatabaseSnapshot, Observation } from '../../lib/types'
import { DataTable, QueryEvidence } from './QueryEvidence'

const OPERATIONS: Record<string, string> = {
  login: 'Đăng nhập',
  search: 'Tìm sản phẩm',
  'profile-save': 'Lưu hồ sơ',
  'order-report': 'Đọc lại → đơn hàng',
}

export function AdminPage() {
  const [events, setEvents] = useState<Observation[]>([])
  const [snapshot, setSnapshot] = useState<DatabaseSnapshot | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [dbError, setDbError] = useState('')
  const [updated, setUpdated] = useState<string | null>(null)
  useEffect(() => {
    let active = true
    let timer: ReturnType<typeof setTimeout>
    const refresh = async () => {
      const [history, database] = await Promise.allSettled([
        api.observations(),
        api.database(),
      ])
      if (!active) return
      if (history.status === 'fulfilled') {
        setEvents(history.value.observations)
        setError('')
        setUpdated(new Date().toLocaleTimeString('vi-VN'))
      } else {
        setError(
          history.reason instanceof Error
            ? history.reason.message
            : 'Không tải được lịch sử.',
        )
        setEvents([])
      }
      if (database.status === 'fulfilled') {
        setSnapshot(database.value)
        setDbError('')
      } else {
        setSnapshot(null)
        setDbError(
          database.reason instanceof Error
            ? database.reason.message
            : 'Không đọc được CSDL.',
        )
      }
      timer = setTimeout(refresh, 2000)
    }
    void refresh()
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [])
  const current =
    events.find((event) => event.id === selected) ??
    (selected === null ? events[0] : undefined)
  return (
    <div className="observer">
      <header className="observer-header">
        <div>
          <h1>Bảng quan sát SQL</h1>
          <p>Cửa hàng → API → PostgreSQL → kết quả</p>
        </div>
        <Link
          className="button button--secondary"
          to="/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Mở cửa hàng ở tab mới
        </Link>
      </header>
      <div className="observer-toolbar">
        <span>
          Tự cập nhật mỗi 2 giây{updated && ` · đọc lịch sử lúc ${updated}`}
        </span>
        <button
          className="button button--secondary"
          onClick={() => setSelected(null)}
        >
          Theo dõi truy vấn mới nhất
        </button>
        <Link to="/lab/comparison">Kiểm chứng đăng nhập</Link>
      </div>
      {error && (
        <p role="alert" className="shop-error">
          {error} Đang tự thử lại.
        </p>
      )}
      <div className="observer-workspace">
        <section className="observer-history">
          <h2>Lịch sử thao tác</h2>
          <p className="subtle">
            30 thao tác gần nhất. Chọn một dòng để giữ kết quả khi có truy vấn
            mới.
          </p>
          {events.length === 0 && (
            <p className="shop-empty">
              Chưa có quan sát. Nhập form ở cửa hàng để bắt đầu.
            </p>
          )}
          <ol>
            {events.map((event) => (
              <li key={event.id}>
                <button
                  className={
                    current?.id === event.id ? 'observation-active' : ''
                  }
                  onClick={() => setSelected(event.id)}
                  aria-pressed={current?.id === event.id}
                >
                  <strong>
                    {OPERATIONS[event.operation] ?? event.operation}
                  </strong>
                  <span>
                    {event.mode === 'secure'
                      ? 'Prepared Statements'
                      : 'Nối chuỗi'}{' '}
                    · {event.outcome}
                  </span>
                  <time dateTime={event.created_at}>
                    {new Date(event.created_at).toLocaleTimeString('vi-VN')}
                  </time>
                </button>
              </li>
            ))}
          </ol>
        </section>
        <section className="observer-detail">
          {current ? (
            <>
              <h2>{OPERATIONS[current.operation] ?? current.operation}</h2>
              <p className="subtle">
                {current.mode === 'secure' ? 'Bind tham số' : 'Nối chuỗi'} ·{' '}
                {current.outcome} · <code>{current.id}</code>
              </p>
              {current.detail.saved_value !== undefined &&
                current.detail.saved_value !== null && (
                  <p>
                    Giá trị đọc lại từ hồ sơ:{' '}
                    <code>{current.detail.saved_value}</code>
                  </p>
                )}
              <QueryEvidence detail={current.detail} />
            </>
          ) : (
            <p className="shop-empty">
              {selected
                ? 'Quan sát đã chọn không còn trong 30 thao tác gần nhất. Bấm theo dõi truy vấn mới nhất.'
                : 'SQL, tham số và các dòng kết quả sẽ xuất hiện ở đây.'}
            </p>
          )}
        </section>
      </div>
      <section className="observer-database">
        <h2>Database hiện tại</h2>
        {dbError && (
          <p role="alert" className="shop-error">
            {dbError}
          </p>
        )}
        {snapshot && (
          <>
            <p>{snapshot.notice}</p>
            <details open>
              <summary>
                demo.users · tài khoản giả và mật khẩu fixture dạng thô
              </summary>
              <DataTable
                caption="Tài khoản fixture hiện tại — không phải lịch sử input đăng nhập"
                rows={snapshot.users}
              />
            </details>
            <details open>
              <summary>demo.products · gồm sản phẩm chưa công khai</summary>
              <DataTable caption="Sản phẩm hiện tại" rows={snapshot.products} />
            </details>
            <details>
              <summary>demo.profiles · dữ liệu đã lưu bằng bind</summary>
              <DataTable
                caption="Hồ sơ hiện tại (tối đa 30)"
                rows={snapshot.profiles}
              />
            </details>
            <details>
              <summary>demo.orders · public và internal</summary>
              <DataTable
                caption="Đơn hàng giả hiện tại"
                rows={snapshot.orders}
              />
            </details>
          </>
        )}
      </section>
      <footer className="shop-footer">
        Bảng quan sát dành cho người vận hành local, độc lập với kết quả đăng
        nhập giả. Không có trình nhập SQL tùy ý hay nút reset HTTP.
      </footer>
    </div>
  )
}
