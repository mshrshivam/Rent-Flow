

export interface Property {
  id: string;
  owner_id: string;
  name: string;
  address: string;
  city: string;
  state: string | null;
  zip_code: string | null;
  description: string | null;
  image_url: string | null;
  amenities: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface Unit {
  id: string;
  property_id: string;
  unit_number: string;
  unit_type: string;
  monthly_rent: number;
  security_deposit: number;
  status: string;
  floor_number: number | null;
  area_sqft: number | null;
  created_at: string;
  updated_at: string;
}

export async function getProperties(ownerId: string): Promise<Property[]> {
  try {
    const res = await fetch(`/api/properties?ownerId=${encodeURIComponent(ownerId)}`);
    if (!res.ok) throw new Error('Network error');
    return await res.json();
  } catch (err) {
    console.error('Exception fetching properties:', err);
    return [];
  }
}

export async function getAllProperties(): Promise<Property[]> {
  try {
    const res = await fetch('/api/properties?scope=all');
    if (!res.ok) throw new Error('Network error');
    return await res.json();
  } catch (err) {
    console.error('Exception fetching all properties:', err);
    return [];
  }
}

export async function getTenantProperties(tenantId: string): Promise<Property[]> {
  try {
    const res = await fetch(`/api/properties?tenantId=${encodeURIComponent(tenantId)}`);
    if (!res.ok) throw new Error('Network error');
    return await res.json();
  } catch (err) {
    console.error('Exception fetching tenant properties:', err);
    return [];
  }
}

export async function getUnits(propertyId: string): Promise<Unit[]> {
  try {
    const res = await fetch(`/api/units?propertyId=${encodeURIComponent(propertyId)}`);
    if (!res.ok) throw new Error('Network error');
    return await res.json();
  } catch (err) {
    console.error('Error fetching units:', err);
    return [];
  }
}

export async function createProperty(property: Omit<Property, 'id' | 'created_at' | 'updated_at'>): Promise<Property | null> {
  try {
    const res = await fetch('/api/properties', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(property)
    });
    if (!res.ok) throw new Error('Network error');
    return await res.json();
  } catch (err) {
    console.error('Exception creating property:', err);
    const mockProperty: Property = {
      id: 'mock-prop-' + Date.now(),
      ...property,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    return mockProperty;
  }
}

export async function updateProperty(id: string, updates: Partial<Property>): Promise<Property | null> {
  try {
    const res = await fetch(`/api/properties`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates })
    });
    if (!res.ok) throw new Error('Network error');
    return await res.json();
  } catch (error) {
    console.error('Error updating property:', error);
    return null;
  }
}

export async function deleteProperty(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/properties?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    return res.ok;
  } catch (error) {
    console.error('Error deleting property:', error);
    return false;
  }
}

export async function createUnit(unit: Omit<Unit, 'id' | 'created_at' | 'updated_at'>): Promise<Unit | null> {
  try {
    const res = await fetch('/api/units', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(unit)
    });
    if (!res.ok) throw new Error('Network error');
    return await res.json();
  } catch (err) {
    console.error('Exception creating unit:', err);
    const mockUnit: Unit = {
      id: 'mock-unit-' + Date.now(),
      ...unit,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    return mockUnit;
  }
}

export async function updateUnit(
  id: string,
  updates: Partial<Pick<Unit, 'unit_number' | 'unit_type' | 'monthly_rent' | 'status' | 'area_sqft'>>
): Promise<Unit | null> {
  try {
    const payload: Record<string, unknown> = { id };
    if (updates.unit_number !== undefined) payload.unit_number = updates.unit_number;
    if (updates.unit_type !== undefined) payload.unit_type = updates.unit_type;
    if (updates.monthly_rent !== undefined) payload.rent_amount = updates.monthly_rent;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.area_sqft !== undefined) payload.area_sqft = updates.area_sqft;

    const res = await fetch('/api/units', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Network error');
    return await res.json();
  } catch (error) {
    console.error('Error updating unit:', error);
    return null;
  }
}

