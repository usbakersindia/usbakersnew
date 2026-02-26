import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import LayoutWithSidebar from '../components/LayoutWithSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Package,
  CheckCircle,
  Clock,
  Truck,
  Star,
  Edit,
  Printer,
  DollarSign,
  XCircle,
  Calendar,
  Search
} from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const STATUS_CONFIG = {
  confirmed: {
    label: 'Confirmed',
    color: 'bg-blue-500',
    icon: CheckCircle,
    nextStatus: 'ready'
  },
  ready: {
    label: 'Ready',
    color: 'bg-green-500',
    icon: Clock,
    nextStatus: 'picked_up'
  },
  picked_up: {
    label: 'Out for Delivery',
    color: 'bg-purple-500',
    icon: Truck,
    nextStatus: 'delivered'
  },
  reached: {
    label: 'Reached',
    color: 'bg-indigo-500',
    icon: Truck
  },
  delivered: {
    label: 'Delivered',
    color: 'bg-green-600',
    icon: Star
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-red-500',
    icon: XCircle
  }
};

const ManageOrders = () => {
  const { token } = useAuth();
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('all');

  // Payment form
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_method: 'cash'
  });

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchTerm, statusFilter, activeTab, orders]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/orders/manage`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
      setMessage({ type: 'error', text: 'Failed to fetch orders' });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...orders];

    // Tab filter
    if (activeTab !== 'all') {
      filtered = filtered.filter(order => order.status === activeTab);
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(order =>
        order.order_number?.toLowerCase().includes(term) ||
        order.customer_info?.name?.toLowerCase().includes(term) ||
        order.customer_info?.phone?.toLowerCase().includes(term)
      );
    }

    setFilteredOrders(filtered);
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      await axios.patch(
        `${API_URL}/api/orders/${orderId}/status?status=${newStatus}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setMessage({ type: 'success', text: `Order status updated to ${STATUS_CONFIG[newStatus].label}` });
      fetchOrders();
    } catch (error) {
      console.error('Error updating status:', error);
      setMessage({ type: 'error', text: 'Failed to update order status' });
    }
  };

  const handleViewOrder = (order) => {
    setSelectedOrder(order);
    setDialogOpen(true);
  };

  const handleAddPayment = (order) => {
    setSelectedOrder(order);
    setPaymentForm({
      amount: Math.max(0, order.total_amount - order.paid_amount).toString(),
      payment_method: 'cash'
    });
    setPaymentDialogOpen(true);
  };

  const submitPayment = async () => {
    try {
      await axios.post(
        `${API_URL}/api/payments`,
        {
          order_id: selectedOrder.id,
          amount: parseFloat(paymentForm.amount),
          payment_method: paymentForm.payment_method
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setMessage({ type: 'success', text: 'Payment recorded successfully' });
      setPaymentDialogOpen(false);
      fetchOrders();
    } catch (error) {
      console.error('Error recording payment:', error);
      setMessage({ type: 'error', text: 'Failed to record payment' });
    }
  };

  const handlePrintKOT = (order) => {
    // Open print window with KOT
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>KOT - ${order.order_number}</title>
          <style>
            body { font-family: 'Courier New', monospace; padding: 20px; max-width: 300px; }
            .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
            .header h1 { margin: 0; font-size: 24px; }
            .header h2 { margin: 5px 0; font-size: 18px; }
            .section { margin: 15px 0; }
            .section-title { font-weight: bold; font-size: 14px; text-decoration: underline; }
            .item { margin: 5px 0; }
            .footer { text-align: center; border-top: 2px dashed #000; padding-top: 10px; margin-top: 20px; }
            .qr-code { text-align: center; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>US BAKERS</h1>
            <h2>Kitchen Order Ticket</h2>
            <p><strong>Order #${order.order_number}</strong></p>
            <p>${new Date().toLocaleString()}</p>
          </div>
          
          <div class="section">
            <div class="section-title">Customer Details:</div>
            <div class="item">Name: ${order.customer_info?.name || 'N/A'}</div>
            <div class="item">Phone: ${order.customer_info?.phone || 'N/A'}</div>
          </div>
          
          <div class="section">
            <div class="section-title">Order Details:</div>
            <div class="item">Flavour: ${order.flavour || 'N/A'}</div>
            <div class="item">Size: ${order.size_pounds} lbs</div>
            <div class="item">Name on Cake: ${order.name_on_cake || 'None'}</div>
            ${order.occasion ? `<div class="item">Occasion: ${order.occasion}</div>` : ''}
          </div>
          
          <div class="section">
            <div class="section-title">Delivery Information:</div>
            <div class="item">Date: ${order.delivery_date}</div>
            <div class="item">Time: ${order.delivery_time}</div>
            ${order.needs_delivery ? `<div class="item">Address: ${order.delivery_address}</div>` : '<div class="item">Type: Self Pickup</div>'}
          </div>
          
          ${order.special_instructions ? `
          <div class="section">
            <div class="section-title">Special Instructions:</div>
            <div class="item">${order.special_instructions}</div>
          </div>
          ` : ''}
          
          <div class="footer">
            <div class="qr-code">
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${order.order_number}" alt="QR Code" />
            </div>
            <p><strong>Amount: ₹${order.total_amount.toFixed(2)}</strong></p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const getStatusBadge = (status) => {
    const config = STATUS_CONFIG[status];
    if (!config) return null;
    
    const Icon = config.icon;
    return (
      <Badge className={`${config.color} text-white`}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <LayoutWithSidebar>
        <div className="flex items-center justify-center h-screen">
          <div className="text-lg">Loading orders...</div>
        </div>
      </LayoutWithSidebar>
    );
  }

  return (
    <LayoutWithSidebar>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold" style={{ color: '#e92587' }}>Manage Orders</h1>
          <p className="text-gray-600 mt-1">Track and manage all bakery orders</p>
        </div>

        {message.text && (
          <Alert className={message.type === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
            <AlertDescription className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}>
              {message.text}
            </AlertDescription>
          </Alert>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="search">Search</Label>
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Order #, Customer name, Phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="status-filter">Filter by Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                    setActiveTab('all');
                  }}
                  className="w-full"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="all">All ({orders.length})</TabsTrigger>
            <TabsTrigger value="confirmed">
              Confirmed ({orders.filter(o => o.status === 'confirmed').length})
            </TabsTrigger>
            <TabsTrigger value="ready">
              Ready ({orders.filter(o => o.status === 'ready').length})
            </TabsTrigger>
            <TabsTrigger value="picked_up">
              Delivery ({orders.filter(o => o.status === 'picked_up').length})
            </TabsTrigger>
            <TabsTrigger value="delivered">
              Delivered ({orders.filter(o => o.status === 'delivered').length})
            </TabsTrigger>
            <TabsTrigger value="cancelled">
              Cancelled ({orders.filter(o => o.status === 'cancelled').length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Orders ({filteredOrders.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order #</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Delivery</TableHead>
                        <TableHead>Details</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOrders.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                            No orders found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredOrders.map((order) => (
                          <TableRow key={order.id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center space-x-2">
                                <Package className="h-4 w-4 text-gray-400" />
                                <span>{order.order_number}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{order.customer_info?.name}</div>
                                <div className="text-sm text-gray-500">{order.customer_info?.phone}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-1 text-sm">
                                <Calendar className="h-3 w-3" />
                                <span>{order.delivery_date}</span>
                              </div>
                              <div className="text-sm text-gray-500">{order.delivery_time}</div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <div>{order.flavour} - {order.size_pounds} lbs</div>
                                {order.name_on_cake && (
                                  <div className="text-gray-500">"{order.name_on_cake}"</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <div className="font-bold" style={{ color: '#e92587' }}>
                                  ₹{order.total_amount.toFixed(2)}
                                </div>
                                <div className="text-gray-500">
                                  Paid: ₹{order.paid_amount.toFixed(2)}
                                </div>
                                {order.pending_amount > 0 && (
                                  <div className="text-orange-600 font-semibold">
                                    Due: ₹{order.pending_amount.toFixed(2)}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{getStatusBadge(order.status)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end space-x-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleViewOrder(order)}
                                  title="View Details"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handlePrintKOT(order)}
                                  title="Print KOT"
                                >
                                  <Printer className="h-4 w-4" />
                                </Button>
                                {order.pending_amount > 0 && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleAddPayment(order)}
                                    title="Add Payment"
                                  >
                                    <DollarSign className="h-4 w-4" />
                                  </Button>
                                )}
                                {STATUS_CONFIG[order.status]?.nextStatus && (
                                  <Button
                                    size="sm"
                                    style={{ backgroundColor: '#e92587' }}
                                    className="text-white"
                                    onClick={() => handleStatusUpdate(order.id, STATUS_CONFIG[order.status].nextStatus)}
                                    title={`Mark as ${STATUS_CONFIG[STATUS_CONFIG[order.status].nextStatus].label}`}
                                  >
                                    {STATUS_CONFIG[STATUS_CONFIG[order.status].nextStatus].icon && (
                                      <STATUS_CONFIG[STATUS_CONFIG[order.status].nextStatus].icon className="h-4 w-4" />
                                    )}
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Order Details Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Order Details - {selectedOrder?.order_number}</DialogTitle>
            </DialogHeader>
            {selectedOrder && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Customer Name</Label>
                    <div className="font-medium mt-1">{selectedOrder.customer_info?.name}</div>
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <div className="font-medium mt-1">{selectedOrder.customer_info?.phone}</div>
                  </div>
                  <div>
                    <Label>Delivery Date</Label>
                    <div className="font-medium mt-1">{selectedOrder.delivery_date}</div>
                  </div>
                  <div>
                    <Label>Delivery Time</Label>
                    <div className="font-medium mt-1">{selectedOrder.delivery_time}</div>
                  </div>
                  <div>
                    <Label>Flavour</Label>
                    <div className="font-medium mt-1">{selectedOrder.flavour}</div>
                  </div>
                  <div>
                    <Label>Size</Label>
                    <div className="font-medium mt-1">{selectedOrder.size_pounds} lbs</div>
                  </div>
                  {selectedOrder.name_on_cake && (
                    <div className="col-span-2">
                      <Label>Name on Cake</Label>
                      <div className="font-medium mt-1">{selectedOrder.name_on_cake}</div>
                    </div>
                  )}
                  {selectedOrder.occasion && (
                    <div>
                      <Label>Occasion</Label>
                      <div className="font-medium mt-1">{selectedOrder.occasion}</div>
                    </div>
                  )}
                  <div>
                    <Label>Status</Label>
                    <div className="mt-1">{getStatusBadge(selectedOrder.status)}</div>
                  </div>
                </div>

                {selectedOrder.special_instructions && (
                  <div>
                    <Label>Special Instructions</Label>
                    <div className="mt-1 p-3 bg-gray-50 rounded border">
                      {selectedOrder.special_instructions}
                    </div>
                  </div>
                )}

                <div className="border-t pt-4">
                  <Label>Payment Information</Label>
                  <div className="mt-2 space-y-2">
                    <div className="flex justify-between">
                      <span>Total Amount:</span>
                      <span className="font-bold">₹{selectedOrder.total_amount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Paid Amount:</span>
                      <span className="font-bold text-green-600">₹{selectedOrder.paid_amount.toFixed(2)}</span>
                    </div>
                    {selectedOrder.pending_amount > 0 && (
                      <div className="flex justify-between">
                        <span>Pending Amount:</span>
                        <span className="font-bold text-orange-600">₹{selectedOrder.pending_amount.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Payment Dialog */}
        <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Payment - {selectedOrder?.order_number}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="amount">Amount *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  placeholder="Enter amount"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="payment-method">Payment Method *</Label>
                <Select
                  value={paymentForm.payment_method}
                  onValueChange={(value) => setPaymentForm({ ...paymentForm, payment_method: value })}
                >
                  <SelectTrigger className="mt-1">
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
              <Button
                onClick={submitPayment}
                className="w-full text-white"
                style={{ backgroundColor: '#e92587' }}
              >
                Record Payment
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </LayoutWithSidebar>
  );
};

export default ManageOrders;
