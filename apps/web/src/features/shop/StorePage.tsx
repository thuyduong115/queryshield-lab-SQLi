import {
  Headphones,
  Keyboard,
  LampDesk,
  Laptop,
  Mouse,
  NotebookPen,
  Search,
} from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useOutletContext } from 'react-router'

import { api } from '../../lib/api'
import type { Mode, ShopRun } from '../../lib/types'

const PRODUCT_ICONS = [
  Keyboard,
  Mouse,
  Headphones,
  LampDesk,
  NotebookPen,
  Laptop,
]
const money = (value: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
    value,
  )

export function StorePage() {
  const { mode } = useOutletContext<{ mode: Mode }>()
  const [term, setTerm] = useState('')
  const [result, setResult] = useState<ShopRun | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    setBusy(true)
    setResult(null)
    setError('')
    api
      .search('', mode)
      .then((data) => {
        if (active) setResult(data)
      })
      .catch((err: Error) => {
        if (active) setError(err.message)
      })
      .finally(() => {
        if (active) setBusy(false)
      })
    return () => {
      active = false
    }
  }, [mode])
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setResult(null)
    setError('')
    try {
      setResult(await api.search(term, mode))
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Không tìm kiếm được. Hãy thử lại.',
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <section className="store-intro">
        <div>
          <h1>
            Một góc làm việc,
            <br />
            nhiều điều vừa ý.
          </h1>
          <p>Khám phá đồ dùng nhỏ cho bàn làm việc của bạn.</p>
        </div>
        <p className="store-demo-note">
          Nhập vào ô tìm kiếm, rồi xem SQL và dữ liệu trả về ở tab bảng quan
          sát.
        </p>
      </section>
      <form className="store-search" onSubmit={submit}>
        <label htmlFor="product-search">Tìm sản phẩm</label>
        <div>
          <Search aria-hidden size={22} />
          <input
            id="product-search"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            maxLength={128}
            placeholder="Thử: bàn phím, đèn bàn…"
          />
          <button className="button" disabled={busy}>
            {busy ? 'Đang tìm…' : 'Tìm kiếm'}
          </button>
        </div>
      </form>
      {error && (
        <p role="alert" className="shop-error">
          {error}
        </p>
      )}
      {result?.outcome === 'QUERY_ERROR' && (
        <p role="alert" className="shop-error">
          Truy vấn gặp lỗi. Xem mã SQLSTATE và câu SQL trong bảng quan sát.
        </p>
      )}
      <div className="store-result-head">
        <h2>Sản phẩm</h2>
        <p role="status">
          {busy
            ? 'Đang đọc dữ liệu PostgreSQL…'
            : result
              ? `${result.rows.length} sản phẩm · ${result.mode === 'secure' ? 'Prepared Statements' : 'Nối chuỗi'}`
              : 'Chưa có kết quả'}
        </p>
      </div>
      {result &&
        result.outcome !== 'QUERY_ERROR' &&
        result.rows.length === 0 && (
          <p className="shop-empty">Không tìm thấy sản phẩm phù hợp.</p>
        )}
      <div className="product-grid">
        {result?.rows.map((product, index) => {
          const Icon = PRODUCT_ICONS[index % PRODUCT_ICONS.length]
          return (
            <article className="product" key={String(product.id)}>
              <div className={`product-art product-art--${index % 3}`}>
                <Icon size={92} strokeWidth={1.1} aria-hidden />
              </div>
              <div className="product-info">
                <p>
                  {String(product.category)}
                  {product.published === false && ' · Chưa công khai'}
                </p>
                <h3>{String(product.name)}</h3>
                <strong>{money(Number(product.price))}</strong>
              </div>
            </article>
          )
        })}
      </div>
      <p className="store-footnote">
        Giá và sản phẩm đều là dữ liệu tổng hợp. Ký tự % và _ có ý nghĩa
        wildcard trong ILIKE ở cả hai bản; bind tham số không thay đổi quy tắc
        tìm kiếm này.
      </p>
    </>
  )
}
