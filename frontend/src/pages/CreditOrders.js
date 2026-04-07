import { useEffect, useState } from 'react';
import axios from 'axios';
import LayoutWithSidebar from '../components/LayoutWithSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CreditCard, Gift, DollarSign, Package } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CreditOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });

  const fetchCreditOrders = async () => {
    try {
      const res = await axios.get(`${API}/orders/credit`);
      setOrders(res.data);
    } catch (err) {
      console.error('Failed to fetch credit orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCreditOrders(); }, []);

  const handleMarkComplementary = async (orderId, value) => {
    try {
      await axios.post(`${API}/orders/${orderId}/mark-complementary?is_complementary=${value}`);
      setMessage({ type: 'success', text: value ? 'Marked as Complementary' : 'Marked for Payment Sync' });
      fetchCreditOrders();
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to update' });
    }
  };

  const complementaryTotal = orders
    .filter(o => o.is_complementary)
    .reduce((sum, o) => sum + (o.total_amount || 0), 0);

  const creditTotal = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
  const pendingPaymentOrders = orders.filter(o => !o.is_complementary);

  if (loading) {
    return (
      <LayoutWithSidebar>
        <div className="flex items-center justify-center h-64">
          <p>Loading credit orders...</p>
        </div>
      </LayoutWithSidebar>
    );
  }

  return (
    <LayoutWithSidebar>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: '#e92587' }}>Credit Orders</h1>
          <p className="text-gray-600 mt-1">Manage credit and complementary orders</p>
        </div>

        {message.text && (
          <div className={`p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {message.text}
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Credit Orders</p>
                  <p className="text-2xl font-bold" style={{ color: '#e92587' }}>{orders.length}</p>
                  <p className="text-sm text-gray-500">Rs.{creditTotal.toFixed(2)}</p>
                </div>
                <CreditCard className="h-8 w-8 text-pink-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-green-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Complementary Value</p>
                  <p className="text-2xl font-bold text-green-600">Rs.{complementaryTotal.toFixed(2)}</p>
                  <p className="text-sm text-gray-500">{orders.filter(o => o.is_complementary).length} orders</p>
                </div>
                <Gift className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Needs Payment Sync</p>
                  <p className="text-2xl font-bold text-orange-600">{pendingPaymentOrders.length}</p>
                  <p className="text-sm text-gray-500">Rs.{pendingPaymentOrders.reduce((s, o) => s + (o.total_amount || 0), 0).toFixed(2)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-orange-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Credit Orders ({orders.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <CreditCard className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No credit orders found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Delivery</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id} className={order.is_complementary ? 'bg-green-50' : ''}>
                      <TableCell className="font-bold">#{order.order_number}</TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">{order.customer_info?.name}</div>
                        <div className="text-xs text-gray-500">{order.customer_info?.phone}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{order.flavour} - {order.size_pounds} Lbs</div>
                        <div className="text-xs text-gray-500">{order.occasion}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{order.delivery_date}</div>
                        <div className="text-xs text-gray-500">{order.delivery_time}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-bold">Rs.{order.total_amount?.toFixed(2)}</div>
                        <div className="text-xs text-gray-500">Paid: Rs.{order.paid_amount?.toFixed(2) || '0.00'}</div>
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          order.status === 'delivered' ? 'bg-green-600' :
                          order.status === 'ready' ? 'bg-green-500' :
                          order.status === 'in_progress' ? 'bg-orange-500' :
                          'bg-blue-500'
                        }>
                          {order.status?.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={order.is_complementary ? 'complementary' : 'needs_payment'}
                          onValueChange={(val) => handleMarkComplementary(order.id, val === 'complementary')}
                        >
                          <SelectTrigger className="w-[160px]" data-testid={`credit-type-${order.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="complementary">
                              <span className="flex items-center gap-1"><Gift className="h-3 w-3" /> Complementary</span>
                            </SelectItem>
                            <SelectItem value="needs_payment">
                              <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" /> Needs Payment</span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
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

export default CreditOrders;
