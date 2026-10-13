import { motion } from 'framer-motion';
import { Users, Plus, Search, Filter, Mail, Phone, Home, Calendar } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import GlassCard from '@/components/ui/GlassCard';
import StatusBadge from '@/components/ui/StatusBadge';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { assignTenantToFlat, createTenant, getAllProperties, getProperties, getTenants, getUnits, getUnregisteredTenants } from '@/lib/propertyService';
import { formatINR } from '@/lib/utils';

interface Property {
  id: string;
  name: string;
  city: string;
  address: string;
}

interface Unit {
  id: string;
  property_id: string;
  unit_number: string;
  monthly_rent?: number;
  rent_amount?: number;
  status?: string;
}

interface Tenant {
  id: string;
  tenant_id: string;
  full_name: string;
  email: string;
  phone: string;
  unit_id: string;
  unit_number: string;
  property_name: string;
  property_address: string;
  monthly_rent: number;
  start_date: string;
  is_active: boolean;
}

interface UnregisteredTenant {
  id: string;
  tenant_id: string;
  full_name: string;
  email: string;
  phone: string;
  created_at: string;
}

const Tenants = () => {
  const { user } = useAuth();

  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Please log in to view tenants.</p>
        </div>
      </DashboardLayout>
    );
  }
  
  const canAddTenants = user.role === 'owner' || user.role === 'manager';
  const isManager = user.role === 'manager';
  const [activeTenantTab, setActiveTenantTab] = useState<'registered' | 'unregistered'>('registered');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedUnregisteredTenant, setSelectedUnregisteredTenant] = useState<UnregisteredTenant | null>(null);
  const [selectedProperty, setSelectedProperty] = useState('');
  const [properties, setProperties] = useState<Property[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [unregisteredTenants, setUnregisteredTenants] = useState<UnregisteredTenant[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    unit_id: '',
    start_date: new Date().toISOString().split('T')[0]
  });
  const [assignFormData, setAssignFormData] = useState({
    unit_id: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: ''
  });

  // Load data on mount
  useEffect(() => {
    loadData();
  }, [user.id, user.role]);

  // Keep manager/owner tenant list up to date with near real-time polling.
  useEffect(() => {
    const interval = setInterval(() => {
      loadData();
    }, 5000);

    return () => clearInterval(interval);
  }, [user.id, user.role]);

  const loadData = async () => {
    try {
      const props = user.role === 'manager' ? await getAllProperties() : await getProperties(user.id);
      setProperties(props as Property[]);

      const unitsByProperty = await Promise.all(props.map((p: Property) => getUnits(p.id)));
      setUnits(unitsByProperty.flat() as Unit[]);

      const tenantRows = await getTenants(user.role === 'manager' ? 'all' : user.id);
      setTenants(tenantRows as unknown as Tenant[]);

      if (user.role === 'manager') {
        const unregistered = await getUnregisteredTenants();
        setUnregisteredTenants(unregistered as unknown as UnregisteredTenant[]);
      } else {
        setUnregisteredTenants([]);
      }
    } catch (error) {
      console.error('Error loading tenants page data:', error);
      toast.error('Failed to load tenants data');
    }
  };

  const selectedPropertyUnits = units.filter(u => u.property_id === selectedProperty && (u.status || 'available') === 'available');
  const availableFlatUnits = units.filter((unit) => (unit.status || 'available') === 'available');
  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredRegisteredTenants = normalizedQuery
    ? tenants.filter((tenant) => {
        const haystack = [
          tenant.full_name,
          tenant.email,
          tenant.phone,
          tenant.property_name,
          tenant.unit_number,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(normalizedQuery);
      })
    : tenants;

  const filteredUnregisteredTenants = normalizedQuery
    ? unregisteredTenants.filter((tenant) => {
        const haystack = [tenant.full_name, tenant.email, tenant.phone]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(normalizedQuery);
      })
    : unregisteredTenants;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.full_name || !formData.email || !formData.unit_id) {
      toast.error('Please fill all required fields');
      return;
    }

    const created = await createTenant({
      email: formData.email,
      full_name: formData.full_name,
      phone: formData.phone,
      unit_id: formData.unit_id,
      start_date: formData.start_date,
    });

    if (!created.success) {
      toast.error(created.error || 'Failed to add tenant');
      return;
    }

    setFormData({
      full_name: '',
      email: '',
      phone: '',
      unit_id: '',
      start_date: new Date().toISOString().split('T')[0]
    });
    setSelectedProperty('');
    setIsAddDialogOpen(false);

    toast.success('Tenant added successfully! Login password: password123');

    await loadData();
  };

  const openAssignDialog = (tenant: UnregisteredTenant) => {
    setSelectedUnregisteredTenant(tenant);
    setAssignFormData({
      unit_id: '',
      start_date: new Date().toISOString().split('T')[0],
      end_date: ''
    });
    setIsAssignDialogOpen(true);
  };

  const handleAssignTenant = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedUnregisteredTenant || !assignFormData.unit_id || !assignFormData.start_date) {
      toast.error('Please select unit and start date');
      return;
    }

    const result = await assignTenantToFlat({
      tenant_id: selectedUnregisteredTenant.tenant_id,
      unit_id: assignFormData.unit_id,
      start_date: assignFormData.start_date,
      end_date: assignFormData.end_date || undefined,
    });

    if (!result.success) {
      toast.error(result.error || 'Failed to assign tenant');
      return;
    }

    toast.success('Tenant assigned to flat successfully');
    setIsAssignDialogOpen(false);
    setSelectedUnregisteredTenant(null);
    await loadData();
  };

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
            <h1 className="font-display text-3xl font-bold">Tenants</h1>
            <p className="text-muted-foreground mt-1">Manage your tenants and leases</p>
          </div>
          {(canAddTenants) && (
            <button 
              className="btn-primary flex items-center gap-2"
              onClick={() => setIsAddDialogOpen(true)}
            >
              <Plus className="w-5 h-5" />
              Add Tenant
            </button>
          )}
        </motion.div>

        {/* Search & Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex gap-4"
        >
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search tenants..."
              className="input-glass pl-12 w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button className="btn-secondary flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </button>
        </motion.div>

        {isManager && (
          <div className="flex gap-2">
            <button
              className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTenantTab === 'registered' ? 'bg-primary text-white' : 'bg-muted/50 text-muted-foreground'}`}
              onClick={() => setActiveTenantTab('registered')}
            >
              Registered Tenants ({filteredRegisteredTenants.length})
            </button>
            <button
              className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTenantTab === 'unregistered' ? 'bg-primary text-white' : 'bg-muted/50 text-muted-foreground'}`}
              onClick={() => setActiveTenantTab('unregistered')}
            >
              Unregistered Tenants ({filteredUnregisteredTenants.length})
            </button>
          </div>
        )}

        {/* Tenants Grid */}
        {(activeTenantTab === 'registered' || !isManager) && filteredRegisteredTenants.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRegisteredTenants.map((tenant, index) => (
              <motion.div
                key={tenant.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
              >
                <GlassCard hover className="p-6">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center flex-shrink-0">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">
                        {tenant.full_name}
                      </h3>
                      <StatusBadge status={tenant.is_active ? 'active' : 'ended'} />
                    </div>
                  </div>

                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="w-4 h-4" />
                      <span className="truncate">{tenant.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="w-4 h-4" />
                      <span>{tenant.phone || 'No phone'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Home className="w-4 h-4" />
                      <span className="truncate">
                        {tenant.property_name} - Unit {tenant.unit_number}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {tenant.start_date ? new Date(tenant.start_date).toLocaleDateString() : 'N/A'} - Ongoing
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Monthly Rent</span>
                    <span className="font-semibold">{formatINR(tenant.monthly_rent)}</span>
                  </div>

                  {isManager && (
                    <div className="mt-3">
                      <button
                        className="btn-secondary w-full"
                        onClick={() => {
                          const identifier = tenant.email || tenant.tenant_id;
                          window.location.href = `/messages?chatUser=${encodeURIComponent(identifier)}&chatName=${encodeURIComponent(tenant.full_name || '')}`;
                        }}
                      >
                        Chat With Tenant
                      </button>
                    </div>
                  )}
                </GlassCard>
              </motion.div>
            ))}
          </div>
        ) : (activeTenantTab === 'unregistered' && isManager && filteredUnregisteredTenants.length > 0) ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredUnregisteredTenants.map((tenant, index) => (
              <motion.div
                key={tenant.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 * index }}
              >
                <GlassCard hover className="p-6">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center flex-shrink-0">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{tenant.full_name || 'Unnamed Tenant'}</h3>
                      <StatusBadge status="pending" />
                    </div>
                  </div>

                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="w-4 h-4" />
                      <span className="truncate">{tenant.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="w-4 h-4" />
                      <span>{tenant.phone || 'No phone'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>Registered {tenant.created_at ? new Date(tenant.created_at).toLocaleDateString() : 'N/A'}</span>
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-white/5">
                    <button className="btn-primary w-full" onClick={() => openAssignDialog(tenant)}>
                      Add To Flat
                    </button>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        ) : (
          <GlassCard className="p-12 text-center">
            <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-xl font-semibold mb-2">
              {activeTenantTab === 'unregistered' && isManager ? 'No Unregistered Tenants' : 'No Tenants Found'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {activeTenantTab === 'unregistered' && isManager
                ? 'All registered tenants are currently assigned to flats.'
                : 'Get started by adding your first tenant.'}
            </p>
            {(canAddTenants) && (
              <button 
                className="btn-primary"
                onClick={() => setIsAddDialogOpen(true)}
              >
                <Plus className="w-5 h-5 mr-2" />
                Add Tenant
              </button>
            )}
          </GlassCard>
        )}

        {/* Add Tenant Dialog */}
        {isAddDialogOpen && (
          <div 
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setIsAddDialogOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md"
            >
              <GlassCard className="p-6">
                <h2 className="text-2xl font-bold mb-4">Add New Tenant</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="full_name">Full Name *</Label>
                    <Input
                      id="full_name"
                      value={formData.full_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                      placeholder="Enter tenant's full name"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="Enter tenant's email"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="Enter tenant's phone number"
                    />
                  </div>

                  <div>
                    <Label htmlFor="property">Property *</Label>
                    <select
                      id="property"
                      value={selectedProperty}
                      onChange={(e) => {
                        setSelectedProperty(e.target.value);
                        setFormData(prev => ({ ...prev, unit_id: '' }));
                      }}
                      className="input-glass w-full"
                      required
                    >
                      <option value="">Select a property</option>
                      {properties.map((property) => (
                        <option key={property.id} value={property.id}>
                          {property.name} - {property.city}
                        </option>
                      ))}
                    </select>
                    {properties.length === 0 && (
                      <p className="text-xs text-destructive mt-1">
                        ⚠️ Please add a property first
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="unit">Unit *</Label>
                    <select
                      id="unit"
                      value={formData.unit_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, unit_id: e.target.value }))}
                      className="input-glass w-full"
                      disabled={!selectedProperty}
                      required
                    >
                      <option value="">Select a unit</option>
                      {selectedPropertyUnits.map((unit) => (
                        <option key={unit.id} value={unit.id}>
                          Unit {unit.unit_number} - {formatINR(unit.monthly_rent ?? unit.rent_amount)}/month
                        </option>
                      ))}
                    </select>
                    {selectedProperty && selectedPropertyUnits.length === 0 && (
                      <p className="text-xs text-destructive mt-1">
                        ⚠️ Please add a unit to this property first
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="start_date">Lease Start Date *</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsAddDialogOpen(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" className="flex-1">
                      Add Tenant
                    </Button>
                  </div>
                </form>
              </GlassCard>
            </motion.div>
          </div>
        )}

        {/* Assign Unregistered Tenant Dialog */}
        {isAssignDialogOpen && selectedUnregisteredTenant && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setIsAssignDialogOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md"
            >
              <GlassCard className="p-6">
                <h2 className="text-2xl font-bold mb-2">Assign Tenant To Flat</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  {selectedUnregisteredTenant.full_name} ({selectedUnregisteredTenant.email})
                </p>

                <form onSubmit={handleAssignTenant} className="space-y-4">
                  <div>
                    <Label htmlFor="assign_unit">Flat *</Label>
                    <select
                      id="assign_unit"
                      value={assignFormData.unit_id}
                      onChange={(e) => setAssignFormData((prev) => ({ ...prev, unit_id: e.target.value }))}
                      className="input-glass w-full"
                      required
                    >
                      <option value="">Select a flat</option>
                      {availableFlatUnits.map((unit) => {
                        const property = properties.find((item) => item.id === unit.property_id);
                        return (
                          <option key={unit.id} value={unit.id}>
                            {(property?.name || 'Property')} - Unit {unit.unit_number} - {formatINR(unit.monthly_rent ?? unit.rent_amount)}/month
                          </option>
                        );
                      })}
                    </select>
                    {availableFlatUnits.length === 0 && (
                      <p className="text-xs text-destructive mt-1">
                        ⚠️ No available flats found
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="assign_start_date">Lease Start Date *</Label>
                    <Input
                      id="assign_start_date"
                      type="date"
                      value={assignFormData.start_date}
                      onChange={(e) => setAssignFormData((prev) => ({ ...prev, start_date: e.target.value }))}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="assign_end_date">Lease End Date (Optional)</Label>
                    <Input
                      id="assign_end_date"
                      type="date"
                      value={assignFormData.end_date}
                      onChange={(e) => setAssignFormData((prev) => ({ ...prev, end_date: e.target.value }))}
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsAssignDialogOpen(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" className="flex-1">
                      Assign
                    </Button>
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

export default Tenants;
