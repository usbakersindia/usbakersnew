import { useEffect, useState } from 'react';
import axios from 'axios';
import LayoutWithSidebar from '../components/LayoutWithSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, ShoppingBag, DollarSign, Store, CheckCircle, Clock, Package, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SuperAdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [branchSummary, setBranchSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsResponse, branchResponse] = await Promise.all([
        axios.get(`${API}/dashboard/stats`),
        axios.get(`${API}/dashboard/branch-summary`)
      ]);
      setStats(statsResponse.data);
      setBranchSummary(branchResponse.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <LayoutWithSidebar>
        <div className="text-center py-12">Loading dashboard...</div>
      </LayoutWithSidebar>
    );
  }

  const statCards = [
    {
      title: 'Total Orders Today',
      value: stats?.total_orders_today || 0,
      icon: ShoppingBag,
      color: '#e92587'
    },
    {
      title: 'Revenue Today',
      value: `₹${stats?.total_revenue_today?.toLocaleString() || 0}`,
      icon: DollarSign,
      color: '#10b981'
    },
    {
      title: 'Pending Orders',
      value: stats?.pending_orders || 0,
      icon: Clock,
      color: '#f59e0b'
    },
    {
      title: 'Ready Orders',
      value: stats?.ready_orders || 0,
      icon: Package,
      color: '#3b82f6'
    },
    {
      title: 'Delivered Today',
      value: stats?.delivered_orders || 0,
      icon: CheckCircle,
      color: '#10b981'
    },
    {
      title: 'Total Outlets',
      value: stats?.total_outlets || 0,
      icon: Store,
      color: '#8b5cf6'
    },
    {
      title: 'Total Users',
      value: stats?.total_users || 0,
      icon: Users,
      color: '#6366f1'
    }
  ];

  return (
    <LayoutWithSidebar>
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {stat.title}
                </CardTitle>
                <Icon className="h-5 w-5" style={{ color: stat.color }} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" style={{ color: stat.color }}>
                  {stat.value}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Orders by Occasion */}
      {stats?.orders_by_occasion && Object.keys(stats.orders_by_occasion).length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Orders by Occasion</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(stats.orders_by_occasion).map(([occasion, count]) => (
                <div key={occasion} className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold" style={{ color: '#e92587' }}>
                    {count}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">{occasion}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Branch-wise Summary */}
      {branchSummary && branchSummary.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" style={{ color: '#e92587' }} />
              <CardTitle>Branch-wise Summary</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Outlet Name</TableHead>
                  <TableHead className="text-center">Total Orders</TableHead>
                  <TableHead className="text-center">Today's Orders</TableHead>
                  <TableHead className="text-center">Pending Orders</TableHead>
                  <TableHead className="text-right">Total Income</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {branchSummary.map((branch) => (
                  <TableRow key={branch.outlet_id}>
                    <TableCell className="font-medium">{branch.outlet_name}</TableCell>
                    <TableCell className="text-center">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                        {branch.total_orders}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                        {branch.todays_orders}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-semibold">
                        {branch.pending_orders}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-bold" style={{ color: '#e92587' }}>
                      ₹{branch.total_income.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              className="w-full text-white"
              style={{ backgroundColor: '#e92587' }}
              onClick={() => navigate('/outlets')}
              data-testid="quick-action-create-outlet"
            >
              Create New Outlet
            </Button>
            <Button
              className="w-full text-white"
              style={{ backgroundColor: '#e92587' }}
              onClick={() => navigate('/users')}
              data-testid="quick-action-create-user"
            >
              Add New User
            </Button>
            <Button
              className="w-full text-white"
              style={{ backgroundColor: '#e92587' }}
              onClick={() => navigate('/zones')}
              data-testid="quick-action-view-zones"
            >
              Manage Zones
            </Button>
          </div>
        </CardContent>
      </Card>
    </LayoutWithSidebar>
  );
};

export default SuperAdminDashboard;
