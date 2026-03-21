import { useEffect, useState } from 'react';
import axios from 'axios';
import LayoutWithSidebar from '../components/LayoutWithSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ImageIcon, CheckCircle, AlertCircle, Calendar, User } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CakeImageReport = () => {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [outlets, setOutlets] = useState([]);
  const [salesPersons, setSalesPersons] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [filters, setFilters] = useState({
    date_from: '',
    date_to: '',
    outlet_id: '',
    sales_person_id: ''
  });

  useEffect(() => {
    fetchOrders();
    fetchOutlets();
    fetchSalesPersons();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, orders]);

  const fetchOrders = async () => {
    try {
      const response = await axios.get(`${API}/orders/manage`);
      // Only get orders with actual photos uploaded
      const ordersWithPhotos = response.data.filter(order => 
        order.actual_cake_image_url && order.cake_image_url
      );
      setOrders(ordersWithPhotos);
      setFilteredOrders(ordersWithPhotos);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
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

  const fetchSalesPersons = async () => {
    try {
      const response = await axios.get(`${API}/sales-persons`);
      setSalesPersons(response.data);
    } catch (error) {
      console.error('Failed to fetch sales persons:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...orders];

    if (filters.date_from) {
      filtered = filtered.filter(order => order.delivery_date >= filters.date_from);
    }

    if (filters.date_to) {
      filtered = filtered.filter(order => order.delivery_date <= filters.date_to);
    }

    if (filters.outlet_id) {
      filtered = filtered.filter(order => order.outlet_id === filters.outlet_id);
    }

    if (filters.sales_person_id) {
      filtered = filtered.filter(order => order.order_taken_by === filters.sales_person_id);
    }

    setFilteredOrders(filtered);
  };

  const getSalesPersonName = (id) => {
    const person = salesPersons.find(sp => sp.id === id);
    return person ? person.name : 'Unknown';
  };

  const getOutletName = (id) => {
    const outlet = outlets.find(o => o.id === id);
    return outlet ? outlet.name : 'Unknown';
  };

  if (loading) {
    return (
      <LayoutWithSidebar>
        <div className="flex items-center justify-center h-screen">
          <p className="text-lg">Loading cake images...</p>
        </div>
      </LayoutWithSidebar>
    );
  }

  return (
    <LayoutWithSidebar>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold" style={{ color: '#e92587' }}>
            Cake Image Report
          </h1>
          <p className="text-gray-600 mt-1">
            Compare customer reference photos with actual cake deliveries
          </p>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label>Date From</Label>
                <Input
                  type="date"
                  value={filters.date_from}
                  onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
                />
              </div>
              <div>
                <Label>Date To</Label>
                <Input
                  type="date"
                  value={filters.date_to}
                  onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
                />
              </div>
              <div>
                <Label>Outlet</Label>
                <Select value={filters.outlet_id} onValueChange={(val) => setFilters({ ...filters, outlet_id: val })}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Outlets" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Outlets</SelectItem>
                    {outlets.map((outlet) => (
                      <SelectItem key={outlet.id} value={outlet.id}>
                        {outlet.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Sales Person</Label>
                <Select value={filters.sales_person_id} onValueChange={(val) => setFilters({ ...filters, sales_person_id: val })}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Sales Persons" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Sales Persons</SelectItem>
                    {salesPersons.map((sp) => (
                      <SelectItem key={sp.id} value={sp.id}>
                        {sp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-4">
              <Button
                onClick={() => setFilters({ date_from: '', date_to: '', outlet_id: '', sales_person_id: '' })}
                variant="outline"
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Orders</p>
                  <p className="text-2xl font-bold" style={{ color: '#e92587' }}>
                    {filteredOrders.length}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Image Comparison Grid */}
        {filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <ImageIcon className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <p className="text-lg text-gray-600">No orders with photos found</p>
              <p className="text-sm text-gray-500 mt-2">
                Photos appear here after kitchen uploads actual cake images
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {filteredOrders.map((order) => (
              <Card key={order.id} className="overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-pink-50 to-purple-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl mb-2">
                        Order #{order.order_number}
                      </CardTitle>
                      <div className="flex gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {order.delivery_date}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          {order.customer_info?.name}
                        </span>
                      </div>
                      <div className="mt-2 flex gap-2">
                        <Badge variant="outline">{getOutletName(order.outlet_id)}</Badge>
                        <Badge variant="outline">{getSalesPersonName(order.order_taken_by)}</Badge>
                      </div>
                    </div>
                    <Badge className="bg-green-600">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Photo Uploaded
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Customer Reference Image */}
                    <div className="space-y-2">
                      <h3 className="font-semibold text-lg text-center" style={{ color: '#e92587' }}>
                        Customer Reference
                      </h3>
                      <div className="border-4 border-pink-200 rounded-lg overflow-hidden">
                        <img
                          src={order.cake_image_url.startsWith('http') 
                            ? order.cake_image_url 
                            : `${BACKEND_URL}${order.cake_image_url}`}
                          alt="Customer Reference"
                          className="w-full h-64 object-cover"
                        />
                      </div>
                      <p className="text-xs text-gray-500 text-center">
                        Image provided by customer
                      </p>
                    </div>

                    {/* Order Details */}
                    <div className="space-y-4">
                      <h3 className="font-semibold text-lg text-center">Order Details</h3>
                      <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                        <div>
                          <p className="text-xs text-gray-600">Flavour</p>
                          <p className="font-semibold">{order.flavour}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Size</p>
                          <p className="font-semibold">{order.size_pounds} lbs</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Occasion</p>
                          <p className="font-semibold">{order.occasion}</p>
                        </div>
                        {order.name_on_cake && (
                          <div>
                            <p className="text-xs text-gray-600">Name on Cake</p>
                            <p className="font-semibold text-pink-600">"{order.name_on_cake}"</p>
                          </div>
                        )}
                        <div>
                          <p className="text-xs text-gray-600">Amount</p>
                          <p className="font-bold text-lg">₹{order.total_amount.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Actual Cake Photo */}
                    <div className="space-y-2">
                      <h3 className="font-semibold text-lg text-center text-green-600">
                        Actual Cake Delivered
                      </h3>
                      <div className="border-4 border-green-200 rounded-lg overflow-hidden">
                        <img
                          src={order.actual_cake_image_url.startsWith('http') 
                            ? order.actual_cake_image_url 
                            : `${BACKEND_URL}${order.actual_cake_image_url}`}
                          alt="Actual Cake"
                          className="w-full h-64 object-cover"
                        />
                      </div>
                      <p className="text-xs text-gray-500 text-center">
                        Photo uploaded by kitchen
                      </p>
                    </div>
                  </div>

                  {/* Special Instructions */}
                  {order.special_instructions && (
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                      <p className="text-xs text-gray-600 mb-1">Special Instructions:</p>
                      <p className="text-sm">{order.special_instructions}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </LayoutWithSidebar>
  );
};

export default CakeImageReport;
