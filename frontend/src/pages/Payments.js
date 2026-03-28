import { useEffect, useState } from 'react';
import axios from 'axios';
import LayoutWithSidebar from '../components/LayoutWithSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Wallet, CreditCard } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Payments = () => {
  const [paymentsData, setPaymentsData] = useState([]);
  const [outlets, setOutlets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterOutlet, setFilterOutlet] = useState('all');
  const [expandedOrders, setExpandedOrders] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    fetchOutlets();
  }, []);

  useEffect(() => {
    fetchPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterOutlet]);

  const fetchOutlets = async () => {
    try {
      const response = await axios.get(`${API}/outlets`);
      setOutlets(response.data);
    } catch (error) {
      console.error('Failed to fetch outlets:', error);
    }
  };

  const fetchPayments = async () => {
    try {
      const url = filterOutlet === 'all' ? `${API}/payments` : `${API}/payments?outlet_id=${filterOutlet}`;
      const response = await axios.get(url);
      setPaymentsData(response.data);
    } catch (error) {
      console.error('Failed to fetch payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleOrderExpand = (orderId) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
    } else {
      newExpanded.add(orderId);
    }
    setExpandedOrders(newExpanded);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTotalPayments = () => {
    return paymentsData.reduce((sum, order) => {
      const orderTotal = order.payments.reduce((pSum, payment) => pSum + payment.amount, 0);
      return sum + orderTotal;
    }, 0);
  };

  if (loading) {
    return (
      <LayoutWithSidebar>
        <div className="text-center py-12">Loading payments...</div>
      </LayoutWithSidebar>
    );
  }

  return (
    <LayoutWithSidebar>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-3xl font-bold" style={{ color: '#e92587' }}>Payments</h2>
          <p className="text-gray-600 mt-1">All synced payments from PetPooja and manual entries</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Orders with Payments</p>
                  <p className="text-2xl font-bold" style={{ color: '#e92587' }}>
                    {paymentsData.length}
                  </p>
                </div>
                <Wallet className="h-8 w-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Payments Received</p>
                  <p className="text-2xl font-bold text-green-600">
                    ₹{getTotalPayments().toFixed(2)}
                  </p>
                </div>
                <CreditCard className="h-8 w-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Payment Transactions</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {paymentsData.reduce((sum, order) => sum + order.payments.length, 0)}
                  </p>
                </div>
                <CreditCard className="h-8 w-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <Label>Filter by Outlet:</Label>
              <Select value={filterOutlet} onValueChange={setFilterOutlet}>
                <SelectTrigger className="w-64">
                  <SelectValue />
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
          </CardContent>
        </Card>

        {/* Payments Table */}
        <Card>
          <CardHeader>
            <CardTitle>Orders with Payments ({paymentsData.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {paymentsData.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No payments found.
              </div>
            ) : (
              <>
              <div className="space-y-4">
                {paymentsData
                  .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                  .map((order) => (
                  <div key={order.order_id} className="border rounded-lg overflow-hidden">
                    {/* Order Header - Clickable */}
                    <div
                      className="bg-gray-50 p-4 cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => toggleOrderExpand(order.order_id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 grid grid-cols-5 gap-4">
                          <div>
                            <p className="text-xs text-gray-500">Order Number</p>
                            <p className="font-semibold text-sm" style={{ color: '#e92587' }}>
                              {order.order_number}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Customer</p>
                            <p className="font-medium text-sm">{order.customer_name}</p>
                            <p className="text-xs text-gray-500">{order.customer_phone}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Total Amount</p>
                            <p className="font-semibold text-sm">₹{order.total_amount.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Paid Amount</p>
                            <p className="font-semibold text-sm text-green-600">
                              ₹{order.paid_amount.toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Pending Amount</p>
                            <p className="font-semibold text-sm text-orange-600">
                              ₹{order.pending_amount.toFixed(2)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <Badge variant="outline">
                            {order.payments.length} {order.payments.length === 1 ? 'Payment' : 'Payments'}
                          </Badge>
                          {expandedOrders.has(order.order_id) ? (
                            <ChevronUp className="h-5 w-5 text-gray-500" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-gray-500" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Payments Details - Expandable */}
                    {expandedOrders.has(order.order_id) && (
                      <div className="p-4 bg-white">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Payment Date</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>Payment Method</TableHead>
                              <TableHead>PetPooja Bill Number</TableHead>
                              <TableHead>Payment ID</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {order.payments.map((payment, idx) => (
                              <TableRow key={payment.id || idx}>
                                <TableCell>{formatDate(payment.paid_at)}</TableCell>
                                <TableCell>
                                  <span className="font-semibold text-green-600">
                                    ₹{payment.amount.toFixed(2)}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="capitalize">
                                    {payment.payment_method}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {payment.petpooja_bill_number ? (
                                    <Badge style={{ backgroundColor: '#e92587', color: 'white' }}>
                                      {payment.petpooja_bill_number}
                                    </Badge>
                                  ) : (
                                    <span className="text-gray-400">-</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <span className="text-xs text-gray-500 font-mono">
                                    {payment.id.substring(0, 8)}...
                                  </span>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {/* Pagination Controls */}
              {paymentsData.length > itemsPerPage && (
                <div className="flex items-center justify-between mt-4 px-4 pb-4">
                  <div className="text-sm text-gray-600">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, paymentsData.length)} of {paymentsData.length} orders
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
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCurrentPage(Math.min(Math.ceil(paymentsData.length / itemsPerPage), currentPage + 1))}
                      disabled={currentPage >= Math.ceil(paymentsData.length / itemsPerPage)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </LayoutWithSidebar>
  );
};

export default Payments;
