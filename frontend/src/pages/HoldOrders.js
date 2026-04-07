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
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DollarSign, Trash2, Eye, Edit, Send } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const HoldOrders = () => {
  const [orders, setOrders] = useState([]);
  const [outlets, setOutlets] = useState([]);
  const [zones, setZones] = useState([]);
  const [salesPersons, setSalesPersons] = useState([]);
  const [flavours, setFlavours] = useState([]);
  const [occasions, setOccasions] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paymentDialog, setPaymentDialog] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [viewDialog, setViewDialog] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editFormData, setEditFormData] = useState(null);

  const [paymentData, setPaymentData] = useState({
    amount: 0,
    payment_method: 'cash',
    petpooja_bill_number: ''
  });

  useEffect(() => {
    fetchOrders();
    fetchOutlets();
    fetchFlavours();
    fetchOccasions();
    fetchTimeSlots();
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

  const fetchFlavours = async () => {
    try {
      const response = await axios.get(`${API}/flavours`);
      setFlavours(response.data);
    } catch (error) {
      console.error('Failed to fetch flavours:', error);
    }
  };

  const fetchOccasions = async () => {
    try {
      const response = await axios.get(`${API}/occasions`);
      setOccasions(response.data);
    } catch (error) {
      console.error('Failed to fetch occasions:', error);
    }
  };

  const fetchTimeSlots = async () => {
    try {
      const response = await axios.get(`${API}/time-slots`);
      setTimeSlots(response.data);
    } catch (error) {
      console.error('Failed to fetch time slots:', error);
    }
  };

  const fetchZonesForOutlet = async (outletId) => {
    try {
      const response = await axios.get(`${API}/zones?outlet_id=${outletId}`);
      setZones(response.data);
    } catch (error) {
      console.error('Failed to fetch zones:', error);
    }
  };

  const fetchSalesPersonsForOutlet = async (outletId) => {
    try {
      const response = await axios.get(`${API}/sales-persons?outlet_id=${outletId}`);
      setSalesPersons(response.data);
    } catch (error) {
      console.error('Failed to fetch sales persons:', error);
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

  const openEditDialog = (order) => {
    setSelectedOrder(order);
    setEditFormData({
      customer_info: { ...order.customer_info },
      receiver_info: order.receiver_info ? { ...order.receiver_info } : null,
      delivery_address: order.delivery_address || '',
      delivery_city: order.delivery_city || '',
      zone_id: order.zone_id || '',
      occasion: order.occasion || '',
      flavour: order.flavour,
      size_pounds: order.size_pounds,
      name_on_cake: order.name_on_cake || '',
      special_instructions: order.special_instructions || '',
      delivery_date: order.delivery_date,
      delivery_time: order.delivery_time,
      outlet_id: order.outlet_id,
      order_taken_by: order.order_taken_by,
      total_amount: order.total_amount,
      needs_delivery: order.needs_delivery
    });
    fetchZonesForOutlet(order.outlet_id);
    fetchSalesPersonsForOutlet(order.outlet_id);
    setEditDialog(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${API}/orders/${selectedOrder.id}`, editFormData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess('Order updated successfully!');
      setEditDialog(false);
      fetchOrders();
    } catch (error) {
      setError(error.response?.data?.detail || 'Failed to update order');
    }
  };

  const handleReleaseOrder = async () => {
    if (!window.confirm('Release this order to Pending Orders? This will make it available for payment processing.')) return;

    try {
      const token = localStorage.getItem('token');
      // Update order to move it out of hold
      await axios.patch(`${API}/orders/${selectedOrder.id}`, {
        ...editFormData,
        is_hold: false
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess('Order released to Pending Orders successfully!');
      setEditDialog(false);
      fetchOrders();
    } catch (error) {
      setError(error.response?.data?.detail || 'Failed to release order');
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
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => openEditDialog(order)}
                            className="text-white"
                            style={{ backgroundColor: '#e92587' }}
                            title="Edit Order"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleDelete(order.id)}
                            variant="destructive"
                            title="Delete Order"
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
                    src={selectedOrder.cake_image_url?.startsWith('http') ? selectedOrder.cake_image_url : `${BACKEND_URL}${selectedOrder.cake_image_url?.startsWith('/uploads/') ? '/api' + selectedOrder.cake_image_url : selectedOrder.cake_image_url}`}
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

        {/* Edit Dialog */}
        <Dialog open={editDialog} onOpenChange={setEditDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Order - #{selectedOrder?.order_number}</DialogTitle>
              <DialogDescription>
                Update order details and release to Pending Orders when ready
              </DialogDescription>
            </DialogHeader>
            {editFormData && (
              <form onSubmit={handleEditSubmit} className="space-y-6">
                {/* Customer Information */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-lg">Customer Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Customer Name *</Label>
                      <Input
                        value={editFormData.customer_info.name}
                        onChange={(e) => setEditFormData({
                          ...editFormData,
                          customer_info: { ...editFormData.customer_info, name: e.target.value }
                        })}
                        required
                      />
                    </div>
                    <div>
                      <Label>Phone *</Label>
                      <Input
                        value={editFormData.customer_info.phone}
                        onChange={(e) => setEditFormData({
                          ...editFormData,
                          customer_info: { ...editFormData.customer_info, phone: e.target.value }
                        })}
                        required
                      />
                    </div>
                    <div>
                      <Label>Alternate Phone</Label>
                      <Input
                        value={editFormData.customer_info.alternate_phone || ''}
                        onChange={(e) => setEditFormData({
                          ...editFormData,
                          customer_info: { ...editFormData.customer_info, alternate_phone: e.target.value }
                        })}
                      />
                    </div>
                    <div>
                      <Label>Birthday</Label>
                      <Input
                        type="date"
                        value={editFormData.customer_info.birthday || ''}
                        onChange={(e) => setEditFormData({
                          ...editFormData,
                          customer_info: { ...editFormData.customer_info, birthday: e.target.value }
                        })}
                      />
                    </div>
                  </div>
                </div>

                {/* Cake Details */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-lg">Cake Details</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Flavour *</Label>
                      <Select
                        value={editFormData.flavour}
                        onValueChange={(value) => setEditFormData({ ...editFormData, flavour: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {flavours.map((f) => (
                            <SelectItem key={f.id} value={f.name}>{f.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Size (Pounds) *</Label>
                      <Input
                        type="number"
                        step="0.5"
                        min="0.5"
                        value={editFormData.size_pounds}
                        onChange={(e) => setEditFormData({ ...editFormData, size_pounds: parseFloat(e.target.value) })}
                        required
                      />
                    </div>
                    <div>
                      <Label>Occasion</Label>
                      <Select
                        value={editFormData.occasion}
                        onValueChange={(value) => setEditFormData({ ...editFormData, occasion: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select occasion" />
                        </SelectTrigger>
                        <SelectContent>
                          {occasions.map((o) => (
                            <SelectItem key={o.id} value={o.name}>{o.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Name on Cake</Label>
                      <Input
                        value={editFormData.name_on_cake}
                        onChange={(e) => setEditFormData({ ...editFormData, name_on_cake: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Special Instructions</Label>
                    <Textarea
                      value={editFormData.special_instructions}
                      onChange={(e) => setEditFormData({ ...editFormData, special_instructions: e.target.value })}
                      placeholder="Add any special instructions"
                      rows={3}
                    />
                  </div>
                </div>

                {/* Delivery Information */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-lg">Delivery Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Delivery Date *</Label>
                      <Input
                        type="date"
                        value={editFormData.delivery_date}
                        onChange={(e) => setEditFormData({ ...editFormData, delivery_date: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label>Delivery Time Slot *</Label>
                      <Select
                        value={editFormData.delivery_time}
                        onValueChange={(value) => setEditFormData({ ...editFormData, delivery_time: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {timeSlots.map((slot) => (
                            <SelectItem key={slot.id} value={slot.time_slot}>
                              {slot.time_slot}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {editFormData.needs_delivery && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <Label>Delivery Address *</Label>
                        <Input
                          value={editFormData.delivery_address}
                          onChange={(e) => setEditFormData({ ...editFormData, delivery_address: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label>City *</Label>
                        <Input
                          value={editFormData.delivery_city}
                          onChange={(e) => setEditFormData({ ...editFormData, delivery_city: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label>Zone</Label>
                        <Select
                          value={editFormData.zone_id}
                          onValueChange={(value) => setEditFormData({ ...editFormData, zone_id: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select zone" />
                          </SelectTrigger>
                          <SelectContent>
                            {zones.map((zone) => (
                              <SelectItem key={zone.id} value={zone.id}>
                                {zone.name} - ₹{zone.delivery_charge}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Order Details */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-lg">Order Details</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Outlet *</Label>
                      <Select
                        value={editFormData.outlet_id}
                        onValueChange={(value) => {
                          setEditFormData({ ...editFormData, outlet_id: value });
                          fetchZonesForOutlet(value);
                          fetchSalesPersonsForOutlet(value);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
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
                    <div>
                      <Label>Order Taken By *</Label>
                      <Select
                        value={editFormData.order_taken_by}
                        onValueChange={(value) => setEditFormData({ ...editFormData, order_taken_by: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {salesPersons.map((person) => (
                            <SelectItem key={person.id} value={person.id}>
                              {person.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Total Amount (₹) *</Label>
                      <Input
                        type="number"
                        min="0"
                        value={editFormData.total_amount}
                        onChange={(e) => setEditFormData({ ...editFormData, total_amount: parseFloat(e.target.value) })}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="outline"
                    className="border-blue-600 text-blue-600 hover:bg-blue-50"
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Save Changes
                  </Button>
                  <Button
                    type="button"
                    onClick={handleReleaseOrder}
                    className="text-white"
                    style={{ backgroundColor: '#10b981' }}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Save & Release Order
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </LayoutWithSidebar>
  );
};

export default HoldOrders;
