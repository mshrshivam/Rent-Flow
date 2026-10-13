import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Building2,
  Users,
  IndianRupee,
  Wrench,
  TrendingUp,
  Calendar,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Home,
  CreditCard,
  MessageSquare,
  FileText,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import GlassCard from '@/components/ui/GlassCard';
import StatCard from '@/components/ui/StatCard';
import StatusBadge from '@/components/ui/StatusBadge';
import { useQuery } from '@tanstack/react-query';
import { getDashboardStats, getProperties, getTenantTenancies, getUnits } from '@/lib/propertyService';
import { getMaintenanceRequests } from '@/lib/maintenanceService';
import { formatINR } from '@/lib/utils';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const revenueData = [
  { month: 'Jan', revenue: 320000, profit: 240000 },
  { month: 'Feb', revenue: 350000, profit: 260000 },
  { month: 'Mar', revenue: 380000, profit: 280000 },
  { month: 'Apr', revenue: 360000, profit: 270000 },
  { month: 'May', revenue: 420000, profit: 320000 },
  { month: 'Jun', revenue: 450000, profit: 350000 },
];

const OwnerDashboard = () => {
  const { user } = useAuth();

  const { data: ownerStats } = useQuery({
    queryKey: ['dashboard-owner-stats', user?.id],
    queryFn: async () => {
      if (!user) return { properties: 0, tenants: 0, pendingRequests: 0 };
      return await getDashboardStats('owner', user.id);
    },
  });

  const { data: properties } = useQuery({
    queryKey: ['dashboard-properties', user?.id],
    queryFn: async () => {
      if (!user) return [];
      return await getProperties(user.id);
    },
  });

  const { data: units } = useQuery({
    queryKey: ['dashboard-units', user?.id],
    queryFn: async () => {
      if (!user) return [];
      // fetch units for all properties
      const props = await getProperties(user.id);
      let all: any[] = [];
      for (const p of props) {
        const u = await getUnits(p.id);
        all = all.concat(u);
      }
      return all;
    },
  });

  const { data: maintenanceRequests } = useQuery({
    queryKey: ['dashboard-maintenance', user?.id],
    queryFn: async () => {
      if (!user) return [];
      return await getMaintenanceRequests(user.id, 'owner');
    },
  });

  const { data: payments } = useQuery({
    queryKey: ['dashboard-payments', user?.id],
    queryFn: async () => {
      // owner-specific payments endpoint not implemented yet, returning empty for now
      return [];
    },
  });

  const occupiedUnits = units?.filter(u => u.status === 'occupied').length || 0;
  const totalUnits = units?.length || 1;
  const pendingMaintenance = ownerStats?.pendingRequests ?? (maintenanceRequests?.filter(m => m.status === 'pending').length || 0);

  const occupancyData = [
    { name: 'Occupied', value: occupiedUnits, color: '#3B82F6' },
    { name: 'Available', value: units?.filter(u => u.status === 'available').length || 0, color: '#14B8A6' },
    { name: 'Maintenance', value: units?.filter(u => u.status === 'maintenance').length || 0, color: '#F59E0B' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="font-display text-3xl font-bold">Welcome back, {user?.fullName?.split(' ')[0] || 'Owner'}!</h1>
            <p className="text-muted-foreground mt-1">Here's what's happening with your properties today.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/agreements" className="btn-ghost flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Agreements AI
            </Link>
            <button className="btn-primary flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Add Property
            </button>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Properties"
            value={ownerStats?.properties ?? properties?.length ?? 0}
            icon={Building2}
            variant="primary"
            delay={0}
          />
          <StatCard
            title="Tenants"
            value={ownerStats?.tenants ?? 0}
            icon={Users}
            variant="accent"
            delay={0.1}
          />
          <StatCard
            title="Occupancy Rate"
            value={`${Math.round((occupiedUnits / totalUnits) * 100)}%`}
            icon={Users}
            trend={{ value: 5.2, isPositive: true }}
            variant="success"
            delay={0.2}
          />
          <StatCard
            title="Pending Tasks"
            value={pendingMaintenance}
            icon={Wrench}
            variant="warning"
            delay={0.3}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-2"
          >
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-display text-lg font-semibold">Revenue Overview</h3>
                  <p className="text-sm text-muted-foreground">Monthly revenue breakdown</p>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-primary" />
                    <span className="text-muted-foreground">Revenue</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-accent" />
                    <span className="text-muted-foreground">Profit</span>
                  </div>
                </div>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueData} margin={{ left: 8, right: 12 }}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#14B8A6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#14B8A6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="month" stroke="rgba(255,255,255,0.5)" />
                    <YAxis
                      width={110}
                      tickMargin={8}
                      stroke="rgba(255,255,255,0.5)"
                      tickFormatter={formatINR}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(230 25% 12%)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '12px',
                      }}
                      formatter={(value: number) => [formatINR(value), '']}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#3B82F6"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorRevenue)"
                    />
                    <Area
                      type="monotone"
                      dataKey="profit"
                      stroke="#14B8A6"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorProfit)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>
          </motion.div>

          {/* Occupancy Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <GlassCard className="p-6 h-full">
              <div className="mb-6">
                <h3 className="font-display text-lg font-semibold">Unit Status</h3>
                <p className="text-sm text-muted-foreground">Current occupancy breakdown</p>
              </div>
              <div className="h-48 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={occupancyData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {occupancyData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(230 25% 12%)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 mt-4">
                {occupancyData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-muted-foreground">{item.name}</span>
                    </div>
                    <span className="font-medium">{item.value} units</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Payments */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-display text-lg font-semibold">Recent Payments</h3>
                  <p className="text-sm text-muted-foreground">Latest rent transactions</p>
                </div>
                <button className="text-primary text-sm hover:underline flex items-center gap-1">
                  View All <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-4">
                {payments && payments.length > 0 ? (
                  payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg ${payment.status === 'paid' ? 'bg-success/20' : payment.status === 'overdue' ? 'bg-destructive/20' : 'bg-warning/20'}`}>
                          {payment.status === 'paid' ? (
                            <ArrowUpRight className="w-5 h-5 text-success" />
                          ) : (
                            <ArrowDownRight className="w-5 h-5 text-destructive" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">Unit {payment.tenancy?.unit?.unit_number || 'N/A'}</p>
                          <p className="text-sm text-muted-foreground">Due: {new Date(payment.due_date).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatINR(payment.amount)}</p>
                        <StatusBadge status={payment.status as 'paid' | 'pending' | 'overdue'} />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-4">No recent payments</p>
                )}
              </div>
            </GlassCard>
          </motion.div>

          {/* Maintenance Requests */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-display text-lg font-semibold">Maintenance Requests</h3>
                  <p className="text-sm text-muted-foreground">Recent service requests</p>
                </div>
                <button className="text-primary text-sm hover:underline flex items-center gap-1">
                  View All <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-4">
                {maintenanceRequests && maintenanceRequests.length > 0 ? (
                  maintenanceRequests.map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center justify-between p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg ${
                          request.priority === 'urgent' ? 'bg-destructive/20' :
                          request.priority === 'high' ? 'bg-warning/20' :
                          'bg-muted'
                        }`}>
                          <Wrench className={`w-5 h-5 ${
                            request.priority === 'urgent' ? 'text-destructive' :
                            request.priority === 'high' ? 'text-warning' :
                            'text-muted-foreground'
                          }`} />
                        </div>
                        <div>
                          <p className="font-medium">{request.title}</p>
                          <p className="text-sm text-muted-foreground capitalize">{request.category}</p>
                        </div>
                      </div>
                      <StatusBadge status={request.status as 'pending' | 'in-progress' | 'fixed' | 'closed'} />
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-4">No maintenance requests</p>
                )}
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
};

