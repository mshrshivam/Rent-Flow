export type UserRole = 'owner' | 'manager' | 'tenant';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
}

export interface Property {
  id: string;
  ownerId: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  description: string;
  images: string[];
  facilities: string[];
  totalUnits: number;
  createdAt: Date;
}

export interface Unit {
  id: string;
  propertyId: string;
  unitNumber: string;
  type: '1BHK' | '2BHK' | '3BHK' | 'Studio';
  monthlyRent: number;
  securityDeposit: number;
  status: 'available' | 'occupied' | 'maintenance';
  sqft: number;
  bedrooms: number;
  bathrooms: number;
  amenities: string[];
  images: string[];
}

export interface Tenant {
  id: string;
  userId: string;
  unitId: string;
  leaseStart: Date;
  leaseEnd: Date;
  monthlyRent: number;
  securityDeposit: number;
  status: 'active' | 'pending' | 'ended';
  score: number;
  latePayments: number;
  complaints: number;
}

export interface RentPayment {
  id: string;
  tenantId: string;
  unitId: string;
  amount: number;
  dueDate: Date;
  paidDate?: Date;
  status: 'paid' | 'pending' | 'overdue';
  method?: 'card' | 'bank' | 'cash' | 'upi';
}

export interface MaintenanceRequest {
  id: string;
  tenantId: string;
  unitId: string;
  category: 'plumbing' | 'electrical' | 'washing' | 'general' | 'other';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in-progress' | 'fixed' | 'closed';
  images: string[];
  createdAt: Date;
  resolvedAt?: Date;
  assignedTo?: string;
}

export interface ServiceProvider {
  id: string;
  name: string;
  category: string;
  phone: string;
  rating: number;
  reviews: number;
  distance: string;
  availability: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: Date;
  read: boolean;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  read: boolean;
  createdAt: Date;
}
