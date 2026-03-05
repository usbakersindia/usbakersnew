import { useState } from 'react';
import axios from 'axios';
import LayoutWithSidebar from '../components/LayoutWithSidebar';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, DollarSign, Truck } from 'lucide-react';
import { useEffect } from 'react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Reports = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [outlets, setOutlets] = useState([]);
  
  const [filters, setFilters] = useState({
    start_date: new Date(new Date().setDate(1)).toISOString().split('T')[0], // First day of month
    end_date: new Date().toISOString().split('T')[0],
    outlet_id: 'all'
  });

  const [orderReport, setOrderReport] = useState(null);
  const [paymentReport, setPaymentReport] = useState(null);
  const [deliveryReport, setDeliveryReport] = useState(null);

  useEffect(() => {
    fetchOutlets();
  }, []);

  const fetchOutlets = async () => {
    try {
      const response = await axios.get(`${API}/outlets`);
      setOutlets(response.data);
    } catch (error) {
      console.error('Failed to fetch outlets:', error);
    }
  };

  const fetchOrderReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('start_date', filters.start_date);
      params.append('end_date', filters.end_date);
      if (filters.outlet_id && filters.outlet_id !== 'all') params.append('outlet_id', filters.outlet_id);
      
      const response = await axios.get(`${API}/reports/orders?${params}`);
      setOrderReport(response.data);
    } catch (error) {
      console.error('Failed to fetch order report:', error);
      alert('Failed to fetch order report');
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('start_date', filters.start_date + 'T00:00:00');
      params.append('end_date', filters.end_date + 'T23:59:59');
      if (filters.outlet_id && filters.outlet_id !== 'all') params.append('outlet_id', filters.outlet_id);
      
      const response = await axios.get(`${API}/reports/payments?${params}`);
      setPaymentReport(response.data);
    } catch (error) {
      console.error('Failed to fetch payment report:', error);
      alert('Failed to fetch payment report');
    } finally {
      setLoading(false);
    }
  };

  const fetchDeliveryReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('start_date', filters.start_date);
      params.append('end_date', filters.end_date);
      if (filters.outlet_id && filters.outlet_id !== 'all') params.append('outlet_id', filters.outlet_id);
      
      const response = await axios.get(`${API}/reports/delivery?${params}`);
      setDeliveryReport(response.data);
    } catch (error) {
      console.error('Failed to fetch delivery report:', error);
      alert('Failed to fetch delivery report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LayoutWithSidebar>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Reports</h1>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Report Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label>Start Date</Label>
                <Input 
                  type="date" 
                  value={filters.start_date}
                  onChange={(e) => setFilters({...filters, start_date: e.target.value})}
                />
              </div>
              <div>
                <Label>End Date</Label>
                <Input 
                  type="date" 
                  value={filters.end_date}
                  onChange={(e) => setFilters({...filters, end_date: e.target.value})}
                />
              </div>
              {user?.role === 'super_admin' && (
                <div>
                  <Label>Outlet</Label>
                  <Select value={filters.outlet_id || 'all'} onValueChange={(value) => setFilters({...filters, outlet_id: value === 'all' ? '' : value})}>
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
              )}
            </div>
          </CardContent>
        </Card>

        {/* Report Tabs */}
        <Tabs defaultValue="orders" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="orders">
              <FileText className="h-4 w-4 mr-2" />
              Orders
            </TabsTrigger>
            <TabsTrigger value="payments">
              <DollarSign className="h-4 w-4 mr-2" />
              Payments
            </TabsTrigger>
            <TabsTrigger value="delivery">
              <Truck className="h-4 w-4 mr-2" />
              Delivery
            </TabsTrigger>
          </TabsList>

          {/* Orders Report */}
          <TabsContent value="orders">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Order Report</CardTitle>
                  <Button onClick={fetchOrderReport} disabled={loading}>
                    {loading ? 'Loading...' : 'Generate Report'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {orderReport && (
                  <div className="space-y-4">
                    {/* Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-2xl font-bold">{orderReport.summary.total_orders}</div>
                          <p className="text-sm text-gray-500">Total Orders</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-2xl font-bold">₹{orderReport.summary.total_amount.toFixed(2)}</div>
                          <p className="text-sm text-gray-500">Total Amount</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-2xl font-bold text-green-600">₹{orderReport.summary.total_paid.toFixed(2)}</div>
                          <p className="text-sm text-gray-500">Total Paid</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-2xl font-bold text-red-600">₹{orderReport.summary.total_pending.toFixed(2)}</div>
                          <p className="text-sm text-gray-500">Total Pending</p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Status Breakdown */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Status Breakdown</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {Object.entries(orderReport.summary.status_breakdown).map(([status, count]) => (
                            <div key={status} className="text-center">
                              <div className="text-xl font-bold">{count}</div>
                              <p className="text-sm text-gray-500 capitalize">{status}</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Orders Table */}
                    <div className="text-sm text-gray-500 mb-2">
                      Showing {orderReport.orders ? orderReport.orders.length : 0} orders
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payments Report */}
          <TabsContent value="payments">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Payment Report</CardTitle>
                  <Button onClick={fetchPaymentReport} disabled={loading}>
                    {loading ? 'Loading...' : 'Generate Report'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {paymentReport && (
                  <div className="space-y-4">
                    {/* Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-2xl font-bold">{paymentReport.summary.total_payments}</div>
                          <p className="text-sm text-gray-500">Total Transactions</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-2xl font-bold text-green-600">₹{paymentReport.summary.total_collected.toFixed(2)}</div>
                          <p className="text-sm text-gray-500">Total Collected</p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* By Payment Method */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">By Payment Method</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {Object.entries(paymentReport.summary.by_method).map(([method, amount]) => (
                            <div key={method} className="text-center">
                              <div className="text-xl font-bold">₹{amount.toFixed(2)}</div>
                              <p className="text-sm text-gray-500 capitalize">{method}</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Delivery Report */}
          <TabsContent value="delivery">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Delivery Report</CardTitle>
                  <Button onClick={fetchDeliveryReport} disabled={loading}>
                    {loading ? 'Loading...' : 'Generate Report'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {deliveryReport && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-2xl font-bold">{deliveryReport.summary.total_delivery_orders}</div>
                          <p className="text-sm text-gray-500">Total Deliveries</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-2xl font-bold text-green-600">{deliveryReport.summary.delivered}</div>
                          <p className="text-sm text-gray-500">Delivered</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-2xl font-bold text-blue-600">{deliveryReport.summary.in_transit}</div>
                          <p className="text-sm text-gray-500">In Transit</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-2xl font-bold text-yellow-600">{deliveryReport.summary.pending_delivery}</div>
                          <p className="text-sm text-gray-500">Pending</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-2xl font-bold">{deliveryReport.summary.delivery_rate}%</div>
                          <p className="text-sm text-gray-500">Delivery Rate</p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </LayoutWithSidebar>
  );
};

export default Reports;