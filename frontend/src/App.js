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
import MSG91Settings from './pages/MSG91Settings';
import ManageOrders from './pages/ManageOrders';
import KitchenDashboard from './pages/KitchenDashboard';
import DeliveryDashboard from './pages/DeliveryDashboard';
import Reports from './pages/Reports';
import PermissionManagement from './pages/PermissionManagement';
import PetPoojaSettings from './pages/PetPoojaSettings';
import '@/App.css';

const AppRoutes = () => {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // Get default route based on user role
  const getDefaultRoute = () => {
    if (!user) return '/login';
    if (user.role === 'kitchen') return '/kitchen';
    if (user.role === 'delivery') return '/delivery';
    return '/dashboard';
  };

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to={getDefaultRoute()} replace /> : <Login />}
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowedRoles={['super_admin', 'outlet_admin', 'order_manager']}>
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
          <ProtectedRoute allowedRoles={['super_admin', 'outlet_admin', 'order_manager']}>
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
        path="/msg91-settings"
        element={
          <ProtectedRoute allowedRoles={['super_admin']}>
            <MSG91Settings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/kitchen"
        element={
          <ProtectedRoute allowedRoles={['super_admin', 'kitchen']}>
            <KitchenDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/delivery"
        element={
          <ProtectedRoute allowedRoles={['super_admin', 'delivery']}>
            <DeliveryDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute allowedRoles={['super_admin', 'outlet_admin', 'kitchen', 'order_manager']}>
            <Reports />
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
        path="/permissions"
        element={
          <ProtectedRoute allowedRoles={['super_admin']}>
            <PermissionManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/petpooja-settings"
        element={
          <ProtectedRoute allowedRoles={['super_admin']}>
            <PetPoojaSettings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/"
        element={<Navigate to={isAuthenticated ? getDefaultRoute() : '/login'} replace />}
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
