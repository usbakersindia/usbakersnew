import { useEffect, useState } from 'react';
import axios from 'axios';
import LayoutWithSidebar from '../components/LayoutWithSidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Store, CheckCircle, XCircle, Edit } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const OutletManagement = () => {
  const [outlets, setOutlets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingOutlet, setEditingOutlet] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    phone: '',
    incentive_percentage: 0,
    ready_time_buffer_minutes: 30
  });

  useEffect(() => {
    fetchOutlets();
  }, []);

  const fetchOutlets = async () => {
    try {
      const response = await axios.get(`${API}/outlets`);
      setOutlets(response.data);
    } catch (error) {
      console.error('Failed to fetch outlets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await axios.post(`${API}/outlets`, formData);
      setSuccess('Outlet created successfully!');
      setDialogOpen(false);
      setFormData({
        name: '',
        address: '',
        city: '',
        phone: '',
        incentive_percentage: 0,
        ready_time_buffer_minutes: 30
      });
      fetchOutlets();
    } catch (error) {
      setError(error.response?.data?.detail || 'Failed to create outlet');
    }
  };

  const handleEdit = (outlet) => {
    setEditingOutlet(outlet);
    setFormData({
      name: outlet.name,
      address: outlet.address,
      city: outlet.city,
      phone: outlet.phone,
      incentive_percentage: outlet.incentive_percentage,
      ready_time_buffer_minutes: outlet.ready_time_buffer_minutes
    });
    setEditDialogOpen(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await axios.patch(`${API}/outlets/${editingOutlet.id}`, formData);
      setSuccess('Outlet updated successfully!');
      setEditDialogOpen(false);
      setEditingOutlet(null);
      fetchOutlets();
    } catch (error) {
      setError(error.response?.data?.detail || 'Failed to update outlet');
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
            <h2 className="text-3xl font-bold" style={{ color: '#e92587' }}>Outlet Management</h2>
            <p className="text-gray-600 mt-1">Manage bakery outlets and their settings</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button
                className="text-white"
                style={{ backgroundColor: '#e92587' }}
                data-testid="create-outlet-button"
              >
                <Store className="mr-2 h-4 w-4" />
                Create New Outlet
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Outlet</DialogTitle>
                <DialogDescription>Add a new bakery outlet</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="name">Outlet Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    data-testid="outlet-name-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address *</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    required
                    data-testid="outlet-address-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    required
                    data-testid="outlet-city-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                    data-testid="outlet-phone-input"
                  />
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
                    data-testid="outlet-incentive-input"
                  />
                  <p className="text-xs text-gray-500">Incentive % for order managers</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="buffer">Ready Time Buffer (minutes) *</Label>
                  <Input
                    id="buffer"
                    type="number"
                    min="0"
                    value={formData.ready_time_buffer_minutes}
                    onChange={(e) => setFormData({ ...formData, ready_time_buffer_minutes: parseInt(e.target.value) })}
                    required
                    data-testid="outlet-buffer-input"
                  />
                  <p className="text-xs text-gray-500">Buffer time before delivery for kitchen preparation</p>
                </div>

                <Button
                  type="submit"
                  className="w-full text-white"
                  style={{ backgroundColor: '#e92587' }}
                  data-testid="submit-outlet-button"
                >
                  Create Outlet
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {success && (
          <Alert>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* Outlets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {outlets.map((outlet) => (
            <Card key={outlet.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg" style={{ color: '#e92587' }}>
                      {outlet.name}
                    </CardTitle>
                    {outlet.is_active ? (
                      <Badge className="bg-green-100 text-green-800 mt-2">
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Active
                      </Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-800 mt-2">
                        <XCircle className="mr-1 h-3 w-3" />
                        Inactive
                      </Badge>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(outlet)}
                    data-testid={`edit-outlet-${outlet.id}`}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="text-sm text-gray-500">Address</p>
                  <p className="text-sm font-medium">{outlet.address}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">City</p>
                  <p className="text-sm font-medium">{outlet.city}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="text-sm font-medium">{outlet.phone}</p>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Incentive</span>
                    <span className="text-sm font-bold" style={{ color: '#e92587' }}>
                      {outlet.incentive_percentage}%
                    </span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-sm text-gray-500">Buffer Time</span>
                    <span className="text-sm font-bold" style={{ color: '#e92587' }}>
                      {outlet.ready_time_buffer_minutes} mins
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Outlet</DialogTitle>
              <DialogDescription>Update outlet information</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdate} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="edit-name">Outlet Name *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-address">Address *</Label>
                <Input
                  id="edit-address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-city">City *</Label>
                <Input
                  id="edit-city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-phone">Phone *</Label>
                <Input
                  id="edit-phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-incentive">Incentive Percentage *</Label>
                <Input
                  id="edit-incentive"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={formData.incentive_percentage}
                  onChange={(e) => setFormData({ ...formData, incentive_percentage: parseFloat(e.target.value) })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-buffer">Ready Time Buffer (minutes) *</Label>
                <Input
                  id="edit-buffer"
                  type="number"
                  min="0"
                  value={formData.ready_time_buffer_minutes}
                  onChange={(e) => setFormData({ ...formData, ready_time_buffer_minutes: parseInt(e.target.value) })}
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full text-white"
                style={{ backgroundColor: '#e92587' }}
              >
                Update Outlet
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </LayoutWithSidebar>
  );
};

export default OutletManagement;
