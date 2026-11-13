import {
  CircleCheck,
  CircleX,
  ClipboardCheck,
  Columns2,
  FlaskConical,
  Home,
  Presentation,
  RefreshCw,
  ShieldHalf,
  ShieldPlus,
  Ticket,
} from 'lucide-react'
import { NavLink, Outlet } from 'react-router'

import { useHealth } from '../lib/health'

const NAV = [
  { to: '/', label: 'Tổng quan', icon: Home, end: true },
  { to: '/demo', label: 'Kịch bản demo', icon: Presentation },
  { to: '/lab/login-bypass', label: 'Lab tự do', icon: FlaskConical },
  { to: '/lab/comparison', label: 'So sánh', icon: Columns2 },
  { to: '/lab/test-results', label: 'Kiểm thử', icon: ClipboardCheck },
  { to: '/lab/defenses', label: 'Đánh giá phòng thủ', icon: ShieldPlus },
  { to: '/app/login', label: 'SecureDesk', icon: Ticket },
]

function StatusStrip() {
  const { state, refresh } = useHealth()
  if (state.kind === 'loading') {
    return <p className="status-strip">Đang kiểm tra API…</p>
  }
  if (state.kind === 'offline') {
    return (
      <p className="status-strip status-strip--bad" role="alert">
        <CircleX
          size={18}
          aria-hidden
          className="status-icon status-icon--bad"
        />{' '}
        API ngoại tuyến. Hãy chạy Docker Compose.
        <button className="icon-button" onClick={refresh} type="button">
          <RefreshCw size={16} aria-hidden /> Thử lại
        </button>
      </p>
    )
  }
  const { health } = state
  return (
    <p className="status-strip">
      {health.database === 'ok' ? (
        <CircleCheck
          size={18}
          aria-hidden
          className="status-icon status-icon--ok"
        />
      ) : (
        <CircleX
          size={18}
          aria-hidden
          className="status-icon status-icon--bad"
        />
      )}
      <span>
        CSDL {health.database === 'ok' ? 'sẵn sàng' : 'không kết nối được'}
      </span>
      <span className="sep" aria-hidden>
        ·
      </span>
      <span>
        Lab không an toàn:{' '}
        <strong className={health.unsafeLabEnabled ? 'text-breach' : ''}>
          {health.unsafeLabEnabled ? 'BẬT (chỉ máy cục bộ)' : 'tắt'}
        </strong>
      </span>
      <span className="sep" aria-hidden>
        ·
      </span>
      <span className="mono">{health.datasetVersion ?? 'chưa seed'}</span>
      <span className="sep" aria-hidden>
        ·
      </span>
      <span className="mono">{health.environment}</span>
    </p>
  )
}

export function LabShell() {
  return (
    <div className="shell">
      <aside className="rail">
        <div className="brand">
          <ShieldHalf size={28} aria-hidden className="brand__icon" />
          <span>
            <strong>QueryShield</strong> Lab
          </span>
        </div>
        <nav aria-label="Điều hướng chính">
          <ul>
            {NAV.map(({ to, label, icon: Icon, end }) => (
              <li key={to}>
                <NavLink to={to} end={end} className="rail__link">
                  <Icon size={20} aria-hidden />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <p className="rail__foot">
          Chỉ chạy cục bộ. Dữ liệu hoàn toàn tổng hợp.
        </p>
      </aside>
      <div className="workspace">
        <StatusStrip />
        <main className="main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
