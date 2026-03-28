import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import LayoutWithSidebar from '../components/LayoutWithSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Package,
  CheckCircle,
  Clock,
  Truck,
  Star,
  Edit,
  Printer,
  DollarSign,
  XCircle,
  Calendar,
  Search,
  ArrowRightLeft,
  Ban,
  Download,
  Upload,
  Image as ImageIcon,
  MoreVertical,
  Trash2
} from 'lucide-react';
import axios from 'axios';
import * as XLSX from 'xlsx';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const STATUS_CONFIG = {
  confirmed: {
    label: 'Confirmed',
    color: 'bg-blue-500',
    icon: CheckCircle,
    nextStatus: 'ready'
  },
  ready: {
    label: 'Ready',
    color: 'bg-green-500',
    icon: Clock,
    nextStatus: 'picked_up'
  },
  picked_up: {
    label: 'Out for Delivery',
    color: 'bg-purple-500',
    icon: Truck,
    nextStatus: 'delivered'
  },
  reached: {
    label: 'Reached',
    color: 'bg-indigo-500',
    icon: Truck
  },
  delivered: {
    label: 'Delivered',
    color: 'bg-green-600',
    icon: Star
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-red-500',
    icon: XCircle
  }
};

const ManageOrders = () => {
  const { token } = useAuth();
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [photoUploadModalOpen, setPhotoUploadModalOpen] = useState(false);
  const [selectedOrderForPhoto, setSelectedOrderForPhoto] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [outlets, setOutlets] = useState([]);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // New state for edit functionality
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [occasionFilter, setOccasionFilter] = useState('all');
  const [flavourFilter, setFlavourFilter] = useState('all');

  // Payment form
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_method: 'cash'
  });

  useEffect(() => {
    fetchOrders();
    fetchOutlets();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchTerm, statusFilter, activeTab, dateFrom, dateTo, occasionFilter, flavourFilter, orders]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/orders/manage`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
      setMessage({ type: 'error', text: 'Failed to fetch orders' });
    } finally {
      setLoading(false);
    }
  };

  const fetchOutlets = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/outlets`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOutlets(response.data);
    } catch (error) {
      console.error('Error fetching outlets:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...orders];

    // Tab filter
    if (activeTab !== 'all') {
      filtered = filtered.filter(order => order.status === activeTab);
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    // Date range filter
    if (dateFrom) {
      filtered = filtered.filter(order => order.delivery_date >= dateFrom);
    }
    if (dateTo) {
      filtered = filtered.filter(order => order.delivery_date <= dateTo);
    }

    // Occasion filter
    if (occasionFilter !== 'all') {
      filtered = filtered.filter(order => order.occasion === occasionFilter);
    }

    // Flavour filter
    if (flavourFilter !== 'all') {
      filtered = filtered.filter(order => order.flavour === flavourFilter);
    }

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(order =>
        order.order_number?.toLowerCase().includes(term) ||
        order.customer_info?.name?.toLowerCase().includes(term) ||
        order.customer_info?.phone?.toLowerCase().includes(term)
      );
    }

    setFilteredOrders(filtered);
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      // Validation: Cannot assign to delivery (picked_up) without photo upload
      if (newStatus === 'picked_up') {
        const order = orders.find(o => o.id === orderId);
        if (!order.actual_cake_image_url) {
          setMessage({ 
            type: 'error', 
            text: 'Cannot assign to delivery! Counter person must upload actual cake photo first.' 
          });
          setTimeout(() => setMessage({ type: '', text: '' }), 5000);
          return;
        }
      }

      await axios.patch(
        `${API_URL}/api/orders/${orderId}/status?status=${newStatus}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setMessage({ type: 'success', text: `Order status updated to ${STATUS_CONFIG[newStatus].label}` });
      fetchOrders();
    } catch (error) {
      console.error('Error updating status:', error);
      setMessage({ type: 'error', text: 'Failed to update order status' });
    }
  };

  const handleViewOrder = (order) => {
    setSelectedOrder(order);
    setDialogOpen(true);
  };
  
  const handleEditOrder = (order) => {
    setEditFormData({
      ...order,
      customer_name: order.customer_info?.name || '',
      customer_phone: order.customer_info?.phone || '',
      customer_address: order.customer_info?.address || order.delivery_address || ''
    });
    setEditDialogOpen(true);
  };
  
  const submitEditOrder = async () => {
    try {
      const updateData = {
        customer_info: {
          name: editFormData.customer_name,
          phone: editFormData.customer_phone,
          address: editFormData.customer_address
        },
        delivery_date: editFormData.delivery_date,
        delivery_time: editFormData.delivery_time,
        occasion: editFormData.occasion,
        flavour: editFormData.flavour,
        size_pounds: parseFloat(editFormData.size_pounds),
        name_on_cake: editFormData.name_on_cake,
        total_amount: parseFloat(editFormData.total_amount),
        special_instructions: editFormData.special_instructions
      };
      
      await axios.patch(
        `${API_URL}/api/orders/${editFormData.id}`,
        updateData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setMessage({ type: 'success', text: 'Order updated successfully' });
      setEditDialogOpen(false);
      setEditFormData(null);
      fetchOrders();
    } catch (error) {
      console.error('Error updating order:', error);
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to update order' });
    }
  };
  
  const handleDeleteOrder = async (order) => {
    if (!window.confirm(`Are you sure you want to delete order ${order.order_number}?`)) {
      return;
    }
    
    try {
      await axios.delete(
        `${API_URL}/api/orders/${order.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setMessage({ type: 'success', text: 'Order deleted successfully' });
      fetchOrders();
    } catch (error) {
      console.error('Error deleting order:', error);
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to delete order' });
    }
  };

  const openPhotoUploadModal = (order) => {
    if (!order.is_ready) {
      setMessage({ type: 'error', text: 'Order must be marked as ready by kitchen first' });
      return;
    }
    if (order.actual_cake_image_url) {
      setMessage({ type: 'error', text: 'Photo already uploaded for this order' });
      return;
    }
    setSelectedOrderForPhoto(order);
    setPhotoUploadModalOpen(true);
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePhotoUpload = async () => {
    if (!photoFile) {
      setMessage({ type: 'error', text: 'Please select a photo' });
      return;
    }

    try {
      // Step 1: Upload image file
      const formData = new FormData();
      formData.append('file', photoFile);

      const uploadResponse = await axios.post(`${API_URL}/api/upload-image`, formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });

      const imageUrl = uploadResponse.data.url;

      // Step 2: Use specialized endpoint to save actual photo and trigger incentive
      await axios.post(
        `${API_URL}/api/orders/${selectedOrderForPhoto.id}/upload-actual-photo?image_url=${encodeURIComponent(imageUrl)}`,
        {},
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      setPhotoUploadModalOpen(false);
      setPhotoFile(null);
      setPhotoPreview(null);
      setSelectedOrderForPhoto(null);
      setMessage({ type: 'success', text: 'Photo uploaded successfully! Incentive calculated for sales person.' });
      
      fetchOrders();
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    } catch (error) {
      console.error('Failed to upload photo:', error);
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to upload photo' });
    }
  };

  const handleAddPayment = (order) => {
    setSelectedOrder(order);
    setPaymentForm({
      amount: Math.max(0, order.total_amount - order.paid_amount).toString(),
      payment_method: 'cash'
    });
    setPaymentDialogOpen(true);
  };

  const submitPayment = async () => {
    try {
      await axios.post(
        `${API_URL}/api/payments`,
        {
          order_id: selectedOrder.id,
          amount: parseFloat(paymentForm.amount),
          payment_method: paymentForm.payment_method
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setMessage({ type: 'success', text: 'Payment recorded successfully' });
      setPaymentDialogOpen(false);
      fetchOrders();
    } catch (error) {
      console.error('Error recording payment:', error);
      setMessage({ type: 'error', text: 'Failed to record payment' });
    }
  };

  const handleTransferOrder = (order) => {
    setSelectedOrder(order);
    setTransferDialogOpen(true);
  };

  const submitTransfer = async (newOutletId) => {
    try {
      await axios.post(
        `${API_URL}/api/orders/${selectedOrder.id}/transfer?new_outlet_id=${newOutletId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setMessage({ type: 'success', text: 'Order transferred successfully!' });
      setTransferDialogOpen(false);
      fetchOrders();
    } catch (error) {
      console.error('Error transferring order:', error);
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to transfer order' });
    }
  };

  const handleCancelDelivery = async (order) => {
    if (!window.confirm(`Cancel delivery for order ${order.order_number}? Delivery charges will be removed.`)) {
      return;
    }

    try {
      await axios.post(
        `${API_URL}/api/orders/${order.id}/cancel-delivery`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setMessage({ type: 'success', text: 'Delivery cancelled and charges removed' });
      fetchOrders();
    } catch (error) {
      console.error('Error cancelling delivery:', error);
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to cancel delivery' });
    }
  };

  const exportOrdersToExcel = () => {
    if (!filteredOrders || filteredOrders.length === 0) {
      alert('No orders to export');
      return;
    }

    const ws_data = [
      ['Orders Export'],
      ['Generated', new Date().toLocaleString()],
      [],
      ['Order #', 'Customer', 'Phone', 'Type', 'Occasion', 'Flavour', 'Size', 'Delivery Date', 'Status', 'Total', 'Paid', 'Pending']
    ];

    filteredOrders.forEach(order => {
      ws_data.push([
        order.order_number,
        order.customer_info?.name || 'N/A',
        order.customer_info?.phone || 'N/A',
        order.order_type,
        order.occasion || 'N/A',
        order.flavour || 'N/A',
        order.size || 'N/A',
        order.delivery_date || 'N/A',
        order.status,
        order.total_amount,
        order.paid_amount,
        order.pending_amount || 0
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Orders');
    XLSX.writeFile(wb, `orders_export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handlePrintKOT = (order) => {
    // Get outlet name
    const outlet = outlets.find(o => o.id === order.outlet_id);
    const outletName = outlet ? outlet.name : 'N/A';
    
    // Generate order URL for QR code
    const orderUrl = `${window.location.origin}/orders/${order.id}`;
    
    // Open print window with complete KOT
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>KOT - ${order.order_number}</title>
          <style>
            body { 
              font-family: 'Arial', sans-serif; 
              padding: 20px; 
              max-width: 400px; 
              margin: 0 auto;
            }
            .header { 
              text-align: center; 
              border-bottom: 3px solid #000; 
              padding-bottom: 15px; 
              margin-bottom: 15px; 
            }
            .header h1 { 
              margin: 0; 
              font-size: 28px; 
              color: #e92587;
              font-weight: bold;
            }
            .header h2 { 
              margin: 5px 0; 
              font-size: 16px; 
              color: #666;
            }
            .section { 
              margin: 12px 0; 
              padding: 10px;
              background: #f9f9f9;
              border-radius: 5px;
            }
            .section-title { 
              font-weight: bold; 
              font-size: 14px; 
              color: #e92587;
              margin-bottom: 8px;
              text-transform: uppercase;
            }
            .item { 
              margin: 6px 0;
              font-size: 13px;
              display: flex;
              justify-content: space-between;
            }
            .item-label {
              font-weight: 600;
              color: #333;
            }
            .item-value {
              color: #666;
            }
            .highlight {
              background: #fff3cd;
              padding: 10px;
              border-left: 4px solid #ffc107;
              margin: 15px 0;
              font-size: 14px;
              font-weight: bold;
            }
            .footer { 
              text-align: center; 
              border-top: 3px solid #000; 
              padding-top: 15px; 
              margin-top: 20px; 
            }
            .qr-code { 
              margin: 15px 0; 
            }
            .qr-code img {
              border: 2px solid #e92587;
              padding: 5px;
              border-radius: 8px;
            }
            .billing-note {
              background: #e8f5e9;
              padding: 12px;
              border-radius: 5px;
              margin-top: 15px;
              font-weight: bold;
              color: #2e7d32;
              border: 2px dashed #4caf50;
            }
            @media print {
              body { max-width: 100%; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>US BAKERS</h1>
            <h2>Kitchen Order Ticket (KOT)</h2>
            <div style="margin-top: 10px;">
              <strong>Order ID:</strong> ${order.order_number}<br/>
              <strong>Date of Booking:</strong> ${new Date(order.created_at).toLocaleDateString('en-IN')}
            </div>
          </div>
          
          <div class="section">
            <div class="section-title">Order Information</div>
            <div class="item">
              <span class="item-label">Outlet Name:</span>
              <span class="item-value">${outletName}</span>
            </div>
            <div class="item">
              <span class="item-label">Taken By:</span>
              <span class="item-value">${order.order_taken_by || 'N/A'}</span>
            </div>
            <div class="item">
              <span class="item-label">Branch:</span>
              <span class="item-value">${outletName}</span>
            </div>
            <div class="item">
              <span class="item-label">Delivery Status:</span>
              <span class="item-value">${order.status.toUpperCase()}</span>
            </div>
          </div>
          
          <div class="section">
            <div class="section-title">Customer Details</div>
            <div class="item">
              <span class="item-label">Name:</span>
              <span class="item-value">${order.customer_info?.name || 'N/A'}</span>
            </div>
            <div class="item">
              <span class="item-label">Phone Number:</span>
              <span class="item-value">${order.customer_info?.phone || 'N/A'}</span>
            </div>
            <div class="item">
              <span class="item-label">Address:</span>
              <span class="item-value">${order.customer_info?.address || order.delivery_address || 'N/A'}</span>
            </div>
            <div class="item">
              <span class="item-label">Delivery Zone:</span>
              <span class="item-value">${order.delivery_zone || 'N/A'}</span>
            </div>
          </div>
          
          <div class="section">
            <div class="section-title">Cake Details</div>
            <div class="item">
              <span class="item-label">Occasion:</span>
              <span class="item-value">${order.occasion || 'N/A'}</span>
            </div>
            <div class="item">
              <span class="item-label">Flavour:</span>
              <span class="item-value">${order.flavour || 'N/A'}</span>
            </div>
            <div class="item">
              <span class="item-label">Size:</span>
              <span class="item-value">${order.size_pounds} Pounds</span>
            </div>
            <div class="item">
              <span class="item-label">Name on Cake:</span>
              <span class="item-value">${order.name_on_cake || 'None'}</span>
            </div>
          </div>
          
          <div class="section">
            <div class="section-title">Delivery Information</div>
            <div class="item">
              <span class="item-label">Delivery Date:</span>
              <span class="item-value">${order.delivery_date}</span>
            </div>
            <div class="item">
              <span class="item-label">Delivery Time:</span>
              <span class="item-value">${order.delivery_time}</span>
            </div>
          </div>
          
          ${order.special_instructions ? `
          <div class="highlight">
            <div style="color: #856404; margin-bottom: 5px;">⚠️ SPECIAL INSTRUCTIONS:</div>
            ${order.special_instructions}
          </div>
          ` : ''}
          
          <div class="section">
            <div class="section-title">Payment & PetPooja Details</div>
            <div class="item">
              <span class="item-label">Total Amount:</span>
              <span class="item-value">₹${order.total_amount.toFixed(2)}</span>
            </div>
            <div class="item">
              <span class="item-label">Paid Amount:</span>
              <span class="item-value">₹${order.paid_amount ? order.paid_amount.toFixed(2) : '0.00'}</span>
            </div>
            <div class="item">
              <span class="item-label">PetPooja Bill No.:</span>
              <span class="item-value">${order.petpooja_bill_number || 'Pending'}</span>
            </div>
          </div>
          
          <div class="billing-note">
            📋 Billing in PetPooja
          </div>
          
          <div class="footer">
            <div class="qr-code">
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(orderUrl)}" alt="Order QR Code" />
              <div style="font-size: 11px; color: #666; margin-top: 5px;">Scan for order details</div>
            </div>
            <div style="font-size: 12px; color: #666; margin-top: 10px;">
              Generated: ${new Date().toLocaleString('en-IN')}
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const getStatusBadge = (status) => {
    const config = STATUS_CONFIG[status];
    if (!config) return null;
    
    const Icon = config.icon;
    return (
      <Badge className={`${config.color} text-white`}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <LayoutWithSidebar>
        <div className="flex items-center justify-center h-screen">
          <div className="text-lg">Loading orders...</div>
        </div>
      </LayoutWithSidebar>
    );
  }

  return (
    <LayoutWithSidebar>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: '#e92587' }}>Manage Orders</h1>
            <p className="text-gray-600 mt-1">Track and manage all bakery orders</p>
          </div>
          <Button variant="outline" onClick={exportOrdersToExcel} disabled={!filteredOrders || filteredOrders.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export to Excel
          </Button>
        </div>

        {message.text && (
          <Alert className={message.type === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
            <AlertDescription className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}>
              {message.text}
            </AlertDescription>
          </Alert>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="search">Search</Label>
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Order #, Customer name, Phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="date-from">From Date</Label>
                <Input
                  id="date-from"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="date-to">To Date</Label>
                <Input
                  id="date-to"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="status-filter">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="occasion-filter">Occasion</Label>
                <Select value={occasionFilter} onValueChange={setOccasionFilter}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="All Occasions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Occasions</SelectItem>
                    <SelectItem value="birthday">Birthday</SelectItem>
                    <SelectItem value="anniversary">Anniversary</SelectItem>
                    <SelectItem value="wedding">Wedding</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="flavour-filter">Flavour</Label>
                <Select value={flavourFilter} onValueChange={setFlavourFilter}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="All Flavours" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Flavours</SelectItem>
                    <SelectItem value="chocolate">Chocolate</SelectItem>
                    <SelectItem value="vanilla">Vanilla</SelectItem>
                    <SelectItem value="strawberry">Strawberry</SelectItem>
                    <SelectItem value="butterscotch">Butterscotch</SelectItem>
                    <SelectItem value="red_velvet">Red Velvet</SelectItem>
                    <SelectItem value="black_forest">Black Forest</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2 flex items-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                    setActiveTab('all');
                    setDateFrom('');
                    setDateTo('');
                    setOccasionFilter('all');
                    setFlavourFilter('all');
                  }}
                  className="w-full"
                >
                  Clear All Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="all">All ({orders.length})</TabsTrigger>
            <TabsTrigger value="confirmed">
              Confirmed ({orders.filter(o => o.status === 'confirmed').length})
            </TabsTrigger>
            <TabsTrigger value="ready">
              Ready ({orders.filter(o => o.status === 'ready').length})
            </TabsTrigger>
            <TabsTrigger value="picked_up">
              Delivery ({orders.filter(o => o.status === 'picked_up').length})
            </TabsTrigger>
            <TabsTrigger value="delivered">
              Delivered ({orders.filter(o => o.status === 'delivered').length})
            </TabsTrigger>
            <TabsTrigger value="cancelled">
              Cancelled ({orders.filter(o => o.status === 'cancelled').length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Orders ({filteredOrders.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order #</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Cake Photo</TableHead>
                        <TableHead>Delivery</TableHead>
                        <TableHead>Details</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOrders.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                            No orders found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredOrders
                          .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                          .map((order) => (
                          <TableRow 
                            key={order.id}
                            className={order.status === 'delivered' ? 'bg-green-50 hover:bg-green-100' : ''}
                          >
                            <TableCell className="font-medium">
                              <div className="flex items-center space-x-2">
                                <Package className="h-4 w-4 text-gray-400" />
                                <span>{order.order_number}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{order.customer_info?.name}</div>
                                <div className="text-sm text-gray-500">{order.customer_info?.phone}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {order.cake_image_url ? (
                                <div 
                                  className="cursor-pointer hover:opacity-80 transition-opacity"
                                  onClick={() => {
                                    // Check if URL is already absolute
                                    const imageUrl = order.cake_image_url.startsWith('http') 
                                      ? order.cake_image_url 
                                      : `${API_URL}${order.cake_image_url}`;
                                    setPreviewImage(imageUrl);
                                    setImagePreviewOpen(true);
                                  }}
                                  title="Click to preview"
                                >
                                  <img
                                    src={order.cake_image_url.startsWith('http') ? order.cake_image_url : `${API_URL}${order.cake_image_url}`}
                                    alt="Cake"
                                    className="w-12 h-12 object-cover rounded border-2 border-gray-200"
                                  />
                                </div>
                              ) : (
                                <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                                  <ImageIcon className="h-5 w-5 text-gray-400" />
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-1 text-sm">
                                <Calendar className="h-3 w-3" />
                                <span>{order.delivery_date}</span>
                              </div>
                              <div className="text-sm text-gray-500">{order.delivery_time}</div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <div>{order.flavour} - {order.size_pounds} lbs</div>
                                {order.name_on_cake && (
                                  <div className="text-gray-500">"{order.name_on_cake}"</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <div className="font-bold" style={{ color: '#e92587' }}>
                                  ₹{order.total_amount.toFixed(2)}
                                </div>
                                <div className="text-gray-500">
                                  Paid: ₹{order.paid_amount.toFixed(2)}
                                </div>
                                {order.pending_amount > 0 && (
                                  <div className="text-orange-600 font-semibold">
                                    Due: ₹{order.pending_amount.toFixed(2)}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{getStatusBadge(order.status)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end items-center space-x-2">
                                {/* Photo Upload Button */}
                                {order.is_ready && !order.actual_cake_image_url && (
                                  <Button
                                    size="sm"
                                    onClick={() => openPhotoUploadModal(order)}
                                    className="bg-purple-600 hover:bg-purple-700 text-white"
                                    title="Upload Actual Cake Photo"
                                  >
                                    <Upload className="h-4 w-4" />
                                  </Button>
                                )}
                                {order.actual_cake_image_url && (
                                  <Badge className="bg-green-600 text-white text-xs">✓ Photo</Badge>
                                )}
                                
                                {/* Status Dropdown */}
                                <Select 
                                  value={order.status}
                                  onValueChange={(newStatus) => handleStatusUpdate(order.id, newStatus)}
                                >
                                  <SelectTrigger className="w-[140px] h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="confirmed">Confirmed</SelectItem>
                                    <SelectItem value="preparing">Preparing</SelectItem>
                                    <SelectItem value="ready">Ready</SelectItem>
                                    <SelectItem 
                                      value="picked_up"
                                      disabled={!order.actual_cake_image_url}
                                    >
                                      Picked Up {!order.actual_cake_image_url && '🔒'}
                                    </SelectItem>
                                    <SelectItem value="delivered">Delivered</SelectItem>
                                  </SelectContent>
                                </Select>
                                
                                {/* More Menu */}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button size="sm" variant="outline">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleEditOrder(order)}>
                                      <Edit className="h-4 w-4 mr-2" />
                                      Edit Order
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handlePrintKOT(order)}>
                                      <Printer className="h-4 w-4 mr-2" />
                                      Print KOT
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleTransferOrder(order)}>
                                      <ArrowRightLeft className="h-4 w-4 mr-2" />
                                      Transfer
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      onClick={() => handleDeleteOrder(order)}
                                      className="text-red-600"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                
                {/* Pagination Controls */}
                {filteredOrders.length > itemsPerPage && (
                  <div className="flex items-center justify-between mt-4 px-4">
                    <div className="text-sm text-gray-600">
                      Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredOrders.length)} of {filteredOrders.length} orders
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      <div className="flex items-center space-x-1">
                        {Array.from({ length: Math.ceil(filteredOrders.length / itemsPerPage) }, (_, i) => i + 1).map((page) => (
                          <Button
                            key={page}
                            size="sm"
                            variant={currentPage === page ? "default" : "outline"}
                            onClick={() => setCurrentPage(page)}
                            className={currentPage === page ? "bg-pink-600 text-white" : ""}
                          >
                            {page}
                          </Button>
                        ))}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setCurrentPage(Math.min(Math.ceil(filteredOrders.length / itemsPerPage), currentPage + 1))}
                        disabled={currentPage >= Math.ceil(filteredOrders.length / itemsPerPage)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}

                {/* Status Legend */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
                  <h4 className="font-semibold mb-3 text-sm text-gray-700">Status Legend</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {Object.entries(STATUS_CONFIG).map(([key, config]) => {
                      const Icon = config.icon;
                      return (
                        <div key={key} className="flex items-center space-x-2">
                          <div className={`${config.color} w-8 h-8 rounded flex items-center justify-center`}>
                            {Icon && <Icon className="h-4 w-4 text-white" />}
                          </div>
                          <span className="text-sm">{config.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Image Preview Dialog */}
        <Dialog open={imagePreviewOpen} onOpenChange={setImagePreviewOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Cake Photo Preview</DialogTitle>
            </DialogHeader>
            <div className="flex items-center justify-center bg-gray-100 rounded-lg p-4 min-h-[400px]">
              {previewImage ? (
                <img
                  src={previewImage}
                  alt="Cake Preview"
                  className="max-w-full max-h-[70vh] object-contain rounded"
                  onError={(e) => {
                    console.error('Image failed to load:', previewImage);
                    e.target.src = '/placeholder-image.png';
                  }}
                />
              ) : (
                <div className="text-gray-500">No image available</div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Order Details Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Order Details - {selectedOrder?.order_number}</DialogTitle>
            </DialogHeader>
            {selectedOrder && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Customer Name</Label>
                    <div className="font-medium mt-1">{selectedOrder.customer_info?.name}</div>
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <div className="font-medium mt-1">{selectedOrder.customer_info?.phone}</div>
                  </div>
                  <div>
                    <Label>Delivery Date</Label>
                    <div className="font-medium mt-1">{selectedOrder.delivery_date}</div>
                  </div>
                  <div>
                    <Label>Delivery Time</Label>
                    <div className="font-medium mt-1">{selectedOrder.delivery_time}</div>
                  </div>
                  <div>
                    <Label>Flavour</Label>
                    <div className="font-medium mt-1">{selectedOrder.flavour}</div>
                  </div>
                  <div>
                    <Label>Size</Label>
                    <div className="font-medium mt-1">{selectedOrder.size_pounds} lbs</div>
                  </div>
                  {selectedOrder.name_on_cake && (
                    <div className="col-span-2">
                      <Label>Name on Cake</Label>
                      <div className="font-medium mt-1">{selectedOrder.name_on_cake}</div>
                    </div>
                  )}
                  {selectedOrder.occasion && (
                    <div>
                      <Label>Occasion</Label>
                      <div className="font-medium mt-1">{selectedOrder.occasion}</div>
                    </div>
                  )}
                  <div>
                    <Label>Status</Label>
                    <div className="mt-1">{getStatusBadge(selectedOrder.status)}</div>
                  </div>
                </div>

                {selectedOrder.special_instructions && (
                  <div>
                    <Label>Special Instructions</Label>
                    <div className="mt-1 p-3 bg-gray-50 rounded border">
                      {selectedOrder.special_instructions}
                    </div>
                  </div>
                )}

                <div className="border-t pt-4">
                  <Label>Payment Information</Label>
                  <div className="mt-2 space-y-2">
                    <div className="flex justify-between">
                      <span>Total Amount:</span>
                      <span className="font-bold">₹{selectedOrder.total_amount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Paid Amount:</span>
                      <span className="font-bold text-green-600">₹{selectedOrder.paid_amount.toFixed(2)}</span>
                    </div>
                    {selectedOrder.pending_amount > 0 && (
                      <div className="flex justify-between">
                        <span>Pending Amount:</span>
                        <span className="font-bold text-orange-600">₹{selectedOrder.pending_amount.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Payment Dialog */}
        <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Payment - {selectedOrder?.order_number}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="amount">Amount *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  placeholder="Enter amount"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="payment-method">Payment Method *</Label>
                <Select
                  value={paymentForm.payment_method}
                  onValueChange={(value) => setPaymentForm({ ...paymentForm, payment_method: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="online">Online Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={submitPayment}
                className="w-full text-white"
                style={{ backgroundColor: '#e92587' }}
              >
                Record Payment
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Transfer Order Dialog */}
        <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Transfer Order - {selectedOrder?.order_number}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Transfer this order to another outlet. All payment data will be moved with the order.
              </p>
              <div>
                <Label htmlFor="transfer-outlet">Select Target Outlet *</Label>
                <Select
                  onValueChange={(value) => submitTransfer(value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Choose outlet" />
                  </SelectTrigger>
                  <SelectContent>
                    {outlets
                      .filter(o => o.id !== selectedOrder?.outlet_id)
                      .map((outlet) => (
                        <SelectItem key={outlet.id} value={outlet.id}>
                          {outlet.name} - {outlet.city}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

        {/* Photo Upload Modal */}
        <Dialog open={photoUploadModalOpen} onOpenChange={setPhotoUploadModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Actual Cake Photo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-gray-600">
                Upload a photo of the completed cake. This will trigger incentive calculation for the sales person.
              </p>
              <div>
                <Label>Select Photo</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  className="cursor-pointer"
                />
              </div>
              {photoPreview && (
                <div>
                  <Label>Preview</Label>
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="w-full rounded-lg border-2 border-gray-200 mt-2"
                  />
                </div>
              )}
              <Button
                onClick={handlePhotoUpload}
                disabled={!photoFile}
                className="w-full"
                style={{ backgroundColor: '#e92587' }}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Photo & Calculate Incentive
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Order Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Order - {editFormData?.order_number}</DialogTitle>
              <DialogDescription>Update order details below</DialogDescription>
            </DialogHeader>
            {editFormData && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Customer Name *</Label>
                    <Input
                      value={editFormData.customer_name}
                      onChange={(e) => setEditFormData({...editFormData, customer_name: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Customer Phone *</Label>
                    <Input
                      value={editFormData.customer_phone}
                      onChange={(e) => setEditFormData({...editFormData, customer_phone: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <Label>Delivery Address</Label>
                  <Input
                    value={editFormData.customer_address}
                    onChange={(e) => setEditFormData({...editFormData, customer_address: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Delivery Date *</Label>
                    <Input
                      type="date"
                      value={editFormData.delivery_date}
                      onChange={(e) => setEditFormData({...editFormData, delivery_date: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Delivery Time *</Label>
                    <Input
                      type="time"
                      value={editFormData.delivery_time}
                      onChange={(e) => setEditFormData({...editFormData, delivery_time: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Occasion *</Label>
                    <Input
                      value={editFormData.occasion}
                      onChange={(e) => setEditFormData({...editFormData, occasion: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Flavour *</Label>
                    <Input
                      value={editFormData.flavour}
                      onChange={(e) => setEditFormData({...editFormData, flavour: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Size (Pounds) *</Label>
                    <Input
                      type="number"
                      step="0.5"
                      value={editFormData.size_pounds}
                      onChange={(e) => setEditFormData({...editFormData, size_pounds: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Total Amount *</Label>
                    <Input
                      type="number"
                      value={editFormData.total_amount}
                      onChange={(e) => setEditFormData({...editFormData, total_amount: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <Label>Name on Cake</Label>
                  <Input
                    value={editFormData.name_on_cake || ''}
                    onChange={(e) => setEditFormData({...editFormData, name_on_cake: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Special Instructions</Label>
                  <Input
                    value={editFormData.special_instructions || ''}
                    onChange={(e) => setEditFormData({...editFormData, special_instructions: e.target.value})}
                  />
                </div>
                <div className="flex justify-end space-x-2 pt-4">
                  <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={submitEditOrder}
                    className="bg-pink-600 text-white hover:bg-pink-700"
                  >
                    Save Changes
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

          </DialogContent>
        </Dialog>
      </div>
    </LayoutWithSidebar>
  );
};

export default ManageOrders;
