
export interface MaintenanceRequest {
  id: string;
  tenant_id: string;
  unit_id: string;
  category: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in-progress' | 'fixed' | 'cancelled';
  photo?: string | null;
  created_at: string;
  updated_at: string;
}

export async function createMaintenanceRequest(request: {
  tenant_id: string;
  unit_id: string;
  category: string;
  title: string;
  description: string;
  priority: string;
  photo?: string | null;
}): Promise<MaintenanceRequest | null> {
  try {
    const res = await fetch('/api/maintenance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    if (!res.ok) throw new Error('Network error');
    return await res.json();
  } catch (err) {
    console.error('Exception creating maintenance request:', err);
    return null;
  }
}

export async function getMaintenanceRequests(
  userId: string,
  role: 'tenant' | 'owner' | 'manager' = 'tenant'
): Promise<MaintenanceRequest[]> {
  try {
    const params = new URLSearchParams({ userId, role });
    const res = await fetch(`/api/maintenance?${params.toString()}`);
    if (!res.ok) throw new Error('Network error');
    return await res.json();
  } catch (error) {
    console.error('Error fetching maintenance requests:', error);
    return [];
  }
}
