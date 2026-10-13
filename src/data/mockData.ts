import { Property, Unit, User, RentPayment, MaintenanceRequest, ServiceProvider, Notification } from '@/types';

export const mockUsers: User[] = [
  { id: '1', name: 'John Smith', email: 'john@owner.com', role: 'owner', avatar: '', phone: '+1 234 567 8901' },
  { id: '2', name: 'Sarah Manager', email: 'sarah@manager.com', role: 'manager', avatar: '', phone: '+1 234 567 8902' },
  { id: '3', name: 'Mike Tenant', email: 'mike@tenant.com', role: 'tenant', avatar: '', phone: '+1 234 567 8903' },
  { id: '4', name: 'Emily Tenant', email: 'emily@tenant.com', role: 'tenant', avatar: '', phone: '+1 234 567 8904' },
];

export const mockProperties: Property[] = [
  {
    id: '1',
    ownerId: '1',
    name: 'Skyline Residences',
    address: '123 Main Street',
    city: 'New York',
    state: 'NY',
    zipCode: '10001',
    description: 'Luxury apartments with stunning city views, modern amenities, and premium finishes.',
    images: ['/placeholder.svg'],
    facilities: ['Gym', 'Pool', 'Parking', '24/7 Security', 'Elevator', 'Rooftop Lounge'],
    totalUnits: 24,
    createdAt: new Date('2023-01-15'),
  },
  {
    id: '2',
    ownerId: '1',
    name: 'Green Valley Apartments',
    address: '456 Oak Avenue',
    city: 'Los Angeles',
    state: 'CA',
    zipCode: '90001',
    description: 'Eco-friendly living spaces surrounded by nature with sustainable features.',
    images: ['/placeholder.svg'],
    facilities: ['Garden', 'EV Charging', 'Solar Panels', 'Playground', 'BBQ Area'],
    totalUnits: 18,
    createdAt: new Date('2023-03-20'),
  },
  {
    id: '3',
    ownerId: '1',
    name: 'Harbor View Complex',
    address: '789 Waterfront Drive',
    city: 'Miami',
    state: 'FL',
    zipCode: '33101',
    description: 'Waterfront living with breathtaking ocean views and beach access.',
    images: ['/placeholder.svg'],
    facilities: ['Beach Access', 'Marina', 'Pool', 'Spa', 'Concierge', 'Fitness Center'],
    totalUnits: 32,
    createdAt: new Date('2023-06-10'),
  },
];

export const mockUnits: Unit[] = [
  {
    id: '1',
    property_id: '1',
    unit_number: 'A-101',
    monthly_rent: 25000,
  },
  {
    id: '2',
    property_id: '1',
    unit_number: 'A-102',
    monthly_rent: 18000,
  },
  {
    id: '3',
    property_id: '1',
    unit_number: 'A-201',
    monthly_rent: 35000,
  },
  {
    id: '4',
    property_id: '2',
    unit_number: 'B-201',
    monthly_rent: 22000,
  },
  {
    id: '5',
    property_id: '2',
    unit_number: 'B-202',
    monthly_rent: 22000,
  },
  {
    id: '6',
    property_id: '3',
    unit_number: 'C-301',
    monthly_rent: 28000,
  },
  {
    id: '7',
    property_id: '3',
    unit_number: 'C-302',
    monthly_rent: 28000,
  },
];

export const mockPayments: RentPayment[] = [
  { id: '1', tenantId: '3', unitId: '1', amount: 25000, dueDate: new Date('2024-01-01'), paidDate: new Date('2024-01-03'), status: 'paid', method: 'card' },
  { id: '2', tenantId: '3', unitId: '1', amount: 25000, dueDate: new Date('2024-02-01'), paidDate: new Date('2024-02-01'), status: 'paid', method: 'bank' },
  { id: '3', tenantId: '3', unitId: '1', amount: 25000, dueDate: new Date('2024-03-01'), paidDate: new Date('2024-03-05'), status: 'paid', method: 'upi' },
  { id: '4', tenantId: '3', unitId: '1', amount: 25000, dueDate: new Date('2024-04-01'), status: 'pending' },
  { id: '5', tenantId: '4', unitId: '5', amount: 22000, dueDate: new Date('2024-01-01'), paidDate: new Date('2024-01-10'), status: 'paid', method: 'card' },
  { id: '6', tenantId: '4', unitId: '5', amount: 22000, dueDate: new Date('2024-02-01'), status: 'overdue' },
];

