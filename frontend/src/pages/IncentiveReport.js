import { useEffect, useState } from 'react';
import axios from 'axios';
import LayoutWithSidebar from '../components/LayoutWithSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, TrendingUp, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const IncentiveReport = () => {
  const [orders, setOrders] = useState([]);
  const [incentiveData, setIncentiveData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalIncentive, setTotalIncentive] = useState(0);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    const token = localStorage.getItem('token');
    setLoading(true);
    try {
      const response = await axios.get(`${API}/orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Calculate incentives (1% per order)
      const ordersWithIncentive = response.data.map(order => ({
        ...order,
        incentive_amount: order.total_amount * 0.01
      }));

      // Group by order_taken_by (sales person name)
      const grouped = ordersWithIncentive.reduce((acc, order) => {
        const takenBy = order.order_taken_by || 'Unknown';
        if (!acc[takenBy]) {
          acc[takenBy] = {
            name: takenBy,
            orders_count: 0,
            total_sales: 0,
            total_incentive: 0,
            orders: []
          };
        }
        acc[takenBy].orders_count += 1;
        acc[takenBy].total_sales += order.total_amount;
        acc[takenBy].total_incentive += order.total_amount * 0.01;
        acc[takenBy].orders.push(order);
        return acc;
      }, {});

      const incentiveArray = Object.values(grouped);
      setIncentiveData(incentiveArray);
      setOrders(ordersWithIncentive);
      
      const total = incentiveArray.reduce((sum, item) => sum + item.total_incentive, 0);
      setTotalIncentive(total);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      incentiveData.map(item => ({
        'Sales Person': item.name,
        'Orders Count': item.orders_count,
        'Total Sales (₹)': item.total_sales.toFixed(2),
        'Incentive (1%)': item.total_incentive.toFixed(2)
      }))
    );
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Incentive Report');
    XLSX.writeFile(wb, `Incentive_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
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
              Incentive Report
            </h2>
            <p className="text-gray-600 mt-1">
              Sales commission report (1% per order)
            </p>
          </div>
          <Button
            onClick={exportToExcel}
            className="text-white"
            style={{ backgroundColor: '#10b981' }}
          >
            <Download className="mr-2 h-4 w-4" />
            Export to Excel
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{orders.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ₹{orders.reduce((sum, order) => sum + order.total_amount, 0).toFixed(2)}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Incentives</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" style={{ color: '#e92587' }}>
                ₹{totalIncentive.toFixed(2)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Info Alert */}
        <Alert className="bg-blue-50 border-blue-200">
          <AlertDescription className="text-blue-800">
            💡 Incentive is calculated at 1% of each order amount taken by the sales person.
          </AlertDescription>
        </Alert>

        {/* Incentive Table */}
        <Card>
          <CardHeader>
            <CardTitle>Sales Person Incentives</CardTitle>
          </CardHeader>
          <CardContent>
            {incentiveData.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">No orders found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sales Person</TableHead>
                    <TableHead className="text-right">Orders Count</TableHead>
                    <TableHead className="text-right">Total Sales</TableHead>
                    <TableHead className="text-right" style={{ color: '#e92587' }}>
                      Incentive (1%)
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incentiveData.map((person, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{person.name}</TableCell>
                      <TableCell className="text-right">{person.orders_count}</TableCell>
                      <TableCell className="text-right">₹{person.total_sales.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-semibold" style={{ color: '#e92587' }}>
                        ₹{person.total_incentive.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Total Row */}
                  <TableRow className="bg-gray-50 font-bold">
                    <TableCell>TOTAL</TableCell>
                    <TableCell className="text-right">
                      {incentiveData.reduce((sum, p) => sum + p.orders_count, 0)}
                    </TableCell>
                    <TableCell className="text-right">
                      ₹{incentiveData.reduce((sum, p) => sum + p.total_sales, 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right" style={{ color: '#e92587' }}>
                      ₹{totalIncentive.toFixed(2)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </LayoutWithSidebar>
  );
};

export default IncentiveReport;
