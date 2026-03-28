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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MapPin, Power, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ZoneManagement = () => {
  const [zones, setZones] = useState([]);
  const [outlets, setOutlets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filterOutlet, setFilterOutlet] = useState('all');

  const [formData, setFormData] = useState({
    outlet_id: '',
    name: '',
    description: '',
    delivery_charge: 0
  });
  
  const [editMode, setEditMode] = useState(false);
  const [editingZone, setEditingZone] = useState(null);

  useEffect(() => {
    fetchOutlets();
    fetchZones();
  }, []);

  const fetchOutlets = async () => {
    try {
      const response = await axios.get(`${API}/outlets`);
      setOutlets(response.data);
    } catch (error) {
      console.error('Failed to fetch outlets:', error);
    }
  };

  const fetchZones = async () => {
    try {
      const response = await axios.get(`${API}/zones`);
      setZones(response.data);
    } catch (error) {
      console.error('Failed to fetch zones:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      if (editMode && editingZone) {
        // Update existing zone
        await axios.patch(`${API}/zones/${editingZone.id}`, formData);
        setSuccess('Zone updated successfully!');
      } else {
        // Create new zone
        await axios.post(`${API}/zones`, formData);
        setSuccess('Zone created successfully!');
      }
      setDialogOpen(false);
      setEditMode(false);
      setEditingZone(null);
      setFormData({
        outlet_id: '',
        name: '',
        description: '',
        delivery_charge: 0
      });
      fetchZones();
    } catch (error) {
      setError(error.response?.data?.detail || `Failed to ${editMode ? 'update' : 'create'} zone`);
    }
  };
  
  const handleEditZone = (zone) => {
    setEditMode(true);
    setEditingZone(zone);
    setFormData({
      outlet_id: zone.outlet_id,
      name: zone.name,
      description: zone.description || '',
      delivery_charge: zone.delivery_charge
    });
    setDialogOpen(true);
  };
  
  const handleAddNew = () => {
    setEditMode(false);
    setEditingZone(null);
    setFormData({
      outlet_id: '',
      name: '',
      description: '',
      delivery_charge: 0
    });
    setDialogOpen(true);
  };

  const handleToggleActive = async (zoneId, currentStatus) => {
    try {
      const response = await axios.patch(`${API}/zones/${zoneId}/toggle-active`);
      setSuccess(response.data.message);
      fetchZones();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError(error.response?.data?.detail || 'Failed to toggle zone status');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleDelete = async (zoneId, zoneName) => {
    if (!window.confirm(`Are you sure you want to delete zone "${zoneName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await axios.delete(`${API}/zones/${zoneId}`);
      setSuccess('Zone deleted successfully!');
      fetchZones();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError(error.response?.data?.detail || 'Failed to delete zone');
      setTimeout(() => setError(''), 3000);
    }
  };

  const filteredZones = filterOutlet === 'all'
    ? zones
    : zones.filter((zone) => zone.outlet_id === filterOutlet);

  const getOutletName = (outletId) => {
    const outlet = outlets.find((o) => o.id === outletId);
    return outlet?.name || 'Unknown';
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
            <h2 className="text-3xl font-bold" style={{ color: '#e92587' }}>Zone Management</h2>
            <p className="text-gray-600 mt-1">Manage delivery zones and charges</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={handleAddNew}
                className="text-white"
                style={{ backgroundColor: '#e92587' }}
                data-testid="create-zone-button"
              >
                <MapPin className="mr-2 h-4 w-4" />
                Create New Zone
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editMode ? 'Edit Zone' : 'Create New Zone'}</DialogTitle>
                <DialogDescription>{editMode ? 'Update zone details' : 'Add a new delivery zone'}</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="outlet">Outlet *</Label>
                  <Select
                    value={formData.outlet_id}
                    onValueChange={(value) => setFormData({ ...formData, outlet_id: value })}
                  >
                    <SelectTrigger data-testid="zone-outlet-select">
                      <SelectValue placeholder="Select outlet" />
                    </SelectTrigger>
                    <SelectContent>
                      {outlets.map((outlet) => (
                        <SelectItem key={outlet.id} value={outlet.id}>
                          {outlet.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="zone-name">Zone Name *</Label>
                  <Input
                    id="zone-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="e.g., Downtown, Uptown"
                    data-testid="zone-name-input"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="zone-description">Description (Optional)</Label>
                  <Input
                    id="zone-description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="e.g., Covers areas near main street"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="delivery-charge">Delivery Charge (₹) *</Label>
                  <Input
                    id="delivery-charge"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.delivery_charge}
                    onChange={(e) => setFormData({ ...formData, delivery_charge: parseFloat(e.target.value) })}
                    required
                    data-testid="zone-charge-input"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full text-white"
                  style={{ backgroundColor: '#e92587' }}
                  data-testid="submit-zone-button"
                >
                  {editMode ? 'Update Zone' : 'Create Zone'}
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

        {/* Filter */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <Label>Filter by Outlet:</Label>
              <Select value={filterOutlet} onValueChange={setFilterOutlet}>
                <SelectTrigger className="w-64" data-testid="filter-outlet-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Outlets</SelectItem>
                  {outlets.map((outlet) => (
                    <SelectItem key={outlet.id} value={outlet.id}>
                      {outlet.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Zones Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Zones ({filteredZones.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredZones.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No zones found. Create your first zone to get started.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Outlet</TableHead>
                    <TableHead>Zone Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Delivery Charge</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredZones.map((zone) => (
                    <TableRow key={zone.id}>
                      <TableCell className="font-medium">{getOutletName(zone.outlet_id)}</TableCell>
                      <TableCell>{zone.name}</TableCell>
                      <TableCell className="text-sm text-gray-600">{zone.description || '-'}</TableCell>
                      <TableCell>
                        <span className="font-bold" style={{ color: '#e92587' }}>
                          ₹{zone.delivery_charge.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {zone.is_active ? (
                          <Badge className="bg-green-500 hover:bg-green-600">Active</Badge>
                        ) : (
                          <Badge variant="destructive">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditZone(zone)}
                            className="text-blue-600 border-blue-600 hover:bg-blue-50"
                            title="Edit Zone"
                          >
                            <MapPin className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant={zone.is_active ? "outline" : "default"}
                            onClick={() => handleToggleActive(zone.id, zone.is_active)}
                            className={zone.is_active ? "text-orange-600 border-orange-600 hover:bg-orange-50" : "bg-green-600 hover:bg-green-700"}
                            title={zone.is_active ? "Mark as Inactive" : "Mark as Active"}
                          >
                            <Power className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(zone.id, zone.name)}
                            className="text-red-600 border-red-600 hover:bg-red-50"
                            title="Delete Zone"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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

export default ZoneManagement;
