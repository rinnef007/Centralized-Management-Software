import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import MainLayout from './layouts/MainLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Network from './pages/Network';
import Servers from './pages/Servers';
import TollCollection from './pages/TollCollection';
import Weighing from './pages/Weighing';
import Cameras from './pages/Cameras';
import VMS from './pages/VMS';
import Power from './pages/Power';
import Reports from './pages/Reports';
import LoadingSpinner from './components/common/LoadingSpinner';

function ProtectedRoute({ children, roles }) {
  const { user, loading, hasRole } = useAuth();
  if (loading) return <div className="flex h-screen items-center justify-center"><LoadingSpinner size="lg" text="Đang tải hệ thống..." /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !hasRole(...roles)) return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex h-screen items-center justify-center"><LoadingSpinner size="lg" text="Đang tải hệ thống..." /></div>;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="network" element={<ProtectedRoute roles={['admin', 'cmo_operator']}><Network /></ProtectedRoute>} />
        <Route path="servers" element={<ProtectedRoute roles={['admin', 'cmo_operator']}><Servers /></ProtectedRoute>} />
        <Route path="tolls" element={<TollCollection />} />
        <Route path="weighing" element={<Weighing />} />
        <Route path="cameras" element={<Cameras />} />
        <Route path="vms" element={<ProtectedRoute roles={['admin', 'cmo_operator']}><VMS /></ProtectedRoute>} />
        <Route path="power" element={<ProtectedRoute roles={['admin', 'cmo_operator']}><Power /></ProtectedRoute>} />
        <Route path="reports" element={<ProtectedRoute roles={['admin', 'cmo_operator']}><Reports /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
