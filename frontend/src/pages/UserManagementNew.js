import { useEffect, useState } from 'react';
import axios from 'axios';
import LayoutWithSidebar from '../components/LayoutWithSidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UserPlus, CheckCircle, XCircle } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const UserManagementNew = () => {
  const [users, setUsers] = useState([]);
  const [outlets, setOutlets] = useState([]);
  const [availablePermissions, setAvailablePermissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    email: '',
    name: '',
    phone: '',
    password: '',
    outlet_id: null,
    permissions: [],
    incentive_percentage: 0
  });

  useEffect(() => {
    fetchUsers();
    fetchOutlets();
    fetchPermissions();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API}/users`);
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOutlets = async () => {
    try {
      const response = await axios.get(`${API}/outlets`);
      setOutlets(response.data);
    } catch (error) {
      console.error('Failed to fetch outlets:', error);
    }
  };

  const fetchPermissions = async () => {
    try {
      const response = await axios.get(`${API}/permissions/available`);
      setAvailablePermissions(response.data);
    } catch (error) {
      console.error('Failed to fetch permissions:', error);
    }
  };

  const handlePermissionToggle = (permission) => {
    const current = [...formData.permissions];
    const index = current.indexOf(permission);
    
    if (index > -1) {
      current.splice(index, 1);
    } else {
      current.push(permission);
    }
    
    setFormData({ ...formData, permissions: current });
  };

  const handleSelectAll = (category) => {
    const categoryPerms = Object.keys(availablePermissions[category] || {});
    const current = [...formData.permissions];
    const allSelected = categoryPerms.every(p => current.includes(p));
    
    if (allSelected) {
      // Remove all from this category
      setFormData({
        ...formData,
        permissions: current.filter(p => !categoryPerms.includes(p))
      });
    } else {
      // Add all from this category
      const newPerms = [...new Set([...current, ...categoryPerms])];
      setFormData({ ...formData, permissions: newPerms });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await axios.post(`${API}/users`, formData);
      setSuccess('User created successfully!');
      setDialogOpen(false);
      setFormData({
        email: '',
        name: '',
        phone: '',
        password: '',
        outlet_id: null,
        permissions: [],
        incentive_percentage: 0
      });
      fetchUsers();
    } catch (error) {
      setError(error.response?.data?.detail || 'Failed to create user');
    }
  };

  const toggleUserActive = async (userId) => {
    try {
      await axios.patch(`${API}/users/${userId}/toggle-active`);
      fetchUsers();
    } catch (error) {
      console.error('Failed to toggle user status:', error);
    }
  };

  if (loading) {
    return (
      <LayoutWithSidebar>
        <div className="text-center py-12">Loading...</div>
      </LayoutWithSidebar>
    );
  }

  return (
    <LayoutWithSidebar>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold" style={{ color: '#e92587' }}>User Management</h2>
            <p className="text-gray-600 mt-1">Manage users and their permissions</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button
                className="text-white"
                style={{ backgroundColor: '#e92587' }}
                data-testid="create-user-button"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Create New User
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh]">
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
                <DialogDescription>Add a new user and assign specific permissions</DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[70vh] pr-4">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  {/* Basic Info */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-lg">Basic Information</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Name *</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          required
                          data-testid="user-name-input"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email">Email *</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          required
                          data-testid="user-email-input"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone *</Label>
                        <Input
                          id="phone"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          required
                          data-testid="user-phone-input"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="password">Password *</Label>
                        <Input
                          id="password"
                          type="password"
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          required
                          data-testid="user-password-input"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="outlet">Assign to Outlet (Optional)</Label>
                        <Select
                          value={formData.outlet_id || 'none'}
                          onValueChange={(value) => setFormData({ ...formData, outlet_id: value === 'none' ? null : value })}
                        >
                          <SelectTrigger data-testid="user-outlet-select">
                            <SelectValue placeholder="Select outlet" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No Outlet</SelectItem>
                            {outlets.map((outlet) => (
                              <SelectItem key={outlet.id} value={outlet.id}>
                                {outlet.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="incentive">Incentive Percentage *</Label>
                        <Input
                          id="incentive"
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={formData.incentive_percentage}
                          onChange={(e) => setFormData({ ...formData, incentive_percentage: parseFloat(e.target.value) })}
                          required
                          data-testid="user-incentive-input"
                        />
                        <p className="text-xs text-gray-500">Commission % for this user on orders they create</p>
                      </div>
                    </div>
                  </div>

                  {/* Permissions */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-lg">Permissions</h4>
                    <p className="text-sm text-gray-600">
                      Select specific permissions for this user
                    </p>

                    {Object.entries(availablePermissions).map(([category, perms]) => (
                      <Card key={category}>
                        <CardHeader className="pb-3">
                          <div className="flex justify-between items-center">
                            <CardTitle className="text-base capitalize">
                              {category.replace('_', ' ')}
                            </CardTitle>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleSelectAll(category)}
                            >
                              Toggle All
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {Object.entries(perms).map(([key, label]) => (
                              <div key={key} className="flex items-start space-x-2">
                                <Checkbox
                                  id={key}
                                  checked={formData.permissions.includes(key)}
                                  onCheckedChange={() => handlePermissionToggle(key)}
                                />
                                <div className="grid gap-1.5 leading-none">
                                  <label
                                    htmlFor={key}
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                  >
                                    {label}
                                  </label>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <div className="pt-4">
                    <p className="text-sm text-gray-600 mb-2">
                      Selected permissions: <strong>{formData.permissions.length}</strong>
                    </p>
                    <Button
                      type="submit"
                      className="w-full text-white"
                      style={{ backgroundColor: '#e92587' }}
                      data-testid="submit-user-button"
                    >
                      Create User
                    </Button>
                  </div>
                </form>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </div>

        {success && (
          <Alert>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Users ({users.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Outlet</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => {
                  const outlet = outlets.find((o) => o.id === user.outlet_id);
                  return (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.phone}</TableCell>
                      <TableCell>{outlet?.name || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {user.permissions?.length || 0} permissions
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.is_active ? (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Active
                          </Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-800">
                            <XCircle className="mr-1 h-3 w-3" />
                            Inactive
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleUserActive(user.id)}
                          data-testid={`toggle-user-${user.id}`}
                        >
                          {user.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}</TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </LayoutWithSidebar>
  );
};

export default UserManagementNew;
