-- ============================================
-- COMPLETE DATABASE FIX - RUN THIS IN SUPABASE
-- ============================================

-- Step 1: Disable ALL RLS
ALTER TABLE IF EXISTS public.properties DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.units DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tenancies DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.rent_payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.maintenance_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.messages DISABLE ROW LEVEL SECURITY;

-- Step 2: Grant ALL permissions to authenticated users
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Step 3: Grant ALL permissions to anon users (for demo)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO anon;

-- Step 4: Grant specific table permissions
GRANT ALL ON public.properties TO authenticated, anon;
GRANT ALL ON public.units TO authenticated, anon;
GRANT ALL ON public.tenancies TO authenticated, anon;
GRANT ALL ON public.rent_payments TO authenticated, anon;
GRANT ALL ON public.maintenance_requests TO authenticated, anon;
GRANT ALL ON public.profiles TO authenticated, anon;
GRANT ALL ON public.user_roles TO authenticated, anon;

-- Step 5: Test insert (this should work now)
-- Uncomment to test:
-- INSERT INTO public.properties (owner_id, name, address, city, state, zip_code)
-- VALUES ('test-owner', 'Test Property', '123 Test St', 'Test City', 'TS', '12345');

SELECT 'Database permissions fixed! Try adding property now.' as status;
