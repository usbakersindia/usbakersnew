import { useEffect, useState } from 'react';
import axios from 'axios';
import LayoutWithSidebar from '../components/LayoutWithSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ImageIcon, CheckCircle, Calendar, User, Search, Phone, Hash, X } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CakeImageReport = () => {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [outlets, setOutlets] = useState([]);
  const [salesPersons, setSalesPersons] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [filters, setFilters] = useState({
    order_id: '',
    customer_name: '',
    phone: '',
    date_from: '',
    date_to: '',
    outlet_id: 'all',
    sales_person_id: 'all'
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    fetchOrders();
    fetchOutlets();
    fetchSalesPersons();
  }, []);

  useEffect(() => {
    applyFilters();
    setCurrentPage(1);
  }, [filters, orders]);

  const fetchOrders = async () => {
    try {
      const response = await axios.get(`${API}/orders/manage`);
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

    if (filters.order_id.trim()) {
      filtered = filtered.filter(order => 
        order.order_number?.toLowerCase().includes(filters.order_id.toLowerCase().replace('#', ''))
      );
    }

    if (filters.customer_name.trim()) {
      filtered = filtered.filter(order => 
        order.customer_info?.name?.toLowerCase().includes(filters.customer_name.toLowerCase())
      );
    }

    if (filters.phone.trim()) {
      filtered = filtered.filter(order => 
        order.customer_info?.phone?.includes(filters.phone)
      );
    }

    if (filters.date_from) {
      filtered = filtered.filter(order => order.delivery_date >= filters.date_from);
    }

    if (filters.date_to) {
      filtered = filtered.filter(order => order.delivery_date <= filters.date_to);
    }

    if (filters.outlet_id && filters.outlet_id !== 'all') {
      filtered = filtered.filter(order => order.outlet_id === filters.outlet_id);
    }

    if (filters.sales_person_id && filters.sales_person_id !== 'all') {
      filtered = filtered.filter(order => order.order_taken_by === filters.sales_person_id);
    }

    setFilteredOrders(filtered);
  };

  const clearFilters = () => {
    setFilters({
      order_id: '', customer_name: '', phone: '',
      date_from: '', date_to: '', outlet_id: 'all', sales_person_id: 'all'
    });
  };

  const hasActiveFilters = filters.order_id || filters.customer_name || filters.phone || 
    filters.date_from || filters.date_to || 
    (filters.outlet_id !== 'all') || (filters.sales_person_id !== 'all');

  const getSalesPersonName = (id) => {
    const person = salesPersons.find(sp => sp.id === id);
    return person ? person.name : 'Unknown';
  };

  const getOutletName = (id) => {
    const outlet = outlets.find(o => o.id === id);
    return outlet ? outlet.name : 'Unknown';
  };

  const getImageUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    if (url.startsWith('/uploads/')) return `${BACKEND_URL}/api${url}`;
    return `${BACKEND_URL}${url}`;
  };

  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);

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
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label className="flex items-center gap-1 mb-1">
                  <Hash className="h-3 w-3" /> Order ID
                </Label>
                <Input
                  placeholder="Search by order #"
                  value={filters.order_id}
                  onChange={(e) => setFilters({ ...filters, order_id: e.target.value })}
                  data-testid="filter-order-id"
                />
              </div>
              <div>
                <Label className="flex items-center gap-1 mb-1">
                  <User className="h-3 w-3" /> Customer Name
                </Label>
                <Input
                  placeholder="Search by name"
                  value={filters.customer_name}
                  onChange={(e) => setFilters({ ...filters, customer_name: e.target.value })}
                  data-testid="filter-customer-name"
                />
              </div>
              <div>
                <Label className="flex items-center gap-1 mb-1">
                  <Phone className="h-3 w-3" /> Phone Number
                </Label>
                <Input
                  placeholder="Search by phone"
                  value={filters.phone}
                  onChange={(e) => setFilters({ ...filters, phone: e.target.value })}
                  data-testid="filter-phone"
                />
              </div>
              <div>
                <Label className="flex items-center gap-1 mb-1">
                  <Calendar className="h-3 w-3" /> Date From
                </Label>
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
                    <SelectItem value="all">All Outlets</SelectItem>
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
                    <SelectItem value="all">All Sales Persons</SelectItem>
                    {salesPersons.map((sp) => (
                      <SelectItem key={sp.id} value={sp.id}>
                        {sp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                {hasActiveFilters && (
                  <Button onClick={clearFilters} variant="outline" className="w-full" data-testid="clear-filters-btn">
                    <X className="h-4 w-4 mr-2" />
                    Clear Filters
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Comparisons</p>
                  <p className="text-2xl font-bold" style={{ color: '#e92587' }}>
                    {filteredOrders.length}
                  </p>
                </div>
                <ImageIcon className="h-8 w-8 text-pink-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Photos Uploaded</p>
                  <p className="text-2xl font-bold text-green-600">
                    {filteredOrders.filter(o => o.actual_cake_image_url).length}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Showing</p>
                  <p className="text-2xl font-bold text-gray-700">
                    {paginatedOrders.length} of {filteredOrders.length}
                  </p>
                </div>
                <Search className="h-8 w-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Image Comparison Grid */}
        {filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <ImageIcon className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <p className="text-lg text-gray-600">No orders with photo comparisons found</p>
              <p className="text-sm text-gray-500 mt-2">
                Photos appear here after branch uploads actual cake images via "Ready to Deliver"
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6">
              {paginatedOrders.map((order) => (
                <Card key={order.id} className="overflow-hidden" data-testid={`comparison-card-${order.order_number}`}>
                  <CardHeader className="bg-gradient-to-r from-pink-50 to-purple-50 py-4">
                    <div className="flex flex-wrap justify-between items-start gap-2">
                      <div>
                        <CardTitle className="text-xl">
                          Order #{order.order_number}
                        </CardTitle>
                        <div className="flex flex-wrap gap-3 text-sm text-gray-600 mt-1">
                          <span className="flex items-center gap-1">
                            <User className="h-3.5 w-3.5" />
                            {order.customer_info?.name}
                          </span>
                          <span className="flex items-center gap-1">
                            <Phone className="h-3.5 w-3.5" />
                            {order.customer_info?.phone}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {order.delivery_date}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge variant="outline">{getOutletName(order.outlet_id)}</Badge>
                          <Badge variant="outline">{getSalesPersonName(order.order_taken_by)}</Badge>
                          <Badge variant="outline">{order.flavour} - {order.size_pounds} Pounds</Badge>
                        </div>
                      </div>
                      <Badge className="bg-green-600">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Compared
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Customer Reference Image */}
                      <div className="space-y-2">
                        <h3 className="font-semibold text-center" style={{ color: '#e92587' }}>
                          Customer Reference
                        </h3>
                        <div className="border-4 border-pink-200 rounded-lg overflow-hidden bg-gray-100">
                          <img
                            src={getImageUrl(order.cake_image_url)}
                            alt="Customer Reference"
                            className="w-full h-72 object-cover"
                            onError={(e) => { e.target.src = 'https://placehold.co/400x300/fce7f3/e92587?text=Reference'; }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 text-center">
                          Image provided by customer at order time
                        </p>
                      </div>

                      {/* Actual Cake Photo */}
                      <div className="space-y-2">
                        <h3 className="font-semibold text-center text-green-600">
                          Actual Cake Ready
                        </h3>
                        <div className="border-4 border-green-200 rounded-lg overflow-hidden bg-gray-100">
                          <img
                            src={getImageUrl(order.actual_cake_image_url)}
                            alt="Actual Cake"
                            className="w-full h-72 object-cover"
                            onError={(e) => { e.target.src = 'https://placehold.co/400x300/dcfce7/16a34a?text=Actual'; }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 text-center">
                          Photo captured by branch before delivery
                        </p>
                      </div>
                    </div>

                    {/* Order Details Row */}
                    <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-3">
                      <div className="bg-gray-50 p-3 rounded-lg text-center">
                        <p className="text-xs text-gray-500">Occasion</p>
                        <p className="font-semibold text-sm">{order.occasion || '-'}</p>
                      </div>
                      {order.name_on_cake && (
                        <div className="bg-pink-50 p-3 rounded-lg text-center">
                          <p className="text-xs text-gray-500">Message on Cake</p>
                          <p className="font-semibold text-sm text-pink-600">"{order.name_on_cake}"</p>
                        </div>
                      )}
                      <div className="bg-gray-50 p-3 rounded-lg text-center">
                        <p className="text-xs text-gray-500">Amount</p>
                        <p className="font-bold text-sm">₹{order.total_amount?.toFixed(2)}</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg text-center">
                        <p className="text-xs text-gray-500">Status</p>
                        <p className="font-semibold text-sm capitalize">{order.status?.replace(/_/g, ' ')}</p>
                      </div>
                    </div>

                    {/* Special Instructions */}
                    {order.special_instructions && (
                      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-xs font-semibold text-yellow-700 mb-1">Special Instructions</p>
                        <ul className="list-disc list-inside text-sm space-y-0.5">
                          {order.special_instructions.split('\n').filter(l => l.trim()).map((line, i) => (
                            <li key={i}>{line.trim()}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </LayoutWithSidebar>
  );
};

export default CakeImageReport;
