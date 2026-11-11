import { useEffect, useState } from 'react'

type Health = {
  status: string
  environment: string
  unsafeLabEnabled: boolean
}

type ApiState =
  | { kind: 'loading' }
  | { kind: 'ready'; health: Health }
  | { kind: 'error' }

function App() {
  const [apiState, setApiState] = useState<ApiState>({ kind: 'loading' })

  useEffect(() => {
    const controller = new AbortController()

    fetch('/api/v1/health', { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('API health check failed')
        return response.json() as Promise<Health>
      })
      .then((health) => setApiState({ kind: 'ready', health }))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setApiState({ kind: 'error' })
      })

    return () => controller.abort()
  }, [])

  return (
    <main className="shell">
      <section className="hero" aria-labelledby="page-title">
        <p className="eyebrow">Phòng thí nghiệm bảo mật chạy cục bộ</p>
        <h1 id="page-title">QueryShield Lab</h1>
        <p className="lead">
          Nền tảng học SQL Injection qua thực nghiệm tấn công, phòng thủ và kiểm
          chứng có thể tái lập.
        </p>

        <div className="status-card" aria-live="polite">
          <span className={`status-dot status-dot--${apiState.kind}`} />
          <div>
            <strong>
              {apiState.kind === 'loading' && 'Đang kiểm tra API…'}
              {apiState.kind === 'ready' && 'API đang hoạt động'}
              {apiState.kind === 'error' && 'Không thể kết nối API'}
            </strong>
            <p>
              {apiState.kind === 'ready'
                ? `Môi trường: ${apiState.health.environment} · Chế độ không an toàn: ${apiState.health.unsafeLabEnabled ? 'bật' : 'tắt'}`
                : 'Hãy khởi động đầy đủ các dịch vụ bằng Docker Compose.'}
            </p>
          </div>
        </div>
      </section>

      <section className="phase-card">
        <span>P0</span>
        <div>
          <h2>Nền tảng an toàn đã sẵn sàng</h2>
          <p>
            Chức năng mô phỏng SQL Injection sẽ được bổ sung ở các giai đoạn
            sau.
          </p>
        </div>
      </section>
    </main>
  )
}

export default App
