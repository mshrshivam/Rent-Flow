import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// keep AppRole type aligned with other parts of the code
export type AppRole = 'owner' | 'manager' | 'tenant';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string | null;
  role: AppRole;
  avatarUrl: string | null;
  phone: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    role: AppRole
  ) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Test credentials for demo
const TEST_USERS = {
  'owner@test.com': { password: 'password123', role: 'owner' as AppRole, name: 'Property Owner' },
  'manager@test.com': { password: 'password123', role: 'manager' as AppRole, name: 'Property Manager' },
  'tenant@test.com': { password: 'password123', role: 'tenant' as AppRole, name: 'John Tenant' },
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserProfile = async (userId: string): Promise<AuthUser | null> => {
    try {
      const res = await fetch(`/api/auth/profile?userId=${encodeURIComponent(userId)}`);
      if (!res.ok) throw new Error('Network error');
      const data = await res.json();
      return data.user as AuthUser;
    } catch (err) {
      console.error('fetchUserProfile error', err);
      return null;
    }
  };

  // restore from localStorage
  useEffect(() => {
    const savedUser = localStorage.getItem('authUser');
    if (savedUser) {
      try {
        const parsed: AuthUser = JSON.parse(savedUser);
        setUser(parsed);
      } catch {}
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);

      // Prefer real backend authentication first so tenant IDs match DB tenancies.
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        localStorage.setItem('authUser', JSON.stringify(data.user));
        return { error: null };
      }

      const testUser = TEST_USERS[email as keyof typeof TEST_USERS];
      if (testUser && testUser.password === password) {
        const mockAuthUser: AuthUser = {
          id: email,
          email,
          fullName: testUser.name,
          role: testUser.role,
          avatarUrl: null,
          phone: null,
        };
        setUser(mockAuthUser);
        localStorage.setItem('authUser', JSON.stringify(mockAuthUser));
        return { error: null };
      }

      const storedTenants = localStorage.getItem('tenants');
      if (storedTenants) {
        const tenants = JSON.parse(storedTenants);
        const tenant = tenants.find((t: any) => t.email === email);
        if (tenant && (password === 'password123' || password === email)) {
          const mockAuthUser: AuthUser = {
            id: tenant.id,
            email: tenant.email,
            fullName: tenant.full_name,
            role: 'tenant',
            avatarUrl: tenant.avatar_url || null,
            phone: tenant.phone || null,
          };
          setUser(mockAuthUser);
          localStorage.setItem('authUser', JSON.stringify(mockAuthUser));
          return { error: null };
        }
      }

      const data = await res.json();
      return { error: data.error || 'Login failed' };
    } catch (err: any) {
      return { error: err.message || 'An unexpected error occurred. Please try again.' };
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    role: AppRole
  ) => {
    try {
      setIsLoading(true);
      if (email in TEST_USERS) {
        return { error: 'An account with this email already exists. Please log in instead.' };
      }
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fullName, role })
      });
      const data = await res.json();
      if (!res.ok) {
        return { error: data.error || 'Signup failed' };
      }
      setUser(data.user);
      localStorage.setItem('authUser', JSON.stringify(data.user));
      return { error: null };
    } catch (err: any) {
      return { error: err.message || 'An unexpected error occurred. Please try again.' };
    } finally {
      setIsLoading(false);
    }
  };
  
  const logout = async () => {
    setIsLoading(true);
    setUser(null);
    localStorage.removeItem('authUser');
    setIsLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        signUp,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
