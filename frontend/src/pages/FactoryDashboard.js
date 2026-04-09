import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import LayoutWithSidebar from '../components/LayoutWithSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import {
  Download, FileText, Package, Filter, RefreshCw,
  Truck, Clock, ChefHat, CheckCircle
} from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const FactoryDashboard = () => {
  const { token } = useAuth();
  const [orders, setOrders] = useState([]);
  const [outlets, setOutlets] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedOutlet, setSelectedOutlet] = useState('all');
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const getImageUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    if (url.startsWith('/uploads/')) return `${API_URL}/api${url}`;
    return `${API_URL}${url}`;
  };

  useEffect(() => {
    fetchOrders();
    fetchOutlets();
  }, [selectedDate, selectedOutlet]);

  const fetchOutlets = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/outlets`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOutlets(res.data);
    } catch (err) {
      console.error('Failed to fetch outlets:', err);
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      let url = `${API_URL}/api/factory/orders?date=${selectedDate}`;
      if (selectedOutlet && selectedOutlet !== 'all') {
        url += `&outlet_id=${selectedOutlet}`;
      }
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(res.data);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async () => {
    setDownloading(true);
    try {
      let url = `${API_URL}/api/factory/orders/pdf?date=${selectedDate}`;
      if (selectedOutlet && selectedOutlet !== 'all') {
        url += `&outlet_id=${selectedOutlet}`;
      }
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `factory_orders_${selectedDate}.pdf`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (err) {
      console.error('PDF download failed:', err);
      alert('Failed to download PDF');
    } finally {
      setDownloading(false);
    }
  };

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-purple-100 text-purple-800',
    ready: 'bg-green-100 text-green-800',
    ready_to_deliver: 'bg-cyan-100 text-cyan-800',
    picked_up: 'bg-indigo-100 text-indigo-800',
    delivered: 'bg-emerald-100 text-emerald-800',
    on_hold: 'bg-gray-100 text-gray-800',
  };

  const stats = {
    total: orders.length,
    confirmed: orders.filter(o => o.status === 'confirmed').length,
    in_progress: orders.filter(o => o.status === 'in_progress').length,
    ready: orders.filter(o => ['ready', 'ready_to_deliver'].includes(o.status)).length,
    delivered: orders.filter(o => o.status === 'delivered').length,
  };

  return (
    <LayoutWithSidebar>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold" style={{ color: '#e92587' }} data-testid="factory-dashboard-title">
              Factory Dashboard
            </h2>
            <p className="text-gray-600 mt-1">All orders across all outlets</p>
          </div>
          <Button
            onClick={downloadPDF}
            disabled={downloading || orders.length === 0}
            className="bg-pink-600 hover:bg-pink-700 text-white"
            data-testid="download-pdf-btn"
          >
            {downloading ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            {downloading ? 'Generating PDF...' : 'Download PDF'}
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <label className="text-sm font-medium text-gray-600 mb-1 block">Date</label>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-48"
                  data-testid="factory-date-filter"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 mb-1 block">Outlet</label>
                <Select value={selectedOutlet} onValueChange={setSelectedOutlet}>
                  <SelectTrigger className="w-48" data-testid="factory-outlet-filter">
                    <SelectValue placeholder="All Outlets" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Outlets</SelectItem>
                    {outlets.map(o => (
                      <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" onClick={fetchOrders} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <FileText className="h-6 w-6 mx-auto mb-1 text-gray-500" />
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-gray-500">Total</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Package className="h-6 w-6 mx-auto mb-1 text-blue-500" />
              <p className="text-2xl font-bold text-blue-600">{stats.confirmed}</p>
              <p className="text-xs text-gray-500">Confirmed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <ChefHat className="h-6 w-6 mx-auto mb-1 text-purple-500" />
              <p className="text-2xl font-bold text-purple-600">{stats.in_progress}</p>
              <p className="text-xs text-gray-500">Preparing</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <CheckCircle className="h-6 w-6 mx-auto mb-1 text-green-500" />
              <p className="text-2xl font-bold text-green-600">{stats.ready}</p>
              <p className="text-xs text-gray-500">Ready</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Truck className="h-6 w-6 mx-auto mb-1 text-emerald-500" />
              <p className="text-2xl font-bold text-emerald-600">{stats.delivered}</p>
              <p className="text-xs text-gray-500">Delivered</p>
            </CardContent>
          </Card>
        </div>

        {/* Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="h-5 w-5" />
              Orders ({orders.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-10">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-pink-500" />
                <p className="mt-2 text-gray-500">Loading orders...</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No orders found for the selected date</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm" data-testid="factory-orders-table">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left p-3 font-semibold">Order</th>
                      <th className="text-left p-3 font-semibold">Outlet</th>
                      <th className="text-left p-3 font-semibold">Customer</th>
                      <th className="text-left p-3 font-semibold">Cake</th>
                      <th className="text-left p-3 font-semibold">Image</th>
                      <th className="text-left p-3 font-semibold">Delivery</th>
                      <th className="text-left p-3 font-semibold">Status</th>
                      <th className="text-right p-3 font-semibold">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order.id} className="border-b hover:bg-gray-50" data-testid={`factory-order-row-${order.order_number}`}>
                        <td className="p-3">
                          <span className="font-bold">#{order.order_number}</span>
                          <div className="text-xs text-gray-400">{order.delivery_time}</div>
                        </td>
                        <td className="p-3">
                          <span className="text-xs bg-gray-100 px-2 py-1 rounded">{order.outlet_name || 'N/A'}</span>
                        </td>
                        <td className="p-3">
                          <div className="font-medium">{order.customer_info?.name}</div>
                          <div className="text-xs text-gray-400">{order.customer_info?.phone}</div>
                        </td>
                        <td className="p-3">
                          <div className="font-medium">{order.flavour}</div>
                          <div className="text-xs text-gray-500">{order.size_pounds} lbs</div>
                          {order.name_on_cake && (
                            <div className="text-xs text-pink-600">"{order.name_on_cake}"</div>
                          )}
                        </td>
                        <td className="p-3">
                          {order.cake_image_url ? (
                            <img
                              src={getImageUrl(order.cake_image_url)}
                              alt="Cake"
                              className="w-14 h-14 object-cover rounded border"
                            />
                          ) : (
                            <div className="w-14 h-14 bg-gray-100 rounded flex items-center justify-center text-gray-400 text-xs">No img</div>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1">
                            {order.needs_delivery ? (
                              <Badge className="bg-cyan-100 text-cyan-800 text-xs">Delivery</Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">Pickup</Badge>
                            )}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">{order.delivery_date}</div>
                        </td>
                        <td className="p-3">
                          <Badge className={`${statusColors[order.status] || 'bg-gray-100'} text-xs`}>
                            {order.status?.replace(/_/g, ' ').toUpperCase()}
                          </Badge>
                        </td>
                        <td className="p-3 text-right">
                          <div className="font-bold">Rs.{order.total_amount?.toFixed(0)}</div>
                          <div className="text-xs text-gray-400">Paid: Rs.{(order.paid_amount || 0).toFixed(0)}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </LayoutWithSidebar>
  );
};

export default FactoryDashboard;