export const mockMaintenanceRequests: MaintenanceRequest[] = [
  {
    id: '1',
    tenantId: '3',
    unitId: '1',
    category: 'plumbing',
    title: 'Leaking Faucet in Kitchen',
    description: 'The kitchen faucet has been leaking for 2 days. Water dripping constantly.',
    priority: 'medium',
    status: 'in-progress',
    images: [],
    createdAt: new Date('2024-03-20'),
    assignedTo: 'Bob the Plumber',
  },
  {
    id: '2',
    tenantId: '3',
    unitId: '1',
    category: 'electrical',
    title: 'Light Flickering in Bedroom',
    description: 'The ceiling light in the master bedroom keeps flickering.',
    priority: 'low',
    status: 'pending',
    images: [],
    createdAt: new Date('2024-03-22'),
  },
  {
    id: '3',
    tenantId: '4',
    unitId: '5',
    category: 'washing',
    title: 'Washing Machine Not Draining',
    description: 'The washing machine is not draining water after the cycle.',
    priority: 'high',
    status: 'fixed',
    images: [],
    createdAt: new Date('2024-03-18'),
    resolvedAt: new Date('2024-03-19'),
  },
];

export const mockServiceProviders: ServiceProvider[] = [
  { id: '1', name: 'Quick Fix Plumbing', category: 'plumbing', phone: '+1 555 0101', rating: 4.8, reviews: 234, distance: '0.5 km', availability: 'Available Now' },
  { id: '2', name: 'Spark Electric Services', category: 'electrical', phone: '+1 555 0102', rating: 4.6, reviews: 189, distance: '1.2 km', availability: 'Available in 30 min' },
  { id: '3', name: 'Appliance Pro Repairs', category: 'washing', phone: '+1 555 0103', rating: 4.9, reviews: 312, distance: '0.8 km', availability: 'Available Now' },
  { id: '4', name: 'HomeServ Solutions', category: 'general', phone: '+1 555 0104', rating: 4.5, reviews: 156, distance: '2.1 km', availability: 'Available in 1 hour' },
  { id: '5', name: 'Rapid Response Plumbing', category: 'plumbing', phone: '+1 555 0105', rating: 4.7, reviews: 198, distance: '1.5 km', availability: 'Available Now' },
];

export const mockTenancies: any[] = [
  {
    id: '1',
    unit_id: '1',
    tenant_id: '3',
    start_date: '2024-01-01',
    end_date: null,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    unit: {
      unit_number: 'A-101',
      monthly_rent: 25000,
      property: {
        name: 'Skyline Residences',
        address: '123 Main Street'
      }
    }
  },
  {
    id: '2',
    unit_id: '2',
    tenant_id: '4',
    start_date: '2024-02-01',
    end_date: null,
    is_active: true,
    created_at: '2024-02-01T00:00:00Z',
    unit: {
      unit_number: 'A-102',
      monthly_rent: 22000,
      property: {
        name: 'Skyline Residences',
        address: '123 Main Street'
      }
    }
  }
];

export const mockTenantProfiles: any[] = [
  {
    id: '3',
    full_name: 'Mike Tenant',
    email: 'mike@tenant.com',
    phone: '+1 234 567 8903',
    role: 'tenant',
    created_at: '2024-01-01T00:00:00Z'
  },
  {
    id: '4',
    full_name: 'Emily Tenant',
    email: 'emily@tenant.com',
    phone: '+1 234 567 8904',
    role: 'tenant',
    created_at: '2024-02-01T00:00:00Z'
  }
];

export const revenueData = [
  { month: 'Jan', revenue: 45000, expenses: 12000, profit: 33000 },
  { month: 'Feb', revenue: 48000, expenses: 11500, profit: 36500 },
  { month: 'Mar', revenue: 52000, expenses: 13000, profit: 39000 },
  { month: 'Apr', revenue: 49000, expenses: 11000, profit: 38000 },
  { month: 'May', revenue: 55000, expenses: 14000, profit: 41000 },
  { month: 'Jun', revenue: 58000, expenses: 12500, profit: 45500 },
];