export async function updateUnitStatus(id: string, status: 'available' | 'occupied'): Promise<Unit | null> {
  try {
    const res = await fetch('/api/units/status', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status })
    });
    if (!res.ok) throw new Error('Network error');
    return await res.json();
  } catch (error) {
    console.error('Error updating unit status:', error);
    return null;
  }
}

// Tenant-related functions
export interface TenantProfile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  role: string;
  created_at: string;
  updated_at: string;
}

export interface UnregisteredTenant {
  id: string;
  tenant_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  created_at: string;
}

export interface Tenancy {
  id: string;
  unit_id: string;
  tenant_id: string;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  unit?: Unit & { property?: Property };
  tenant?: TenantProfile;
}

export interface DashboardStats {
  owners?: number;
  properties: number;
  tenants: number;
  pendingRequests?: number;
}

export async function getDashboardStats(role: 'manager' | 'owner', ownerId?: string): Promise<DashboardStats> {
  try {
    const params = new URLSearchParams({ role });
    if (role === 'owner' && ownerId) params.set('ownerId', ownerId);

    const res = await fetch(`/api/dashboard/stats?${params.toString()}`);
    if (!res.ok) throw new Error('Network error');
    return await res.json();
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return { owners: 0, properties: 0, tenants: 0, pendingRequests: 0 };
  }
}

export async function getTenants(ownerId: string): Promise<TenantProfile[]> {
  try {
    const isManagerScope = ownerId === 'all';
    const res = await fetch(
      isManagerScope
        ? '/api/tenants?scope=all'
        : `/api/tenants?ownerId=${encodeURIComponent(ownerId)}`
    );
    if (!res.ok) throw new Error('Network error');
    return await res.json();
  } catch (error) {
    console.error('Error fetching tenants:', error);
    return [];
  }
}

export async function getUnregisteredTenants(): Promise<UnregisteredTenant[]> {
  try {
    const res = await fetch('/api/tenants?scope=unregistered');
    if (!res.ok) throw new Error('Network error');
    return await res.json();
  } catch (error) {
    console.error('Error fetching unregistered tenants:', error);
    return [];
  }
}

export async function assignTenantToFlat(params: {
  tenant_id: string;
  unit_id: string;
  start_date: string;
  end_date?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch('/api/tenants/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { success: false, error: data.error || 'Failed to assign tenant' };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error assigning tenant to flat:', error);
    return { success: false, error: error.message || 'Failed to assign tenant' };
  }
}

export async function createTenant(tenantData: {
  email: string;
  full_name: string;
  phone?: string;
  unit_id: string;
  start_date: string;
  end_date?: string;
}): Promise<{ success: boolean; tenant?: TenantProfile; tenancy?: Tenancy; error?: string }> {
  try {
    const res = await fetch('/api/tenants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tenantData)
    });
    if (!res.ok) {
      const data = await res.json();
      return { success: false, error: data.error || 'Failed to create tenant' };
    }
    const data = await res.json();
    return { success: true, tenant: data.tenant, tenancy: data.tenancy };
  } catch (error: any) {
    console.error('Error creating tenant:', error);
    return { success: false, error: error.message || 'Failed to create tenant' };
  }
}

export async function getTenancies(ownerId: string): Promise<Tenancy[]> {
  try {
    const isManagerScope = ownerId === 'all';
    const res = await fetch(
      isManagerScope
        ? '/api/tenancies?scope=all'
        : `/api/tenancies?ownerId=${encodeURIComponent(ownerId)}`
    );
    if (!res.ok) throw new Error("Network error");
    return await res.json();
  } catch (error) {
    console.error("Error fetching tenancies:", error);
    return [];
  }
}

export async function getTenantTenancies(tenantId: string): Promise<Tenancy[]> {
  try {
    const res = await fetch(`/api/tenancies?tenantId=${encodeURIComponent(tenantId)}`);
    if (!res.ok) throw new Error('Network error');
    return await res.json();
  } catch (error) {
    console.error('Error fetching tenant tenancies:', error);
    return [];
  }
}
