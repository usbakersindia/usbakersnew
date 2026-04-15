import { useState, useEffect } from 'react';
import axios from 'axios';
import LayoutWithSidebar from '../components/LayoutWithSidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Trash2, User } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SalesPersonManagement = () => {
  const [salesPersons, setSalesPersons] = useState([]);
  const [outlets, setOutlets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [selectedOutlet, setSelectedOutlet] = useState('all');

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    outlet_id: ''
  });

  useEffect(() => {
    fetchSalesPersons();
    fetchOutlets();
  }, []);

  const fetchSalesPersons = async (outletId = null) => {
    try {
      const url = outletId && outletId !== 'all' 
        ? `${API}/sales-persons?outlet_id=${outletId}`
        : `${API}/sales-persons`;
      const response = await axios.get(url);
      setSalesPersons(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch sales persons:', error);
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

  const handleOutletFilterChange = (value) => {
    setSelectedOutlet(value);
    fetchSalesPersons(value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.outlet_id) {
      setMessage({ type: 'error', text: 'Name and outlet are required' });
      return;
    }

    try {
      await axios.post(`${API}/sales-persons`, formData);
      setMessage({ type: 'success', text: 'Sales person created successfully' });
      setShowAddModal(false);
      setFormData({ name: '', phone: '', outlet_id: '' });
      fetchSalesPersons(selectedOutlet);
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to create sales person' });
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to deactivate ${name}?`)) return;

    try {
      await axios.delete(`${API}/sales-persons/${id}`);
      setMessage({ type: 'success', text: 'Sales person deactivated successfully' });
      fetchSalesPersons(selectedOutlet);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to deactivate sales person' });
    }
  };

  const getOutletName = (outletId) => {
    const outlet = outlets.find(o => o.id === outletId);
    return outlet?.name || 'Unknown';
  };

  return (
    <LayoutWithSidebar>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: '#e92587' }}>Sales Persons</h1>
            <p className="text-gray-600 mt-1">Manage sales persons for order tracking</p>
          </div>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Sales Person
          </Button>
        </div>

        {/* Message */}
        {message.text && (
          <Alert className={message.type === 'error' ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}>
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        {/* Filter */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Label>Filter by Outlet:</Label>
              <Select value={selectedOutlet} onValueChange={handleOutletFilterChange}>
                <SelectTrigger className="w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Outlets</SelectItem>
                  {outlets.map(outlet => (
                    <SelectItem key={outlet.id} value={outlet.id}>
                      {outlet.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Sales Persons Table */}
        <Card>
          <CardHeader>
            <CardTitle>Sales Persons ({salesPersons.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : salesPersons.length === 0 ? (
              <div className="text-center py-12">
                <User className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">No sales persons found</p>
                <Button className="mt-4" onClick={() => setShowAddModal(true)}>
                  Add First Sales Person
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Outlet</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salesPersons.map((person) => (
                    <TableRow key={person.id}>
                      <TableCell className="font-medium">{person.name}</TableCell>
                      <TableCell>{person.phone || '-'}</TableCell>
                      <TableCell>{getOutletName(person.outlet_id)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(person.id, person.name)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Add Sales Person Modal */}
        <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Sales Person</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter name"
                  required
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <Label className="text-base font-semibold">Outlet * <span className="text-red-500">(Required)</span></Label>
                <Select
                  value={formData.outlet_id}
                  onValueChange={(value) => setFormData({ ...formData, outlet_id: value })}
                  required
                >
                  <SelectTrigger className={!formData.outlet_id ? 'border-red-300 bg-red-50' : 'border-green-300'}>
                    <SelectValue placeholder="⚠ Please select an outlet" />
                  </SelectTrigger>
                  <SelectContent>
                    {outlets.map(outlet => (
                      <SelectItem key={outlet.id} value={outlet.id}>
                        {outlet.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!formData.outlet_id && (
                  <p className="text-xs text-red-500 mt-1">Please select an outlet</p>
                )}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button type="submit">Add Sales Person</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </LayoutWithSidebar>
  );
};

export default SalesPersonManagement;