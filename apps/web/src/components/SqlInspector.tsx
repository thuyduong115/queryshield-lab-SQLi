import {
  Brackets,
  EyeOff,
  Mail,
  MailCheck,
  Strikethrough,
  TextCursorInput,
} from 'lucide-react'

import { OBSERVATION_TEXT } from '../lib/labels'
import type { Inspector, Segment } from '../lib/types'

function SpilledSql({ segments }: { segments: Segment[] }) {
  return (
    <pre className="sql" aria-label="Câu SQL được dựng bằng nối chuỗi">
      <code>
        {segments.map((segment, index) => (
          <span
            key={index}
            className={`seg seg--${segment.origin} syn--${segment.syntax}`}
          >
            {segment.text}
          </span>
        ))}
      </code>
    </pre>
  )
}

function SealedSql({ segments }: { segments: Segment[] }) {
  let slot = 0
  return (
    <pre className="sql" aria-label="Câu SQL cố định với chỗ giữ tham số">
      <code>
        {segments.map((segment, index) => {
          if (segment.origin !== 'placeholder') {
            return (
              <span key={index} className="seg seg--template syn--code">
                {segment.text}
              </span>
            )
          }
          slot += 1
          return (
            <span
              key={index}
              className="slot"
              title={`Chỗ giữ tham số thứ ${slot}`}
            >
              ${slot}
            </span>
          )
        })}
      </code>
    </pre>
  )
}

function Envelopes({ inspector }: { inspector: Inspector }) {
  return (
    <ul className="envelopes" aria-label="Giá trị gửi riêng tới PostgreSQL">
      {inspector.parameters.map((parameter) => (
        <li key={parameter.position} className="envelope">
          <span className="envelope__slot">${parameter.position}</span>
          <span className="envelope__meta">
            {parameter.name} · {parameter.sql_type}
          </span>
          {parameter.redacted ? (
            <span className="envelope__value redaction">mật khẩu đã ẩn</span>
          ) : (
            <span className="envelope__value">
              <code>{parameter.value}</code>
            </span>
          )}
        </li>
      ))}
    </ul>
  )
}

export function SqlLegend({ mode }: { mode: 'vulnerable' | 'secure' }) {
  if (mode === 'secure') {
    return (
      <ul className="legend">
        <li>
          <Brackets
            size={18}
            aria-hidden
            className="legend-icon legend-icon--sealed"
          />{' '}
          Chỗ giữ tham số
        </li>
        <li>
          <Mail
            size={18}
            aria-hidden
            className="legend-icon legend-icon--sealed"
          />{' '}
          Giá trị gửi riêng
        </li>
      </ul>
    )
  }
  return (
    <ul className="legend">
      <li>
        <TextCursorInput
          size={18}
          aria-hidden
          className="legend-icon legend-icon--input"
        />{' '}
        Input người dùng
      </li>
      <li>
        <Strikethrough
          size={18}
          aria-hidden
          className="legend-icon legend-icon--breach"
        />{' '}
        Bị biến thành chú thích
      </li>
      <li>
        <EyeOff
          size={18}
          aria-hidden
          className="legend-icon legend-icon--muted"
        />{' '}
        Mật khẩu đã ẩn
      </li>
    </ul>
  )
}

export function SqlInspector({ inspector }: { inspector: Inspector }) {
  const secure = inspector.explanation_code === 'PARAMETER_BINDING'
  return (
    <section
      className={`inspector inspector--${secure ? 'secure' : 'vulnerable'}`}
      aria-label="Trình kiểm tra truy vấn"
    >
      <header className="inspector__head">
        <h3>
          {secure
            ? 'Câu SQL cố định + giá trị gửi riêng'
            : 'Câu SQL sau khi nối chuỗi'}
        </h3>
        <SqlLegend mode={secure ? 'secure' : 'vulnerable'} />
      </header>

      {secure ? (
        <>
          <SealedSql segments={inspector.segments} />
          <div className="envelope-row">
            <MailCheck aria-hidden size={22} />
            <Envelopes inspector={inspector} />
          </div>
        </>
      ) : (
        <SpilledSql segments={inspector.segments} />
      )}

      <ul className="observations">
        {inspector.observations.map((code) => (
          <li key={code}>{OBSERVATION_TEXT[code] ?? code}</li>
        ))}
      </ul>
      <p className="preview-label">{inspector.preview_label}</p>
    </section>
  )
}
