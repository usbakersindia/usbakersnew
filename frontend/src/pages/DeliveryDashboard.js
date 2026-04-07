import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Truck, MapPin, Phone, User, Clock, Package,
  CheckCircle, LogOut, Navigation, RefreshCw, DollarSign, CreditCard
} from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const DeliveryDashboard = () => {
  const { token, user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('available');
  const [availableOrders, setAvailableOrders] = useState([]);
  const [myOrders, setMyOrders] = useState([]);

  const getImageUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    if (url.startsWith('/uploads/')) return `${API_URL}/api${url}`;
    return `${API_URL}${url}`;
  };
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(null);

  const fetchOrders = useCallback(async () => {
    try {
      const [availRes, myRes] = await Promise.all([
        axios.get(`${API_URL}/api/delivery/available-orders`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/api/delivery/my-orders`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      setAvailableOrders(availRes.data);
      setMyOrders(myRes.data);
    } catch (err) {
      console.error('Failed to fetch delivery orders:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 15000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const acceptOrder = async (orderId) => {
    setAccepting(orderId);
    try {
      await axios.post(`${API_URL}/api/delivery/accept-order/${orderId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchOrders();
      setActiveTab('my');
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to accept order');
    } finally {
      setAccepting(null);
    }
  };

  const updateDeliveryStatus = async (orderId, status) => {
    try {
      await axios.patch(`${API_URL}/api/orders/${orderId}/status`, 
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchOrders();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update status');
    }
  };

  const handleLogout = () => {
    logout();
  };

  const OrderCard = ({ order, type }) => {
    const pendingAmount = (order.total_amount || 0) - (order.paid_amount || 0);
    const isPaid = pendingAmount <= 0;
    
    return (
      <Card className="mb-3 border-l-4" style={{ borderLeftColor: type === 'available' ? '#06b6d4' : '#8b5cf6' }}>
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-3">
            <div>
              <span className="font-bold text-lg" data-testid={`order-num-${order.order_number}`}>#{order.order_number}</span>
              <Badge className="ml-2 text-xs" variant="outline">
                {order.status === 'ready_to_deliver' ? 'Ready' : order.status === 'picked_up' ? 'Picked Up' : order.status}
              </Badge>
            </div>
            <span className="text-sm text-gray-500">
              <Clock className="h-3 w-3 inline mr-1" />
              {order.delivery_time}
            </span>
          </div>

          {/* Payment Status Banner */}
          <div className={`rounded-lg p-3 mb-3 flex items-center justify-between ${isPaid ? 'bg-green-50 border border-green-200' : 'bg-orange-50 border border-orange-200'}`}
               data-testid={`payment-status-${order.id}`}>
            <div className="flex items-center gap-2">
              {isPaid ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <CreditCard className="h-5 w-5 text-orange-600" />
              )}
              <div>
                <p className={`font-bold text-sm ${isPaid ? 'text-green-700' : 'text-orange-700'}`}>
                  {isPaid ? 'FULLY PAID' : 'PAYMENT PENDING'}
                </p>
                <p className="text-xs text-gray-600">
                  Total: Rs.{(order.total_amount || 0).toFixed(2)}
                  {!isPaid && ` | Paid: Rs.${(order.paid_amount || 0).toFixed(2)}`}
                </p>
              </div>
            </div>
            {!isPaid && (
              <div className="text-right">
                <p className="font-bold text-orange-700 text-lg" data-testid={`pending-amount-${order.id}`}>
                  Rs.{pendingAmount.toFixed(2)}
                </p>
                <p className="text-xs text-orange-600">To Collect</p>
              </div>
            )}
          </div>

          {/* Customer Address - Prominent */}
          {order.delivery_address && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3" data-testid={`delivery-address-${order.id}`}>
              <div className="flex items-start gap-2">
                <MapPin className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-blue-700 mb-1">DELIVERY ADDRESS</p>
                  <p className="text-sm font-medium">{order.delivery_address}</p>
                  {order.delivery_city && <p className="text-xs text-gray-500">{order.delivery_city}</p>}
                  {order.zone_name && <p className="text-xs text-gray-400">Zone: {order.zone_name}</p>}
                </div>
                <a 
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.delivery_address || '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-blue-600 text-white p-2 rounded-lg flex-shrink-0"
                >
                  <Navigation className="h-4 w-4" />
                </a>
              </div>
            </div>
          )}

          {/* Cake Photo */}
          {order.actual_cake_image_url && (
            <div className="mb-3">
              <img 
                src={getImageUrl(order.actual_cake_image_url)}
                alt="Cake" 
                className="w-full h-40 object-cover rounded-lg"
              />
            </div>
          )}

          {/* Customer Info */}
          <div className="space-y-2 mb-3">
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-gray-400" />
              <span className="font-medium">{order.customer_info?.name}</span>
            </div>
            {order.customer_info?.phone && (
              <a href={`tel:${order.customer_info.phone}`} className="flex items-center gap-2 text-sm text-blue-600">
                <Phone className="h-4 w-4" />
                {order.customer_info.phone}
              </a>
            )}
          </div>

          {/* Order details */}
          <div className="bg-gray-50 rounded-lg p-3 mb-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-500">Flavour</span>
              <span className="font-medium">{order.flavour}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Size</span>
              <span className="font-medium">{order.size_pounds} Pounds</span>
            </div>
            {order.name_on_cake && (
              <div className="flex justify-between">
                <span className="text-gray-500">Message</span>
                <span className="font-medium">{order.name_on_cake}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">Date</span>
              <span className="font-medium">{order.delivery_date}</span>
            </div>
          </div>

          {/* Special Instructions */}
          {order.special_instructions && (
            <div className="bg-yellow-50 rounded-lg p-3 mb-3 border border-yellow-200">
              <p className="text-xs font-semibold text-yellow-700 mb-1">Instructions</p>
              <ul className="list-disc list-inside text-sm space-y-0.5">
                {order.special_instructions.split('\n').filter(l => l.trim()).map((line, i) => (
                  <li key={i}>{line.trim()}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Buttons */}
          {type === 'available' && (
            <Button
              className="w-full bg-cyan-600 hover:bg-cyan-700 text-white"
              onClick={() => acceptOrder(order.id)}
              disabled={accepting === order.id}
              data-testid={`accept-order-btn-${order.id}`}
            >
              {accepting === order.id ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              {accepting === order.id ? 'Accepting...' : 'Accept Order'}
            </Button>
          )}

          {type === 'my' && order.status === 'picked_up' && (
            <div className="flex gap-2">
              <a 
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.delivery_address || '')}`}
                target="_blank"
                rel="noreferrer"
                className="flex-1"
              >
                <Button variant="outline" className="w-full text-blue-600 border-blue-300">
                  <Navigation className="h-4 w-4 mr-2" />
                  Navigate
                </Button>
              </a>
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                onClick={() => updateDeliveryStatus(order.id, 'delivered')}
                data-testid={`mark-delivered-btn-${order.id}`}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Delivered
              </Button>
            </div>
          )}

          {type === 'my' && order.status === 'delivered' && (
            <div className="text-center py-2 text-green-600 font-medium text-sm">
              <CheckCircle className="h-4 w-4 inline mr-1" />
              Delivered Successfully
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-cyan-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" style={{ maxWidth: '480px', margin: '0 auto' }}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b px-4 py-3 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2">
          <Truck className="h-5 w-5" style={{ color: '#e92587' }} />
          <span className="font-bold text-lg">Delivery</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{user?.name}</span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleLogout}
            data-testid="delivery-logout-btn"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex bg-white border-b">
        <button
          onClick={() => setActiveTab('available')}
          className={`flex-1 py-3 text-center text-sm font-medium relative ${
            activeTab === 'available' ? 'text-cyan-600' : 'text-gray-500'
          }`}
          data-testid="tab-available-orders"
        >
          <Package className="h-4 w-4 inline mr-1" />
          Available ({availableOrders.length})
          {activeTab === 'available' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-600" />}
        </button>
        <button
          onClick={() => setActiveTab('my')}
          className={`flex-1 py-3 text-center text-sm font-medium relative ${
            activeTab === 'my' ? 'text-purple-600' : 'text-gray-500'
          }`}
          data-testid="tab-my-orders"
        >
          <Truck className="h-4 w-4 inline mr-1" />
          My Orders ({myOrders.length})
          {activeTab === 'my' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600" />}
        </button>
      </div>

      {/* Order List */}
      <div className="p-3">
        {activeTab === 'available' && (
          <>
            {availableOrders.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <Package className="h-12 w-12 mx-auto mb-3" />
                <p className="font-medium">No orders available</p>
                <p className="text-sm mt-1">New orders will appear here in real-time</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={fetchOrders}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            ) : (
              availableOrders.map(order => (
                <OrderCard key={order.id} order={order} type="available" />
              ))
            )}
          </>
        )}

        {activeTab === 'my' && (
          <>
            {myOrders.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <Truck className="h-12 w-12 mx-auto mb-3" />
                <p className="font-medium">No accepted orders</p>
                <p className="text-sm mt-1">Accept an available order to get started</p>
              </div>
            ) : (
              myOrders.map(order => (
                <OrderCard key={order.id} order={order} type="my" />
              ))
            )}
          </>
        )}
      </div>

      {/* Floating refresh button */}
      <button
        onClick={fetchOrders}
        className="fixed bottom-6 right-6 bg-cyan-600 text-white p-3 rounded-full shadow-lg hover:bg-cyan-700 active:scale-95 transition-all"
        data-testid="refresh-orders-btn"
      >
        <RefreshCw className="h-5 w-5" />
      </button>
    </div>
  );
};

export default DeliveryDashboard;
