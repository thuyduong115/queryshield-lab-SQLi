import { ArrowLeft, LifeBuoy } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'

export function SecureDeskFrame({ children }: { children: ReactNode }) {
  return (
    <div className="desk">
      <p className="desk__labstrip">
        <span>
          Ứng dụng mô phỏng bên trong QueryShield Lab. Không có cookie hay token
          thật nào được cấp.
        </span>
        <Link to="/demo">
          <ArrowLeft size={16} aria-hidden /> Về Lab
        </Link>
      </p>
      <header className="desk__bar">
        <span className="desk__brand">
          <LifeBuoy size={24} aria-hidden />
          SecureDesk
        </span>
        <span className="desk__tag">Cổng hỗ trợ nội bộ</span>
      </header>
      {children}
    </div>
  )
}
