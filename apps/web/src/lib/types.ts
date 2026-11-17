export type Mode = 'vulnerable' | 'secure'

export type DataRow = Record<string, string | number | boolean | null>
export type ShopDetail = {
  inspector: {
    query_template: string
    sql_preview_redacted: string
    preview_label: string
    parameters: unknown[]
  }
  rows: DataRow[]
  duration_ms: number | null
  sqlstate: string | null
  saved_value?: string | null
  profile_id?: string | null
}
export type ShopRun = ShopDetail & {
  id: string
  mode: Mode
  operation: string
  outcome: string
}
export type Observation = {
  id: string
  operation: string
  mode: Mode
  outcome: string
  detail: ShopDetail
  created_at: string
}
export type DatabaseSnapshot = {
  users: DataRow[]
  products: DataRow[]
  orders: DataRow[]
  profiles: DataRow[]
  notice: string
}

export type Outcome =
  | 'AUTHENTICATED'
  | 'DENIED'
  | 'QUERY_ERROR'
  | 'LAB_DISABLED'
  | 'VALIDATION_ERROR'
  | 'REJECTED_BY_VALIDATION'

export type Health = {
  status: 'ok' | 'degraded'
  environment: string
  unsafeLabEnabled: boolean
  database: 'ok' | 'unavailable'
  datasetVersion: string | null
}

export type Segment = {
  text: string
  origin: 'template' | 'username' | 'password' | 'placeholder'
  syntax: 'code' | 'string' | 'comment'
}

export type Parameter = {
  position: number
  name: string
  sql_type: string
  value: string | null
  redacted: boolean
}

export type Inspector = {
  query_template: string
  sql_preview_redacted: string
  preview_label: string
  segments: Segment[]
  parameters: Parameter[]
  explanation_code: 'UNSAFE_CONCATENATION' | 'PARAMETER_BINDING'
  observations: string[]
}

export type LoginRun = {
  run_id: string
  scenario_id: string
  mode: Mode
  test_case_id: string | null
  outcome: Outcome
  authentication: {
    authenticated: boolean
    simulated_user: { username: string; role: string } | null
    rows_returned: number | null
  }
  inspector: Inspector
  query_error: { sqlstate: string | null; category: string } | null
  layers: string[]
  alerts: string[]
  duration_ms: number
  dataset_version: string
  created_at: string
  simulation_notice: string
}

export type Layers = {
  input_validation: boolean
  error_masking: boolean
}

export type LoginInput = {
  mode: Mode
  username: string
  password: string
  test_case_id?: string
  layers?: Layers
}

export type TestCaseMeta = {
  id: string
  title: string
  purpose: string
  input_label: string
  password_label: string
  expected_vulnerable: Outcome
  expected_secure: Outcome
  gating: boolean
}

export type SuiteCaseResult = {
  test_case_id: string
  title: string
  input_label: string
  password_label: string
  gating: boolean
  mode: Mode
  expected_outcome: Outcome
  actual_outcome: Outcome
  expected_authenticated: boolean
  actual_authenticated: boolean | null
  status: 'passed' | 'failed' | 'skipped'
  passed: boolean | null
  run_id: string | null
  duration_ms: number | null
}

export type SuiteResult = {
  suite_id: string
  scenario_id: string
  dataset_version: string | null
  unsafe_lab_enabled: boolean
  total: number
  passed: number
  failed: number
  skipped: number
  results: SuiteCaseResult[]
}

export type RunSummary = {
  run_id: string
  mode: Mode
  test_case_id: string | null
  suite_id: string | null
  outcome: Outcome
  authenticated: boolean
  simulated_user: string | null
  simulated_role: string | null
  rows_returned: number | null
  sqlstate: string | null
  expected_outcome: string | null
  passed: boolean | null
  duration_ms: number
  dataset_version: string
  created_at: string
}

export type Ticket = {
  id: number
  title: string
  status: 'open' | 'in_progress' | 'resolved'
  priority: 'low' | 'normal' | 'high'
  visibility: 'owner' | 'internal'
  owner_username: string
  created_at: string
}

export type SimulatedSession = {
  run_id: string
  mode: Mode
  simulated: true
  profile: {
    username: string
    role: string
    display_name: string
    department: string
  }
  tickets: Ticket[]
  notice: string
}

export type RoleReport = {
  role: string
  superuser: boolean
  can_create_db: boolean
  can_create_role: boolean
  settings: string[]
  tables: { table: string; granted: string[] }[]
}

export type DefenseCatalog = {
  allow_list_pattern: string
  detection_rules: { id: string; description: string }[]
  least_privilege: RoleReport
}

export type CaseRole = 'legitimate' | 'wrong_credentials' | 'attack'

export type EvaluationCell = {
  configuration_id: string
  test_case_id: string
  role: CaseRole
  expected_outcome: Outcome
  actual_outcome: Outcome | null
  status: 'passed' | 'failed' | 'skipped'
  alerts: string[]
  run_id: string | null
  duration_ms: number | null
}

export type ConfigurationSummary = {
  id: string
  title: string
  mode: Mode
  layers: string[]
  skipped: boolean
  attack_blocked: boolean | null
  legitimate_accepted: number
  legitimate_total: number
  false_rejections: number
  wrong_credentials_denied: number
  wrong_credentials_total: number
  alerts_on_attack: number
  alerts_on_legitimate: number
  mean_duration_ms: number | null
}

export type EvaluationResult = {
  suite_id: string
  unsafe_lab_enabled: boolean
  cases: {
    id: string
    role: CaseRole
    input_label: string
    password_label: string
  }[]
  configurations: ConfigurationSummary[]
  cells: EvaluationCell[]
  expectations_met: number
  expectations_total: number
}
