-- Temporarily disable RLS for demo/development
-- WARNING: Only use this in development environment

-- Disable RLS on tables for easier testing
ALTER TABLE public.properties DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.units DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenancies DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.rent_payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_requests DISABLE ROW LEVEL SECURITY;

-- Keep profiles and user_roles RLS enabled for security
-- ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;

-- Note: Re-enable RLS in production by running:
-- ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
-- etc.
