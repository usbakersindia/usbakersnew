import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ChefHat, Clock, User, Calendar, Package, MessageSquare, Upload, CheckCircle, AlertCircle, Play, Volume2, LogOut, Timer, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const KitchenDashboardNew = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [outlets, setOutlets] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
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

  const fetchOrders = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/kitchen/orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const sortedOrders = response.data.sort((a, b) => {
        const statusOrder = { 'confirmed': 0, 'in_progress': 1, 'ready': 2, 'ready_to_deliver': 3 };
        return (statusOrder[a.status] || 0) - (statusOrder[b.status] || 0);
      });
      setOrders(sortedOrders);
      if (currentOrder) {
        const updated = sortedOrders.find(o => o.id === currentOrder.id);
        if (updated) setCurrentOrder(updated);
      }
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
      setLoading(false);
    }
  }, [currentOrder]);

  const fetchOutlets = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/outlets`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOutlets(response.data);
    } catch (err) {
      console.error('Failed to fetch outlets:', err);
    }
  };

  const fetchTimeSlots = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/time-slots`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTimeSlots(response.data);
    } catch (err) {
      console.error('Failed to fetch time slots:', err);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchOutlets();
    fetchTimeSlots();
    let interval;
    if (autoRefresh) {
      interval = setInterval(fetchOrders, 15000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [autoRefresh]);

  const playVoiceInstruction = (url) => {
    const fullUrl = url.startsWith('http') ? url : `${BACKEND_URL}${url}`;
    const audio = new Audio(fullUrl);
    audio.play().catch(err => console.error('Audio playback failed:', err));
  };

  // Start Preparing - changes status to in_progress
  const handleStartPreparing = async (order) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${API}/orders/${order.id}/status`, 
        { status: 'in_progress' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCurrentOrder({ ...order, status: 'in_progress' });
      setSuccess('Order preparation started!');
      fetchOrders();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to start preparing');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleOrderSelect = (order) => {
    if (order.status === 'confirmed') {
      handleStartPreparing(order);
    } else {
      setCurrentOrder(order);
    }
  };

  const handleMarkReady = () => {
    setMarkReadyModalOpen(true);
  };

  const confirmMarkReady = async () => {
    try {
      const token = localStorage.getItem('token');
      const updateData = { status: 'ready', is_ready: true };
      if (selectedOutlet) {
        updateData.transfer_to_outlet_id = selectedOutlet;
      }
      await axios.patch(`${API}/orders/${currentOrder.id}/status`, updateData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMarkReadyModalOpen(false);
      setSelectedOutlet('');
      setSuccess('Order marked as Ready!');
      fetchOrders();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to mark ready');
      setTimeout(() => setError(''), 3000);
    }
  };

  // Group orders by time slots
  const getTimeSlotForOrder = (order) => {
    const orderTime = order.delivery_time || '';
    for (const slot of timeSlots) {
      const slotRange = slot.time_slot; // e.g. "05:00 PM - 07:00 PM"
      const parts = slotRange.split(' - ');
      if (parts.length === 2) {
        const slotStart = parseTimeTo24(parts[0].trim());
        const slotEnd = parseTimeTo24(parts[1].trim());
        const orderT = parseTimeTo24(orderTime);
        if (orderT !== null && slotStart !== null && slotEnd !== null) {
          if (orderT >= slotStart && orderT < slotEnd) {
            return slot.time_slot;
          }
        }
      }
      // Also match if order's delivery_time exactly matches the slot
      if (orderTime === slotRange || orderTime.includes(slotRange)) {
        return slot.time_slot;
      }
    }
    return orderTime || 'Unslotted';
  };

  const parseTimeTo24 = (timeStr) => {
    if (!timeStr) return null;
    const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!match) return null;
    let hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const period = match[3].toUpperCase();
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };

  const groupedOrders = () => {
    const groups = {};
    orders.forEach(order => {
      const slot = getTimeSlotForOrder(order);
      if (!groups[slot]) groups[slot] = [];
      groups[slot].push(order);
    });
    // Sort slots by time
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      const tA = parseTimeTo24(a.split(' - ')[0]) || 0;
      const tB = parseTimeTo24(b.split(' - ')[0]) || 0;
      return tA - tB;
    });
    return sortedKeys.map(key => ({ slot: key, orders: groups[key] }));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'bg-blue-100 border-blue-300 text-blue-700';
      case 'in_progress': return 'bg-orange-100 border-orange-300 text-orange-700';
      case 'ready': return 'bg-green-100 border-green-400 text-green-700';
      case 'ready_to_deliver': return 'bg-emerald-100 border-emerald-400 text-emerald-700';
      default: return 'bg-gray-100 border-gray-300 text-gray-700';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'confirmed': return 'Waiting';
      case 'in_progress': return 'Preparing';
      case 'ready': return 'Ready';
      case 'ready_to_deliver': return 'Dispatched';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin" style={{ color: '#e92587' }} />
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
          <Button variant="outline" size="sm" onClick={handleLogout} data-testid="kitchen-logout-btn">
            <LogOut className="h-4 w-4 mr-2" /> Logout
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

  const preparingCount = orders.filter(o => o.status === 'in_progress').length;
  const readyCount = orders.filter(o => o.status === 'ready' || o.status === 'ready_to_deliver').length;
  const waitingCount = orders.filter(o => o.status === 'confirmed').length;

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
            <div className="flex gap-4 mt-1">
              <Badge variant="outline" className="bg-blue-50 text-blue-700">{waitingCount} Waiting</Badge>
              <Badge variant="outline" className="bg-orange-50 text-orange-700">{preparingCount} Preparing</Badge>
              <Badge variant="outline" className="bg-green-50 text-green-700">{readyCount} Ready</Badge>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setAutoRefresh(!autoRefresh)}>
              {autoRefresh ? 'Pause' : 'Resume'} Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={fetchOrders}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout} data-testid="kitchen-logout-btn">
              <LogOut className="h-4 w-4 mr-2" /> Logout
            </Button>
          </div>
        </div>

        {success && (
          <Alert className="mb-3 bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}
        {error && (
          <Alert className="mb-3 bg-red-50 border-red-200">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Main Content */}
        <div className="flex-1 flex gap-4 overflow-hidden">
          {/* Left - Order Details (75%) */}
          <div className="w-3/4 overflow-y-auto">
            {currentOrder ? (
              <Card className="h-full">
                <CardHeader className={`py-4 ${currentOrder.status === 'ready' ? 'bg-green-600 text-white' : 'bg-gradient-to-r from-pink-600 to-pink-500 text-white'}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-2xl mb-1">
                        Order #{currentOrder.order_number}
                      </CardTitle>
                      <div className="flex gap-4 text-sm opacity-90">
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
                    <Badge className="bg-white text-lg px-4 py-2" style={{ color: currentOrder.status === 'ready' ? '#16a34a' : '#e92587' }}>
                      {getStatusLabel(currentOrder.status)}
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
                          src={currentOrder.cake_image_url.startsWith('http') ? currentOrder.cake_image_url : `${BACKEND_URL}${currentOrder.cake_image_url}`}
                          alt="Cake"
                          className="w-full rounded-lg border-4 border-pink-200 shadow-lg"
                        />
                      ) : (
                        <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                          <p className="text-gray-400">No image provided</p>
                        </div>
                      )}
                      {currentOrder.secondary_images && currentOrder.secondary_images.length > 0 && (
                        <div className="mt-4">
                          <p className="text-sm font-medium mb-2">Additional References:</p>
                          <div className="grid grid-cols-3 gap-2">
                            {currentOrder.secondary_images.map((img, idx) => (
                              <img key={idx} src={img.startsWith('http') ? img : `${BACKEND_URL}${img}`} alt={`Ref ${idx + 1}`} className="w-full h-24 object-cover rounded border-2 border-gray-200" />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right Column - Details */}
                    <div className="space-y-4">
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h3 className="font-semibold flex items-center gap-2 mb-2">
                          <User className="h-5 w-5 text-blue-600" /> Customer
                        </h3>
                        <p className="text-lg font-bold">{currentOrder.customer_info?.name}</p>
                        <p className="text-gray-600">{currentOrder.customer_info?.phone}</p>
                      </div>

                      <div className="bg-pink-50 p-4 rounded-lg">
                        <h3 className="font-semibold mb-3" style={{ color: '#e92587' }}>Cake Specifications</h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between"><span className="text-gray-600">Flavour:</span><span className="font-semibold">{currentOrder.flavour}</span></div>
                          <div className="flex justify-between"><span className="text-gray-600">Size:</span><span className="font-semibold">{currentOrder.size_pounds} Pounds</span></div>
                          <div className="flex justify-between"><span className="text-gray-600">Occasion:</span><span className="font-semibold">{currentOrder.occasion}</span></div>
                          {currentOrder.name_on_cake && (
                            <div className="flex justify-between"><span className="text-gray-600">Message:</span><span className="font-semibold text-pink-600">"{currentOrder.name_on_cake}"</span></div>
                          )}
                        </div>
                      </div>

                      {currentOrder.special_instructions && (
                        <div className="bg-yellow-50 p-4 rounded-lg border-2 border-yellow-200">
                          <h3 className="font-semibold flex items-center gap-2 mb-2">
                            <MessageSquare className="h-5 w-5 text-yellow-600" /> Instructions
                          </h3>
                          <ul className="list-disc list-inside space-y-1">
                            {currentOrder.special_instructions.split('\n').filter(l => l.trim()).map((line, idx) => (
                              <li key={idx} className="text-sm">{line.trim()}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {currentOrder.voice_instruction_url && (
                        <div className="bg-purple-50 p-4 rounded-lg border-2 border-purple-200">
                          <h3 className="font-semibold flex items-center gap-2 mb-2">
                            <Volume2 className="h-5 w-5 text-purple-600" /> Voice Instruction
                          </h3>
                          <audio controls src={currentOrder.voice_instruction_url.startsWith('http') ? currentOrder.voice_instruction_url : `${BACKEND_URL}${currentOrder.voice_instruction_url}`} className="w-full" />
                        </div>
                      )}

                      {/* Action Button based on status */}
                      {currentOrder.status === 'in_progress' && (
                        <Button onClick={handleMarkReady} className="w-full bg-green-600 hover:bg-green-700 text-white py-6 text-lg" data-testid="mark-ready-btn">
                          <CheckCircle className="h-5 w-5 mr-2" /> Mark as Ready
                        </Button>
                      )}
                      {currentOrder.status === 'ready' && (
                        <div className="text-center py-4 bg-green-50 rounded-lg border-2 border-green-300">
                          <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                          <p className="font-bold text-green-700 text-lg">Order Ready</p>
                          <p className="text-sm text-green-600">Waiting for counter to dispatch</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center text-gray-400">
                  <ChefHat className="h-16 w-16 mx-auto mb-4" />
                  <p className="text-xl font-medium">Select an order to view details</p>
                  <p className="text-sm mt-2">Click "Start Preparing" on a waiting order</p>
                </div>
              </div>
            )}
          </div>

          {/* Right - Orders List grouped by Time Slots (25%) */}
          <div className="w-1/4 overflow-y-auto">
            <Card className="h-full">
              <CardHeader className="pb-2 sticky top-0 bg-white z-10 border-b">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Timer className="h-4 w-4" />
                  Orders by Time Slot ({orders.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {groupedOrders().map((group) => (
                  <div key={group.slot} className="border-b last:border-b-0">
                    <div className="bg-gray-100 px-3 py-2 sticky top-12 z-5">
                      <p className="text-xs font-bold text-gray-700 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {group.slot}
                        <Badge variant="outline" className="ml-auto text-xs">{group.orders.length}</Badge>
                      </p>
                    </div>
                    {group.orders.map((order) => (
                      <div
                        key={order.id}
                        onClick={() => {
                          if (order.status === 'confirmed') {
                            handleStartPreparing(order);
                          } else {
                            setCurrentOrder(order);
                          }
                        }}
                        className={`p-3 cursor-pointer border-b transition-all ${
                          currentOrder?.id === order.id ? 'border-l-4 border-l-pink-600 bg-pink-50' : 'hover:bg-gray-50'
                        } ${order.status === 'ready' || order.status === 'ready_to_deliver' ? 'bg-green-50' : ''}`}
                        data-testid={`kitchen-order-${order.id}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-sm">#{order.order_number}</span>
                          <Badge className={`text-xs ${getStatusColor(order.status)}`}>
                            {getStatusLabel(order.status)}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium truncate">{order.customer_info?.name}</p>
                        <p className="text-xs text-gray-500">{order.flavour} - {order.size_pounds} Pounds</p>
                        {order.status === 'confirmed' && (
                          <Button size="sm" className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white text-xs" data-testid={`start-preparing-${order.id}`}>
                            <Timer className="h-3 w-3 mr-1" /> Start Preparing
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Mark Ready Modal */}
        <Dialog open={markReadyModalOpen} onOpenChange={setMarkReadyModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Mark Order as Ready</DialogTitle>
              <DialogDescription>Select the branch where this order will be dispatched from.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Transfer to Branch</Label>
                <Select value={selectedOutlet} onValueChange={setSelectedOutlet}>
                  <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                  <SelectContent>
                    {outlets.map((outlet) => (
                      <SelectItem key={outlet.id} value={outlet.id}>{outlet.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={confirmMarkReady} className="w-full text-white" style={{ backgroundColor: '#e92587' }}>
                Mark as Ready
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default KitchenDashboardNew;
