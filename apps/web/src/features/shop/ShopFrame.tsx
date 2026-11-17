import { Database, ShoppingBag } from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router'

import { useHealth } from '../../lib/health'
import type { Mode } from '../../lib/types'

export function ShopFrame() {
  const [mode, setMode] = useState<Mode>('secure')
  const { state } = useHealth()
  return (
    <div className="shop">
      <div className="shop-notice">
        Cửa hàng thực hành SQL · dữ liệu giả · chỉ chạy cục bộ
      </div>
      <header className="shop-header">
        <Link className="shop-brand" to="/">
          <ShoppingBag aria-hidden /> Góc Nhỏ
          <span>Đồ dùng cho ngày làm việc</span>
        </Link>
        <nav aria-label="Cửa hàng">
          <NavLink to="/" end>
            Sản phẩm
          </NavLink>
          <NavLink to="/login">Đăng nhập</NavLink>
          <NavLink to="/profile">Hồ sơ & đơn hàng</NavLink>
        </nav>
        <Link
          className="button button--secondary"
          to="/admin"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Database size={18} aria-hidden /> Mở bảng quan sát
        </Link>
      </header>
      <div className={`shop-mode shop-mode--${mode}`}>
        <label htmlFor="shop-mode">Bản xử lý SQL</label>
        <select
          id="shop-mode"
          value={mode}
          onChange={(e) => setMode(e.target.value as Mode)}
        >
          <option value="vulnerable">Phần 1 · Không bảo vệ (nối chuỗi)</option>
          <option value="secure">Phần 2 · Prepared Statements</option>
        </select>
        <span>
          {state.kind === 'ready' && state.health.database === 'ok'
            ? 'PostgreSQL sẵn sàng'
            : state.kind === 'loading'
              ? 'Đang kiểm tra API…'
              : 'CSDL chưa sẵn sàng'}
        </span>
        {state.kind === 'ready' && !state.health.unsafeLabEnabled && (
          <span>Bản không bảo vệ đang bị khóa bởi cấu hình.</span>
        )}
      </div>
      <main className="shop-main">
        <Outlet context={{ mode }} />
      </main>
      <footer className="shop-footer">
        QueryShield Lab · Kết quả đăng nhập chỉ mô phỏng, không cấp quyền quản
        trị. <Link to="/lab/overview">Mở công cụ kiểm chứng</Link>
      </footer>
    </div>
  )
}
