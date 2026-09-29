import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute({ children, requireSuperUser = false }) {
  const { user, profile, loading } = useAuth();

  if (loading) return <div>Cargando...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (requireSuperUser && !profile?.is_superuser) return <Navigate to="/dashboard" replace />;

  return children;
}