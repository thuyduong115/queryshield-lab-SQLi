import { Route, Routes } from 'react-router'

import { LabShell } from './app/LabShell'
import { ComparisonPage } from './features/comparison/ComparisonPage'
import { DemoPage } from './features/demo/DemoPage'
import { LabPage } from './features/laboratory/LabPage'
import { OverviewPage } from './features/overview/OverviewPage'
import { SecureDeskDashboard } from './features/securedesk/SecureDeskDashboard'
import { SecureDeskLogin } from './features/securedesk/SecureDeskLogin'
import { TestResultsPage } from './features/test-results/TestResultsPage'
import { HealthProvider } from './lib/health'

function NotFound() {
  return (
    <section className="page">
      <h1>Không tìm thấy trang</h1>
      <p>Đường dẫn này không tồn tại trong QueryShield Lab.</p>
    </section>
  )
}

export default function App() {
  return (
    <HealthProvider>
      <Routes>
        <Route element={<LabShell />}>
          <Route index element={<OverviewPage />} />
          <Route path="demo" element={<DemoPage />} />
          <Route path="lab/login-bypass" element={<LabPage />} />
          <Route path="lab/comparison" element={<ComparisonPage />} />
          <Route path="lab/test-results" element={<TestResultsPage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
        <Route path="app/login" element={<SecureDeskLogin />} />
        <Route path="app/dashboard" element={<SecureDeskDashboard />} />
      </Routes>
    </HealthProvider>
  )
}
