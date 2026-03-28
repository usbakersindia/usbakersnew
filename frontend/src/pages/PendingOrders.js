import { useState, useEffect } from 'react';
import axios from 'axios';
import LayoutWithSidebar from '../components/LayoutWithSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, DollarSign, User, MapPin, CreditCard } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PendingOrders = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingOrders();
    fetchSettings();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchPendingOrders();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchPendingOrders = async () => {
    try {
      const response = await axios.get(`${API}/orders/pending`);
      setOrders(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch pending orders:', error);
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${API}/system-settings`);
      setSettings(response.data);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    }
  };
  
  const markAsCredit = async (orderId) => {
    if (!window.confirm('Mark this order as Credit Order? It will bypass payment threshold.')) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API}/orders/${orderId}/mark-credit`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchPendingOrders(); // Refresh list
      alert('Order marked as credit successfully!');
    } catch (error) {
      console.error('Failed to mark as credit:', error);
      alert('Failed to mark order as credit');
    }
  };

  const calculatePaymentPercentage = (paid, total) => {
    if (total === 0) return 0;
    return ((paid / total) * 100).toFixed(1);
  };

  const getPaymentStatusColor = (percentage, threshold) => {
    if (percentage >= threshold) return 'bg-green-100 text-green-800 border-green-300';
    if (percentage >= threshold * 0.8) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-red-100 text-red-800 border-red-300';
  };

  if (loading) {
    return (
      <LayoutWithSidebar>
        <div className="flex items-center justify-center h-screen">
          <div className="text-lg">Loading pending orders...</div>
        </div>
      </LayoutWithSidebar>
    );
  }

  const threshold = settings?.minimum_payment_percentage || 20;

  return (
    <LayoutWithSidebar>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold" style={{ color: '#e92587' }}>Pending Orders</h1>
          <p className="text-gray-600 mt-1">
            Orders waiting for {threshold}% payment to move to Manage Orders
          </p>
        </div>

        {/* Stats Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Pending Orders</p>
                <p className="text-3xl font-bold">{orders.length}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Payment Threshold</p>
                <p className="text-3xl font-bold text-blue-600">{threshold}%</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Auto-refresh</p>
                <p className="text-sm font-medium text-green-600">Every 30 seconds</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Orders List */}
        {orders.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Clock className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">No pending orders</p>
              <p className="text-sm text-gray-500 mt-2">All punch orders have met the payment threshold</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {orders.map((order) => {
              const paymentPercentage = calculatePaymentPercentage(
                order.paid_amount || 0,
                order.total_amount
              );
              const statusColor = getPaymentStatusColor(paymentPercentage, threshold);

              return (
                <Card key={order.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">
                        {order.order_number}
                      </CardTitle>
                      <Badge className={statusColor}>
                        {paymentPercentage}%
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Customer Info */}
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">{order.customer_info?.name}</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {order.customer_info?.phone}
                    </div>

                    {/* Delivery Info */}
                    {order.needs_delivery && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="h-4 w-4" />
                        <span className="truncate">{order.delivery_address}</span>
                      </div>
                    )}

                    {/* Payment Info */}
                    <div className="pt-3 border-t space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Total Amount:</span>
                        <span className="font-semibold">₹{order.total_amount}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Paid:</span>
                        <span className="font-semibold text-green-600">
                          ₹{order.paid_amount || 0}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Pending:</span>
                        <span className="font-semibold text-red-600">
                          ₹{order.pending_amount || order.total_amount}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-gray-600">
                        <span>Payment Progress</span>
                        <span>{paymentPercentage}% / {threshold}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            parseFloat(paymentPercentage) >= threshold
                              ? 'bg-green-500'
                              : parseFloat(paymentPercentage) >= threshold * 0.8
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(paymentPercentage, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Delivery Date */}
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="h-4 w-4" />
                      <span>
                        {order.delivery_date} at {order.delivery_time}
                      </span>
                    </div>

                    {/* Status Message */}
                    {parseFloat(paymentPercentage) >= threshold ? (
                      <div className="text-xs text-green-600 font-medium">
                        ✓ Ready to move to Manage Orders on next payment sync
                      </div>
                    ) : (
                      <div className="text-xs text-gray-600">
                        Needs ₹{(order.total_amount * threshold / 100 - (order.paid_amount || 0)).toFixed(2)} more
                      </div>
                    )}
                    
                    {/* Mark as Credit Button - Super Admin Only */}
                    {user?.role === 'super_admin' && (
                      <Button
                        onClick={() => markAsCredit(order.id)}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white mt-3"
                        size="sm"
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        Mark as Credit Order
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </LayoutWithSidebar>
  );
};

export default PendingOrders;