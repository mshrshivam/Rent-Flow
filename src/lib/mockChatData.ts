// Mock users for chat system
export const MOCK_USERS = {
  owner: {
    id: 'owner@test.com',
    email: 'owner@test.com',
    full_name: 'Rajesh Kumar',
    role: 'owner',
    phone: '+91 98765 43210',
    avatar_url: null
  },
  manager: {
    id: 'manager@test.com',
    email: 'manager@test.com',
    full_name: 'Priya Sharma',
    role: 'manager',
    phone: '+91 98765 43211',
    avatar_url: null
  },
  tenants: [
    {
      id: 'tenant1@test.com',
      email: 'tenant1@test.com',
      full_name: 'Amit Patel',
      role: 'tenant',
      phone: '+91 98765 43212',
      avatar_url: null,
      unit: 'A-101',
      property: 'Sunrise Apartments'
    },
    {
      id: 'tenant2@test.com',
      email: 'tenant2@test.com',
      full_name: 'Sneha Reddy',
      role: 'tenant',
      phone: '+91 98765 43213',
      avatar_url: null,
      unit: 'A-102',
      property: 'Sunrise Apartments'
    },
    {
      id: 'tenant3@test.com',
      email: 'tenant3@test.com',
      full_name: 'Vikram Singh',
      role: 'tenant',
      phone: '+91 98765 43214',
      avatar_url: null,
      unit: 'B-201',
      property: 'Green Valley Homes'
    },
    {
      id: 'tenant4@test.com',
      email: 'tenant4@test.com',
      full_name: 'Ananya Iyer',
      role: 'tenant',
      phone: '+91 98765 43215',
      avatar_url: null,
      unit: 'B-202',
      property: 'Green Valley Homes'
    },
    {
      id: 'tenant5@test.com',
      email: 'tenant5@test.com',
      full_name: 'Rahul Sharma',
      role: 'tenant',
      phone: '+91 98765 43216',
      avatar_url: null,
      unit: 'C-301',
      property: 'Royal Heights'
    },
    {
      id: 'tenant6@test.com',
      email: 'tenant6@test.com',
      full_name: 'Priya Gupta',
      role: 'tenant',
      phone: '+91 98765 43217',
      avatar_url: null,
      unit: 'C-302',
      property: 'Royal Heights'
    }
  ]
};

// Initialize mock data in localStorage
export function initializeMockChatData() {
  const existingTenants = localStorage.getItem('tenants');
  
  if (!existingTenants) {
    // Add mock tenants to localStorage
    localStorage.setItem('tenants', JSON.stringify(MOCK_USERS.tenants));
    console.log('Mock tenants initialized:', MOCK_USERS.tenants);
  } else {
    // Check if we need to update with new tenants
    const storedTenants = JSON.parse(existingTenants);
    if (storedTenants.length < MOCK_USERS.tenants.length) {
      localStorage.setItem('tenants', JSON.stringify(MOCK_USERS.tenants));
      console.log('Mock tenants updated with new tenants:', MOCK_USERS.tenants);
    }
  }
  
  // Always ensure conversations are initialized
  const existingConversations = localStorage.getItem('conversations');
  if (!existingConversations) {
    // We'll let the Messages component handle conversation initialization
    console.log('Conversations will be initialized by Messages component');
  }
}

// Get available chat users based on role
export function getAvailableChatUsers(currentUserId: string, currentUserRole: string) {
  const users = [];
  
  if (currentUserRole === 'owner') {
    // Owner can chat with manager and all tenants
    users.push(MOCK_USERS.manager);
    
    // Add tenants from localStorage
    const storedTenants = localStorage.getItem('tenants');
    if (storedTenants) {
      const tenants = JSON.parse(storedTenants);
      users.push(...tenants);
    } else {
      users.push(...MOCK_USERS.tenants);
    }
  } else if (currentUserRole === 'manager') {
    // Manager can chat with owner and all tenants
    users.push(MOCK_USERS.owner);
    
    const storedTenants = localStorage.getItem('tenants');
    if (storedTenants) {
      const tenants = JSON.parse(storedTenants);
      users.push(...tenants);
    } else {
      users.push(...MOCK_USERS.tenants);
    }
  } else if (currentUserRole === 'tenant') {
    // Tenant can chat with owner, manager, and other tenants
    users.push(MOCK_USERS.owner);
    users.push(MOCK_USERS.manager);
    
    const storedTenants = localStorage.getItem('tenants');
    if (storedTenants) {
      const tenants = JSON.parse(storedTenants);
      // Add other tenants (exclude self)
      const otherTenants = tenants.filter((t: any) => t.id !== currentUserId && t.email !== currentUserId);
      users.push(...otherTenants);
    } else {
      const otherTenants = MOCK_USERS.tenants.filter(t => t.id !== currentUserId && t.email !== currentUserId);
      users.push(...otherTenants);
    }
  }
  
  return users;
}
