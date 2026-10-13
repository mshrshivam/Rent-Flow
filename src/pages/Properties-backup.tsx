import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Building2, MapPin, Users, Settings, Edit, Trash2, Eye } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import GlassCard from '@/components/ui/GlassCard';
import StatusBadge from '@/components/ui/StatusBadge';
import { getProperties, getUnits, createProperty, createUnit, getTenantProperties, getAllProperties, type Property, type Unit } from '@/lib/propertyService';
import { useAuth } from '@/contexts/AuthContext';
import { cn, formatINR } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const Properties = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Please log in to view properties.</p>
        </div>
      </DashboardLayout>
    );
  }
  const [properties, setProperties] = useState<Property[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [activeProperty, setActiveProperty] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showAddUnitDialog, setShowAddUnitDialog] = useState(false);

  useEffect(() => {
    fetchProperties();
  }, []);

  // Debug logging
  useEffect(() => {
    console.log('[Properties Debug]', { 
      loading, 
      propertiesCount: properties.length,
      unitsCount: units.length,
      activeProperty,
      user: user?.id
    });
  }, [loading, properties, units]);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      // Fetch properties based on user role
      const props = user.role === 'tenant'
        ? await getTenantProperties(user.id)
        : user.role === 'manager'
          ? await getAllProperties()
          : await getProperties(user.id);
      setProperties(props);
      
      if (props.length > 0) {
        setActiveProperty(props[0].id);
        
        // Load units for all properties
        const allUnitsPromises = props.map(p => getUnits(p.id));
        const allUnitsArrays = await Promise.all(allUnitsPromises);
        const allUnits = allUnitsArrays.flat();
        setUnits(allUnits);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching properties:', error);
      setProperties([]);
      setUnits([]);
      setLoading(false);
    }
  };

  const getUnitsForProperty = (propertyId: string) => {
    return units.filter(u => u.property_id === propertyId);
  };

  const getOccupancyRate = (propertyId: string) => {
    const propertyUnits = getUnitsForProperty(propertyId);
    const occupied = propertyUnits.filter(u => u.status === 'occupied').length;
    return propertyUnits.length > 0 ? Math.round((occupied / propertyUnits.length) * 100) : 0;
  };

  const handleAddProperty = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) {
      toast({ title: 'Error', description: 'Please login first', variant: 'destructive' });
      return;
    }

    const formData = new FormData(e.currentTarget);
    const propertyData = {
      owner_id: user.id,
      name: formData.get('name') as string,
      address: formData.get('address') as string,
      city: formData.get('city') as string,
      state: formData.get('state') as string,
      zip_code: formData.get('zip_code') as string,
      description: formData.get('description') as string,
      image_url: null,
      amenities: [],
    };

    console.log('Adding property:', propertyData);
    const newProperty = await createProperty(propertyData);
    console.log('Result:', newProperty);

    if (newProperty) {
      // Update state with new property
      const updatedProperties = [newProperty, ...properties];
      setProperties(updatedProperties);
      
      // Save to localStorage
      localStorage.setItem('properties', JSON.stringify(updatedProperties));
      
      if (properties.length === 0) {
        setActiveProperty(newProperty.id);
      }
      setShowAddDialog(false);
      toast({ title: 'Success', description: 'Property added successfully!' });
      
      // Reset form
      e.currentTarget.reset();
    } else {
      toast({ 
        title: 'Error', 
        description: 'Failed to add property. Check console for details.', 
        variant: 'destructive' 
      });
    }
  };

  const handleAddUnit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeProperty) {
      toast({ title: 'Error', description: 'Please select a property first', variant: 'destructive' });
      return;
    }

    const formData = new FormData(e.currentTarget);
    const unitData = {
      property_id: activeProperty,
      unit_number: formData.get('unit_number') as string,
      unit_type: formData.get('unit_type') as string,
      monthly_rent: parseFloat(formData.get('monthly_rent') as string),
      security_deposit: parseFloat(formData.get('security_deposit') as string),
      status: 'available',
      floor_number: parseInt(formData.get('floor_number') as string) || null,
      area_sqft: parseInt(formData.get('area_sqft') as string) || null,
    };

    console.log('Adding unit:', unitData);
    const newUnit = await createUnit(unitData);
    console.log('Unit created:', newUnit);

    if (newUnit) {
      const updatedUnits = [...units, newUnit];
      setUnits(updatedUnits);
      
      // IMPORTANT: Save to localStorage
      localStorage.setItem('units', JSON.stringify(updatedUnits));
      console.log('Units saved to localStorage:', updatedUnits);
      
      setShowAddUnitDialog(false);
      toast({ title: 'Success', description: 'Unit added successfully!' });
      
      // Reset form
      e.currentTarget.reset();
    } else {
      toast({ title: 'Error', description: 'Failed to add unit', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <p className="text-muted-foreground animate-pulse">Loading properties...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

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
            <h1 className="font-display text-3xl font-bold">Properties</h1>
            <p className="text-muted-foreground mt-1">
              {user.role === 'tenant' ? 'View your rental properties' : 'Manage your rental properties and units.'}
            </p>
          </div>
          {user.role !== 'tenant' && (
            <button className="btn-primary flex items-center gap-2" onClick={() => setShowAddDialog(true)}>
              <Plus className="w-5 h-5" />
              Add Property
            </button>
          )}
        </motion.div>

        {/* Properties Grid */}
        {properties.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {properties.map((property, index) => (
            <motion.div
              key={property.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <GlassCard
                hover
                glow={activeProperty === property.id ? 'primary' : 'none'}
                className={cn(
                  'cursor-pointer transition-all',
                  activeProperty === property.id && 'ring-2 ring-primary'
                )}
                onClick={() => setActiveProperty(property.id)}
              >
                {/* Property Image */}
                <div className="h-40 rounded-t-2xl bg-gradient-primary flex items-center justify-center relative overflow-hidden">
                  <Building2 className="w-16 h-16 text-white/50" />
                  <div className="absolute inset-0 bg-gradient-to-t from-card/80 to-transparent" />
                  <div className="absolute bottom-4 left-4">
                    <span className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm text-sm font-medium">
                      {getUnitsForProperty(property.id).length} Units
                    </span>
                  </div>
                </div>

                {/* Property Info */}
                <div className="p-6 space-y-4">
                  <div>
                    <h3 className="font-display text-lg font-semibold">{property.name}</h3>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                      <MapPin className="w-4 h-4" />
                      {property.city}, {property.state}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-xl bg-muted/30">
                      <p className="text-xs text-muted-foreground">Occupancy</p>
                      <p className="font-semibold text-lg">{getOccupancyRate(property.id)}%</p>
                    </div>
                    <div className="p-3 rounded-xl bg-muted/30">
                      <p className="text-xs text-muted-foreground">Revenue</p>
                      <p className="font-semibold text-lg">₹12.5L</p>
                    </div>
                  </div>

                  {/* Amenities */}
                  <div className="flex flex-wrap gap-2">
                    {(property.amenities || []).slice(0, 3).map((amenity) => (
                      <span key={amenity} className="px-2 py-1 rounded-lg bg-muted text-xs">
                        {amenity}
                      </span>
                    ))}
                    {(property.amenities || []).length > 3 && (
                      <span className="px-2 py-1 rounded-lg bg-muted text-xs">
                        +{(property.amenities || []).length - 3}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                    <button className="flex-1 btn-ghost py-2 text-sm flex items-center justify-center gap-1">
                      <Eye className="w-4 h-4" /> View
                    </button>
                    {user.role !== 'tenant' && (
                      <>
                        <button className="flex-1 btn-ghost py-2 text-sm flex items-center justify-center gap-1">
                          <Edit className="w-4 h-4" /> Edit
                        </button>
                        <button className="p-2 rounded-xl hover:bg-destructive/10 text-destructive transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
        ) : (
          <div className="flex items-center justify-center h-64 border border-dashed border-muted rounded-lg">
            <div className="text-center">
              <Building2 className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-muted-foreground mb-4">No properties yet</p>
              {user.role !== 'tenant' && (
                <button 
                  className="btn-primary flex items-center gap-2 mx-auto"
                  onClick={() => setShowAddDialog(true)}
                >
                  <Plus className="w-5 h-5" />
                  Create Your First Property
                </button>
              )}
            </div>
          </div>
        )}

        {/* Units Section - Only show if properties exist */}
        {properties.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-display text-xl font-semibold">
                Units in {properties.find(p => p.id === activeProperty)?.name}
              </h2>
              <p className="text-sm text-muted-foreground">
                {getUnitsForProperty(activeProperty).length} total units
              </p>
            </div>
            {user.role !== 'tenant' && (
              <button className="btn-ghost flex items-center gap-2" onClick={() => setShowAddUnitDialog(true)}>
                <Plus className="w-5 h-5" />
                Add Unit
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {getUnitsForProperty(activeProperty).map((unit, index) => (
              <motion.div
                key={unit.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
              >
                <GlassCard hover className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="font-semibold text-lg">{unit.unitNumber}</h4>
                      <p className="text-sm text-muted-foreground">{unit.type} • {unit.sqft} sqft</p>
                    </div>
                    <StatusBadge status={unit.status} />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Monthly Rent</span>
                      <span className="font-semibold">{formatINR(unit.monthly_rent ?? unit.monthlyRent)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Security Deposit</span>
                      <span className="font-medium">{formatINR(unit.security_deposit ?? unit.securityDeposit)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Area</span>
                      <span>{unit.area_sqft || unit.sqft} sqft</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1 mt-4">
                    {(unit.amenities || []).slice(0, 3).map((amenity) => (
                      <span key={amenity} className="px-2 py-0.5 rounded bg-muted text-xs">
                        {amenity}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/5">
                    {user.role !== 'tenant' ? (
                      <>
                        <button className="flex-1 py-2 rounded-xl bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors">
                          Manage
                        </button>
                        <button className="p-2 rounded-xl hover:bg-muted transition-colors">
                          <Settings className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </>
                    ) : (
                      <button className="flex-1 py-2 rounded-xl bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors">
                        View Details
                      </button>
                    )}
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </motion.div>
        )}

        {/* Add Property Dialog */}
        {showAddDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAddDialog(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md"
            >
              <GlassCard className="p-6">
                <h2 className="text-2xl font-bold mb-4">Add New Property</h2>
                <form onSubmit={handleAddProperty} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Property Name</label>
                    <input name="name" required className="input-glass w-full" placeholder="Enter property name" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Address</label>
                    <input name="address" required className="input-glass w-full" placeholder="Enter address" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">City</label>
                      <input name="city" required className="input-glass w-full" placeholder="City" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">State</label>
                      <input name="state" className="input-glass w-full" placeholder="State" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Zip Code</label>
                    <input name="zip_code" className="input-glass w-full" placeholder="Zip code" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Description</label>
                    <textarea name="description" className="input-glass w-full" rows={3} placeholder="Property description" />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button type="button" onClick={() => setShowAddDialog(false)} className="flex-1 btn-ghost">Cancel</button>
                    <button type="submit" className="flex-1 btn-primary">Add Property</button>
                  </div>
                </form>
              </GlassCard>
            </motion.div>
          </div>
        )}

        {/* Add Unit Dialog */}
        {showAddUnitDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAddUnitDialog(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md"
            >
              <GlassCard className="p-6">
                <h2 className="text-2xl font-bold mb-4">Add New Unit</h2>
                <form onSubmit={handleAddUnit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Unit Number *</label>
                    <input name="unit_number" required className="input-glass w-full" placeholder="e.g., A-101" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Unit Type *</label>
                    <input name="unit_type" required className="input-glass w-full" placeholder="e.g., 2BHK" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Monthly Rent (₹) *</label>
                      <input name="monthly_rent" type="number" step="1" required className="input-glass w-full" placeholder="25000" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Security Deposit (₹) *</label>
                      <input name="security_deposit" type="number" step="1" required className="input-glass w-full" placeholder="50000" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Floor Number</label>
                      <input name="floor_number" type="number" className="input-glass w-full" placeholder="1" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Area (sqft)</label>
                      <input name="area_sqft" type="number" className="input-glass w-full" placeholder="1200" />
                    </div>
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button type="button" onClick={() => setShowAddUnitDialog(false)} className="flex-1 btn-ghost">Cancel</button>
                    <button type="submit" className="flex-1 btn-primary">Add Unit</button>
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

export default Properties;
