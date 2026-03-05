import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import Login from './pages/Login';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import UserManagementNew from './pages/UserManagementNew';
import OutletManagement from './pages/OutletManagement';
import ZoneManagement from './pages/ZoneManagement';
import Settings from './pages/Settings';
import NewOrder from './pages/NewOrder';
import HoldOrders from './pages/HoldOrders';
import Customers from './pages/Customers';
import WhatsAppTemplates from './pages/WhatsAppTemplates';
import MSG91Settings from './pages/MSG91Settings';
import ManageOrders from './pages/ManageOrders';
import '@/App.css';

const AppRoutes = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />}
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowedRoles={['super_admin']}>
            <SuperAdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/new-order"
        element={
          <ProtectedRoute allowedRoles={['super_admin', 'outlet_admin', 'order_manager']}>
            <NewOrder />
          </ProtectedRoute>
        }
      />
      <Route
        path="/hold-orders"
        element={
          <ProtectedRoute allowedRoles={['super_admin', 'outlet_admin', 'order_manager']}>
            <HoldOrders />
          </ProtectedRoute>
        }
      />
      <Route
        path="/manage-orders"
        element={
          <ProtectedRoute allowedRoles={['super_admin', 'outlet_admin', 'order_manager']}>
            <ManageOrders />
          </ProtectedRoute>
        }
      />
      <Route
        path="/customers"
        element={
          <ProtectedRoute allowedRoles={['super_admin']}>
            <Customers />
          </ProtectedRoute>
        }
      />
      <Route
        path="/users"
        element={
          <ProtectedRoute allowedRoles={['super_admin']}>
            <UserManagementNew />
          </ProtectedRoute>
        }
      />
      <Route
        path="/outlets"
        element={
          <ProtectedRoute allowedRoles={['super_admin']}>
            <OutletManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/zones"
        element={
          <ProtectedRoute allowedRoles={['super_admin']}>
            <ZoneManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/whatsapp-templates"
        element={
          <ProtectedRoute allowedRoles={['super_admin']}>
            <WhatsAppTemplates />
          </ProtectedRoute>
        }
      />
      <Route
        path="/msg91-settings"
        element={
          <ProtectedRoute allowedRoles={['super_admin']}>
            <MSG91Settings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute allowedRoles={['super_admin']}>
            <Settings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/"
        element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />}
      />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
