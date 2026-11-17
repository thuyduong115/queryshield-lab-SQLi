import { useState, type FormEvent } from 'react'
import { useOutletContext } from 'react-router'

import { api } from '../../lib/api'
import type { Mode, ShopRun } from '../../lib/types'
import { QueryEvidence } from './QueryEvidence'

export function ProfilePage() {
  const { mode } = useOutletContext<{ mode: Mode }>()
  const [name, setName] = useState('student01')
  const [saved, setSaved] = useState<{ id: string; value: string } | null>(null)
  const [write, setWrite] = useState<ShopRun | null>(null)
  const [report, setReport] = useState<ShopRun | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const save = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    setSaved(null)
    setWrite(null)
    setReport(null)
    try {
      const result = await api.saveProfile(name)
      setSaved({ id: result.profile_id, value: name })
      setWrite(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không lưu được hồ sơ.')
    } finally {
      setBusy(false)
    }
  }
  const read = async () => {
    if (!saved) return
    setBusy(true)
    setError('')
    setReport(null)
    try {
      setReport(await api.orderReport(saved.id, mode))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không đọc được đơn hàng.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <h1>Hồ sơ & đơn hàng</h1>
      <p className="shop-lead">
        Second-order: dữ liệu được lưu an toàn, rồi được dùng lại ở một truy vấn
        khác.
      </p>
      <div className="shop-two-columns">
        <section>
          <h2>1. Lưu hồ sơ</h2>
          <p>Bước này luôn dùng bind tham số, ở cả hai bản.</p>
          <form className="shop-form" onSubmit={save}>
            <label htmlFor="customer-name">Tên khách hàng dùng tra đơn</label>
            <input
              id="customer-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={128}
              required
            />
            <button className="button" disabled={busy}>
              Lưu hồ sơ
            </button>
          </form>
          {saved && (
            <p role="status">
              Đã lưu nguyên văn: <code>{saved.value}</code>
            </p>
          )}
        </section>
        <section>
          <h2>2. Xem đơn hàng từ hồ sơ đã lưu</h2>
          <p>
            API đọc tên từ PostgreSQL bằng ID hồ sơ, rồi dùng tên đó trong truy
            vấn báo cáo. Bản đang chọn quyết định cách xử lý ở bước này.
          </p>
          <button className="button" onClick={read} disabled={busy || !saved}>
            {busy ? 'Đang xử lý…' : 'Xem đơn hàng'}
          </button>
          <p className="subtle">
            Đổi bản xử lý và bấm lại để so sánh cùng một hồ sơ, không cần lưu
            lại.
          </p>
        </section>
      </div>
      {error && (
        <p role="alert" className="shop-error">
          {error}
        </p>
      )}
      <div className="shop-lesson">
        <h2>Prepared Statements bảo vệ ở đâu?</h2>
        <p>
          Bind ở bước lưu giữ input dưới dạng dữ liệu. Nếu bước đọc lại ghép giá
          trị đã lưu vào SQL, dữ liệu vẫn có thể trở thành cú pháp: đó là
          second-order SQL Injection. Cách vá là bind cả ở bước đọc lại.
        </p>
        <p>
          Đây là tra cứu minh họa bằng tên khách hàng; bind không thay thế kiểm
          tra quyền sở hữu đơn hàng.
        </p>
      </div>
      {report && (
        <>
          <p role="status">
            Kết quả bước đọc ·{' '}
            {report.mode === 'secure' ? 'Prepared Statements' : 'Nối chuỗi'} ·{' '}
            {report.rows.length} dòng
          </p>
          <QueryEvidence detail={report} />
        </>
      )}
      {write && (
        <details>
          <summary>Bằng chứng bước lưu bằng tham số</summary>
          <QueryEvidence detail={write} />
        </details>
      )}
    </>
  )
}
