import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <div className="page-loader">Checking your session…</div>
  return user ? children : <Navigate to="/login" state={{ from: location }} replace />
}

export function AdminRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <div className="page-loader">Checking your session…</div>
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  return user.role === 'admin' ? children : <Navigate to="/" replace />
}
