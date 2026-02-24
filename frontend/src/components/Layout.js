import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useNavigate, useLocation } from 'react-router-dom';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', testId: 'nav-dashboard' },
    { path: '/outlets', label: 'Outlets', testId: 'nav-outlets' },
    { path: '/users', label: 'Users', testId: 'nav-users' },
    { path: '/zones', label: 'Zones', testId: 'nav-zones' },
    { path: '/settings', label: 'Settings', testId: 'nav-settings' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b" style={{ borderColor: '#e92587' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4 cursor-pointer" onClick={() => navigate('/dashboard')}>
              <img src="/us-bakers-logo.jpg" alt="US Bakers" className="h-12" />
              <div>
                <h1 className="text-2xl font-bold" style={{ color: '#e92587' }}>
                  US Bakers - Bakery Management System
                </h1>
                <p className="text-sm text-gray-600">Super Admin Dashboard</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="font-semibold">{user?.name}</p>
                <p className="text-sm text-gray-500">{user?.email}</p>
              </div>
              <Button
                variant="outline"
                onClick={logout}
                data-testid="logout-button"
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`px-3 py-4 text-sm font-medium border-b-2 transition-colors ${
                  isActive(item.path)
                    ? 'border-[#e92587] text-[#e92587]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
                data-testid={item.testId}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;