const TenantDashboard = () => {
  const { user } = useAuth();

  const { data: tenancies } = useQuery({
    queryKey: ['tenant-tenancies', user?.id],
    queryFn: async () => {
      if (!user) return [];
      return await getTenantTenancies(user.id);
    },
  });

  const activeTenancy = tenancies && tenancies.length > 0 ? tenancies[0] : null;
  const monthlyRentValue = formatINR(activeTenancy ? Number((activeTenancy as any).rent_amount || 0) : 0);

  const { data: tenantMaintenanceRequests } = useQuery({
    queryKey: ['tenant-maintenance', user?.id, user?.email],
    queryFn: async () => {
      if (!user) return [];

      const byId = await getMaintenanceRequests(user.id, 'tenant');
      // Backward compatibility for older records that used email as tenant_id.
      if (byId.length === 0 && user.email) {
        return await getMaintenanceRequests(user.email, 'tenant');
      }
      return byId;
    },
  });

  const openRequestsCount = (tenantMaintenanceRequests || []).filter(
    (r) => r.status === 'pending' || r.status === 'in-progress'
  ).length;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="font-display text-3xl font-bold">Welcome back, {user?.fullName?.split(' ')[0] || 'Tenant'}!</h1>
            <p className="text-muted-foreground mt-1">Manage your rental with ease.</p>
          </div>
        </motion.div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Next Rent Due"
            value="Apr 1"
            icon={Calendar}
            variant="warning"
            delay={0}
          />
          <StatCard
            title="Monthly Rent"
            value={monthlyRentValue}
            icon={IndianRupee}
            variant="primary"
            delay={0.1}
          />
          <StatCard
            title="Open Requests"
            value={openRequestsCount}
            icon={Wrench}
            variant="accent"
            delay={0.2}
          />
          <StatCard
            title="Tenant Score"
            value="92"
            icon={TrendingUp}
            variant="success"
            delay={0.3}
          />
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h2 className="font-display text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <GlassCard hover glow="primary" className="p-6 cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/20">
                  <CreditCard className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Pay Rent</h3>
                  <p className="text-sm text-muted-foreground">Make a payment now</p>
                </div>
              </div>
            </GlassCard>
            <GlassCard hover glow="accent" className="p-6 cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-accent/20">
                  <Wrench className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold">Report Issue</h3>
                  <p className="text-sm text-muted-foreground">Submit a maintenance request</p>
                </div>
              </div>
            </GlassCard>
            <Link to="/agreements">
              <GlassCard hover className="p-6 cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-secondary/20">
                    <FileText className="w-6 h-6 text-secondary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Agreements AI</h3>
                    <p className="text-sm text-muted-foreground">Summarize a lease or try demos</p>
                  </div>
                </div>
              </GlassCard>
            </Link>
          </div>
        </motion.div>

        {/* My Home - Enhanced */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-2xl font-semibold mb-4">My Home</h2>
            </div>
            
            {activeTenancy ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Property Info Card */}
                <div className="lg:col-span-2">
                  <GlassCard className="p-6 h-full">
                    <div className="flex items-start gap-4 mb-6">
                      <div className="w-24 h-24 rounded-xl bg-gradient-primary flex items-center justify-center flex-shrink-0">
                        <Home className="w-10 h-10 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-display text-2xl font-semibold mb-1">
                          {(activeTenancy as any).property_name}
                        </h3>
                        <p className="text-muted-foreground mb-2">
                          Unit {(activeTenancy as any).unit_number}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {(activeTenancy as any).property_address} {(activeTenancy as any).property_city && `• ${(activeTenancy as any).property_city}`}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Lease Start</p>
                        <p className="font-semibold">
                          {activeTenancy ? new Date((activeTenancy as any).start_date).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Status</p>
                        <StatusBadge status={(activeTenancy as any).is_active ? 'active' : 'inactive'} />
                      </div>
                    </div>
                  </GlassCard>
                </div>

                {/* Quick Details Card */}
                <GlassCard className="p-6">
                  <h4 className="font-semibold mb-4">Details</h4>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Unit Type</p>
                      <p className="text-sm font-medium">Apartment</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Lease Type</p>
                      <p className="text-sm font-medium">
                        {activeTenancy ? (
                          <>
                            {new Date((activeTenancy as any).start_date).toLocaleDateString()} - 
                            {activeTenancy && (activeTenancy as any).end_date 
                              ? new Date((activeTenancy as any).end_date).toLocaleDateString() 
                              : 'Open-ended'}
                          </>
                        ) : 'N/A'}
                      </p>
                    </div>
                    <button className="w-full mt-4 btn-primary text-sm">
                      View Lease Agreement
                    </button>
                  </div>
                </GlassCard>
              </div>
            ) : (
              <GlassCard className="p-12 text-center">
                <Home className="w-16 h-16 text-muted-foreground opacity-50 mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">No Active Lease Found</h3>
                <p className="text-muted-foreground mb-6">
                  You don't have an active lease assigned. Contact your property manager to set up your unit details.
                </p>
                <button className="btn-primary inline-flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Contact Manager
                </button>
              </GlassCard>
            )}
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

const ManagerDashboard = () => {
  const { user } = useAuth();

  const { data: managerStats } = useQuery({
    queryKey: ['dashboard-manager-stats'],
    queryFn: async () => await getDashboardStats('manager'),
  });

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="font-display text-3xl font-bold">Welcome back, {user?.fullName?.split(' ')[0] || 'Manager'}!</h1>
            <p className="text-muted-foreground mt-1">Here's an overview of your managed properties.</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-semibold">Portfolio Summary</h2>
              <span className="text-xs text-muted-foreground">Live Counts</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl bg-muted/30 p-4 border border-white/5">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Total Owners</p>
                <p className="text-3xl font-bold mt-2">{managerStats?.owners ?? 0}</p>
              </div>
              <div className="rounded-xl bg-muted/30 p-4 border border-white/5">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Total Properties</p>
                <p className="text-3xl font-bold mt-2">{managerStats?.properties ?? 0}</p>
              </div>
              <div className="rounded-xl bg-muted/30 p-4 border border-white/5">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Total Tenants</p>
                <p className="text-3xl font-bold mt-2">{managerStats?.tenants ?? 0}</p>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Owners"
            value={managerStats?.owners ?? 0}
            icon={Users}
            variant="primary"
            delay={0}
          />
          <StatCard
            title="Total Properties"
            value={managerStats?.properties ?? 0}
            icon={Building2}
            variant="accent"
            delay={0.1}
          />
          <StatCard
            title="Total Tenants"
            value={managerStats?.tenants ?? 0}
            icon={Users}
            variant="success"
            delay={0.2}
          />
          <StatCard
            title="Pending Requests"
            value={managerStats?.pendingRequests ?? 0}
            icon={Wrench}
            variant="warning"
            delay={0.3}
          />
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <GlassCard className="p-6">
            <h3 className="font-display text-lg font-semibold mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button className="p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors text-left">
                <Wrench className="w-6 h-6 mb-2 text-primary" />
                <h4 className="font-medium">Handle Requests</h4>
                <p className="text-sm text-muted-foreground">View and manage maintenance</p>
              </button>
              <button className="p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors text-left">
                <CreditCard className="w-6 h-6 mb-2 text-accent" />
                <h4 className="font-medium">Track Payments</h4>
                <p className="text-sm text-muted-foreground">Monitor rent collection</p>
              </button>
              <Link to="/agreements" className="p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors text-left">
                <FileText className="w-6 h-6 mb-2 text-secondary" />
                <h4 className="font-medium">Agreements AI</h4>
                <p className="text-sm text-muted-foreground">Demo leases, summaries, and Q&amp;A</p>
              </Link>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

const Dashboard = () => {
  const { user } = useAuth();

  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Please log in to view dashboard.</p>
        </div>
      </DashboardLayout>
    );
  }

  if (user.role === 'tenant') {
    return <TenantDashboard />;
  }

  if (user.role === 'manager') {
    return <ManagerDashboard />;
  }

  return <OwnerDashboard />;
};

export default Dashboard;