export const mockConversations: any[] = [
  // Owner conversations with manager and tenants
  {
    id: 'owner-manager-1',
    title: 'Priya Sharma (Manager)',
    participants: ['owner@test.com', 'manager@test.com'],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-03-25T10:00:00Z',
    lastMessage: 'Monthly report has been prepared.',
    unread: 0,
    online: true,
    avatar: '',
    language: 'en'
  },
  {
    id: 'owner-tenant1-1',
    title: 'Amit Patel - Unit A-101',
    participants: ['owner@test.com', 'tenant1@test.com'],
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-03-24T14:00:00Z',
    lastMessage: 'Rent payment received successfully.',
    unread: 0,
    online: true,
    avatar: '',
    language: 'en'
  },
  {
    id: 'owner-tenant2-1',
    title: 'Sneha Reddy - Unit A-102',
    participants: ['owner@test.com', 'tenant2@test.com'],
    created_at: '2024-02-01T00:00:00Z',
    updated_at: '2024-03-23T16:30:00Z',
    lastMessage: 'Maintenance request submitted.',
    unread: 1,
    online: false,
    avatar: '',
    language: 'hi'
  },
  {
    id: 'owner-tenant3-1',
    title: 'Vikram Singh - Unit B-201',
    participants: ['owner@test.com', 'tenant3@test.com'],
    created_at: '2024-02-15T00:00:00Z',
    updated_at: '2024-03-22T11:00:00Z',
    lastMessage: 'Lease renewal discussion.',
    unread: 0,
    online: true,
    avatar: '',
    language: 'en'
  },
  {
    id: 'owner-tenant4-1',
    title: 'Ananya Iyer - Unit B-202',
    participants: ['owner@test.com', 'tenant4@test.com'],
    created_at: '2024-03-01T00:00:00Z',
    updated_at: '2024-03-21T09:00:00Z',
    lastMessage: 'Property inspection completed.',
    unread: 0,
    online: true,
    avatar: '',
    language: 'en'
  },
  {
    id: 'owner-tenant5-1',
    title: 'Rahul Sharma - Unit C-301',
    participants: ['owner@test.com', 'tenant5@test.com'],
    created_at: '2024-03-05T00:00:00Z',
    updated_at: '2024-03-20T13:00:00Z',
    lastMessage: 'New tenant orientation scheduled.',
    unread: 1,
    online: false,
    avatar: '',
    language: 'hi'
  },
  {
    id: 'owner-tenant6-1',
    title: 'Priya Gupta - Unit C-302',
    participants: ['owner@test.com', 'tenant6@test.com'],
    created_at: '2024-03-08T00:00:00Z',
    updated_at: '2024-03-19T12:00:00Z',
    lastMessage: 'Welcome to Royal Heights!',
    unread: 0,
    online: true,
    avatar: '',
    language: 'en'
  },
  // Manager conversations with owner and tenants
  {
    id: 'manager-tenant1-1',
    title: 'Amit Patel - Unit A-101',
    participants: ['manager@test.com', 'tenant1@test.com'],
    created_at: '2024-01-20T00:00:00Z',
    updated_at: '2024-03-18T10:00:00Z',
    lastMessage: 'Maintenance check scheduled.',
    unread: 0,
    online: true,
    avatar: '',
    language: 'en'
  },
  {
    id: 'manager-tenant2-1',
    title: 'Sneha Reddy - Unit A-102',
    participants: ['manager@test.com', 'tenant2@test.com'],
    created_at: '2024-02-05T00:00:00Z',
    updated_at: '2024-03-17T14:00:00Z',
    lastMessage: 'Rent collection reminder sent.',
    unread: 0,
    online: false,
    avatar: '',
    language: 'hi'
  },
  // Tenant conversations with owner, manager, and other tenants
  {
    id: 'tenant1-tenant2-1',
    title: 'Sneha Reddy',
    participants: ['tenant1@test.com', 'tenant2@test.com'],
    created_at: '2024-03-10T00:00:00Z',
    updated_at: '2024-03-19T15:00:00Z',
    lastMessage: 'Neighbor introduction.',
    unread: 0,
    online: true,
    avatar: '',
    language: 'en'
  },
  {
    id: 'tenant3-tenant4-1',
    title: 'Ananya Iyer',
    participants: ['tenant3@test.com', 'tenant4@test.com'],
    created_at: '2024-03-12T00:00:00Z',
    updated_at: '2024-03-18T10:00:00Z',
    lastMessage: 'Building community event.',
    unread: 0,
    online: true,
    avatar: '',
    language: 'hi'
  },
  {
    id: 'tenant5-tenant6-1',
    title: 'Priya Gupta',
    participants: ['tenant5@test.com', 'tenant6@test.com'],
    created_at: '2024-03-14T00:00:00Z',
    updated_at: '2024-03-17T16:00:00Z',
    lastMessage: 'Welcome to the floor!',
    unread: 1,
    online: true,
    avatar: '',
    language: 'en'
  }
];

