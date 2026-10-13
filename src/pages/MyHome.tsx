import { motion } from 'framer-motion';
import {
  Home,
  MapPin,
  IndianRupee,
  Calendar,
  Phone,
  Mail,
  FileText,
  AlertCircle,
  CheckCircle,
  Wrench,
  MessageSquare,
  Download,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import GlassCard from '@/components/ui/GlassCard';
import StatusBadge from '@/components/ui/StatusBadge';
import { useQuery } from '@tanstack/react-query';
import { getTenantTenancies } from '@/lib/propertyService';
import { toast } from 'sonner';
import { formatINR } from '@/lib/utils';

const MyHome = () => {
  const { user } = useAuth();

  const { data: tenancies, isLoading } = useQuery({
    queryKey: ['my-home-tenancies', user?.id],
    queryFn: async () => {
      if (!user) return [];
      return await getTenantTenancies(user.id);
    },
  });

  const activeTenancy = tenancies && tenancies.length > 0 ? tenancies[0] : null;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading your home details...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!activeTenancy) {
    return (
      <DashboardLayout>
        <div className="space-y-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="font-display text-3xl font-bold">My Home</h1>
            <p className="text-muted-foreground mt-1">Your current residence information</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <GlassCard className="p-12 text-center">
              <Home className="w-16 h-16 text-muted-foreground opacity-50 mx-auto mb-4" />
              <h3 className="font-semibold text-xl mb-2">No Active Lease Found</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                You don't currently have an active lease assigned. Contact your property manager to get started, or browse available homes.
              </p>
              <div className="flex gap-3 justify-center">
                <button 
                  onClick={() => window.location.href = '/search'}
                  className="btn-primary flex items-center gap-2"
                >
                  Find Homes
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => window.location.href = '/messages'}
                  className="btn-ghost flex items-center gap-2"
                >
                  <MessageSquare className="w-4 h-4" />
                  Contact Manager
                </button>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </DashboardLayout>
    );
  }

  const leaseStartDate = new Date((activeTenancy as any).start_date);
  const leaseEndDate = (activeTenancy as any).end_date ? new Date((activeTenancy as any).end_date) : null;
  const today = new Date();
  const daysRemaining = leaseEndDate ? Math.ceil((leaseEndDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="font-display text-3xl font-bold">My Home</h1>
          <p className="text-muted-foreground mt-1">Your current residence information</p>
        </motion.div>

        {/* Main Property Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <GlassCard className="p-8 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-primary/10 rounded-full -mr-32 -mt-32"></div>
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Unit Number</p>
                  <h2 className="font-display text-4xl font-bold mb-2">
                    {(activeTenancy as any).unit_number}
                  </h2>
                  <h3 className="text-xl text-muted-foreground">
                    {(activeTenancy as any).property_name}
                  </h3>
                </div>
                <StatusBadge status={(activeTenancy as any).is_active ? 'active' : 'closed'} />
              </div>

              {/* Address */}
              <div className="flex items-start gap-3 p-4 bg-white/5 rounded-lg mb-6">
                <MapPin className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Address</p>
                  <p className="text-muted-foreground">
                    {(activeTenancy as any).property_address}
                  </p>
                  {(activeTenancy as any).property_city && (
                    <p className="text-muted-foreground text-sm">
                      {(activeTenancy as any).property_city}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Key Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Monthly Rent */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <GlassCard className="p-6 h-full">
              <div className="flex items-center justify-between mb-3">
                <IndianRupee className="w-5 h-5 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground mb-1">Monthly Rent</p>
              <p className="text-2xl font-bold">
                {formatINR((activeTenancy as any).rent_amount)}
              </p>
              <p className="text-xs text-muted-foreground mt-2">Due on 1st of each month</p>
            </GlassCard>
          </motion.div>

          {/* Lease Duration */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <GlassCard className="p-6 h-full">
              <div className="flex items-center justify-between mb-3">
                <Calendar className="w-5 h-5 text-accent" />
              </div>
              <p className="text-sm text-muted-foreground mb-1">Lease Duration</p>
              <p className="text-2xl font-bold">
                {leaseStartDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </p>
              {leaseEndDate && (
                <p className="text-xs text-muted-foreground mt-2">
                  to {leaseEndDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </p>
              )}
            </GlassCard>
          </motion.div>

          {/* Lease Status */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <GlassCard className="p-6 h-full">
              <div className="flex items-center justify-between mb-3">
                {(activeTenancy as any).is_active ? (
                  <CheckCircle className="w-5 h-5 text-success" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-warning" />
                )}
              </div>
              <p className="text-sm text-muted-foreground mb-1">Status</p>
              <p className="text-2xl font-bold capitalize">
                {(activeTenancy as any).is_active ? 'Active' : 'Inactive'}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {daysRemaining !== null && daysRemaining > 0
                  ? `${daysRemaining} days remaining`
                  : 'Lease details available'}
              </p>
            </GlassCard>
          </motion.div>

          {/* Next Rent Due */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <GlassCard className="p-6 h-full">
              <div className="flex items-center justify-between mb-3">
                <FileText className="w-5 h-5 text-secondary" />
              </div>
              <p className="text-sm text-muted-foreground mb-1">Next Rent Due</p>
              <p className="text-2xl font-bold">Apr 1</p>
              <p className="text-xs text-muted-foreground mt-2">~26 days away</p>
            </GlassCard>
          </motion.div>
        </div>

        {/* Two Column Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lease Terms */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="lg:col-span-2"
          >
            <GlassCard className="p-6 h-full">
              <h3 className="font-display text-lg font-semibold mb-4">Lease Terms</h3>
              <div className="space-y-4">
                <div className="flex items-start justify-between p-3 bg-white/5 rounded-lg">
                  <div>
                    <p className="text-sm font-medium">Monthly Rent Amount</p>
                    <p className="text-xs text-muted-foreground">Your recurring monthly payment</p>
                  </div>
                  <p className="font-semibold">{formatINR((activeTenancy as any).rent_amount)}</p>
                </div>

                <div className="flex items-start justify-between p-3 bg-white/5 rounded-lg">
                  <div>
                    <p className="text-sm font-medium">Lease Start Date</p>
                    <p className="text-xs text-muted-foreground">When your tenancy began</p>
                  </div>
                  <p className="font-semibold">{leaseStartDate.toLocaleDateString()}</p>
                </div>

                <div className="flex items-start justify-between p-3 bg-white/5 rounded-lg">
                  <div>
                    <p className="text-sm font-medium">Lease Status</p>
                    <p className="text-xs text-muted-foreground">Current lease condition</p>
                  </div>
                  <StatusBadge status={(activeTenancy as any).is_active ? 'active' : 'closed'} />
                </div>

                {leaseEndDate && (
                  <div className="flex items-start justify-between p-3 bg-white/5 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">Lease End Date</p>
                      <p className="text-xs text-muted-foreground">When your lease expires</p>
                    </div>
                    <p className="font-semibold">{leaseEndDate.toLocaleDateString()}</p>
                  </div>
                )}
              </div>
            </GlassCard>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7 }}
          >
            <GlassCard className="p-6 h-full flex flex-col">
              <h3 className="font-display text-lg font-semibold mb-4">Quick Actions</h3>
              <div className="space-y-3 flex-1">
                <button className="w-full p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-left">
                  <div className="flex items-center gap-3">
                    <IndianRupee className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium">Pay Rent</p>
                      <p className="text-xs text-muted-foreground">Make a payment</p>
                    </div>
                  </div>
                </button>

                <button className="w-full p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-left">
                  <div className="flex items-center gap-3">
                    <Wrench className="w-5 h-5 text-accent" />
                    <div>
                      <p className="text-sm font-medium">Report Issue</p>
                      <p className="text-xs text-muted-foreground">Maintenance request</p>
                    </div>
                  </div>
                </button>

                <button className="w-full p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-left">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-secondary" />
                    <div>
                      <p className="text-sm font-medium">View Lease</p>
                      <p className="text-xs text-muted-foreground">Download agreement</p>
                    </div>
                  </div>
                </button>

                <button className="w-full p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-left">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-5 h-5 text-secondary" />
                    <div>
                      <p className="text-sm font-medium">Chat</p>
                      <p className="text-xs text-muted-foreground">Message manager</p>
                    </div>
                  </div>
                </button>
              </div>
            </GlassCard>
          </motion.div>
        </div>

        {/* Important Notice */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <GlassCard className="p-6 border-l-4 border-primary">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold mb-2">Important Lease Information</h4>
                <p className="text-sm text-muted-foreground">
                  Keep all lease documents and payment receipts. For any questions about your lease terms or to report issues, please contact your property manager through the Messages section.
                </p>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default MyHome;
