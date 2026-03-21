import { useEffect, useState } from 'react';
import axios from 'axios';
import LayoutWithSidebar from '../components/LayoutWithSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RefreshCw, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PetPoojaSync = () => {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(null);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchBills();
  }, []);

  const fetchBills = async () => {
    const token = localStorage.getItem('token');
    setLoading(true);
    try {
      const response = await axios.get(`${API}/petpooja-bills`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBills(response.data);
    } catch (error) {
      console.error('Failed to fetch bills:', error);
      setError('Failed to load PetPooja bills');
    } finally {
      setLoading(false);
    }
  };

  const syncBill = async (billId) => {
    const token = localStorage.getItem('token');
    setSyncing(billId);
    try {
      await axios.post(`${API}/petpooja-bills/sync/${billId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess('Bill synced successfully!');
      fetchBills();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError(error.response?.data?.detail || 'Failed to sync bill');
      setTimeout(() => setError(''), 3000);
    } finally {
      setSyncing(null);
    }
  };

  const getSyncStatus = (bill) => {
    if (bill.synced_to_order) {
      return (
        <Badge className="bg-green-100 text-green-800">
          <CheckCircle className="mr-1 h-3 w-3" />
          Synced Successfully
        </Badge>
      );
    } else if (bill.sync_error) {
      return (
        <Badge className="bg-red-100 text-red-800">
          <XCircle className="mr-1 h-3 w-3" />
          Sync Failed
        </Badge>
      );
    } else if (!bill.has_custom_cake) {
      return (
        <Badge variant="outline" className="text-gray-600">
          No Custom Cake
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-yellow-100 text-yellow-800">
          <Clock className="mr-1 h-3 w-3" />
          Pending Sync
        </Badge>
      );
    }
  };

  if (loading) {
    return (
      <LayoutWithSidebar>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#e92587' }} />
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
            <h2 className="text-3xl font-bold" style={{ color: '#e92587' }}>
              PetPooja Sync
            </h2>
            <p className="text-gray-600 mt-1">
              All PetPooja bills with sync status
            </p>
          </div>
          <Button
            onClick={fetchBills}
            variant="outline"
            className="border-pink-600 text-pink-600 hover:bg-pink-50"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <Alert className="bg-green-50 border-green-200">
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}
        {error && (
          <Alert className="bg-red-50 border-red-200">
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {/* Info Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <div className="rounded-full p-2 bg-blue-100">
                <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold">About PetPooja Sync</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Only bills containing "Custom Cake" items will be synced. You can manually sync pending bills or they will auto-sync when payment is received.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bills Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              All PetPooja Bills ({bills.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {bills.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">No PetPooja bills found</p>
                <p className="text-sm text-gray-400 mt-2">
                  Bills will appear here when synced from PetPooja POS
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bill Number</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Has Custom Cake</TableHead>
                    <TableHead>Sync Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bills.map((bill) => (
                    <TableRow key={bill.id}>
                      <TableCell className="font-medium">{bill.bill_number}</TableCell>
                      <TableCell>
                        <div>
                          <div>{bill.customer_name || 'N/A'}</div>
                          <div className="text-sm text-gray-500">{bill.customer_phone || 'N/A'}</div>
                        </div>
                      </TableCell>
                      <TableCell>₹{(bill.amount || bill.total_amount || 0).toFixed(2)}</TableCell>
                      <TableCell>
                        {bill.has_custom_cake ? (
                          <Badge className="bg-green-100 text-green-800">Yes</Badge>
                        ) : (
                          <Badge variant="outline">No</Badge>
                        )}
                      </TableCell>
                      <TableCell>{getSyncStatus(bill)}</TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {new Date(bill.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {!bill.synced_to_order && bill.has_custom_cake && (
                          <Button
                            size="sm"
                            onClick={() => syncBill(bill.id)}
                            disabled={syncing === bill.id}
                            className="text-white"
                            style={{ backgroundColor: '#e92587' }}
                          >
                            {syncing === bill.id ? (
                              <>
                                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                Syncing...
                              </>
                            ) : (
                              'Sync Now'
                            )}
                          </Button>
                        )}
                        {bill.synced_to_order && bill.order_id && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.location.href = `/orders/${bill.order_id}`}
                          >
                            View Order
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </LayoutWithSidebar>
  );
};

export default PetPoojaSync;
