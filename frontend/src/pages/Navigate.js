import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import LayoutWithSidebar from '../components/LayoutWithSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LogIn, Loader2, ArrowRight } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Navigate = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [impersonating, setImpersonating] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const token = localStorage.getItem('token');
    setLoading(true);
    try {
      const response = await axios.get(`${API}/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Filter out current super admin
      const currentUser = JSON.parse(localStorage.getItem('user'));
      setUsers(response.data.filter(user => user.id !== currentUser?.id));
    } catch (error) {
      console.error('Failed to fetch users:', error);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const impersonateUser = async (userId, userName) => {
    const token = localStorage.getItem('token');
    setImpersonating(userId);
    try {
      const response = await axios.post(`${API}/impersonate/${userId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Save new token and user data
      localStorage.setItem('token', response.data.access_token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      // Store original admin info for returning
      const originalAdmin = JSON.parse(localStorage.getItem('user'));
      localStorage.setItem('original_admin', JSON.stringify({
        token: token,
        user: originalAdmin
      }));
      
      // Redirect to dashboard
      window.location.href = '/dashboard';
    } catch (error) {
      setError(error.response?.data?.detail || 'Failed to impersonate user');
      setTimeout(() => setError(''), 3000);
      setImpersonating(null);
    }
  };

  const getRoleBadge = (role) => {
    const colors = {
      super_admin: 'bg-purple-100 text-purple-800',
      admin: 'bg-blue-100 text-blue-800',
      order_manager: 'bg-green-100 text-green-800',
      factory: 'bg-orange-100 text-orange-800'
    };
    
    const labels = {
      super_admin: 'Super Admin',
      admin: 'Admin',
      order_manager: 'Order Manager',
      factory: 'Factory'
    };

    return (
      <Badge className={colors[role] || 'bg-gray-100 text-gray-800'}>
        {labels[role] || role}
      </Badge>
    );
  };

  if (loading) {
    return (
      <LayoutWithSidebar>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#e92587' }} />
        </div>
      </LayoutWithSidebar>
    );
  }

  return (
    <LayoutWithSidebar>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-3xl font-bold" style={{ color: '#e92587' }}>
            Navigate to User Accounts
          </h2>
          <p className="text-gray-600 mt-1">
            Login as any user without password (Super Admin only)
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <Alert className="bg-red-50 border-red-200">
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {/* Warning Card */}
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <div className="rounded-full p-2 bg-yellow-100">
                <svg className="h-5 w-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-yellow-900">Important Security Note</h4>
                <p className="text-sm text-yellow-800 mt-1">
                  You are about to impersonate another user. All actions will be performed as that user. This feature is for support and testing purposes only.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Users ({users.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {users.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">No other users found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Outlet</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {user.outlet_id || 'All Outlets'}
                      </TableCell>
                      <TableCell>
                        {user.is_active ? (
                          <Badge className="bg-green-100 text-green-800">Active</Badge>
                        ) : (
                          <Badge variant="outline" className="text-gray-600">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => impersonateUser(user.id, user.name)}
                          disabled={!user.is_active || impersonating === user.id}
                          className="text-white"
                          style={{ backgroundColor: '#e92587' }}
                        >
                          {impersonating === user.id ? (
                            <>
                              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                              Logging in...
                            </>
                          ) : (
                            <>
                              <LogIn className="mr-2 h-3 w-3" />
                              Login as User
                              <ArrowRight className="ml-2 h-3 w-3" />
                            </>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </LayoutWithSidebar>
  );
};

export default Navigate;
