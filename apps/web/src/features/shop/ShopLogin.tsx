import { useState, type FormEvent } from 'react'
import { useOutletContext } from 'react-router'

import { CredentialFields } from '../../components/CredentialFields'
import { SqlInspector } from '../../components/SqlInspector'
import { api } from '../../lib/api'
import type { LoginRun, Mode } from '../../lib/types'

export function ShopLogin() {
  const { mode } = useOutletContext<{ mode: Mode }>()
  const [username, setUsername] = useState('student01')
  const [password, setPassword] = useState('')
  const [result, setResult] = useState<LoginRun | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setResult(null)
    setError('')
    try {
      setResult(await api.execute({ mode, username, password }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không đăng nhập được.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="shop-two-columns">
      <section>
        <h1>Chào bạn trở lại.</h1>
        <p className="shop-lead">Đăng nhập để thử luồng tài khoản cửa hàng.</p>
        <form className="shop-form" onSubmit={submit}>
          <CredentialFields
            idPrefix="shop"
            username={username}
            password={password}
            onUsername={setUsername}
            onPassword={setPassword}
          />
          <button className="button" disabled={busy}>
            {busy ? 'Đang đăng nhập…' : 'Đăng nhập'}
          </button>
        </form>
        {error && (
          <p role="alert" className="shop-error">
            {error}
          </p>
        )}
        {result && (
          <div className="shop-result" role="status">
            <strong>
              {result.authentication.authenticated
                ? `Đăng nhập mô phỏng thành công: ${result.authentication.simulated_user?.username}`
                : result.outcome === 'QUERY_ERROR'
                  ? 'Truy vấn gặp lỗi'
                  : 'Tên đăng nhập hoặc mật khẩu không đúng'}
            </strong>
            <p>
              Kết quả của bản{' '}
              {result.mode === 'secure' ? 'Prepared Statements' : 'nối chuỗi'}.
              Không cấp cookie, token hay quyền trong bảng quan sát.
            </p>
            <code>run {result.run_id}</code>
          </div>
        )}
      </section>
      <aside className="shop-lesson">
        <h2>Đăng nhập & Prepared Statements</h2>
        <p>
          Thử tài khoản student01 với mật khẩu fixture công khai
          StudentDemo123!, sau đó thử sai mật khẩu để có kết quả đối chứng.
        </p>
        <p>
          Giữ nguyên input khi đổi bản xử lý SQL. Cả hai bản đọc cùng bảng
          demo.users và so sánh mật khẩu dạng thô chỉ để giảng dạy.
        </p>
        <p>
          Hash mật khẩu và bind tham số giải quyết hai vấn đề khác nhau. Bản
          demo bỏ hash không phải mẫu xác thực cho ứng dụng thật.
        </p>
        <details>
          <summary>Xem mã xử lý đăng nhập</summary>
          <p>
            Hai file thật trong
            apps/api/src/queryshield_api/modules/laboratory/adapters/
          </p>
          <pre className="sql">
            <code>{`# vulnerable.py — local lab only\nquery = build_query(username, password)\ncur.execute(query, prepare=True)\n\n# secure.py\nSQL = "SELECT id, username, role FROM demo.users WHERE username = %s AND password = %s LIMIT 1"\ncur.execute(SQL, (username, password))`}</code>
          </pre>
          <p>
            prepare=True ở bản lỗi chỉ yêu cầu chuẩn bị câu SQL đã bị nối chuỗi;
            nó không thay thế bind giá trị.
          </p>
        </details>
      </aside>
      {result && (
        <div className="shop-full">
          <SqlInspector inspector={result.inspector} />
        </div>
      )}
    </div>
  )
}
