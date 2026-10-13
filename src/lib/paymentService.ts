
export interface Payment {
  id: string;
  tenancy_id: string;
  amount: number;
  due_date: string;
  paid_date?: string;
  status: 'pending' | 'paid' | 'overdue';
  payment_method?: string;
  created_at: string;
}

export async function createPayment(payment: {
  tenancy_id: string;
  amount: number;
  due_date: string;
  status?: string;
}): Promise<Payment | null> {
  try {
    const res = await fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payment)
    });
    if (!res.ok) throw new Error('Network error');
    return await res.json();
  } catch (err) {
    console.error('Exception creating payment:', err);
    return null;
  }
}

export async function updatePayment(id: string, updates: Partial<Payment>): Promise<Payment | null> {
  try {
    const res = await fetch('/api/payments', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates })
    });
    if (!res.ok) throw new Error('Network error');
    return await res.json();
  } catch (error) {
    console.error('Error updating payment:', error);
    return null;
  }
}
