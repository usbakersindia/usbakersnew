import { useEffect, useState } from 'react';
import axios from 'axios';
import LayoutWithSidebar from '../components/LayoutWithSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [outlets, setOutlets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterOutlet, setFilterOutlet] = useState('all');

  const fetchCustomers = async () => {
    try {
      const url = filterOutlet === 'all' ? `${API}/customers` : `${API}/customers?outlet_id=${filterOutlet}`;
      const response = await axios.get(url);
      setCustomers(response.data);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
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

  // Fetch outlets once on mount
  useEffect(() => {
    fetchOutlets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch customers whenever filter changes
  useEffect(() => {
    fetchCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterOutlet]);

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
        <div>
          <h2 className="text-3xl font-bold" style={{ color: '#e92587' }}>Customers</h2>
          <p className="text-gray-600 mt-1">All customers from all outlets</p>
        </div>

        {/* Filter */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <Label>Filter by Outlet:</Label>
              <Select value={filterOutlet} onValueChange={setFilterOutlet}>
                <SelectTrigger className="w-64">
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

        {/* Customers Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Customers ({customers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {customers.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No customers found.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Birthday</TableHead>
                    <TableHead>Gender</TableHead>
                    <TableHead>Total Orders</TableHead>
                    <TableHead>Total Spent</TableHead>
                    <TableHead>Pending</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{customer.name}</TableCell>
                      <TableCell>{customer.phone}</TableCell>
                      <TableCell>{customer.birthday || '-'}</TableCell>
                      <TableCell>
                        {customer.gender ? (
                          <Badge variant="outline" className="capitalize">
                            {customer.gender}
                          </Badge>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge style={{ backgroundColor: '#e92587', color: 'white' }}>
                          {customer.total_orders}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-bold" style={{ color: '#10b981' }}>
                          ₹{customer.total_spent?.toFixed(2) || '0.00'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-bold" style={{ color: '#f59e0b' }}>
                          ₹{customer.pending_amount?.toFixed(2) || '0.00'}
                        </span>
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

export default Customers;