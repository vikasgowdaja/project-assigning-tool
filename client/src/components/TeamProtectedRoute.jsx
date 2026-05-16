import { Navigate, useLocation } from 'react-router-dom'
import { getTeamToken } from '../services/api'

export function TeamProtectedRoute({ children }) {
  const location = useLocation()
  const token = getTeamToken()

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return children
}