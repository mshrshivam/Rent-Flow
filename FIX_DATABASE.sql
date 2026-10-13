-- ============================================
-- FIX ALL RLS AND PERMISSION ISSUES
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Disable RLS on all tables
ALTER TABLE IF EXISTS public.properties DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.units DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tenancies DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.rent_payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.maintenance_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_roles DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop all existing policies (to avoid conflicts)
DROP POLICY IF EXISTS "Anyone can view properties" ON public.properties;
DROP POLICY IF EXISTS "Owners can insert properties" ON public.properties;
DROP POLICY IF EXISTS "Owners can update own properties" ON public.properties;
DROP POLICY IF EXISTS "Owners can delete own properties" ON public.properties;
DROP POLICY IF EXISTS "Anyone can view units" ON public.units;
DROP POLICY IF EXISTS "Owners can manage units" ON public.units;
DROP POLICY IF EXISTS "View own tenancies" ON public.tenancies;
DROP POLICY IF EXISTS "Owners/managers can manage tenancies" ON public.tenancies;
DROP POLICY IF EXISTS "View relevant payments" ON public.rent_payments;
DROP POLICY IF EXISTS "Manage payments" ON public.rent_payments;
DROP POLICY IF EXISTS "View maintenance requests" ON public.maintenance_requests;
DROP POLICY IF EXISTS "Tenants can create requests" ON public.maintenance_requests;
DROP POLICY IF EXISTS "Update maintenance requests" ON public.maintenance_requests;

-- Step 3: Grant full permissions to authenticated users
GRANT ALL ON public.properties TO authenticated;
GRANT ALL ON public.units TO authenticated;
GRANT ALL ON public.tenancies TO authenticated;
GRANT ALL ON public.rent_payments TO authenticated;
GRANT ALL ON public.maintenance_requests TO authenticated;
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.user_roles TO authenticated;

-- Step 4: Grant permissions to anon users (for demo/testing)
GRANT ALL ON public.properties TO anon;
GRANT ALL ON public.units TO anon;
GRANT ALL ON public.tenancies TO anon;
GRANT ALL ON public.rent_payments TO anon;
GRANT ALL ON public.maintenance_requests TO anon;
GRANT ALL ON public.profiles TO anon;
GRANT ALL ON public.user_roles TO anon;

-- Step 5: Grant sequence permissions
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Step 6: Verify changes
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('properties', 'units', 'tenancies', 'rent_payments', 'maintenance_requests');

-- Success message
SELECT 'RLS disabled and permissions granted successfully!' as status;
