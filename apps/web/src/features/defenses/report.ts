import { OUTCOME_SHORT } from '../../lib/labels'
import type { EvaluationResult } from '../../lib/types'

const ROLE_TEXT = {
  legitimate: 'hợp lệ',
  wrong_credentials: 'sai thông tin',
  attack: 'tấn công',
} as const

function yesNo(value: boolean | null): string {
  if (value === null) return 'không đo'
  return value ? 'có' : 'không'
}

/** Markdown report built only from the measured result passed in. */
export function toMarkdown(
  result: EvaluationResult,
  generatedAt: Date,
): string {
  const lines: string[] = []
  lines.push('# Kết quả đánh giá phòng thủ nhiều lớp')
  lines.push('')
  lines.push(`- Suite: \`${result.suite_id}\``)
  lines.push(`- Thời điểm xuất: ${generatedAt.toISOString()}`)
  lines.push(
    `- Kỳ vọng đạt: ${result.expectations_met}/${result.expectations_total} ô đo được`,
  )
  lines.push(
    `- Lab không an toàn: ${result.unsafe_lab_enabled ? 'bật' : 'tắt (C0, C1 bị bỏ qua)'}`,
  )
  lines.push('')
  lines.push('## Tổng hợp theo cấu hình')
  lines.push('')
  lines.push(
    '| Cấu hình | Chặn tấn công | Hợp lệ vào được | Chặn nhầm | Từ chối sai thông tin | Cảnh báo (tấn công / hợp lệ) | TB ms |',
  )
  lines.push('|---|---|---|---|---|---|---|')
  for (const c of result.configurations) {
    if (c.skipped) {
      lines.push(`| ${c.id} · ${c.title} | bỏ qua | | | | | |`)
      continue
    }
    lines.push(
      `| ${c.id} · ${c.title} | ${yesNo(c.attack_blocked)} | ${c.legitimate_accepted}/${c.legitimate_total} | ${c.false_rejections} | ${c.wrong_credentials_denied}/${c.wrong_credentials_total} | ${c.alerts_on_attack} / ${c.alerts_on_legitimate} | ${c.mean_duration_ms ?? ''} |`,
    )
  }
  lines.push('')
  lines.push('## Ma trận chi tiết')
  lines.push('')
  const ids = result.configurations.map((c) => c.id)
  lines.push(`| Ca | Vai trò | ${ids.join(' | ')} |`)
  lines.push(`|---|---|${ids.map(() => '---').join('|')}|`)
  for (const testCase of result.cases) {
    const cells = ids.map((id) => {
      const cell = result.cells.find(
        (c) => c.configuration_id === id && c.test_case_id === testCase.id,
      )
      if (!cell || cell.status === 'skipped') return 'bỏ qua'
      const actual = cell.actual_outcome
        ? OUTCOME_SHORT[cell.actual_outcome]
        : ''
      return cell.status === 'passed'
        ? actual
        : `${actual} (kỳ vọng ${OUTCOME_SHORT[cell.expected_outcome]})`
    })
    lines.push(
      `| ${testCase.id} \`${testCase.input_label}\` | ${ROLE_TEXT[testCase.role]} | ${cells.join(' | ')} |`,
    )
  }
  lines.push('')
  lines.push(
    'Giới hạn: một kịch bản đăng nhập, một payload, dữ liệu tổng hợp. Kết quả không chứng minh ứng dụng miễn nhiễm SQL Injection.',
  )
  return lines.join('\n') + '\n'
}

export function download(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
