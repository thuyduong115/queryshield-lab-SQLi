import { Ban } from 'lucide-react'

// Excerpts of the real adapters in apps/api/src/queryshield_api/modules/laboratory/adapters/.
const BEFORE = `# vulnerable.py (chỉ dùng trong lab)
query = (
    "SELECT id, username, role FROM demo.users "
    f"WHERE username = '{username}' "
    f"AND password_hash = crypt('{password}', password_hash) LIMIT 1"
)
cur.execute(query)`

const AFTER = `# secure.py
SECURE_LOGIN_SQL = (
    "SELECT id, username, role FROM demo.users "
    "WHERE username = %s "
    "AND password_hash = crypt(%s, password_hash) LIMIT 1"
)
cur.execute(SECURE_LOGIN_SQL, (username, password))`

export function CodeDiff() {
  return (
    <div className="patch">
      <div className="code-diff">
        <figure className="code-card code-card--before">
          <figcaption>Trước · nối chuỗi bằng f-string</figcaption>
          <pre>
            <code>{BEFORE}</code>
          </pre>
        </figure>
        <figure className="code-card code-card--after">
          <figcaption>Sau · bind tham số Psycopg</figcaption>
          <pre>
            <code>{AFTER}</code>
          </pre>
        </figure>
      </div>
      <ul className="patch-facts">
        <li>
          Cùng bảng <code>demo.users</code>, cùng cột, cùng điều kiện{' '}
          <code>crypt(…)</code>, cùng dữ liệu fixture.
        </li>
        <li>
          Khác duy nhất: giá trị đi qua tham số <code>$1</code>, <code>$2</code>{' '}
          thay vì trở thành một phần của văn bản SQL.
        </li>
      </ul>
      <div className="notice notice--neutral">
        <Ban aria-hidden size={22} />
        <div>
          <p className="notice__title">Không phải cách vá</p>
          <p>
            Lọc dấu nháy, chặn chữ <code>OR</code> hay <code>--</code> chỉ chặn
            vài payload đã biết và làm hỏng tên hợp lệ như{' '}
            <code>O&apos;Connor</code>. Lab này cố ý không có danh sách chặn:
            phòng thủ đến từ việc tách mã khỏi dữ liệu.
          </p>
        </div>
      </div>
    </div>
  )
}
