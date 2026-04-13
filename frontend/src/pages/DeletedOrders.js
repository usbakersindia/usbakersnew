import { useState, useEffect } from 'react';
import axios from 'axios';
import LayoutWithSidebar from '../components/LayoutWithSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2, RefreshCw, Loader2, Package } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const DeletedOrders = () => {
  const { token } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDeletedOrders();
  }, []);

  const fetchDeletedOrders = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/orders/deleted`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(response.data);
    } catch (error) {
      console.error('Failed to fetch deleted orders:', error);
    } finally {
      setLoading(false);
    }
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
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold" style={{ color: '#e92587' }}>Deleted Orders</h2>
            <p className="text-gray-600 mt-1">Orders that have been deleted</p>
          </div>
          <Button
            onClick={fetchDeletedOrders}
            variant="outline"
            className="border-pink-600 text-pink-600 hover:bg-pink-50"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-500" />
              Deleted Orders ({orders.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <div className="text-center py-12">
                <Trash2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No deleted orders</p>
                <p className="text-sm text-gray-400 mt-2">
                  Deleted orders from Pending and Hold will appear here
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Flavour</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Delivery Date</TableHead>
                    <TableHead>Previous Status</TableHead>
                    <TableHead>Deleted At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id} className="bg-red-50/30">
                      <TableCell className="font-medium">
                        <div className="flex items-center space-x-2">
                          <Package className="h-4 w-4 text-gray-400" />
                          <span>{order.order_number}</span>
                        </div>
                      </TableCell>
                      <TableCell>{order.customer_info?.name || 'N/A'}</TableCell>
                      <TableCell>{order.customer_info?.phone || 'N/A'}</TableCell>
                      <TableCell>{order.flavour || 'N/A'}</TableCell>
                      <TableCell>{order.size_pounds ? `${order.size_pounds} lbs` : 'N/A'}</TableCell>
                      <TableCell className="font-semibold">
                        {order.total_amount ? `₹${order.total_amount.toFixed(2)}` : 'N/A'}
                      </TableCell>
                      <TableCell>{order.delivery_date || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          order.lifecycle_status === 'hold' 
                            ? 'bg-yellow-100 text-yellow-800' 
                            : order.lifecycle_status === 'pending_payment'
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-gray-100 text-gray-800'
                        }>
                          {order.lifecycle_status === 'hold' ? 'Hold' : 
                           order.lifecycle_status === 'pending_payment' ? 'Pending' :
                           order.status || 'Unknown'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {order.deleted_at 
                          ? new Date(order.deleted_at).toLocaleDateString() + ' ' + new Date(order.deleted_at).toLocaleTimeString()
                          : 'N/A'
                        }
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

export default DeletedOrders;
