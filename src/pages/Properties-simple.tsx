import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Building2 } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { getProperties, type Property } from '@/lib/propertyService';
import { useAuth } from '@/contexts/AuthContext';

const Properties = () => {
  const { user } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProperties = async () => {
      try {
        if (!user) return;
        const props = await getProperties(user.id);
        setProperties(props);
      } catch (error) {
        console.error('Error loading properties:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadProperties();
  }, [user]);

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
          <button className="btn-primary flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add Property
          </button>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map((prop) => (
              <div key={prop.id} className="p-6 border rounded-lg bg-card">
                <h3 className="font-semibold text-lg">{prop.name}</h3>
                <p className="text-sm text-muted-foreground">{prop.city}, {prop.state}</p>
                <p className="text-sm mt-2">{prop.address}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Properties;
