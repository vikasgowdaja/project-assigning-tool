import { Navigate, Route, Routes } from 'react-router-dom'
import { DashboardPage } from './pages/DashboardPage'
import { LandingPage } from './pages/LandingPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { RegistrationPage } from './pages/RegistrationPage'
import { SuccessPage } from './pages/SuccessPage'
import AdminTeamsPage from './pages/AdminTeamsPage'
import { AdminLoginPage } from './pages/AdminLoginPage'
import { ProtectedRoute } from './components/ProtectedRoute'
import { TeamLoginPage } from './pages/TeamLoginPage'
import { TeamDashboardPage } from './pages/TeamDashboardPage'
import { TeamProtectedRoute } from './components/TeamProtectedRoute'

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/register" element={<RegistrationPage />} />
      <Route path="/login" element={<TeamLoginPage />} />
      <Route
        path="/team/dashboard"
        element={
          <TeamProtectedRoute>
            <TeamDashboardPage />
          </TeamProtectedRoute>
        }
      />
      <Route path="/success" element={<SuccessPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/home" element={<Navigate to="/" replace />} />
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/admin" element={<Navigate to="/admin/teams" replace />} />
      <Route
        path="/admin/teams"
        element={
          <ProtectedRoute>
            <AdminTeamsPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default App
