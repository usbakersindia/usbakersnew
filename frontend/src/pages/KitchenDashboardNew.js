import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChefHat, Clock, Calendar, Package, MessageSquare, Volume2, LogOut, Timer, RefreshCw, CheckCircle, AlertCircle, User } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const KitchenDashboardNew = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [timeSlots, setTimeSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  const fetchOrders = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/kitchen/orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const sorted = response.data.sort((a, b) => {
        const order = { 'confirmed': 0, 'in_progress': 1, 'ready': 2, 'ready_to_deliver': 3 };
        return (order[a.status] || 0) - (order[b.status] || 0);
      });
      setOrders(sorted);
      if (currentOrder) {
        const updated = sorted.find(o => o.id === currentOrder.id);
        if (updated) setCurrentOrder(updated);
      }
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
      setLoading(false);
    }
  }, []);

  const fetchTimeSlots = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API}/time-slots`, { headers: { Authorization: `Bearer ${token}` } });
      setTimeSlots(res.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    fetchOrders();
    fetchTimeSlots();
    const interval = setInterval(fetchOrders, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleStartPreparing = async (order) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${API}/orders/${order.id}/status`,
        { status: 'in_progress' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCurrentOrder({ ...order, status: 'in_progress' });
      setSuccess('Started preparing!');
      fetchOrders();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleMarkReady = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${API}/orders/${currentOrder.id}/status`,
        { status: 'ready', is_ready: true },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess('Order marked Ready!');
      fetchOrders();
      setCurrentOrder(null);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed');
      setTimeout(() => setError(''), 3000);
    }
  };

  const getImageUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    if (url.startsWith('/uploads/')) return `${BACKEND_URL}/api${url}`;
    return `${BACKEND_URL}${url}`;
  };

  const parseTimeTo24 = (timeStr) => {
    if (!timeStr) return null;
    const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!match) return null;
    let h = parseInt(match[1]);
    const m = parseInt(match[2]);
    const p = match[3].toUpperCase();
    if (p === 'PM' && h !== 12) h += 12;
    if (p === 'AM' && h === 12) h = 0;
    return h * 60 + m;
  };

  const getTimeSlotForOrder = (order) => {
    const t = order.delivery_time || '';
    for (const slot of timeSlots) {
      const parts = slot.time_slot.split(' - ');
      if (parts.length === 2) {
        const s = parseTimeTo24(parts[0].trim());
        const e = parseTimeTo24(parts[1].trim());
        const o = parseTimeTo24(t);
        if (o !== null && s !== null && e !== null && o >= s && o < e) return slot.time_slot;
      }
      if (t === slot.time_slot || t.includes(slot.time_slot)) return slot.time_slot;
    }
    return t || 'Unslotted';
  };

  const groupedOrders = () => {
    const groups = {};
    orders.forEach(order => {
      const slot = getTimeSlotForOrder(order);
      if (!groups[slot]) groups[slot] = [];
      groups[slot].push(order);
    });
    return Object.keys(groups).sort((a, b) => {
      const tA = parseTimeTo24(a.split(' - ')[0]) || 0;
      const tB = parseTimeTo24(b.split(' - ')[0]) || 0;
      return tA - tB;
    }).map(key => ({ slot: key, orders: groups[key] }));
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'confirmed': return <Badge className="bg-blue-100 text-blue-700 border-blue-300 text-xs">Waiting</Badge>;
      case 'in_progress': return <Badge className="bg-orange-100 text-orange-700 border-orange-300 text-xs">Preparing</Badge>;
      case 'ready': return <Badge className="bg-green-100 text-green-700 border-green-400 text-xs">Ready</Badge>;
      default: return <Badge className="bg-gray-100 text-gray-700 text-xs">{status}</Badge>;
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
            <ChefHat className="h-6 w-6" style={{ color: '#e92587' }} /> Kitchen Dashboard
          </h1>
          <Button variant="outline" size="sm" onClick={handleLogout} data-testid="kitchen-logout-btn">
            <LogOut className="h-4 w-4 mr-2" /> Logout
          </Button>
        </div>
        <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 100px)' }}>
          <Card className="max-w-md"><CardContent className="pt-6 text-center">
            <ChefHat className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <h2 className="text-2xl font-bold mb-2">No Orders for Today</h2>
            <p className="text-gray-600">Check back later</p>
          </CardContent></Card>
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
              <ChefHat className="h-6 w-6" style={{ color: '#e92587' }} /> Kitchen Dashboard
            </h1>
            <div className="flex gap-3 mt-1">
              <Badge variant="outline" className="bg-blue-50 text-blue-700">{waitingCount} Waiting</Badge>
              <Badge variant="outline" className="bg-orange-50 text-orange-700">{preparingCount} Preparing</Badge>
              <Badge variant="outline" className="bg-green-50 text-green-700">{readyCount} Ready</Badge>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchOrders}><RefreshCw className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" onClick={handleLogout} data-testid="kitchen-logout-btn">
              <LogOut className="h-4 w-4 mr-2" /> Logout
            </Button>
          </div>
        </div>

        {success && <Alert className="mb-3 bg-green-50 border-green-200"><CheckCircle className="h-4 w-4 text-green-600" /><AlertDescription>{success}</AlertDescription></Alert>}
        {error && <Alert className="mb-3 bg-red-50 border-red-200"><AlertCircle className="h-4 w-4 text-red-600" /><AlertDescription>{error}</AlertDescription></Alert>}

        <div className="flex-1 flex gap-4 overflow-hidden">
          {/* Left Panel - Order Details */}
          <div className="w-3/4 overflow-y-auto">
            {currentOrder ? (
              <Card className="h-full">
                <CardHeader className={`py-4 ${currentOrder.status === 'ready' ? 'bg-green-600 text-white' : 'bg-gradient-to-r from-pink-600 to-pink-500 text-white'}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-2xl mb-1">Order #{currentOrder.order_number}</CardTitle>
                      <div className="flex gap-4 text-sm opacity-90">
                        <span className="flex items-center gap-1"><Calendar className="h-4 w-4" />{currentOrder.delivery_date}</span>
                        <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{currentOrder.delivery_time}</span>
                        {currentOrder.order_taken_by && <span className="flex items-center gap-1"><User className="h-4 w-4" />Taken by: {currentOrder.order_taken_by}</span>}
                      </div>
                    </div>
                    <Badge className="bg-white text-lg px-4 py-2" style={{ color: currentOrder.status === 'ready' ? '#16a34a' : '#e92587' }}>
                      {currentOrder.status === 'in_progress' ? 'Preparing' : currentOrder.status === 'ready' ? 'Ready' : 'Waiting'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-2 gap-6">
                    {/* Left - Images */}
                    <div>
                      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        <Package className="h-5 w-5 text-pink-600" /> Cake Reference
                      </h3>
                      {currentOrder.cake_image_url ? (
                        <img src={getImageUrl(currentOrder.cake_image_url)} alt="Cake" className="w-full rounded-lg border-4 border-pink-200 shadow-lg" onError={(e) => { e.target.style.display = 'none'; }} />
                      ) : (
                        <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center"><p className="text-gray-400">No image</p></div>
                      )}
                      {currentOrder.secondary_images && currentOrder.secondary_images.length > 0 && (
                        <div className="mt-3">
                          <p className="text-sm font-medium mb-2">Additional Images:</p>
                          <div className="grid grid-cols-3 gap-2">
                            {currentOrder.secondary_images.map((img, i) => (
                              <img key={i} src={getImageUrl(img)} alt={`Ref ${i+1}`} className="w-full h-20 object-cover rounded border" />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right - Details */}
                    <div className="space-y-4">
                      <div className="bg-pink-50 p-4 rounded-lg">
                        <h3 className="font-semibold mb-2" style={{ color: '#e92587' }}>Cake Details</h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between"><span className="text-gray-600">Flavour:</span><span className="font-semibold">{currentOrder.flavour}</span></div>
                          <div className="flex justify-between"><span className="text-gray-600">Size:</span><span className="font-semibold">{currentOrder.size_pounds} Pounds</span></div>
                          <div className="flex justify-between"><span className="text-gray-600">Occasion:</span><span className="font-semibold">{currentOrder.occasion}</span></div>
                          {currentOrder.name_on_cake && (
                            <div className="flex justify-between"><span className="text-gray-600">Name on Cake:</span><span className="font-bold text-pink-600">"{currentOrder.name_on_cake}"</span></div>
                          )}
                        </div>
                      </div>

                      {currentOrder.special_instructions && (
                        <div className="bg-yellow-50 p-4 rounded-lg border-2 border-yellow-200">
                          <h3 className="font-semibold flex items-center gap-2 mb-2">
                            <MessageSquare className="h-5 w-5 text-yellow-600" /> Instructions
                          </h3>
                          <ul className="list-disc list-inside space-y-1">
                            {currentOrder.special_instructions.split('\n').filter(l => l.trim()).map((line, i) => (
                              <li key={i} className="text-sm">{line.trim()}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {currentOrder.voice_instruction_url && (
                        <div className="bg-purple-50 p-4 rounded-lg border-2 border-purple-200">
                          <h3 className="font-semibold flex items-center gap-2 mb-2">
                            <Volume2 className="h-5 w-5 text-purple-600" /> Voice Instruction
                          </h3>
                          <audio controls src={getImageUrl(currentOrder.voice_instruction_url)} className="w-full" />
                        </div>
                      )}

                      {currentOrder.status === 'in_progress' && (
                        <Button onClick={handleMarkReady} className="w-full bg-green-600 hover:bg-green-700 text-white py-6 text-lg" data-testid="mark-ready-btn">
                          <CheckCircle className="h-5 w-5 mr-2" /> Mark as Ready
                        </Button>
                      )}
                      {currentOrder.status === 'ready' && (
                        <div className="text-center py-4 bg-green-50 rounded-lg border-2 border-green-300">
                          <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                          <p className="font-bold text-green-700 text-lg">Order Ready</p>
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
                  <p className="text-sm mt-2">Click "Start Preparing" or tap an order</p>
                </div>
              </div>
            )}
          </div>

          {/* Right - Order List by Time Slots */}
          <div className="w-1/4 overflow-y-auto">
            <Card className="h-full">
              <CardHeader className="pb-2 sticky top-0 bg-white z-10 border-b">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Timer className="h-4 w-4" /> Orders ({orders.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {groupedOrders().map((group) => (
                  <div key={group.slot} className="border-b last:border-b-0">
                    <div className="bg-gray-100 px-3 py-2">
                      <p className="text-xs font-bold text-gray-700 flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {group.slot}
                        <Badge variant="outline" className="ml-auto text-xs">{group.orders.length}</Badge>
                      </p>
                    </div>
                    {group.orders.map((order) => (
                      <div
                        key={order.id}
                        onClick={() => {
                          if (order.status !== 'confirmed') setCurrentOrder(order);
                        }}
                        className={`p-3 cursor-pointer border-b transition-all ${
                          currentOrder?.id === order.id ? 'border-l-4 border-l-pink-600 bg-pink-50' : 'hover:bg-gray-50'
                        } ${order.status === 'ready' ? 'bg-green-50' : ''}`}
                        data-testid={`kitchen-order-${order.id}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-sm">#{order.order_number}</span>
                          {getStatusBadge(order.status)}
                        </div>
                        <p className="text-xs text-gray-500">{order.flavour} - {order.size_pounds} Lbs</p>
                        {order.name_on_cake && <p className="text-xs text-pink-600 font-medium">"{order.name_on_cake}"</p>}
                        {order.status === 'confirmed' && (
                          <Button size="sm" className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white text-xs"
                            onClick={(e) => { e.stopPropagation(); handleStartPreparing(order); }}
                            data-testid={`start-preparing-${order.id}`}>
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
      </div>
    </div>
  );
};

export default KitchenDashboardNew;
