import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ChefHat, Clock, User, Calendar, Package, MessageSquare, Upload, CheckCircle, AlertCircle, Play, Volume2, LogOut } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const KitchenDashboardNew = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [outlets, setOutlets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  const [markReadyModalOpen, setMarkReadyModalOpen] = useState(false);
  const [selectedOutlet, setSelectedOutlet] = useState('');
  
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  useEffect(() => {
    fetchOrders();
    fetchOutlets();
    
    // Auto-refresh every 30 seconds
    let interval;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchOrders();
      }, 30000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      const today = new Date().toISOString().split('T')[0];
      
      // Use kitchen-specific endpoint with authentication
      const response = await axios.get(`${API}/kitchen/orders`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      // Orders are already filtered by date from backend, just sort by delivery time
      const todayOrders = response.data.sort((a, b) => {
        const timeA = a.delivery_time || '23:59';
        const timeB = b.delivery_time || '23:59';
        return timeA.localeCompare(timeB);
      });
      
      setOrders(todayOrders);
      
      // Set first order as current if not already set
      if (!currentOrder && todayOrders.length > 0) {
        setCurrentOrder(todayOrders[0]);
      } else if (currentOrder) {
        // Update current order if it still exists
        const updated = todayOrders.find(o => o.id === currentOrder.id);
        if (updated) {
          setCurrentOrder(updated);
        } else if (todayOrders.length > 0) {
          setCurrentOrder(todayOrders[0]);
        } else {
          setCurrentOrder(null);
        }
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      setError('Failed to load orders. Please try again.');
      setLoading(false);
    }
  };

  const fetchOutlets = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/outlets`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setOutlets(response.data);
    } catch (error) {
      console.error('Failed to fetch outlets:', error);
    }
  };

  const handleOrderSelect = (order) => {
    setCurrentOrder(order);
  };

  const handleMarkReady = () => {
    if (!currentOrder) return;
    if (currentOrder.is_ready) {
      setError('Order is already marked as ready');
      return;
    }
    setMarkReadyModalOpen(true);
  };

  const confirmMarkReady = async () => {
    if (!selectedOutlet) {
      setError('Please select a branch to transfer the order');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      
      // Kitchen only marks ready - photo upload done by counter person later
      await axios.post(
        `${API}/orders/${currentOrder.id}/mark-ready?transfer_to_outlet_id=${selectedOutlet}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      setMarkReadyModalOpen(false);
      setSelectedOutlet('');
      setSuccess('Order marked as ready and transferred! Counter person will upload photo.');
      
      fetchOrders();
      setTimeout(() => setSuccess(''), 5000);
    } catch (error) {
      console.error('Failed to mark order as ready:', error);
      setError(error.response?.data?.detail || 'Failed to mark order as ready');
      setTimeout(() => setError(''), 5000);
    }
  };

  const playVoiceInstruction = (url) => {
    const audio = new Audio(`${BACKEND_URL}${url}`);
    audio.play();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <ChefHat className="h-12 w-12 mx-auto mb-4 text-pink-600 animate-pulse" />
            <p className="text-lg">Loading kitchen orders...</p>
          </div>
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ChefHat className="h-6 w-6" style={{ color: '#e92587' }} />
            Kitchen Dashboard
          </h1>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="flex items-center gap-2"
            data-testid="kitchen-logout-btn"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
        <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 100px)' }}>
          <Card className="max-w-md">
            <CardContent className="pt-6 text-center">
              <ChefHat className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h2 className="text-2xl font-bold mb-2">No Orders for Today</h2>
              <p className="text-gray-600">Check back later or view other dates</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="h-screen flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ChefHat className="h-6 w-6" style={{ color: '#e92587' }} />
              Kitchen Dashboard
            </h1>
            <p className="text-sm text-gray-600">
              {orders.length} orders for today • Auto-refresh: {autoRefresh ? 'ON' : 'OFF'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              {autoRefresh ? 'Disable' : 'Enable'} Auto-refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchOrders}
            >
              Refresh Now
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <Alert className="mb-4 bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}
        {error && (
          <Alert className="mb-4 bg-red-50 border-red-200">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Main Content: 80/20 Split */}
        <div className="flex-1 flex gap-4 overflow-hidden">
          {/* 80% - Current Order Details */}
          <div className="w-4/5 overflow-y-auto">
            {currentOrder && (
              <Card className="h-full">
                <CardHeader className="bg-gradient-to-r from-pink-600 to-pink-500 text-white">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-2xl mb-2">
                        Order #{currentOrder.order_number}
                      </CardTitle>
                      <div className="flex gap-4 text-sm">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {currentOrder.delivery_date}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {currentOrder.delivery_time}
                        </span>
                      </div>
                    </div>
                    <Badge className="bg-white text-pink-600 text-lg px-4 py-2">
                      {currentOrder.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-2 gap-6">
                    {/* Left Column - Cake Image */}
                    <div>
                      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        <Package className="h-5 w-5 text-pink-600" />
                        Cake Reference
                      </h3>
                      {currentOrder.cake_image_url ? (
                        <img
                          src={currentOrder.cake_image_url.startsWith('http') 
                            ? currentOrder.cake_image_url 
                            : `${BACKEND_URL}${currentOrder.cake_image_url}`}
                          alt="Cake"
                          className="w-full rounded-lg border-4 border-pink-200 shadow-lg"
                        />
                      ) : (
                        <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                          <p className="text-gray-400">No image provided</p>
                        </div>
                      )}
                      
                      {/* Secondary Images */}
                      {currentOrder.secondary_images && currentOrder.secondary_images.length > 0 && (
                        <div className="mt-4">
                          <p className="text-sm font-medium mb-2">Additional References:</p>
                          <div className="grid grid-cols-3 gap-2">
                            {currentOrder.secondary_images.map((img, idx) => (
                              <img
                                key={idx}
                                src={img.startsWith('http') ? img : `${BACKEND_URL}${img}`}
                                alt={`Reference ${idx + 1}`}
                                className="w-full h-24 object-cover rounded border-2 border-gray-200"
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right Column - Details */}
                    <div className="space-y-4">
                      {/* Customer Info */}
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h3 className="font-semibold flex items-center gap-2 mb-2">
                          <User className="h-5 w-5 text-blue-600" />
                          Customer Details
                        </h3>
                        <p className="text-lg font-bold">{currentOrder.customer_info?.name}</p>
                        <p className="text-gray-600">{currentOrder.customer_info?.phone}</p>
                      </div>

                      {/* Cake Details */}
                      <div className="bg-pink-50 p-4 rounded-lg">
                        <h3 className="font-semibold mb-3" style={{ color: '#e92587' }}>
                          Cake Specifications
                        </h3>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Flavour:</span>
                            <span className="font-semibold">{currentOrder.flavour}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Size:</span>
                            <span className="font-semibold">{currentOrder.size_pounds} lbs</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Occasion:</span>
                            <span className="font-semibold">{currentOrder.occasion}</span>
                          </div>
                          {currentOrder.name_on_cake && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Name on Cake:</span>
                              <span className="font-semibold text-pink-600">
                                "{currentOrder.name_on_cake}"
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Special Instructions */}
                      {currentOrder.special_instructions && (
                        <div className="bg-yellow-50 p-4 rounded-lg border-2 border-yellow-200">
                          <h3 className="font-semibold flex items-center gap-2 mb-2">
                            <MessageSquare className="h-5 w-5 text-yellow-600" />
                            Special Instructions
                          </h3>
                          <p className="text-sm">{currentOrder.special_instructions}</p>
                        </div>
                      )}

                      {/* Voice Instruction */}
                      {currentOrder.voice_instruction_url && (
                        <div className="bg-purple-50 p-4 rounded-lg border-2 border-purple-200">
                          <h3 className="font-semibold flex items-center gap-2 mb-2">
                            <Volume2 className="h-5 w-5 text-purple-600" />
                            Voice Instruction
                          </h3>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => playVoiceInstruction(currentOrder.voice_instruction_url)}
                            className="w-full"
                          >
                            <Play className="h-4 w-4 mr-2" />
                            Play Voice Message
                          </Button>
                        </div>
                      )}

                      {/* Mark Ready Button */}
                      <Button
                        onClick={handleMarkReady}
                        className="w-full bg-green-600 hover:bg-green-700 text-white py-6 text-lg"
                        disabled={currentOrder.status === 'ready'}
                      >
                        <CheckCircle className="h-5 w-5 mr-2" />
                        {currentOrder.status === 'ready' ? 'Already Marked Ready' : 'Mark as Ready'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* 20% - Orders List Sidebar */}
          <div className="w-1/5 overflow-y-auto">
            <Card className="h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">
                  Orders for Today ({orders.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-2">
                  {orders.map((order, index) => (
                    <div
                      key={order.id}
                      onClick={() => handleOrderSelect(order)}
                      className={`p-3 cursor-pointer border-b transition-colors ${
                        currentOrder?.id === order.id
                          ? 'bg-pink-50 border-l-4 border-l-pink-600'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs" style={{ color: '#e92587' }}>
                          #{index + 1}
                        </span>
                        <span className="text-xs font-semibold">{order.delivery_time}</span>
                      </div>
                      <p className="text-sm font-medium truncate">{order.customer_info?.name}</p>
                      <p className="text-xs text-gray-600 truncate">
                        {order.flavour} • {order.size_pounds}lbs
                      </p>
                      <Badge variant="outline" className="mt-1 text-xs">
                        {order.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Mark Ready Modal */}
        <Dialog open={markReadyModalOpen} onOpenChange={setMarkReadyModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Mark Order as Ready</DialogTitle>
              <DialogDescription>
                Select the branch where this order will be transferred. Counter person at that branch will upload the cake photo.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Transfer to Branch</Label>
                <Select value={selectedOutlet} onValueChange={setSelectedOutlet}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select branch" />
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
              <Button onClick={confirmMarkReady} className="w-full" style={{ backgroundColor: '#e92587' }}>
                Mark as Ready & Transfer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default KitchenDashboardNew;
