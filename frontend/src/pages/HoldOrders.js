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
import { DollarSign, Trash2, Eye } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const HoldOrders = () => {
  const [orders, setOrders] = useState([]);
  const [outlets, setOutlets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paymentDialog, setPaymentDialog] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [viewDialog, setViewDialog] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [paymentData, setPaymentData] = useState({
    amount: 0,
    payment_method: 'cash',
    petpooja_bill_number: ''
  });

  useEffect(() => {
    fetchOrders();
    fetchOutlets();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await axios.get(`${API}/orders/hold`);
      setOrders(response.data);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
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

  const getOutletName = (outletId) => {
    const outlet = outlets.find((o) => o.id === outletId);
    return outlet?.name || 'Unknown';
  };

  const openPaymentDialog = (order) => {
    setSelectedOrder(order);
    setPaymentData({
      amount: order.total_amount * 0.4, // Default to 40%
      payment_method: 'cash',
      petpooja_bill_number: ''
    });
    setPaymentDialog(true);
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const response = await axios.post(`${API}/payments`, {
        order_id: selectedOrder.id,
        ...paymentData
      });

      setSuccess(response.data.message);
      setPaymentDialog(false);
      fetchOrders(); // Refresh list
    } catch (error) {
      setError(error.response?.data?.detail || 'Payment recording failed');
    }
  };

  const handleDelete = async (orderId) => {
    if (!window.confirm('Are you sure you want to delete this order?')) return;

    try {
      await axios.delete(`${API}/orders/${orderId}`);
      setSuccess('Order deleted successfully');
      fetchOrders();
    } catch (error) {
      setError('Failed to delete order');
    }
  };

  const openViewDialog = (order) => {
    setSelectedOrder(order);
    setViewDialog(true);
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
        <div>
          <h2 className="text-3xl font-bold" style={{ color: '#e92587' }}>Hold Orders</h2>
          <p className="text-gray-600 mt-1">Orders pending payment</p>
        </div>

        {success && (
          <Alert>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Hold Orders ({orders.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No orders on hold. All orders have received payment!
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Outlet</TableHead>
                    <TableHead>Flavour</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Delivery Date</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.order_number}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{order.customer_info.name}</p>
                          <p className="text-sm text-gray-500">{order.customer_info.phone}</p>
                        </div>
                      </TableCell>
                      <TableCell>{getOutletName(order.outlet_id)}</TableCell>
                      <TableCell>{order.flavour}</TableCell>
                      <TableCell>{order.size_pounds} lbs</TableCell>
                      <TableCell>{order.delivery_date} {order.delivery_time}</TableCell>
                      <TableCell>
                        <span className="font-bold" style={{ color: '#e92587' }}>
                          ₹{order.total_amount.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            onClick={() => openViewDialog(order)}
                            variant="outline"
                            data-testid={`view-order-${order.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => openPaymentDialog(order)}
                            className="text-white"
                            style={{ backgroundColor: '#10b981' }}
                            data-testid={`pay-order-${order.id}`}
                          >
                            <DollarSign className="h-4 w-4 mr-1" />
                            Pay
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleDelete(order.id)}
                            variant="destructive"
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

        {/* Payment Dialog */}
        <Dialog open={paymentDialog} onOpenChange={setPaymentDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Payment</DialogTitle>
              <DialogDescription>
                Order #{selectedOrder?.order_number} - {selectedOrder?.customer_info.name}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handlePayment} className="space-y-4">
              <div className="space-y-2">
                <Label>Total Amount: ₹{selectedOrder?.total_amount.toFixed(2)}</Label>
                <p className="text-sm text-gray-500">
                  Minimum 40% required (₹{(selectedOrder?.total_amount * 0.4).toFixed(2)}) to move to manage orders
                </p>
              </div>

              <div className="space-y-2">
                <Label>Payment Amount (\u20b9) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max={selectedOrder?.total_amount}
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData({ ...paymentData, amount: parseFloat(e.target.value) })}
                  required
                  data-testid="payment-amount-input"
                />
              </div>

              <div className="space-y-2">
                <Label>Payment Method *</Label>
                <Select
                  value={paymentData.payment_method}
                  onValueChange={(value) => setPaymentData({ ...paymentData, payment_method: value })}
                >
                  <SelectTrigger data-testid="payment-method-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="online">Online Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>PetPooja Bill Number</Label>
                <Input
                  value={paymentData.petpooja_bill_number}
                  onChange={(e) => setPaymentData({ ...paymentData, petpooja_bill_number: e.target.value })}
                  placeholder="Optional"
                  data-testid="bill-number-input"
                />
              </div>

              <Button
                type="submit"
                className="w-full text-white"
                style={{ backgroundColor: '#e92587' }}
                data-testid="submit-payment-button"
              >
                Record Payment
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* View Dialog */}
        <Dialog open={viewDialog} onOpenChange={setViewDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Order Details - #{selectedOrder?.order_number}</DialogTitle>
            </DialogHeader>
            {selectedOrder && (
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Customer Information</h4>
                  <p><strong>Name:</strong> {selectedOrder.customer_info.name}</p>
                  <p><strong>Phone:</strong> {selectedOrder.customer_info.phone}</p>
                  {selectedOrder.customer_info.alternate_phone && (
                    <p><strong>Alt Phone:</strong> {selectedOrder.customer_info.alternate_phone}</p>
                  )}
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Cake Details</h4>
                  <p><strong>Flavour:</strong> {selectedOrder.flavour}</p>
                  <p><strong>Size:</strong> {selectedOrder.size_pounds} pounds</p>
                  {selectedOrder.occasion && <p><strong>Occasion:</strong> {selectedOrder.occasion}</p>}
                  {selectedOrder.name_on_cake && <p><strong>Name on Cake:</strong> {selectedOrder.name_on_cake}</p>}
                </div>

                {selectedOrder.needs_delivery && (
                  <div>
                    <h4 className="font-semibold mb-2">Delivery Information</h4>
                    <p><strong>Address:</strong> {selectedOrder.delivery_address}</p>
                    <p><strong>City:</strong> {selectedOrder.delivery_city}</p>
                  </div>
                )}

                <div>
                  <h4 className="font-semibold mb-2">Cake Image</h4>
                  <img
                    src={`${BACKEND_URL}${selectedOrder.cake_image_url}`}
                    alt="Cake"
                    className="w-64 h-64 object-cover rounded"
                  />
                </div>

                {selectedOrder.special_instructions && (
                  <div>
                    <h4 className="font-semibold mb-2">Special Instructions</h4>
                    <p className="whitespace-pre-wrap">{selectedOrder.special_instructions}</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </LayoutWithSidebar>
  );
};

export default HoldOrders;
