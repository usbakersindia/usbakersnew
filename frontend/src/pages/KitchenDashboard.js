import { useEffect, useState } from 'react';
import axios from 'axios';
import LayoutWithSidebar from '../components/LayoutWithSidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, Clock, Filter, Download, Mic } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const KitchenDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [realtimeOrders, setRealtimeOrders] = useState([]);
  const [todayOrders, setTodayOrders] = useState([]);
  const [summary, setSummary] = useState(null);
  const [outlets, setOutlets] = useState([]);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('realtime');
  
  // Filters
  const [filters, setFilters] = useState({
    date: new Date().toISOString().split('T')[0],
    outlet_id: '',
    status: '',
    size: '',
    flavour: ''
  });

  useEffect(() => {
    fetchOutlets();
    fetchOrders();
    fetchSummary();
  }, [filters]);

  const fetchOutlets = async () => {
    try {
      const response = await axios.get(`${API}/outlets`);
      setOutlets(response.data);
    } catch (error) {
      console.error('Failed to fetch outlets:', error);
    }
  };

  const fetchOrders = async () => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      
      const response = await axios.get(`${API}/kitchen/orders?${params}`);
      const allOrders = response.data;
      setOrders(allOrders);
      
      // Split orders into realtime (delivery today) and today's orders
      const today = new Date().toISOString().split('T')[0];
      const now = new Date();
      
      // Realtime: Orders for delivery today that haven't been delivered yet
      const realtime = allOrders.filter(order => {
        const deliveryDate = order.delivery_date?.split('T')[0];
        return deliveryDate === today && order.status !== 'delivered' && order.status !== 'cancelled';
      });
      
      // Today's orders: All orders created/scheduled for today
      const todayScheduled = allOrders.filter(order => {
        const deliveryDate = order.delivery_date?.split('T')[0];
        return deliveryDate === today;
      });
      
      setRealtimeOrders(realtime);
      setTodayOrders(todayScheduled);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    }
  };

  const fetchSummary = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.date) params.append('date', filters.date);
      if (filters.outlet_id) params.append('outlet_id', filters.outlet_id);
      
      const response = await axios.get(`${API}/kitchen/orders/summary?${params}`);
      setSummary(response.data);
    } catch (error) {
      console.error('Failed to fetch summary:', error);
    }
  };

  const toggleOrderSelection = (orderId) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const markSelectedAsReady = async () => {
    if (selectedOrders.length === 0) {
      alert('Please select orders to mark as ready');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/kitchen/orders/mark-ready`, {
        order_ids: selectedOrders
      });
      
      alert(`${selectedOrders.length} orders marked as ready!`);
      setSelectedOrders([]);
      fetchOrders();
      fetchSummary();
    } catch (error) {
      console.error('Failed to mark orders as ready:', error);
      alert('Failed to mark orders as ready');
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async (dateType) => {
    try {
      let date = '';
      const today = new Date();
      
      if (dateType === 'today') {
        date = today.toISOString().split('T')[0];
      } else if (dateType === 'tomorrow') {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        date = tomorrow.toISOString().split('T')[0];
      } else {
        // Custom date from filter
        date = filters.date;
      }
      
      const response = await axios.get(`${API}/orders/download-pdf?date=${date}`, {
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `orders_${date}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Failed to download PDF:', error);
      alert(error.response?.data?.detail || 'Failed to generate PDF');
    }
  };


  const generateBulkKOT = () => {
    if (selectedOrders.length === 0) {
      alert('Please select orders to generate KOT');
      return;
    }
    
    // Filter selected orders
    const ordersForKOT = orders.filter(o => selectedOrders.includes(o.id));
    
    // Generate print content
    const printContent = ordersForKOT.map(order => `
      <div style="page-break-after: always; padding: 20px; border: 2px solid #000; margin-bottom: 20px;">
        <h2 style="text-align: center;">US Bakers - KOT</h2>
        <hr/>
        <p><strong>Order #:</strong> ${order.order_number}</p>
        <p><strong>Delivery Date:</strong> ${order.delivery_date}</p>
        <p><strong>Delivery Time:</strong> ${order.delivery_time}</p>
        <hr/>
        <h3>Order Details:</h3>
        <p><strong>Flavour:</strong> ${order.flavour}</p>
        <p><strong>Size:</strong> ${order.size_pounds} lbs</p>
        <p><strong>Name on Cake:</strong> ${order.name_on_cake || 'N/A'}</p>
        <p><strong>Special Instructions:</strong> ${order.special_instructions || 'None'}</p>
        <hr/>
        <p><strong>Customer:</strong> ${order.customer_info?.name}</p>
        <p><strong>Phone:</strong> ${order.customer_info?.phone}</p>
      </div>
    `).join('');

    const printWindow = window.open('', '', 'height=600,width=800');
    printWindow.document.write('<html><head><title>Bulk KOT</title></head><body>');
    printWindow.document.write(printContent);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.print();
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      ready: 'bg-green-100 text-green-800',
      picked_up: 'bg-purple-100 text-purple-800',
      delivered: 'bg-green-500 text-white'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };


    const getImageUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    if (url.startsWith('/uploads/')) return `${API}/api${url}`;
    return `${API}${url}`;
  };

  const renderOrdersTable = (ordersList) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">
            <input 
              type="checkbox" 
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedOrders(ordersList.map(o => o.id));
                } else {
                  setSelectedOrders([]);
                }
              }}
              checked={selectedOrders.length === ordersList.length && ordersList.length > 0}
            />
          </TableHead>
          <TableHead>Order #</TableHead>
          <TableHead>Delivery</TableHead>
          <TableHead>Flavour</TableHead>
          <TableHead>Size</TableHead>
          <TableHead>Name on Cake</TableHead>
          <TableHead>Instructions</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Customer</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {ordersList.length === 0 ? (
          <TableRow>
            <TableCell colSpan={9} className="text-center text-gray-500">No orders found</TableCell>
          </TableRow>
        ) : (
          ordersList.map(order => (
            <TableRow key={order.id}>
              <TableCell>
                <input 
                  type="checkbox"
                  checked={selectedOrders.includes(order.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedOrders([...selectedOrders, order.id]);
                    } else {
                      setSelectedOrders(selectedOrders.filter(id => id !== order.id));
                    }
                  }}
                />
              </TableCell>
              <TableCell className="font-medium">
                <div className="flex items-center gap-1">
                  {order.order_number}
                  {order.voice_instruction_url && (
                    <Mic className="h-3.5 w-3.5 text-blue-500" title="Has voice instructions" />
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  <div>{new Date(order.delivery_date).toLocaleDateString()}</div>
                  <div className="text-gray-500">{order.delivery_time}</div>
                </div>
              </TableCell>
              <TableCell>{order.flavour}</TableCell>
              <TableCell>{order.size_pounds} lbs</TableCell>
              <TableCell>{order.name_on_cake || '-'}</TableCell>
              <TableCell>
                <div className="max-w-[200px]">
                  {order.special_instructions && (
                    <p className="text-xs text-gray-600 truncate" title={order.special_instructions}>
                      {order.special_instructions}
                    </p>
                  )}
                  {order.voice_instruction_url && (
                    <audio controls src={getImageUrl(order.voice_instruction_url)} className="w-full h-7 mt-1" />
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={order.status === 'ready' ? 'success' : 'default'}>
                  {order.status}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  <div>{order.customer_info.name}</div>
                  <div className="text-gray-500">{order.customer_info.phone}</div>
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  return (
    <LayoutWithSidebar>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Kitchen Dashboard</h1>
          <div className="flex gap-2">
            <Button 
              onClick={() => downloadPDF('today')} 
              variant="outline"
              className="border-pink-600 text-pink-600 hover:bg-pink-50"
            >
              <Download className="h-4 w-4 mr-2" />
              PDF Today
            </Button>
            <Button 
              onClick={() => downloadPDF('tomorrow')} 
              variant="outline"
              className="border-pink-600 text-pink-600 hover:bg-pink-50"
            >
              <Download className="h-4 w-4 mr-2" />
              PDF Tomorrow
            </Button>
            <Button onClick={generateBulkKOT} disabled={selectedOrders.length === 0} variant="outline">
              Generate Bulk KOT ({selectedOrders.length})
            </Button>
            <Button 
              onClick={markSelectedAsReady} 
              disabled={selectedOrders.length === 0 || loading}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Mark as Ready ({selectedOrders.length})
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.total_orders}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Pending Production</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{summary.pending_production}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Ready</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{summary.ready}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Picked Up</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">{summary.picked_up}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Delivered</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-600">{summary.delivered}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <Label>Date</Label>
                <Input 
                  type="date" 
                  value={filters.date}
                  onChange={(e) => setFilters({...filters, date: e.target.value})}
                />
              </div>
              <div>
                <Label>Outlet</Label>
                <Select value={filters.outlet_id || "all"} onValueChange={(value) => setFilters({...filters, outlet_id: value === "all" ? "" : value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Outlets" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Outlets</SelectItem>
                    {outlets.map(outlet => (
                      <SelectItem key={outlet.id} value={outlet.id}>{outlet.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={filters.status || "all"} onValueChange={(value) => setFilters({...filters, status: value === "all" ? "" : value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="ready">Ready</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Size (lbs)</Label>
                <Input 
                  type="number" 
                  placeholder="All sizes"
                  value={filters.size}
                  onChange={(e) => setFilters({...filters, size: e.target.value})}
                />
              </div>
              <div>
                <Label>Flavour</Label>
                <Input 
                  placeholder="All flavours"
                  value={filters.flavour}
                  onChange={(e) => setFilters({...filters, flavour: e.target.value})}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Orders Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="realtime">
              Real-time Orders ({realtimeOrders.length})
            </TabsTrigger>
            <TabsTrigger value="today">
              Orders for Day ({todayOrders.length})
            </TabsTrigger>
          </TabsList>

          {/* Real-time Orders Tab */}
          <TabsContent value="realtime">
            <Card>
              <CardHeader>
                <CardTitle>Real-time Orders (Delivery Today)</CardTitle>
              </CardHeader>
              <CardContent>
                {renderOrdersTable(realtimeOrders)}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Today's Orders Tab */}
          <TabsContent value="today">
            <Card>
              <CardHeader>
                <CardTitle>All Orders Scheduled for Today</CardTitle>
              </CardHeader>
              <CardContent>
                {renderOrdersTable(todayOrders)}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </LayoutWithSidebar>
  );
};

export default KitchenDashboard;