export const mockMessages: any[] = [
  // Owner-Manager conversation
  {
    id: 'msg-1',
    conversation_id: 'owner-manager-1',
    sender_id: 'manager@test.com',
    content: 'Monthly report has been prepared.',
    original_language: 'en',
    created_at: '2024-03-25T10:00:00Z'
  },
  {
    id: 'msg-2',
    conversation_id: 'owner-manager-1',
    sender_id: 'owner@test.com',
    content: 'Thank you, please send it to my email.',
    original_language: 'en',
    created_at: '2024-03-25T10:05:00Z'
  },
  // Owner-Tenant1 conversation
  {
    id: 'msg-3',
    conversation_id: 'owner-tenant1-1',
    sender_id: 'tenant1@test.com',
    content: 'Hello, I have a question about the rent payment.',
    original_language: 'en',
    created_at: '2024-03-24T14:00:00Z'
  },
  {
    id: 'msg-4',
    conversation_id: 'owner-tenant1-1',
    sender_id: 'owner@test.com',
    content: 'Sure, what would you like to know?',
    original_language: 'en',
    created_at: '2024-03-24T14:05:00Z'
  },
  // Owner-Tenant2 conversation
  {
    id: 'msg-5',
    conversation_id: 'owner-tenant2-1',
    sender_id: 'tenant2@test.com',
    content: 'क्या मेंटेनेंस रिक्वेस्ट ठीक हो गई है?',
    original_language: 'hi',
    created_at: '2024-03-23T16:30:00Z'
  },
  {
    id: 'msg-6',
    conversation_id: 'owner-tenant2-1',
    sender_id: 'owner@test.com',
    content: 'Yes, the maintenance request has been resolved.',
    original_language: 'en',
    created_at: '2024-03-23T16:35:00Z'
  },
  // Owner-Tenant3 conversation
  {
    id: 'msg-7',
    conversation_id: 'owner-tenant3-1',
    sender_id: 'tenant3@test.com',
    content: 'Can we discuss lease renewal?',
    original_language: 'en',
    created_at: '2024-03-22T11:00:00Z'
  },
  {
    id: 'msg-8',
    conversation_id: 'owner-tenant3-1',
    sender_id: 'owner@test.com',
    content: 'Of course, let me know your preferred dates.',
    original_language: 'en',
    created_at: '2024-03-22T11:05:00Z'
  },
  // Manager-Tenant4 conversation
  {
    id: 'msg-9',
    conversation_id: 'manager-tenant4-1',
    sender_id: 'tenant4@test.com',
    content: 'Property inspection completed successfully.',
    original_language: 'en',
    created_at: '2024-03-21T09:00:00Z'
  },
  {
    id: 'msg-10',
    conversation_id: 'manager-tenant4-1',
    sender_id: 'manager@test.com',
    content: 'Great! Thank you for your cooperation.',
    original_language: 'en',
    created_at: '2024-03-21T09:05:00Z'
  },
  // Manager-Tenant5 conversation
  {
    id: 'msg-11',
    conversation_id: 'manager-tenant5-1',
    sender_id: 'tenant5@test.com',
    content: 'नए टेनेंट के लिए ओरिएंटेशन कब है?',
    original_language: 'hi',
    created_at: '2024-03-20T13:00:00Z'
  },
  {
    id: 'msg-12',
    conversation_id: 'manager-tenant5-1',
    sender_id: 'manager@test.com',
    content: 'Next Saturday at 10 AM.',
    original_language: 'en',
    created_at: '2024-03-20T13:05:00Z'
  },
  // Tenant1-Tenant2 conversation
  {
    id: 'msg-13',
    conversation_id: 'tenant1-tenant2-1',
    sender_id: 'tenant1@test.com',
    content: 'Hello Sneha, nice to meet you!',
    original_language: 'en',
    created_at: '2024-03-19T15:00:00Z'
  },
  {
    id: 'msg-14',
    conversation_id: 'tenant1-tenant2-1',
    sender_id: 'tenant2@test.com',
    content: 'Hello Amit, welcome to the building!',
    original_language: 'en',
    created_at: '2024-03-19T15:05:00Z'
  },
  // Tenant3-Tenant4 conversation
  {
    id: 'msg-15',
    conversation_id: 'tenant3-tenant4-1',
    sender_id: 'tenant3@test.com',
    content: 'क्या आप कम्युनिटी इवेंट में शामिल होंगे?',
    original_language: 'hi',
    created_at: '2024-03-18T10:00:00Z'
  },
  {
    id: 'msg-16',
    conversation_id: 'tenant3-tenant4-1',
    sender_id: 'tenant4@test.com',
    content: 'हाँ, जरूर! यह बहुत अच्छा रहेगा।',
    original_language: 'hi',
    created_at: '2024-03-18T10:05:00Z'
  }
];

