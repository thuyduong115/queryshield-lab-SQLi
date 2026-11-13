import { describe, expect, it } from 'vitest'

import type { EvaluationResult } from '../../lib/types'
import { toMarkdown } from './report'

const RESULT: EvaluationResult = {
  suite_id: '11111111-2222-3333-4444-555555555555',
  unsafe_lab_enabled: false,
  cases: [
    {
      id: 'T03',
      role: 'attack',
      input_label: "admin' -- ",
      password_label: 'x',
    },
  ],
  configurations: [
    {
      id: 'C0',
      title: 'Nối chuỗi',
      mode: 'vulnerable',
      layers: ['monitoring'],
      skipped: true,
      attack_blocked: null,
      legitimate_accepted: 0,
      legitimate_total: 0,
      false_rejections: 0,
      wrong_credentials_denied: 0,
      wrong_credentials_total: 0,
      alerts_on_attack: 0,
      alerts_on_legitimate: 0,
      mean_duration_ms: null,
    },
    {
      id: 'C2',
      title: 'Bind tham số',
      mode: 'secure',
      layers: ['binding', 'monitoring'],
      skipped: false,
      attack_blocked: true,
      legitimate_accepted: 0,
      legitimate_total: 0,
      false_rejections: 0,
      wrong_credentials_denied: 0,
      wrong_credentials_total: 0,
      alerts_on_attack: 1,
      alerts_on_legitimate: 0,
      mean_duration_ms: 12.5,
    },
  ],
  cells: [
    {
      configuration_id: 'C0',
      test_case_id: 'T03',
      role: 'attack',
      expected_outcome: 'AUTHENTICATED',
      actual_outcome: null,
      status: 'skipped',
      alerts: [],
      run_id: null,
      duration_ms: null,
    },
    {
      configuration_id: 'C2',
      test_case_id: 'T03',
      role: 'attack',
      expected_outcome: 'DENIED',
      actual_outcome: 'DENIED',
      status: 'passed',
      alerts: ['QUOTE'],
      run_id: 'abc',
      duration_ms: 12,
    },
  ],
  expectations_met: 1,
  expectations_total: 1,
}

describe('toMarkdown', () => {
  it('reports skipped configurations as skipped, never as results', () => {
    const md = toMarkdown(RESULT, new Date('2026-11-13T00:00:00Z'))
    expect(md).toContain('| C0 · Nối chuỗi | bỏ qua |')
    expect(md).toContain("| T03 `admin' -- ` | tấn công | bỏ qua | Từ chối |")
    expect(md).toContain('Kỳ vọng đạt: 1/1')
    expect(md).toContain('không chứng minh ứng dụng miễn nhiễm')
  })
})
