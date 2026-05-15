import { Navigate, useLocation } from 'react-router-dom'
import { getAdminToken } from '../services/api'

export function ProtectedRoute({ children }) {
  const location = useLocation()
  const token = getAdminToken()

  if (!token) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />
  }

  return children
}