export const mockNotifications: any[] = [
  { id: '1', userId: '1', title: 'Rent Payment Received', message: 'Mike Tenant paid rent for Unit A-101', type: 'success', read: false, createdAt: new Date() },
  { id: '2', userId: '1', title: 'Late Payment Alert', message: 'Emily Tenant is 5 days overdue on rent', type: 'warning', read: false, createdAt: new Date() },
  { id: '3', userId: '1', title: 'New Maintenance Request', message: 'Plumbing issue reported in Unit A-101', type: 'info', read: true, createdAt: new Date() },
  { id: '4', userId: '3', title: 'Rent Reminder', message: 'Your rent is due on April 1st', type: 'info', read: false, createdAt: new Date() },
];

export const mockTenants: any[] = [
  {
    id: 'tenant-1',
    tenant_id: 'user-1',
    full_name: 'Amit Patel',
    email: 'tenant1@test.com',
    phone: '+91 98765 43212',
    unit_id: '1',
    unit_number: 'A-101',
    property_name: 'Skyline Residences',
    property_address: '123 Main Street, New York, NY',
    monthly_rent: 25000,
    start_date: '2024-01-15',
    is_active: true
  },
  {
    id: 'tenant-2',
    tenant_id: 'user-2',
    full_name: 'Sneha Reddy',
    email: 'tenant2@test.com',
    phone: '+91 98765 43213',
    unit_id: '2',
    unit_number: 'A-102',
    property_name: 'Skyline Residences',
    property_address: '123 Main Street, New York, NY',
    monthly_rent: 18000,
    start_date: '2024-02-01',
    is_active: true
  },
  {
    id: 'tenant-3',
    tenant_id: 'user-3',
    full_name: 'Vikram Singh',
    email: 'tenant3@test.com',
    phone: '+91 98765 43214',
    unit_id: '4',
    unit_number: 'B-201',
    property_name: 'Green Valley Apartments',
    property_address: '456 Oak Avenue, Los Angeles, CA',
    monthly_rent: 22000,
    start_date: '2024-02-15',
    is_active: true
  },
  {
    id: 'tenant-4',
    tenant_id: 'user-4',
    full_name: 'Ananya Iyer',
    email: 'tenant4@test.com',
    phone: '+91 98765 43215',
    unit_id: '5',
    unit_number: 'B-202',
    property_name: 'Green Valley Apartments',
    property_address: '456 Oak Avenue, Los Angeles, CA',
    monthly_rent: 22000,
    start_date: '2024-03-01',
    is_active: true
  },
  {
    id: 'tenant-5',
    tenant_id: 'user-5',
    full_name: 'Rahul Sharma',
    email: 'tenant5@test.com',
    phone: '+91 98765 43216',
    unit_id: '6',
    unit_number: 'C-301',
    property_name: 'Harbor View Complex',
    property_address: '789 Waterfront Drive, Miami, FL',
    monthly_rent: 28000,
    start_date: '2024-03-05',
    is_active: true
  },
  {
    id: 'tenant-6',
    tenant_id: 'user-6',
    full_name: 'Priya Gupta',
    email: 'tenant6@test.com',
    phone: '+91 98765 43217',
    unit_id: '7',
    unit_number: 'C-302',
    property_name: 'Harbor View Complex',
    property_address: '789 Waterfront Drive, Miami, FL',
    monthly_rent: 28000,
    start_date: '2024-03-08',
    is_active: true
  }
];

// Initialize mock data in localStorage
export function initializeMockData() {
  // Initialize properties
  const existingProperties = localStorage.getItem('properties');
  if (!existingProperties) {
    localStorage.setItem('properties', JSON.stringify(mockProperties));
    console.log('Mock properties initialized');
  }

  // Initialize units
  const existingUnits = localStorage.getItem('units');
  if (!existingUnits) {
    localStorage.setItem('units', JSON.stringify(mockUnits));
    console.log('Mock units initialized');
  }

  // Initialize tenants
  const existingTenants = localStorage.getItem('tenants');
  if (!existingTenants) {
    localStorage.setItem('tenants', JSON.stringify(mockTenants));
    console.log('Mock tenants initialized');
  } else {
    // Check if we need to update with new tenants
    const storedTenants = JSON.parse(existingTenants);
    if (storedTenants.length < mockTenants.length) {
      localStorage.setItem('tenants', JSON.stringify(mockTenants));
      console.log('Mock tenants updated with new tenants');
    }
  }
}
