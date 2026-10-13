import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  MapPin,
  SlidersHorizontal,
  Grid,
  List,
  Heart,
  Bed,
  Bath,
  Square,
  Star,
  X,
  ChevronDown,
  MessageSquare,
  Phone,
  Mail,
  Send,
  User,
  Paperclip,
  File,
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import GlassCard from '@/components/ui/GlassCard';
import StatusBadge from '@/components/ui/StatusBadge';
import { mockUnits, mockProperties } from '@/data/mockData';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { formatINR } from '@/lib/utils';

const SearchHomes = () => {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<any>(null);
  const [showTourModal, setShowTourModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [tourData, setTourData] = useState({ name: '', email: '', phone: '', date: '', time: '' });
  const [filters, setFilters] = useState({
    type: '',
    minRent: '',
    maxRent: '',
    location: '',
    bedrooms: '',
    bathrooms: '',
    minSqft: '',
    maxSqft: '',
    amenities: [] as string[],
    status: 'available',
  });
  const [properties, setProperties] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAvailableUnits = async () => {
      try {
        setLoading(true);
        // Fetch all available units with property details from the API
        const res = await fetch('/api/units?status=available');
        if (res.ok) {
          const data = await res.json();
          setUnits(data);
        } else {
          // Fallback to localStorage if API fails
          const storedUnits = localStorage.getItem('units');
          if (storedUnits) {
            const allUnits = JSON.parse(storedUnits);
            setUnits(allUnits.filter((u: any) => u.status === 'available'));
          }
        }
      } catch (error) {
        console.error('Error fetching units:', error);
        // Fallback to localStorage
        const storedUnits = localStorage.getItem('units');
        if (storedUnits) {
          const allUnits = JSON.parse(storedUnits);
          setUnits(allUnits.filter((u: any) => u.status === 'available'));
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchAvailableUnits();
  }, []);

  useEffect(() => {
    const loadFavorites = async () => {
      if (!user?.id || user.role !== 'tenant') return;
      try {
        const res = await fetch(`/api/favorites?tenantId=${encodeURIComponent(user.id)}`);
        if (!res.ok) return;
        const rows = await res.json();
        const favUnitIds = Array.isArray(rows) ? rows.map((r: any) => r.unit_id) : [];
        setFavorites(favUnitIds);
      } catch (error) {
        console.error('Error loading favorites:', error);
      }
    };

    loadFavorites();
  }, [user?.id, user?.role]);

  const displayUnits = units.length > 0 ? units : (loading ? [] : mockUnits.filter(u => u.status === 'available'));
  const displayProperties = properties.length > 0 ? properties : (loading ? [] : mockProperties);

  const getPropertyDetails = (propertyId: string) => {
    return displayProperties.find(p => p.id === propertyId);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const newFiles = Array.from(files);
      if (selectedFiles.length + newFiles.length > 5) {
        toast.error('Maximum 5 files allowed');
        return;
      }
      const oversized = newFiles.find(f => f.size > 10 * 1024 * 1024);
      if (oversized) {
        toast.error(`${oversized.name} exceeds 10MB limit`);
        return;
      }
      setSelectedFiles(prev => [...prev, ...newFiles]);
      toast.success(`${newFiles.length} file(s) selected`);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const toggleFavorite = async (unitId: string) => {
    const alreadyFavorite = favorites.includes(unitId);
    setFavorites((prev) =>
      alreadyFavorite ? prev.filter((id) => id !== unitId) : [...prev, unitId]
    );

    if (!user?.id || user.role !== 'tenant') {
      toast.success(alreadyFavorite ? 'Removed from favorites' : 'Added to favorites');
      return;
    }

    try {
      if (alreadyFavorite) {
        await fetch('/api/favorites', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenant_id: user.id, unit_id: unitId }),
        });
      } else {
        await fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenant_id: user.id, unit_id: unitId }),
        });
      }
      toast.success(alreadyFavorite ? 'Removed from favorites' : 'Added to favorites');
    } catch (error) {
      // Roll back optimistic update if API call fails.
      setFavorites((prev) =>
        alreadyFavorite ? [...prev, unitId] : prev.filter((id) => id !== unitId)
      );
      toast.error('Failed to update favorites');
    }
  };

  const handleRequestTour = (unit: any) => {
    setSelectedUnit(unit);
    setShowTourModal(true);
  };

  const handleSubmitTour = async (e: React.FormEvent) => {
    e.preventDefault();
    const tourRequest = {
      id: 'tour-' + Date.now(),
      unit_id: selectedUnit.id,
      unit_number: selectedUnit.unitNumber || selectedUnit.unit_number,
      property_name: getPropertyDetails(selectedUnit.propertyId || selectedUnit.property_id)?.name,
      ...tourData,
      created_at: new Date().toISOString()
    };
    
    try {
      if (!user?.id) {
        throw new Error('Please log in to request a tour');
      }

      const res = await fetch('/api/tour-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unit_id: selectedUnit.id,
          tenant_id: user.id,
          name: tourData.name,
          email: tourData.email,
          phone: tourData.phone,
          date: tourData.date,
          time: tourData.time,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to request tour');
      }

      toast.success('Tour request submitted successfully! Owner has been notified.');
      setShowTourModal(false);
      setTourData({ name: '', email: '', phone: '', date: '', time: '' });
    } catch (error) {
      const existingTours = localStorage.getItem('tourRequests');
      const tours = existingTours ? JSON.parse(existingTours) : [];
      tours.push(tourRequest);
      localStorage.setItem('tourRequests', JSON.stringify(tours));
      toast.success('Tour request saved locally.');
    }
  };

  const toggleAmenity = (amenity: string) => {
    setFilters(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  const applyFilters = () => {
    let filtered = displayUnits;
    
    if (filters.type) filtered = filtered.filter(u => u.type === filters.type || u.unit_type === filters.type);
    if (filters.minRent) filtered = filtered.filter(u => (u.monthlyRent || u.monthly_rent || u.rent_amount) >= Number(filters.minRent));
    if (filters.maxRent) filtered = filtered.filter(u => (u.monthlyRent || u.monthly_rent || u.rent_amount) <= Number(filters.maxRent));
    if (filters.bedrooms) filtered = filtered.filter(u => u.bedrooms >= Number(filters.bedrooms));
    if (filters.bathrooms) filtered = filtered.filter(u => u.bathrooms >= Number(filters.bathrooms));
    if (filters.minSqft) filtered = filtered.filter(u => (u.sqft || u.area_sqft) >= Number(filters.minSqft));
    if (filters.maxSqft) filtered = filtered.filter(u => (u.sqft || u.area_sqft) <= Number(filters.maxSqft));
    
    return filtered;
  };

  const filteredUnits = applyFilters();

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="font-display text-3xl font-bold">Find Your Perfect Home</h1>
          <p className="text-muted-foreground mt-1">Browse available apartments and houses.</p>
        </motion.div>

        {/* Search & Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <GlassCard className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search Input */}
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search by location, property name..."
                  className="input-glass pl-12 w-full"
                />
              </div>

              {/* Quick Filters */}
              <div className="flex items-center gap-3">
                <select 
                  className="input-glass px-4 py-3 min-w-[140px]"
                  value={filters.type}
                  onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                >
                  <option value="">All Types</option>
                  <option value="Studio">Studio</option>
                  <option value="1BHK">1 BHK</option>
                  <option value="2BHK">2 BHK</option>
                  <option value="3BHK">3 BHK</option>
                </select>

                <select 
                  className="input-glass px-4 py-3 min-w-[140px]"
                  onChange={(e) => {
                    const [min, max] = e.target.value.split('-');
                    setFilters(prev => ({ ...prev, minRent: min, maxRent: max || '' }));
                  }}
                >
                  <option value="">Price Range</option>
                  <option value="0-15000">Under ₹15,000</option>
                  <option value="15000-25000">₹15,000 - ₹25,000</option>
                  <option value="25000-35000">₹25,000 - ₹35,000</option>
                  <option value="35000-">₹35,000+</option>
                </select>

                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={cn(
                    'btn-ghost flex items-center gap-2',
                    showFilters && 'bg-primary/20 text-primary border-primary/30'
                  )}
                >
                  <SlidersHorizontal className="w-5 h-5" />
                  Filters
                </button>

                <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/50">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={cn(
                      'p-2 rounded-lg transition-colors',
                      viewMode === 'grid' ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Grid className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={cn(
                      'p-2 rounded-lg transition-colors',
                      viewMode === 'list' ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <List className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Extended Filters */}
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-6 pt-6 border-t border-white/5"
              >
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">Bedrooms</label>
                    <div className="flex gap-2">
                      {['Any', '1', '2', '3', '4+'].map((bed) => (
                        <button
                          key={bed}
                          onClick={() => setFilters(prev => ({ ...prev, bedrooms: bed === 'Any' ? '' : bed.replace('+', '') }))}
                          className={cn(
                            'flex-1 py-2 rounded-lg transition-colors text-sm',
                            filters.bedrooms === (bed === 'Any' ? '' : bed.replace('+', ''))
                              ? 'bg-primary text-white'
                              : 'bg-muted hover:bg-primary/20'
                          )}
                        >
                          {bed}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">Bathrooms</label>
                    <div className="flex gap-2">
                      {['Any', '1', '2', '3+'].map((bath) => (
                        <button
                          key={bath}
                          onClick={() => setFilters(prev => ({ ...prev, bathrooms: bath === 'Any' ? '' : bath.replace('+', '') }))}
                          className={cn(
                            'flex-1 py-2 rounded-lg transition-colors text-sm',
                            filters.bathrooms === (bath === 'Any' ? '' : bath.replace('+', ''))
                              ? 'bg-primary text-white'
                              : 'bg-muted hover:bg-primary/20'
                          )}
                        >
                          {bath}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">Min Sqft</label>
                    <input 
                      type="number" 
                      placeholder="Min" 
                      className="input-glass w-full py-2"
                      value={filters.minSqft}
                      onChange={(e) => setFilters(prev => ({ ...prev, minSqft: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">Max Sqft</label>
                    <input 
                      type="number" 
                      placeholder="Max" 
                      className="input-glass w-full py-2"
                      value={filters.maxSqft}
                      onChange={(e) => setFilters(prev => ({ ...prev, maxSqft: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="text-sm text-muted-foreground mb-2 block">Amenities</label>
                  <div className="flex flex-wrap gap-2">
                    {['Parking', 'AC', 'Balcony', 'Furnished', 'Gym', 'Pool', 'Pet Friendly', 'Laundry'].map((amenity) => (
                      <button
                        key={amenity}
                        onClick={() => toggleAmenity(amenity)}
                        className={cn(
                          'px-4 py-2 rounded-lg transition-colors text-sm',
                          filters.amenities.includes(amenity)
                            ? 'bg-primary text-white'
                            : 'bg-muted hover:bg-primary/20 hover:text-primary'
                        )}
                      >
                        {amenity}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </GlassCard>
        </motion.div>

        {/* Results Count */}
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground">
            <span className="font-semibold text-foreground">{filteredUnits.length}</span> homes available
          </p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            Sort by:
            <button className="flex items-center gap-1 text-foreground font-medium">
              Relevance <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Results Grid */}
        <div className={cn(
          'gap-6',
          viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'space-y-4'
        )}>
          {filteredUnits.map((unit, index) => {
            const property = unit.property_name ? {
              name: unit.property_name,
              city: unit.city,
              address: unit.address,
              state: unit.state
            } : getPropertyDetails(unit.propertyId || unit.property_id);
            const isFavorite = favorites.includes(unit.id);
            const unitNumber = unit.unitNumber || unit.unit_number;
            const monthlyRent = unit.monthlyRent || unit.monthly_rent || unit.rent_amount;
            const sqft = unit.sqft || unit.area_sqft;

            return (
              <motion.div
                key={unit.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <GlassCard hover glow="primary" className="overflow-hidden cursor-pointer">
                  {/* Image */}
                  <div className="relative h-48 bg-gradient-accent">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-6xl opacity-30">🏠</div>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
                    
                    {/* Badges */}
                    <div className="absolute top-4 left-4 flex gap-2">
                      <StatusBadge status={unit.status || 'available'} />
                      <span className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm text-xs font-medium">
                        {unit.type || unit.unit_type}
                      </span>
                    </div>

                    {/* Favorite Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(unit.id);
                      }}
                      className="absolute top-4 right-4 p-2 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors"
                    >
                      <Heart className={cn('w-5 h-5', isFavorite && 'fill-destructive text-destructive')} />
                    </button>

                    {/* Price */}
                    <div className="absolute bottom-4 left-4">
                      <p className="text-2xl font-display font-bold">{formatINR(monthlyRent)}</p>
                      <p className="text-sm text-foreground/60">/month</p>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="p-5 space-y-4">
                    <div>
                      <h3 className="font-semibold text-lg">{unitNumber}</h3>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        {property?.name}, {property?.city}
                      </div>
                    </div>

                    {/* Specs */}
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Bed className="w-4 h-4 text-muted-foreground" />
                        <span>{unit.bedrooms} Bed</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Bath className="w-4 h-4 text-muted-foreground" />
                        <span>{unit.bathrooms} Bath</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Square className="w-4 h-4 text-muted-foreground" />
                        <span>{sqft} sqft</span>
                      </div>
                    </div>

                    {/* Amenities */}
                    {unit.amenities && (
                      <div className="flex flex-wrap gap-1">
                        {unit.amenities.slice(0, 3).map((amenity: string) => (
                          <span key={amenity} className="px-2 py-1 rounded bg-muted text-xs">
                            {amenity}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRequestTour(unit);
                        }}
                        className="flex-1 btn-primary py-2 text-sm"
                      >
                        Request Tour
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedUnit(unit);
                          setShowDetailsModal(true);
                        }}
                        className="btn-ghost py-2 text-sm"
                      >
                        Details
                      </button>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>

        {/* Tour Request Modal */}
        {showTourModal && selectedUnit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4" onClick={() => setShowTourModal(false)}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md"
            >
              <GlassCard className="p-6">
                <h2 className="font-display text-2xl font-bold mb-4">Request Tour</h2>
                <p className="text-muted-foreground mb-6">Schedule a tour for {selectedUnit.unitNumber || selectedUnit.unit_number}</p>
                
                <form onSubmit={handleSubmitTour} className="space-y-4">
                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">Name *</label>
                    <input
                      type="text"
                      required
                      className="input-glass w-full"
                      value={tourData.name}
                      onChange={(e) => setTourData(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">Email *</label>
                    <input
                      type="email"
                      required
                      className="input-glass w-full"
                      value={tourData.email}
                      onChange={(e) => setTourData(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">Phone *</label>
                    <input
                      type="tel"
                      required
                      className="input-glass w-full"
                      value={tourData.phone}
                      onChange={(e) => setTourData(prev => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">Preferred Date *</label>
                    <input
                      type="date"
                      required
                      className="input-glass w-full"
                      value={tourData.date}
                      onChange={(e) => setTourData(prev => ({ ...prev, date: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">Preferred Time *</label>
                    <input
                      type="time"
                      required
                      className="input-glass w-full"
                      value={tourData.time}
                      onChange={(e) => setTourData(prev => ({ ...prev, time: e.target.value }))}
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setShowTourModal(false)} className="flex-1 btn-ghost">
                      Cancel
                    </button>
                    <button type="submit" className="flex-1 btn-primary">
                      Submit Request
                    </button>
                  </div>
                </form>
              </GlassCard>
            </motion.div>
          </div>
        )}

          {/* Property Details Modal with Owner Chat */}
          {showDetailsModal && selectedUnit && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4" onClick={() => setShowDetailsModal(false)}>
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              >
                <GlassCard className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h2 className="font-display text-2xl font-bold mb-2">{selectedUnit.unit_number}</h2>
                      <p className="text-muted-foreground">{formatINR(selectedUnit.rent_amount ?? selectedUnit.monthlyRent ?? selectedUnit.monthly_rent)}/month</p>
                    </div>
                    <button onClick={() => setShowDetailsModal(false)} className="p-2 hover:bg-muted rounded-lg transition-colors">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Property Details */}
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-semibold text-sm text-muted-foreground mb-2">Property</h3>
                        <p className="font-medium">{selectedUnit.property_name}</p>
                        <p className="text-sm text-muted-foreground mt-1">{selectedUnit.address}, {selectedUnit.city} {selectedUnit.state}</p>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div className="p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <Bed className="w-4 h-4 text-muted-foreground" />
                            <p className="text-xs text-muted-foreground">Bedrooms</p>
                          </div>
                          <p className="text-lg font-semibold">{selectedUnit.bedrooms}</p>
                        </div>
                        <div className="p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <Bath className="w-4 h-4 text-muted-foreground" />
                            <p className="text-xs text-muted-foreground">Bathrooms</p>
                          </div>
                          <p className="text-lg font-semibold">{selectedUnit.bathrooms}</p>
                        </div>
                        <div className="p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <Square className="w-4 h-4 text-muted-foreground" />
                            <p className="text-xs text-muted-foreground">Area</p>
                          </div>
                          <p className="text-lg font-semibold">{selectedUnit.area_sqft} sqft</p>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-white/10">
                        <h3 className="font-semibold text-sm text-muted-foreground mb-3">About</h3>
                        <p className="text-sm">
                          A beautiful {selectedUnit.bedrooms} bedroom, {selectedUnit.bathrooms} bathroom unit in {selectedUnit.property_name}. Ready for move-in with modern amenities and comfortable living space.
                        </p>
                      </div>
                    </div>

                    {/* Chat with Owner */}
                    <div className="flex flex-col bg-muted/30 rounded-lg p-4">
                      <div className="mb-4 pb-4 border-b border-white/10">
                        <h3 className="font-semibold mb-2">Contact Owner/Manager</h3>
                        <div className="space-y-2">
                          <div className="flex items-center gap-3 p-2 bg-white/5 rounded-lg">
                            <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center">
                              <User className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">Property Owner</p>
                              <p className="text-xs text-muted-foreground">Available 24/7</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Chat Area */}
                      <div className="flex-1 flex flex-col gap-3 mb-4">
                        <div className="text-center py-4">
                          <p className="text-xs text-muted-foreground">Send a message to inquire about this property</p>
                        </div>
                      </div>

                      {/* Message Input */}
                      <div className="space-y-2">
                        {/* File input */}
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          accept="image/*,.pdf,.doc,.docx,.txt,.zip"
                          onChange={handleFileSelect}
                          className="hidden"
                        />
                        
                        {/* Display selected files */}
                        {selectedFiles.length > 0 && (
                          <div className="flex flex-wrap gap-2 p-2 bg-muted/30 rounded-lg">
                            {selectedFiles.map((file, index) => (
                              <div key={index} className="flex items-center gap-2 bg-muted/50 px-2 py-1 rounded-lg text-xs">
                                <File className="w-3 h-3 text-primary" />
                                <span className="max-w-[120px] truncate">{file.name}</span>
                                <span className="text-muted-foreground">({formatFileSize(file.size)})</span>
                                <button
                                  onClick={() => removeFile(index)}
                                  className="ml-1 text-muted-foreground hover:text-destructive transition-colors"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="p-2 rounded-lg hover:bg-muted/50 transition-colors"
                            title="Attach files"
                          >
                            <Paperclip className="w-5 h-5 text-muted-foreground" />
                          </button>
                          <textarea
                            placeholder="Ask about the property, schedule a viewing, or request more information..."
                            value={chatMessage}
                            onChange={(e) => setChatMessage(e.target.value)}
                            className="input-glass flex-1 resize-none text-sm"
                            rows={3}
                          />
                        </div>
                        <button
                          onClick={async () => {
                            if (!chatMessage.trim() && selectedFiles.length === 0) {
                              toast.error('Please enter a message or attach files');
                              return;
                            }

                            if (!user?.id) {
                              toast.error('Please log in to send messages');
                              return;
                            }

                            setIsSendingMessage(true);
                            try {
                              // Upload files first if any selected
                              let attachments = [];
                              if (selectedFiles.length > 0) {
                                toast.info('Uploading files...');
                                const formData = new FormData();
                                selectedFiles.forEach(file => {
                                  formData.append('files', file);
                                });

                                const uploadResponse = await fetch('/api/upload', {
                                  method: 'POST',
                                  body: formData,
                                });

                                if (!uploadResponse.ok) {
                                  throw new Error('Failed to upload files');
                                }

                                const uploadData = await uploadResponse.json();
                                attachments = uploadData.files;
                              }

                              const response = await fetch('/api/property-inquiries', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  unit_id: selectedUnit.id,
                                  unit_number: selectedUnit.unit_number || selectedUnit.unitNumber,
                                  property_name: selectedUnit.property_name,
                                  // Prefer email because backend can reliably resolve or create users from email.
                                  tenant_id: user.email || user.id,
                                  content: chatMessage.trim() || 'Sent file(s)',
                                  attachments,
                                }),
                              });

                              if (!response.ok) {
                                const errorData = await response.json().catch(() => ({}));
                                throw new Error(errorData.error || 'Failed to send message');
                              }

                              const data = await response.json();
                              toast.success(`Message saved and ${data.owner?.full_name || 'owner'} notified`);
                              setChatMessage('');
                              setSelectedFiles([]);
                            } catch (error: any) {
                              toast.error(error.message || 'Failed to send message. Please try again.');
                            } finally {
                              setIsSendingMessage(false);
                            }
                          }}
                          disabled={isSendingMessage || (!chatMessage.trim() && selectedFiles.length === 0)}
                          className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          <Send className="w-4 h-4" />
                          {isSendingMessage ? 'Sending...' : 'Send Message'}
                        </button>
                      </div>

                      <div className="mt-4 pt-4 border-t border-white/10 space-y-2 text-sm">
                        <button className="w-full flex items-center justify-center gap-2 p-2 rounded-lg hover:bg-white/10 transition-colors">
                          <Phone className="w-4 h-4" />
                          Call Owner
                        </button>
                        <button className="w-full flex items-center justify-center gap-2 p-2 rounded-lg hover:bg-white/10 transition-colors">
                          <MessageSquare className="w-4 h-4" />
                          Open Chat
                        </button>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            </div>
          )}
      </div>
    </DashboardLayout>
  );
};

export default SearchHomes;
