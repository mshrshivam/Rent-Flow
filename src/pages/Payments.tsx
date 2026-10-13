import { motion } from 'framer-motion';
import { CreditCard, IndianRupee, Calendar, Download, Plus, Filter, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import GlassCard from '@/components/ui/GlassCard';
import StatCard from '@/components/ui/StatCard';
import StatusBadge from '@/components/ui/StatusBadge';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { formatINR } from '@/lib/utils';

interface Payment {
  id: string;
  tenant_name: string;
  property_name: string;
  unit_number: string;
  amount: number;
  due_date: string;
  paid_date?: string;
  status: 'paid' | 'pending' | 'overdue';
}

interface Tenant {
  id: string;
  full_name: string;
  property_name: string;
  unit_number: string;
  monthly_rent: number;
}

const Payments = () => {
  const { user } = useAuth();

  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Please log in to view payments.</p>
        </div>
      </DashboardLayout>
    );
  }
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [formData, setFormData] = useState({
    tenant_id: '',
    amount: '',
    due_date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    // Load tenants
    const savedTenants = localStorage.getItem('tenants');
    if (savedTenants) {
      setTenants(JSON.parse(savedTenants));
    }

    // Load payments
    const savedPayments = localStorage.getItem('payments');
    if (savedPayments) {
      setPayments(JSON.parse(savedPayments));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.tenant_id || !formData.amount) {
      toast.error('Please fill all required fields');
      return;
    }

    const tenant = tenants.find(t => t.id === formData.tenant_id);
    if (!tenant) {
      toast.error('Invalid tenant');
      return;
    }

    const newPayment: Payment = {
      id: 'payment-' + Date.now(),
      tenant_name: tenant.full_name,
      property_name: tenant.property_name,
      unit_number: tenant.unit_number,
      amount: parseFloat(formData.amount),
      due_date: formData.due_date,
      status: 'pending'
    };

    const updatedPayments = [...payments, newPayment];
    localStorage.setItem('payments', JSON.stringify(updatedPayments));
    setPayments(updatedPayments);

    setFormData({
      tenant_id: '',
      amount: '',
      due_date: new Date().toISOString().split('T')[0]
    });
    setShowAddDialog(false);
    toast.success('Payment recorded successfully!');
  };

  const handleExport = () => {
    if (payments.length === 0) {
      toast.error('No payments to export');
      return;
    }

    // Create CSV content
    const headers = ['Tenant Name', 'Property', 'Unit', 'Amount (INR)', 'Due Date', 'Status'];
    const rows = payments.map(p => [
      p.tenant_name,
      p.property_name,
      p.unit_number,
      p.amount,
      new Date(p.due_date).toLocaleDateString(),
      p.status
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payments-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast.success('Payments exported successfully!');
  };

  const totalPaid = payments.filter(p => p.status === 'paid').reduce((acc, p) => acc + p.amount, 0);
  const totalPending = payments.filter(p => p.status === 'pending').reduce((acc, p) => acc + p.amount, 0);
  const totalOverdue = payments.filter(p => p.status === 'overdue').reduce((acc, p) => acc + p.amount, 0);

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
            <h1 className="font-display text-3xl font-bold">Payments</h1>
            <p className="text-muted-foreground mt-1">Manage rent payments and transactions</p>
          </div>
          {(user?.role === 'owner' || user?.role === 'manager') && (
            <div className="flex gap-3">
              <button 
                className="btn-secondary flex items-center gap-2"
                onClick={handleExport}
              >
                <Download className="w-5 h-5" />
                Export
              </button>
              <button 
                className="btn-primary flex items-center gap-2" 
                onClick={() => setShowAddDialog(true)}
              >
                <Plus className="w-5 h-5" />
                Record Payment
              </button>
            </div>
          )}
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            title="Total Collected"
            value={formatINR(totalPaid)}
            icon={IndianRupee}
            variant="success"
            delay={0}
          />
          <StatCard
            title="Pending"
            value={formatINR(totalPending)}
            icon={Calendar}
            variant="warning"
            delay={0.1}
          />
          <StatCard
            title="Overdue"
            value={formatINR(totalOverdue)}
            icon={CreditCard}
            variant="primary"
            delay={0.2}
          />
        </div>

        {/* Payments List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-display text-lg font-semibold">Recent Transactions</h3>
              <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <Filter className="w-4 h-4" />
                Filter
              </button>
            </div>

            {payments.length > 0 ? (
              <div className="space-y-4">
                {payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${
                        payment.status === 'paid' ? 'bg-success/20' : 
                        payment.status === 'overdue' ? 'bg-destructive/20' : 
                        'bg-warning/20'
                      }`}>
                        {payment.status === 'paid' ? (
                          <ArrowUpRight className="w-5 h-5 text-success" />
                        ) : (
                          <ArrowDownRight className="w-5 h-5 text-destructive" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">
                          {payment.property_name} - Unit {payment.unit_number}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Tenant: {payment.tenant_name} • Due: {new Date(payment.due_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatINR(payment.amount)}</p>
                      <StatusBadge status={payment.status} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No payments found</p>
                <p className="text-sm mt-2">Record your first payment to get started</p>
              </div>
            )}
          </GlassCard>
        </motion.div>

        {/* Add Payment Dialog */}
        {showAddDialog && (
          <div 
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" 
            onClick={() => setShowAddDialog(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md"
            >
              <GlassCard className="p-6">
                <h2 className="text-2xl font-bold mb-4">Record Payment</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Tenant *</label>
                    <select
                      className="input-glass w-full"
                      value={formData.tenant_id}
                      onChange={(e) => {
                        const tenant = tenants.find(t => t.id === e.target.value);
                        setFormData(prev => ({ 
                          ...prev, 
                          tenant_id: e.target.value,
                          amount: tenant ? tenant.monthly_rent.toString() : ''
                        }));
                      }}
                      required
                    >
                      <option value="">Select tenant</option>
                      {tenants.map((tenant) => (
                        <option key={tenant.id} value={tenant.id}>
                          {tenant.full_name} - {tenant.property_name} Unit {tenant.unit_number}
                        </option>
                      ))}
                    </select>
                    {tenants.length === 0 && (
                      <p className="text-xs text-destructive mt-1">
                        ⚠️ Please add a tenant first
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Amount *</label>
                    <input
                      type="number"
                      step="0.01"
                      className="input-glass w-full"
                      placeholder="Enter amount"
                      value={formData.amount}
                      onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Due Date *</label>
                    <input
                      type="date"
                      className="input-glass w-full"
                      value={formData.due_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button 
                      type="button" 
                      onClick={() => setShowAddDialog(false)} 
                      className="flex-1 btn-ghost"
                    >
                      Cancel
                    </button>
                    <button type="submit" className="flex-1 btn-primary">
                      Record Payment
                    </button>
                  </div>
                </form>
              </GlassCard>
            </motion.div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Payments;
