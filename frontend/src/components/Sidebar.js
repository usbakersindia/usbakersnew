import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LayoutDashboard, ShoppingCart, Clock, Store, Users, MapPin, Settings, LogOut, Menu, X, MessageSquare, List, Receipt, Truck, CreditCard } from 'lucide-react';
import { useState } from 'react';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const isSuperAdmin = user?.role === 'super_admin';

  const isActive = (path) => location.pathname === path;

  // Define menu items based on role
  const menuItems = isSuperAdmin 
    ? [
        // Super Admin Menu
        { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, testId: 'nav-dashboard' },
        { path: '/customers', label: 'Customers', icon: Users, testId: 'nav-customers' },
        { path: '/outlets', label: 'Outlets', icon: Store, testId: 'nav-outlets' },
        { path: '/users', label: 'Users', icon: Users, testId: 'nav-users' },
        { path: '/zones', label: 'Zones', icon: MapPin, testId: 'nav-zones' },
        { path: '/permissions', label: 'Permissions', icon: Settings, testId: 'nav-permissions' },
        { path: '/reports', label: 'Reports', icon: Receipt, testId: 'nav-reports' },
        { path: '/petpooja-settings', label: 'PetPooja Integration', icon: CreditCard, testId: 'nav-petpooja' },
        { path: '/msg91-settings', label: 'WhatsApp Settings', icon: MessageSquare, testId: 'nav-msg91' },
        { path: '/settings', label: 'Settings', icon: Settings, testId: 'nav-settings' }
      ]
    : [
        // Outlet/User Menu - Check if user is Kitchen or Delivery role
        ...(user?.role === 'kitchen' 
          ? [
              { path: '/kitchen', label: 'Kitchen Orders', icon: ShoppingCart, testId: 'nav-kitchen' },
              { path: '/reports', label: 'Reports', icon: Receipt, testId: 'nav-reports' },
            ]
          : user?.role === 'delivery'
          ? [
              { path: '/delivery', label: 'Delivery Orders', icon: Truck, testId: 'nav-delivery' },
            ]
          : [
              // Outlet Admin menu - NO Settings
              { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, testId: 'nav-dashboard' },
              { path: '/new-order', label: 'New Order', icon: ShoppingCart, testId: 'nav-new-order' },
              { path: '/hold-orders', label: 'Hold Orders', icon: Clock, testId: 'nav-hold-orders' },
              { path: '/manage-orders', label: 'Manage Orders', icon: List, testId: 'nav-manage-orders' },
              { path: '/customers', label: 'Customers', icon: Users, testId: 'nav-customers' },
              { path: '/reports', label: 'Reports', icon: Receipt, testId: 'nav-reports' },
            ]
        )
      ];

  return (
    <>
      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 h-screen bg-white border-r shadow-sm transition-all duration-300 z-50 ${
          collapsed ? 'w-16' : 'w-64'
        }`}
      >
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b">
          {!collapsed && (
            <div className="flex items-center space-x-2">
              <img src="/us-bakers-logo.jpg" alt="US Bakers" className="h-10 w-10 object-contain" />
              <div>
                <h1 className="text-sm font-bold" style={{ color: '#e92587' }}>US Bakers</h1>
                <p className="text-xs text-gray-500">Bakery CRM</p>
              </div>
            </div>
          )}
          {collapsed && (
            <img src="/us-bakers-logo.jpg" alt="US Bakers" className="h-8 w-8 object-contain" />
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 hover:bg-gray-100 rounded"
          >
            {collapsed ? <Menu className="h-5 w-5" /> : <X className="h-5 w-5" />}
          </button>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 py-4">
          <nav className="space-y-1 px-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                    active
                      ? 'bg-pink-50 text-[#e92587]'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  data-testid={item.testId}
                >
                  <Icon className="h-5 w-5" />
                  {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
                </button>
              );
            })}
          </nav>
        </ScrollArea>

        {/* User Info & Logout */}
        <div className="border-t p-4">
          {!collapsed ? (
            <div>
              <div className="mb-3">
                <p className="text-sm font-semibold truncate">{user?.name}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
              <Button
                variant="outline"
                onClick={logout}
                className="w-full"
                size="sm"
                data-testid="logout-button"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          ) : (
            <button
              onClick={logout}
              className="w-full flex justify-center p-2 hover:bg-gray-100 rounded"
              data-testid="logout-button"
            >
              <LogOut className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Overlay for mobile */}
      {!collapsed && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setCollapsed(true)}
        />
      )}
    </>
  );
};

export default Sidebar;