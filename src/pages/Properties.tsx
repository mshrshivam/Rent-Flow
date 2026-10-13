import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Building2, X, MapPin, Home, Zap, Pencil } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { getAllProperties, getProperties, createProperty, getUnits, createUnit, updateUnitStatus, updateUnit, type Property } from '@/lib/propertyService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { formatINR } from '@/lib/utils';

const Properties = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [showUnitDialog, setShowUnitDialog] = useState(false);
  const [showEditUnitDialog, setShowEditUnitDialog] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [editingUnit, setEditingUnit] = useState<any | null>(null);
  const [propertyUnits, setPropertyUnits] = useState<Record<string, any[]>>({});
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
  });
  const [unitFormData, setUnitFormData] = useState({
    unit_number: '',
    unit_type: '',
    monthly_rent: '',
    monthly_deposit: '',
    floor_number: '',
    area_sqft: '',
  });
  const [editUnitFormData, setEditUnitFormData] = useState({
    unit_number: '',
    unit_type: '',
    monthly_rent: '',
    status: 'available' as 'available' | 'occupied',
    area_sqft: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [updatingUnitId, setUpdatingUnitId] = useState<string | null>(null);

  const loadProperties = async () => {
    try {
      if (!user) return;
      const props = user.role === 'manager' ? await getAllProperties() : await getProperties(user.id);
      setProperties(props);
      
      // Load units for each property
      const unitsMap: Record<string, any[]> = {};
      for (const prop of props) {
        try {
          const units = await getUnits(prop.id);
          unitsMap[prop.id] = units;
        } catch (error) {
          console.error(`Error loading units for property ${prop.id}:`, error);
          unitsMap[prop.id] = [];
        }
      }
      setPropertyUnits(unitsMap);
    } catch (error) {
      console.error('Error loading properties:', error);
      toast({ title: 'Error', description: 'Failed to load properties', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProperties();
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({ title: 'Error', description: 'Please login first', variant: 'destructive' });
      return;
    }

    if (!formData.name || !formData.address || !formData.city) {
      toast({ title: 'Error', description: 'Please fill all required fields', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const newProperty = await createProperty({
        owner_id: user.id,
        name: formData.name,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        postal_code: formData.zip_code,
        country: 'USA',
      });

      if (newProperty) {
        setProperties(prev => [newProperty, ...prev]);
        setPropertyUnits(prev => ({ ...prev, [newProperty.id]: [] }));
        setShowDialog(false);
        setFormData({ name: '', address: '', city: '', state: '', zip_code: '' });
        toast({ title: 'Success', description: 'Property added successfully!' });
      }
    } catch (error) {
      console.error('Error adding property:', error);
      toast({ title: 'Error', description: 'Failed to add property', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnitInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setUnitFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !selectedPropertyId) {
      toast({ title: 'Error', description: 'Please select a property first', variant: 'destructive' });
      return;
    }

    if (!unitFormData.unit_number || !unitFormData.unit_type || !unitFormData.monthly_rent) {
      toast({ title: 'Error', description: 'Please fill all required fields', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const newUnit = await createUnit({
        property_id: selectedPropertyId,
        unit_number: unitFormData.unit_number,
        unit_type: unitFormData.unit_type,
        rent_amount: parseFloat(unitFormData.monthly_rent),
        bedrooms: null,
        bathrooms: null,
        area_sqft: unitFormData.area_sqft ? parseFloat(unitFormData.area_sqft) : null,
        status: 'available',
      });

      if (newUnit) {
        setPropertyUnits(prev => ({
          ...prev,
          [selectedPropertyId]: [newUnit, ...(prev[selectedPropertyId] || [])]
        }));
        setShowUnitDialog(false);
        setSelectedPropertyId(null);
        setUnitFormData({
          unit_number: '',
          unit_type: '',
          monthly_rent: '',
          monthly_deposit: '',
          floor_number: '',
          area_sqft: '',
        });
        toast({ title: 'Success', description: 'Unit added successfully!' });
      }
    } catch (error) {
      console.error('Error adding unit:', error);
      toast({ title: 'Error', description: 'Failed to add unit', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleUnitStatus = async (propertyId: string, unit: any) => {
    const currentStatus = unit.status === 'occupied' ? 'occupied' : 'available';
    const nextStatus = currentStatus === 'available' ? 'occupied' : 'available';

    setUpdatingUnitId(unit.id);
    try {
      const updated = await updateUnitStatus(unit.id, nextStatus);
      if (!updated) throw new Error('Update failed');

      setPropertyUnits(prev => ({
        ...prev,
        [propertyId]: (prev[propertyId] || []).map((u: any) =>
          u.id === unit.id ? { ...u, status: nextStatus } : u
        ),
      }));

      toast({ title: 'Success', description: `Unit marked as ${nextStatus}` });
    } catch (error) {
      console.error('Error updating unit status:', error);
      toast({ title: 'Error', description: 'Failed to update unit status', variant: 'destructive' });
    } finally {
      setUpdatingUnitId(null);
    }
  };

  const handleOpenEditUnitDialog = (propertyId: string, unit: any) => {
    setSelectedPropertyId(propertyId);
    setEditingUnit(unit);
    setEditUnitFormData({
      unit_number: unit.unit_number || '',
      unit_type: unit.unit_type || '',
      monthly_rent: String(unit.monthly_rent ?? unit.rent_amount ?? ''),
      status: unit.status === 'occupied' ? 'occupied' : 'available',
      area_sqft: unit.area_sqft ? String(unit.area_sqft) : '',
    });
    setShowEditUnitDialog(true);
  };

  const handleEditUnitInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditUnitFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEditUnit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingUnit || !selectedPropertyId) {
      toast({ title: 'Error', description: 'No unit selected', variant: 'destructive' });
      return;
    }

    if (!editUnitFormData.unit_number || !editUnitFormData.unit_type || !editUnitFormData.monthly_rent) {
      toast({ title: 'Error', description: 'Please fill all required fields', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const updated = await updateUnit(editingUnit.id, {
        unit_number: editUnitFormData.unit_number,
        unit_type: editUnitFormData.unit_type,
        monthly_rent: Number(editUnitFormData.monthly_rent),
        status: editUnitFormData.status,
        area_sqft: editUnitFormData.area_sqft ? Number(editUnitFormData.area_sqft) : null,
      });

      if (!updated) throw new Error('Update failed');

      setPropertyUnits(prev => ({
        ...prev,
        [selectedPropertyId]: (prev[selectedPropertyId] || []).map((u: any) =>
          u.id === editingUnit.id
            ? {
                ...u,
                unit_number: updated.unit_number,
                unit_type: updated.unit_type,
                status: updated.status,
                area_sqft: updated.area_sqft,
                monthly_rent: Number(updated.monthly_rent ?? updated.rent_amount ?? 0),
              }
            : u
        ),
      }));

      setShowEditUnitDialog(false);
      setEditingUnit(null);
      toast({ title: 'Success', description: 'Unit updated successfully!' });
    } catch (error) {
      console.error('Error updating unit:', error);
      toast({ title: 'Error', description: 'Failed to update unit', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Please log in to view properties.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="font-display text-3xl font-bold">Properties</h1>
            <p className="text-muted-foreground mt-1">Manage your rental properties</p>
          </div>
          {user.role !== 'manager' && (
            <button className="btn-primary flex items-center gap-2" onClick={() => setShowDialog(true)}>
              <Plus className="w-5 h-5" />
              Add Property
            </button>
          )}
        </motion.div>

        {loading && (
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground animate-pulse">Loading properties...</p>
          </div>
        )}

        {!loading && properties.length === 0 && (
          <div className="flex items-center justify-center h-64 border border-dashed border-muted rounded-lg">
            <div className="text-center">
              <Building2 className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-muted-foreground">No properties yet</p>
            </div>
          </div>
        )}

        {!loading && properties.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-[500px]">
            {properties.map((prop) => {
              const units = propertyUnits[prop.id] || [];
              const totalRent = units.reduce((sum, unit) => sum + (Number(unit.monthly_rent ?? unit.rent_amount ?? 0) || 0), 0);
              const avgRent = units.length > 0 ? (totalRent / units.length).toFixed(0) : 0;
              
              return (
                <motion.div
                  key={prop.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -5 }}
                  className="group relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-xl border border-slate-700 hover:border-blue-500/50 shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden flex flex-col"
                >
                  {/* Gradient Background */}
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  <div className="relative p-6 space-y-4 flex flex-col h-full overflow-hidden">
                    {/* Header with Icon */}
                    <div className="flex items-start justify-between flex-shrink-0">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="p-3 rounded-lg bg-blue-500/20 text-blue-400 group-hover:bg-blue-500/30 transition-colors flex-shrink-0">
                          <Building2 className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-lg text-white group-hover:text-blue-400 transition-colors truncate">
                            {prop.name}
                          </h3>
                          <div className="flex items-center gap-1 mt-1 text-sm text-slate-400 group-hover:text-slate-300 transition-colors truncate">
                            <MapPin className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate">{prop.city}, {prop.state}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Address */}
                    <div className="text-sm text-slate-400 flex items-center gap-2 flex-shrink-0">
                      <Home className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{prop.address}</span>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-700 flex-shrink-0">
                      <div className="text-center p-3 rounded-lg bg-slate-800/50 hover:bg-blue-500/20 transition-colors">
                        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Units</p>
                        <p className="text-2xl font-bold text-white mt-1">{units.length}</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-slate-800/50 hover:bg-green-500/20 transition-colors">
                        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Avg Rent</p>
                        <p className="text-xl font-bold text-white mt-1">{formatINR(avgRent)}</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-slate-800/50 hover:bg-purple-500/20 transition-colors">
                        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Total</p>
                        <p className="text-2xl font-bold text-white mt-1">{formatINR(totalRent)}</p>
                      </div>
                    </div>

                    {/* Units List - Grows to fill space */}
                    {units.length > 0 && (
                      <div className="pt-3 border-t border-slate-700 flex-1 flex flex-col min-h-0">
                        <p className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2 flex-shrink-0">
                          <Zap className="w-4 h-4 text-blue-400" />
                          Units Overview
                        </p>
                        <div className="space-y-2 overflow-y-auto flex-1 pr-2">
                          {units.slice(0, 4).map((unit, idx) => (
                            <motion.div
                              key={unit.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.05 }}
                              className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-slate-800/50 to-slate-700/30 hover:from-slate-800 hover:to-slate-700/50 transition-all group/unit"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-white text-sm truncate group-hover/unit:text-blue-300 transition-colors">
                                  {unit.unit_number}
                                </p>
                                <p className="text-xs text-slate-500">{unit.unit_type}</p>
                              </div>
                              <div className="text-right ml-2 flex-shrink-0 space-y-1">
                                <p className="font-bold text-green-400 text-sm">
                                  {formatINR(unit.monthly_rent ?? unit.rent_amount ?? 0)}
                                </p>
                                <div className="flex items-center gap-1 justify-end">
                                  <button
                                    onClick={() => handleOpenEditUnitDialog(prop.id, unit)}
                                    className="px-2 py-0.5 text-[10px] rounded-full border border-blue-400/40 bg-blue-500/20 text-blue-200 hover:bg-blue-500/30 transition-colors"
                                  >
                                    <span className="inline-flex items-center gap-1">
                                      <Pencil className="w-3 h-3" />
                                      Edit
                                    </span>
                                  </button>
                                  <button
                                    onClick={() => handleToggleUnitStatus(prop.id, unit)}
                                    disabled={updatingUnitId === unit.id}
                                    className={`px-2 py-0.5 text-[10px] rounded-full border transition-colors ${
                                      unit.status === 'occupied'
                                        ? 'bg-rose-500/20 text-rose-300 border-rose-400/40 hover:bg-rose-500/30'
                                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40 hover:bg-emerald-500/30'
                                    } disabled:opacity-50`}
                                  >
                                    {updatingUnitId === unit.id
                                      ? 'Updating...'
                                      : unit.status === 'occupied'
                                        ? 'Occupied'
                                        : 'Available'}
                                  </button>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                          {units.length > 4 && (
                            <p className="text-xs text-slate-500 text-center p-2 flex-shrink-0">
                              +{units.length - 4} more units
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Empty State Message */}
                    {units.length === 0 && (
                      <div className="pt-3 border-t border-slate-700 flex-1 flex items-center justify-center">
                        <p className="text-sm text-slate-400 italic">No units yet. Add your first unit!</p>
                      </div>
                    )}

                    {/* Buttons */}
                    <div className="flex gap-3 pt-4 border-t border-slate-700 flex-shrink-0">
                      <button
                        onClick={() => {
                          setSelectedPropertyId(prop.id);
                          setShowUnitDialog(true);
                        }}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white text-sm font-semibold rounded-lg transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-blue-500/50"
                      >
                        <Plus className="w-4 h-4" />
                        Add Unit
                      </button>
                    </div>
                  </div>

                  {/* Corner Accent */}
                  <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-blue-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-bl-3xl" />
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Add Property Dialog */}
        {showDialog && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Building2 className="w-6 h-6" />
                  Add New Property
                </h2>
                <button
                  onClick={() => setShowDialog(false)}
                  className="text-white hover:bg-white/20 p-1 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddProperty} className="p-6 space-y-4">
                <div>
                  <label className="text-sm font-semibold text-slate-300">Property Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g., Downtown Apartment"
                    disabled={submitting}
                    className="w-full mt-2 px-4 py-2.5 border border-slate-600 rounded-lg bg-slate-800 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all disabled:opacity-50"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-300">Address *</label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="e.g., 123 Main Street"
                    disabled={submitting}
                    className="w-full mt-2 px-4 py-2.5 border border-slate-600 rounded-lg bg-slate-800 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all disabled:opacity-50"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-slate-300">City *</label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      placeholder="e.g., New York"
                      disabled={submitting}
                      className="w-full mt-2 px-4 py-2.5 border border-slate-600 rounded-lg bg-slate-800 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all disabled:opacity-50"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-slate-300">State</label>
                    <input
                      type="text"
                      name="state"
                      value={formData.state}
                      onChange={handleInputChange}
                      placeholder="e.g., NY"
                      disabled={submitting}
                      className="w-full mt-2 px-4 py-2.5 border border-slate-600 rounded-lg bg-slate-800 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all disabled:opacity-50"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-300">Zip Code</label>
                  <input
                    type="text"
                    name="zip_code"
                    value={formData.zip_code}
                    onChange={handleInputChange}
                    placeholder="e.g., 10001"
                    disabled={submitting}
                    className="w-full mt-2 px-4 py-2.5 border border-slate-600 rounded-lg bg-slate-800 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all disabled:opacity-50"
                  />
                </div>

                <div className="flex gap-3 pt-6">
                  <button
                    type="button"
                    onClick={() => setShowDialog(false)}
                    disabled={submitting}
                    className="flex-1 px-4 py-2.5 border border-slate-600 text-slate-300 hover:bg-slate-700 rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-lg font-medium transition-all disabled:opacity-50 transform hover:scale-105 active:scale-95"
                  >
                    {submitting ? 'Adding...' : 'Add Property'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Add Unit Dialog */}
        {showUnitDialog && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between sticky top-0">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Home className="w-6 h-6" />
                  Add New Unit
                </h2>
                <button
                  onClick={() => setShowUnitDialog(false)}
                  className="text-white hover:bg-white/20 p-1 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddUnit} className="p-6 space-y-4">
                <div>
                  <label className="text-sm font-semibold text-slate-300">Unit Number *</label>
                  <input
                    type="text"
                    name="unit_number"
                    value={unitFormData.unit_number}
                    onChange={handleUnitInputChange}
                    placeholder="e.g., apt-101"
                    disabled={submitting}
                    className="w-full mt-2 px-4 py-2.5 border border-slate-600 rounded-lg bg-slate-800 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all disabled:opacity-50"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-300">Unit Type *</label>
                  <input
                    type="text"
                    name="unit_type"
                    value={unitFormData.unit_type}
                    onChange={handleUnitInputChange}
                    placeholder="e.g., 2 bed, 1 bath"
                    disabled={submitting}
                    className="w-full mt-2 px-4 py-2.5 border border-slate-600 rounded-lg bg-slate-800 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all disabled:opacity-50"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-slate-300">Monthly Rent (₹) *</label>
                    <input
                      type="number"
                      name="monthly_rent"
                      value={unitFormData.monthly_rent}
                      onChange={handleUnitInputChange}
                      placeholder="e.g., 25000"
                      disabled={submitting}
                      className="w-full mt-2 px-4 py-2.5 border border-slate-600 rounded-lg bg-slate-800 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all disabled:opacity-50"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-slate-300">Monthly Deposit (₹)</label>
                    <input
                      type="number"
                      name="monthly_deposit"
                      value={unitFormData.monthly_deposit}
                      onChange={handleUnitInputChange}
                      placeholder="e.g., 50000"
                      disabled={submitting}
                      className="w-full mt-2 px-4 py-2.5 border border-slate-600 rounded-lg bg-slate-800 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all disabled:opacity-50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-slate-300">Floor Number</label>
                    <input
                      type="number"
                      name="floor_number"
                      value={unitFormData.floor_number}
                      onChange={handleUnitInputChange}
                      placeholder="e.g., 3"
                      disabled={submitting}
                      className="w-full mt-2 px-4 py-2.5 border border-slate-600 rounded-lg bg-slate-800 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-slate-300">Area (Sqft)</label>
                    <input
                      type="number"
                      name="area_sqft"
                      value={unitFormData.area_sqft}
                      onChange={handleUnitInputChange}
                      placeholder="e.g., 900"
                      disabled={submitting}
                      className="w-full mt-2 px-4 py-2.5 border border-slate-600 rounded-lg bg-slate-800 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all disabled:opacity-50"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUnitDialog(false);
                      setSelectedPropertyId(null);
                    }}
                    disabled={submitting}
                    className="flex-1 px-4 py-2.5 border border-slate-600 text-slate-300 hover:bg-slate-700 rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-lg font-medium transition-all disabled:opacity-50 transform hover:scale-105 active:scale-95"
                  >
                    {submitting ? 'Adding...' : 'Add Unit'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Edit Unit Dialog */}
        {showEditUnitDialog && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Pencil className="w-5 h-5" />
                  Edit Unit
                </h2>
                <button
                  onClick={() => {
                    setShowEditUnitDialog(false);
                    setEditingUnit(null);
                  }}
                  className="text-white hover:bg-white/20 p-1 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleEditUnit} className="p-6 space-y-4">
                <div>
                  <label className="text-sm font-semibold text-slate-300">Unit Number *</label>
                  <input
                    type="text"
                    name="unit_number"
                    value={editUnitFormData.unit_number}
                    onChange={handleEditUnitInputChange}
                    disabled={submitting}
                    className="w-full mt-2 px-4 py-2.5 border border-slate-600 rounded-lg bg-slate-800 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all disabled:opacity-50"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-300">Unit Type *</label>
                  <input
                    type="text"
                    name="unit_type"
                    value={editUnitFormData.unit_type}
                    onChange={handleEditUnitInputChange}
                    disabled={submitting}
                    className="w-full mt-2 px-4 py-2.5 border border-slate-600 rounded-lg bg-slate-800 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all disabled:opacity-50"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-slate-300">Monthly Rent (₹) *</label>
                    <input
                      type="number"
                      name="monthly_rent"
                      value={editUnitFormData.monthly_rent}
                      onChange={handleEditUnitInputChange}
                      disabled={submitting}
                      className="w-full mt-2 px-4 py-2.5 border border-slate-600 rounded-lg bg-slate-800 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all disabled:opacity-50"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-slate-300">Area (Sqft)</label>
                    <input
                      type="number"
                      name="area_sqft"
                      value={editUnitFormData.area_sqft}
                      onChange={handleEditUnitInputChange}
                      disabled={submitting}
                      className="w-full mt-2 px-4 py-2.5 border border-slate-600 rounded-lg bg-slate-800 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all disabled:opacity-50"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-300">Status</label>
                  <select
                    name="status"
                    value={editUnitFormData.status}
                    onChange={handleEditUnitInputChange}
                    disabled={submitting}
                    className="w-full mt-2 px-4 py-2.5 border border-slate-600 rounded-lg bg-slate-800 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all disabled:opacity-50"
                  >
                    <option value="available">Available</option>
                    <option value="occupied">Occupied</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditUnitDialog(false);
                      setEditingUnit(null);
                    }}
                    disabled={submitting}
                    className="flex-1 px-4 py-2.5 border border-slate-600 text-slate-300 hover:bg-slate-700 rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-lg font-medium transition-all disabled:opacity-50"
                  >
                    {submitting ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Properties;
