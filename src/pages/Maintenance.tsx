import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Wrench,
  Plus,
  Camera,
  Phone,
  MessageSquare,
  MapPin,
  Star,
  Clock,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  Filter,
  Sparkles,
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import GlassCard from '@/components/ui/GlassCard';
import StatusBadge from '@/components/ui/StatusBadge';
import { mockMaintenanceRequests, mockServiceProviders } from '@/data/mockData';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { createMaintenanceRequest, getMaintenanceRequests } from '@/lib/maintenanceService';
import { getAllProperties, getProperties, getTenantProperties, getUnits } from '@/lib/propertyService';
import { toast } from 'sonner';

const Maintenance = () => {
  const { user } = useAuth();

  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Please log in to view maintenance requests.</p>
        </div>
      </DashboardLayout>
    );
  }
  const [activeTab, setActiveTab] = useState<'requests' | 'providers'>('requests');
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [formData, setFormData] = useState({
    category: '',
    title: '',
    description: '',
    priority: 'medium',
    unit_id: '',
    photo: null as File | null
  });
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [properties, setProperties] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const canCreateRequest = user.role === 'tenant';

  // Load requests and property data from API based on role.
  useEffect(() => {
    const loadData = async () => {
      try {
        const requestRows = await getMaintenanceRequests(user.id, user.role as 'tenant' | 'owner' | 'manager');
        setRequests(Array.isArray(requestRows) ? requestRows : []);

        if (user.role === 'tenant') {
          const tenantProperties = await getTenantProperties(user.id);
          setProperties(tenantProperties || []);
        } else if (user.role === 'owner') {
          const ownerProperties = await getProperties(user.id);
          setProperties(ownerProperties || []);
        } else {
          const allProperties = await getAllProperties();
          setProperties(allProperties || []);
        }
      } catch (error) {
        console.error('Error loading maintenance data:', error);
      }
    };

    loadData();
  }, [user.id, user.role]);

  // Load units when property is selected
  const handlePropertyChange = async (propertyId: string) => {
    try {
      if (!propertyId) {
        setUnits([]);
        return;
      }
      const propertyUnits = await getUnits(propertyId);
      setUnits(propertyUnits || []);
    } catch (error) {
      console.error('Error loading units:', error);
      setUnits([]);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, photo: file }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const categories = [
    { id: 'all', label: 'All', icon: Wrench },
    { id: 'plumbing', label: 'Plumbing', icon: Wrench },
    { id: 'electrical', label: 'Electrical', icon: Wrench },
    { id: 'washing', label: 'Appliances', icon: Wrench },
    { id: 'general', label: 'General', icon: Wrench },
  ];

  const displayRequests = requests.length > 0 ? requests : mockMaintenanceRequests;

  const scopedRequests = user.role === 'tenant'
    ? displayRequests.filter((r) => {
        const tenantId = String(r.tenant_id || '');
        return tenantId === user.id || tenantId === user.email;
      })
    : displayRequests;

  const filteredRequests = selectedCategory === 'all'
    ? scopedRequests
    : scopedRequests.filter(r => r.category === selectedCategory);

  const priorityColors = {
    low: 'bg-muted text-muted-foreground',
    medium: 'bg-primary/20 text-primary',
    high: 'bg-warning/20 text-warning',
    urgent: 'bg-destructive/20 text-destructive',
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.category || !formData.title || !formData.unit_id) {
      toast.error('Please fill in all required fields');
      return;
    }

    const created = await createMaintenanceRequest({
      tenant_id: user.id,
      unit_id: formData.unit_id,
      category: formData.category,
      title: formData.title,
      description: formData.description,
      priority: formData.priority,
      photo: photoPreview,
    });

    if (!created) {
      toast.error('Failed to submit maintenance request');
      return;
    }

    setRequests((prev) => [created, ...prev]);
    toast.success('Maintenance request submitted successfully! Owner has been notified.');
    setShowNewRequest(false);
    setFormData({
      category: '',
      title: '',
      description: '',
      priority: 'medium',
      unit_id: '',
      photo: null
    });
    setPhotoPreview(null);
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
            <h1 className="font-display text-3xl font-bold">Maintenance</h1>
            <p className="text-muted-foreground mt-1">Track and manage maintenance requests.</p>
          </div>
          {canCreateRequest && (
            <button
              onClick={() => setShowNewRequest(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              New Request
            </button>
          )}
        </motion.div>

        <GlassCard className="flex flex-col gap-4 border-primary/20 bg-primary/[0.04] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 font-display font-semibold">
              <Sparkles className="h-5 w-5 text-primary" />
              Need help identifying damage?
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Upload a photo for AI-powered repair triage, an indicative estimate, and an agreement clause check.
            </p>
          </div>
          <Link to="/maintenance-ai" className="btn-primary flex shrink-0 items-center justify-center gap-2">
            <Camera className="h-4 w-4" />
            AI Damage Check
          </Link>
        </GlassCard>

        {/* Tabs */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setActiveTab('requests')}
            className={cn(
              'px-6 py-3 rounded-xl font-medium transition-all',
              activeTab === 'requests'
                ? 'bg-gradient-primary text-white shadow-lg shadow-primary/30'
                : 'bg-muted/50 text-muted-foreground hover:text-foreground'
            )}
          >
            My Requests
          </button>
          <button
            onClick={() => setActiveTab('providers')}
            className={cn(
              'px-6 py-3 rounded-xl font-medium transition-all',
              activeTab === 'providers'
                ? 'bg-gradient-primary text-white shadow-lg shadow-primary/30'
                : 'bg-muted/50 text-muted-foreground hover:text-foreground'
            )}
          >
            Service Providers
          </button>
        </div>

        {activeTab === 'requests' ? (
          <>
            {/* Category Filter */}
            <div className="flex items-center gap-3 overflow-x-auto pb-2">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={cn(
                    'px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all',
                    selectedCategory === category.id
                      ? 'bg-primary text-white'
                      : 'bg-muted/50 text-muted-foreground hover:text-foreground'
                  )}
                >
                  {category.label}
                </button>
              ))}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <GlassCard className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-warning/20">
                    <Clock className="w-5 h-5 text-warning" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{scopedRequests.filter(r => r.status === 'pending').length}</p>
                    <p className="text-sm text-muted-foreground">Pending</p>
                  </div>
                </div>
              </GlassCard>
              <GlassCard className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/20">
                    <Wrench className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{scopedRequests.filter(r => r.status === 'in-progress').length}</p>
                    <p className="text-sm text-muted-foreground">In Progress</p>
                  </div>
                </div>
              </GlassCard>
              <GlassCard className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-success/20">
                    <CheckCircle className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{scopedRequests.filter(r => r.status === 'fixed').length}</p>
                    <p className="text-sm text-muted-foreground">Fixed</p>
                  </div>
                </div>
              </GlassCard>
              <GlassCard className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-destructive/20">
                    <AlertTriangle className="w-5 h-5 text-destructive" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{scopedRequests.filter(r => r.priority === 'urgent' || r.priority === 'high').length}</p>
                    <p className="text-sm text-muted-foreground">High Priority</p>
                  </div>
                </div>
              </GlassCard>
            </div>

            {/* Requests List */}
            <div className="space-y-4">
              {filteredRequests.map((request, index) => (
                <motion.div
                  key={request.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <GlassCard hover className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className={cn('p-3 rounded-xl', priorityColors[request.priority])}>
                          <Wrench className="w-6 h-6" />
                        </div>
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold text-lg">{request.title}</h3>
                            <StatusBadge status={request.status} />
                            <span className={cn(
                              'px-2 py-0.5 rounded-full text-xs font-medium capitalize',
                              priorityColors[request.priority]
                            )}>
                              {request.priority}
                            </span>
                          </div>
                          <p className="text-muted-foreground">{request.description}</p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                            <span className="capitalize">{request.category}</span>
                            <span>•</span>
                            <span>Created {new Date(request.created_at || request.createdAt).toLocaleDateString()}</span>
                            {request.tenant_name && (
                              <>
                                <span>•</span>
                                <span>Tenant: {request.tenant_name}</span>
                              </>
                            )}
                            {request.assignedTo && (
                              <>
                                <span>•</span>
                                <span>Assigned to: {request.assignedTo}</span>
                              </>
                            )}
                          </div>
                          {request.photo && (
                            <div className="mt-3">
                              <img src={request.photo} alt="Issue" className="w-32 h-32 object-cover rounded-lg" />
                            </div>
                          )}
                        </div>
                      </div>
                      <button className="btn-ghost py-2 flex items-center gap-1">
                        Details <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          </>
        ) : (
          <>
            {/* Smart Service Providers */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <GlassCard className="p-6 mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-accent/20">
                    <MapPin className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Smart Assistance</h3>
                    <p className="text-sm text-muted-foreground">
                      Based on your location, we found nearby service providers
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Your location:</span>
                  <span className="font-medium">123 Main Street, New York, NY 10001</span>
                </div>
              </GlassCard>
            </motion.div>

            {/* Category Filter for Providers */}
            <div className="flex items-center gap-3 mb-6">
              {['All', 'Plumbing', 'Electrical', 'Appliances', 'General'].map((cat) => (
                <button
                  key={cat}
                  className="px-4 py-2 rounded-xl bg-muted/50 text-sm font-medium hover:bg-muted transition-colors"
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Providers Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mockServiceProviders.map((provider, index) => (
                <motion.div
                  key={provider.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <GlassCard hover glow="accent" className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-lg">{provider.name}</h3>
                        <p className="text-sm text-muted-foreground capitalize">{provider.category}</p>
                      </div>
                      <span className={cn(
                        'px-3 py-1 rounded-full text-xs font-medium',
                        provider.availability.includes('Now')
                          ? 'bg-success/20 text-success'
                          : 'bg-warning/20 text-warning'
                      )}>
                        {provider.availability}
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Star className="w-4 h-4 text-warning fill-warning" />
                        <span className="font-medium">{provider.rating}</span>
                        <span className="text-sm text-muted-foreground">({provider.reviews} reviews)</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        {provider.distance} away
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        {provider.phone}
                      </div>
                    </div>

                    <div className="flex gap-2 mt-6">
                      <button className="flex-1 btn-primary py-2 text-sm flex items-center justify-center gap-1">
                        <Phone className="w-4 h-4" /> Call
                      </button>
                      <button className="flex-1 btn-ghost py-2 text-sm flex items-center justify-center gap-1">
                        <MessageSquare className="w-4 h-4" /> Message
                      </button>
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          </>
        )}

        {/* New Request Modal */}
        {showNewRequest && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 overflow-y-auto"
            onClick={() => setShowNewRequest(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg my-8"
            >
              <GlassCard className="w-full p-8">
                <h2 className="font-display text-2xl font-bold mb-6">New Maintenance Request</h2>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">Property *</label>
                    <select 
                      className="input-glass w-full"
                      onChange={(e) => handlePropertyChange(e.target.value)}
                      required
                    >
                      <option value="">Select property</option>
                      {properties.map(prop => (
                        <option key={prop.id} value={prop.id}>{prop.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">Unit *</label>
                    <select 
                      className="input-glass w-full"
                      value={formData.unit_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, unit_id: e.target.value }))}
                      required
                      disabled={units.length === 0}
                    >
                      <option value="">Select unit</option>
                      {units.map(unit => (
                        <option key={unit.id} value={unit.id}>Unit {unit.unit_number}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">Category *</label>
                    <select 
                      className="input-glass w-full"
                      value={formData.category}
                      onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                      required
                    >
                      <option value="">Select category</option>
                      <option value="plumbing">Plumbing</option>
                      <option value="electrical">Electrical</option>
                      <option value="washing">Appliances</option>
                      <option value="general">General</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">Title *</label>
                    <input
                      type="text"
                      placeholder="Brief description of the issue"
                      className="input-glass w-full"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      required
                    />
                  </div>

                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">Description</label>
                    <textarea
                      placeholder="Provide more details about the issue..."
                      rows={4}
                      className="input-glass w-full resize-none"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">Upload Photo</label>
                    <div className="space-y-3">
                      <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-muted rounded-xl cursor-pointer hover:border-primary transition-colors">
                        <Camera className="w-5 h-5 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {formData.photo ? formData.photo.name : 'Click to upload photo'}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoChange}
                          className="hidden"
                        />
                      </label>
                      {photoPreview && (
                        <div className="relative">
                          <img src={photoPreview} alt="Preview" className="w-full h-48 object-cover rounded-xl" />
                          <button
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({ ...prev, photo: null }));
                              setPhotoPreview(null);
                            }}
                            className="absolute top-2 right-2 p-2 bg-destructive text-white rounded-lg hover:bg-destructive/80"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">Priority</label>
                    <div className="flex gap-2">
                      {['low', 'medium', 'high', 'urgent'].map((priority) => (
                        <button
                          key={priority}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, priority }))}
                          className={cn(
                            'flex-1 py-2 rounded-xl text-sm transition-colors capitalize',
                            formData.priority === priority
                              ? 'bg-primary text-white'
                              : 'bg-muted hover:bg-muted/80'
                          )}
                        >
                          {priority}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowNewRequest(false)}
                      className="flex-1 btn-ghost"
                    >
                      Cancel
                    </button>
                    <button type="submit" className="flex-1 btn-primary">
                      Submit Request
                    </button>
                  </div>
                </form>
              </GlassCard>
            </motion.div>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Maintenance;
